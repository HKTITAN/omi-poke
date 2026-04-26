import { createHmac, timingSafeEqual, randomBytes } from "crypto";
import { env } from "./env";

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Buffer {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
}

function sign(payload: string): string {
  return b64url(createHmac("sha256", env.APP_SECRET).update(payload).digest());
}

export function signToken(data: Record<string, unknown>, ttlSeconds: number): string {
  const body = { ...data, exp: Math.floor(Date.now() / 1000) + ttlSeconds, jti: randomBytes(8).toString("hex") };
  const payload = b64url(Buffer.from(JSON.stringify(body)));
  return `${payload}.${sign(payload)}`;
}

export function verifyToken<T = Record<string, unknown>>(token: string): T | null {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".", 2);
  const expected = sign(payload);
  const a = fromB64url(sig);
  const b = fromB64url(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const body = JSON.parse(fromB64url(payload).toString("utf8")) as { exp?: number };
    if (body.exp && body.exp < Math.floor(Date.now() / 1000)) return null;
    return body as T;
  } catch {
    return null;
  }
}
