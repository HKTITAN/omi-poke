import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { env } from "./env";

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Buffer {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
}

function aesKey(): Buffer {
  // Derive a stable 32-byte key from APP_SECRET. Domain-separated from HMAC use.
  return createHash("sha256").update(`omi-poke:aes-v1:${env.APP_SECRET}`).digest();
}

export type Scope = "memory" | "transcript" | "tool" | "mcp";
export type WebhookClaims = { k: string; u: string; s: Scope; v: 1 };

export function encryptClaims(claims: WebhookClaims): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", aesKey(), iv);
  const pt = Buffer.from(JSON.stringify(claims), "utf8");
  const ct = Buffer.concat([cipher.update(pt), cipher.final()]);
  const tag = cipher.getAuthTag();
  return b64url(Buffer.concat([iv, ct, tag]));
}

export function decryptClaims(token: string): WebhookClaims | null {
  try {
    const buf = fromB64url(token);
    if (buf.length < 12 + 16 + 1) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(buf.length - 16);
    const ct = buf.subarray(12, buf.length - 16);
    const decipher = createDecipheriv("aes-256-gcm", aesKey(), iv);
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    const obj = JSON.parse(pt.toString("utf8"));
    if (
      obj &&
      typeof obj.k === "string" &&
      typeof obj.u === "string" &&
      (obj.s === "memory" || obj.s === "transcript" || obj.s === "tool" || obj.s === "mcp") &&
      obj.v === 1
    ) {
      return obj as WebhookClaims;
    }
    return null;
  } catch {
    return null;
  }
}
