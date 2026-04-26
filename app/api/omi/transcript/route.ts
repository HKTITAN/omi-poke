import { NextRequest, NextResponse } from "next/server";
import { checkOmiAuth } from "@/lib/auth";
import { decryptClaims } from "@/lib/crypto";
import { sendToPoke } from "@/lib/poke";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Real-time transcript webhook. Configure with `?t=<token>`.
export async function POST(req: NextRequest) {
  const auth = checkOmiAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const t = req.nextUrl.searchParams.get("t");
  if (!t) return NextResponse.json({ error: "missing t query param" }, { status: 400 });
  const claims = decryptClaims(t);
  if (!claims) return NextResponse.json({ error: "invalid token" }, { status: 401 });
  if (claims.s !== "transcript") return NextResponse.json({ error: "wrong scope" }, { status: 403 });

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const segments: any[] = Array.isArray(payload) ? payload : payload?.segments || [];
  const text = segments.map((s) => s?.text).filter(Boolean).join(" ").trim();
  if (text.length < 20) return NextResponse.json({ ok: true, skipped: true });

  const result = await sendToPoke(claims.k, `Live transcript: ${text}`, {
    source: "omi",
    event: "transcript",
  });
  if (!result.ok) {
    return NextResponse.json({ error: "poke error", status: result.status, detail: result.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
