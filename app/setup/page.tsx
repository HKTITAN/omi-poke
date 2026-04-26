"use client";

import { useEffect, useState } from "react";
import { Brand } from "../components/Brand";

type Scope = "memory" | "transcript" | "tool";
type Urls = Partial<Record<Scope, string>>;

const SCOPES: { id: Scope; title: string; blurb: string; defaultOn: boolean }[] = [
  {
    id: "tool",
    title: "Chat tool (explicit)",
    blurb:
      "Only forward when you explicitly invoke send_to_poke in Omi. Lowest-traffic, fully under your control.",
    defaultOn: true,
  },
  {
    id: "memory",
    title: "Memory created",
    blurb:
      "Forward a summary every time Omi saves a finished conversation. Good for meeting capture and journaling.",
    defaultOn: false,
  },
  {
    id: "transcript",
    title: "Real-time transcript",
    blurb:
      "Forward live transcript chunks as you speak. Highest traffic — every conversation goes to Poke.",
    defaultOn: false,
  },
];

export default function SetupPage() {
  const [token, setToken] = useState<string>("");
  const [pokeKey, setPokeKey] = useState<string>("");
  const [enabled, setEnabled] = useState<Record<Scope, boolean>>({
    tool: true,
    memory: false,
    transcript: false,
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "ok" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [urls, setUrls] = useState<Urls | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token") || "";
    setToken(t);
    if (!t) {
      setStatus("error");
      setMessage("Missing setup token. Reinstall the app from Omi to start over.");
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setMessage("");
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, pokeApiKey: pokeKey.trim(), enable: enabled }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Failed");
        return;
      }
      setStatus("ok");
      setUrls(data.urls as Urls);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  function copy(s: string) {
    navigator.clipboard.writeText(s).catch(() => {});
  }

  const anyEnabled = Object.values(enabled).some(Boolean);

  return (
    <main style={{ maxWidth: 640, margin: "60px auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <Brand size={36} />
      <h1 style={{ marginBottom: 8, marginTop: 24 }}>Connect Poke</h1>
      <p style={{ color: "#555", marginBottom: 24 }}>
        Pick which Omi events you want forwarded to Poke. We&apos;ll encrypt your Poke API key into a webhook URL for
        each enabled event — nothing is stored on the server.
      </p>

      {!urls && (
        <form onSubmit={submit}>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Poke API key</label>
          <input
            type="password"
            value={pokeKey}
            onChange={(e) => setPokeKey(e.target.value)}
            placeholder="pk_..."
            required
            autoComplete="off"
            style={{ width: "100%", padding: 10, fontSize: 14, border: "1px solid #ccc", borderRadius: 6 }}
          />
          <p style={{ fontSize: 12, color: "#777", marginTop: 6 }}>
            Generate one at{" "}
            <a href="https://poke.com/settings/advanced" target="_blank" rel="noreferrer">poke.com/settings/advanced</a>.
          </p>

          <fieldset style={{ marginTop: 24, border: "1px solid #e5e5e5", borderRadius: 8, padding: 16 }}>
            <legend style={{ padding: "0 6px", fontWeight: 600 }}>Events to forward</legend>
            {SCOPES.map((s) => (
              <label key={s.id} style={{ display: "flex", gap: 10, padding: "10px 0", alignItems: "flex-start", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={enabled[s.id]}
                  onChange={(e) => setEnabled((prev) => ({ ...prev, [s.id]: e.target.checked }))}
                  style={{ marginTop: 4 }}
                />
                <span>
                  <span style={{ fontWeight: 600 }}>{s.title}</span>
                  <br />
                  <span style={{ fontSize: 13, color: "#666" }}>{s.blurb}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <button
            type="submit"
            disabled={!token || !pokeKey || !anyEnabled || status === "submitting"}
            style={{ marginTop: 16, padding: "10px 16px", fontSize: 14, borderRadius: 6, cursor: "pointer" }}
          >
            {status === "submitting" ? "Generating..." : "Generate webhook URLs"}
          </button>
        </form>
      )}

      {message && !urls && (
        <p style={{ marginTop: 20, color: status === "error" ? "#b00020" : "#0a7d2e" }}>{message}</p>
      )}

      {urls && (
        <div>
          <p style={{ color: "#0a7d2e", fontWeight: 600 }}>Done. Paste these into your Omi app config:</p>
          {(Object.keys(urls) as Scope[]).map((kind) => (
            <div key={kind} style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 4, textTransform: "capitalize" }}>{kind} webhook</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  readOnly
                  value={urls[kind]}
                  style={{ flex: 1, padding: 8, fontSize: 12, fontFamily: "monospace", border: "1px solid #ccc", borderRadius: 6 }}
                />
                <button onClick={() => copy(urls[kind]!)} style={{ padding: "8px 12px", borderRadius: 6, cursor: "pointer" }}>
                  Copy
                </button>
              </div>
            </div>
          ))}
          <p style={{ marginTop: 24, fontSize: 12, color: "#777" }}>
            Each URL is scoped to a single event type — a memory URL won&apos;t accept transcript posts and vice versa.
            To change which events are forwarded, reinstall the Omi app and run setup again. To revoke, rotate your
            Poke API key (or this server&apos;s <code>APP_SECRET</code>).
          </p>
        </div>
      )}
    </main>
  );
}
