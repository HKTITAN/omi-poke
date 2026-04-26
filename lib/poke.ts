const POKE_ENDPOINT = "https://poke.com/api/v1/inbound/api-message";

export type PokeResult = { ok: true; body: unknown } | { ok: false; status: number; error: string };

export async function sendToPoke(apiKey: string, message: string, extra?: Record<string, unknown>): Promise<PokeResult> {
  try {
    const res = await fetch(POKE_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, ...(extra || {}) }),
    });
    const text = await res.text();
    let body: unknown = text;
    try { body = JSON.parse(text); } catch {}
    if (!res.ok) return { ok: false, status: res.status, error: typeof body === "string" ? body : JSON.stringify(body) };
    return { ok: true, body };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : String(e) };
  }
}
