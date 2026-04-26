import { Brand } from "./components/Brand";

export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: "60px auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <Brand size={44} />
      <h1 style={{ marginTop: 32 }}>Connect Omi to Poke</h1>
      <p style={{ color: "#555" }}>
        Forwards Omi events (memories, transcripts, chat tool calls) to your Poke assistant via the Poke API.
      </p>
      <p style={{ color: "#555" }}>
        This is the backend for an Omi app. Install the app from Omi to get started — you will be redirected here
        to connect your Poke API key.
      </p>
      <p style={{ marginTop: 24 }}>
        <a
          href="/auth/omi/start"
          style={{
            display: "inline-block",
            padding: "10px 18px",
            background: "#111",
            color: "#fff",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Connect with Omi
        </a>
      </p>
      <p style={{ fontSize: 12, color: "#888", marginTop: 40 }}>
        Open source, MIT licensed. See the README for setup instructions.
      </p>
    </main>
  );
}
