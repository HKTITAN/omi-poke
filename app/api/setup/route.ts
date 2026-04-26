import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/signing";
import { encryptClaims, Scope } from "@/lib/crypto";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  token?: string;
  pokeApiKey?: string;
  enable?: { memory?: boolean; transcript?: boolean; tool?: boolean; mcp?: boolean };
};

const ALL_SCOPES: Scope[] = ["memory", "transcript", "tool", "mcp"];

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const { token, pokeApiKey, enable } = body;
  if (!token || !pokeApiKey) {
    return NextResponse.json({ error: "missing token or pokeApiKey" }, { status: 400 });
  }
  const claims = verifyToken<{ kind: string; uid: string }>(token);
  if (!claims || claims.kind !== "setup" || !claims.uid) {
    return NextResponse.json({ error: "invalid or expired token" }, { status: 401 });
  }
  if (!/^[\x20-\x7E]{8,512}$/.test(pokeApiKey)) {
    return NextResponse.json({ error: "invalid pokeApiKey" }, { status: 400 });
  }

  const wanted: Scope[] = ALL_SCOPES.filter((s) => enable?.[s]);
  if (wanted.length === 0) {
    return NextResponse.json({ error: "enable at least one option" }, { status: 400 });
  }

  const base = env.PUBLIC_BASE_URL;
  const urls: Partial<Record<Scope, string>> = {};
  for (const s of wanted) {
    const t = encryptClaims({ k: pokeApiKey.trim(), u: claims.uid, s, v: 1 });
    urls[s] = s === "mcp" ? `${base}/api/mcp/${t}` : `${base}/api/omi/${s}?t=${t}`;
  }
  return NextResponse.json({ ok: true, uid: claims.uid, urls });
}
