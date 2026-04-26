import { NextRequest, NextResponse } from "next/server";
import { checkOmiAuth } from "@/lib/auth";
import { decryptClaims } from "@/lib/crypto";
import { sendToPoke } from "@/lib/poke";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Omi "memory created" webhook. Configure with `?t=<token>` (the per-user
// token issued by /setup, which encrypts the user's Poke API key).
export async function POST(req: NextRequest) {
  const auth = checkOmiAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const t = req.nextUrl.searchParams.get("t");
  if (!t) return NextResponse.json({ error: "missing t query param" }, { status: 400 });
  const claims = decryptClaims(t);
  if (!claims) return NextResponse.json({ error: "invalid token" }, { status: 401 });
  if (claims.s !== "memory") return NextResponse.json({ error: "wrong scope" }, { status: 403 });

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const title: string = payload?.structured?.title || payload?.title || "New Omi memory";
  const overview: string = payload?.structured?.overview || payload?.overview || "";
  const transcript: string =
    payload?.transcript ||
    (Array.isArray(payload?.transcript_segments)
      ? payload.transcript_segments.map((s: any) => s?.text).filter(Boolean).join(" ")
      : "");

  const message = [
    `New Omi memory: ${title}`,
    overview && `Summary: ${overview}`,
    transcript && `Transcript: ${transcript.slice(0, 4000)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const result = await sendToPoke(claims.k, message, { source: "omi", event: "memory_created" });
  if (!result.ok) {
    return NextResponse.json({ error: "poke error", status: result.status, detail: result.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
