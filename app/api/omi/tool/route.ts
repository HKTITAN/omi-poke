import { NextRequest, NextResponse } from "next/server";
import { checkOmiAuth } from "@/lib/auth";
import { decryptClaims } from "@/lib/crypto";
import { sendToPoke } from "@/lib/poke";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Chat tool / action endpoint. Configure with `?t=<token>`.
export async function POST(req: NextRequest) {
  const auth = checkOmiAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const t = req.nextUrl.searchParams.get("t");
  if (!t) return NextResponse.json({ result: "Bridge not configured: missing token." });
  const claims = decryptClaims(t);
  if (!claims) return NextResponse.json({ result: "Bridge not configured: invalid token." });
  if (claims.s !== "tool") return NextResponse.json({ result: "Bridge not configured: wrong scope." });

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {}
  const message: string =
    payload?.message || payload?.request || payload?.text || payload?.prompt || "";
  if (!message || typeof message !== "string") {
    return NextResponse.json({ result: "No message provided." });
  }

  const result = await sendToPoke(claims.k, message, { source: "omi", event: "chat_tool" });
  if (!result.ok) {
    return NextResponse.json({ result: `Poke error (${result.status}): ${result.error}` });
  }
  return NextResponse.json({ result: "Sent to Poke." });
}
