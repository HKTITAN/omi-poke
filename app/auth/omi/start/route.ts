import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { signToken } from "@/lib/signing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const state = signToken({ kind: "oauth-state" }, 600);
  const url = new URL("https://api.omi.me/v1/oauth/authorize");
  url.searchParams.set("app_id", env.OMI_APP_ID);
  url.searchParams.set("state", state);
  return NextResponse.redirect(url.toString());
}
