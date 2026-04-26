import { NextRequest, NextResponse } from "next/server";
import { decryptClaims, WebhookClaims } from "@/lib/crypto";
import { sendToPoke } from "@/lib/poke";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Minimal MCP "streamable HTTP" server. Exposes Poke as an MCP tool so any
// MCP-capable client (Claude Desktop, Cursor, Poke itself, etc.) can be
// configured with this URL and gain a `send_to_poke` tool.
//
// URL shape: /api/mcp/<encrypted-token>  (token issued by /api/setup with scope=mcp)

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = { name: "omi-poke-bridge", version: "0.1.0" };

const TOOLS = [
  {
    name: "send_to_poke",
    description:
      "Send a message to the user's Poke assistant. Poke can take real-world actions on the user's behalf — email, SMS, calendar, browser automations, search, scheduled reminders, and any of its connected integrations. Use this to delegate a task, ask Poke to remind/schedule/look up something, or relay information for Poke to act on. Returns once the message is queued; Poke replies asynchronously through its own channels.",
    inputSchema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "The natural-language instruction or content to send to Poke.",
        },
      },
      required: ["message"],
      additionalProperties: false,
    },
  },
];

type JsonRpcReq = { jsonrpc: "2.0"; id?: number | string | null; method: string; params?: any };
type JsonRpcRes = { jsonrpc: "2.0"; id: number | string | null; result?: any; error?: { code: number; message: string } };

class RpcError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

async function dispatch(method: string, params: any, claims: WebhookClaims): Promise<any> {
  switch (method) {
    case "initialize":
      return {
        protocolVersion: typeof params?.protocolVersion === "string" ? params.protocolVersion : PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
      };
    case "ping":
      return {};
    case "tools/list":
      return { tools: TOOLS };
    case "tools/call": {
      const name = params?.name;
      const args = params?.arguments || {};
      if (name !== "send_to_poke") throw new RpcError(-32601, `unknown tool: ${name}`);
      const message = typeof args.message === "string" ? args.message.trim() : "";
      if (!message) throw new RpcError(-32602, "message is required");
      const r = await sendToPoke(claims.k, message, { source: "mcp" });
      if (!r.ok) {
        return {
          content: [{ type: "text", text: `Poke error (${r.status}): ${r.error}` }],
          isError: true,
        };
      }
      return { content: [{ type: "text", text: "Sent to Poke." }] };
    }
    default:
      throw new RpcError(-32601, `method not found: ${method}`);
  }
}

async function handleOne(msg: JsonRpcReq, claims: WebhookClaims): Promise<JsonRpcRes | null> {
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return { jsonrpc: "2.0", id: (msg && (msg.id ?? null)) as any, error: { code: -32600, message: "invalid request" } };
  }
  const isNotification = msg.id === undefined || msg.id === null;
  try {
    const result = await dispatch(msg.method, msg.params, claims);
    if (isNotification) return null;
    return { jsonrpc: "2.0", id: msg.id!, result };
  } catch (e: any) {
    if (isNotification) return null;
    const code = e instanceof RpcError ? e.code : -32603;
    const message = e?.message ? String(e.message) : "internal error";
    return { jsonrpc: "2.0", id: msg.id!, error: { code, message } };
  }
}

export async function POST(req: NextRequest, { params }: { params: { t: string } }) {
  const claims = decryptClaims(params.t);
  if (!claims || claims.s !== "mcp") {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32000, message: "invalid or missing token" } },
      { status: 401 },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } },
      { status: 400 },
    );
  }

  if (Array.isArray(body)) {
    const responses = (await Promise.all(body.map((m) => handleOne(m, claims)))).filter(
      (x): x is JsonRpcRes => x !== null,
    );
    if (responses.length === 0) return new Response(null, { status: 204 });
    return NextResponse.json(responses);
  }

  const response = await handleOne(body, claims);
  if (!response) return new Response(null, { status: 204 });
  return NextResponse.json(response);
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "mcp", server: SERVER_INFO, tools: TOOLS.map((t) => t.name) });
}
