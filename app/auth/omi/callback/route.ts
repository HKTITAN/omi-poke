import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { signToken, verifyToken } from "@/lib/signing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const uid = sp.get("uid");
  const state = sp.get("state");

  if (!uid) return NextResponse.json({ error: "missing uid" }, { status: 400 });
  if (!state || !verifyToken(state)) {
    return NextResponse.json({ error: "invalid or expired state" }, { status: 400 });
  }

  const setupToken = signToken({ kind: "setup", uid }, 1800);
  const dest = new URL(`${env.PUBLIC_BASE_URL}/setup`);
  dest.searchParams.set("token", setupToken);
  return NextResponse.redirect(dest.toString());
}
