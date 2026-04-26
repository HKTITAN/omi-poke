import { NextRequest } from "next/server";
import { env } from "./env";

export function checkOmiAuth(req: NextRequest): { ok: true } | { ok: false; status: number; error: string } {
  const expected = env.OMI_WEBHOOK_SECRET;
  if (!expected) return { ok: true };
  const header = req.headers.get("authorization") || "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : header;
  if (provided && provided === expected) return { ok: true };
  return { ok: false, status: 401, error: "unauthorized" };
}
