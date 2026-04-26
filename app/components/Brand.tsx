export function Brand({ size = 36 }: { size?: number }) {
  const badgeStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: 10,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "0 0 auto",
  };
  const inner: React.CSSProperties = {
    width: Math.round(size * 0.7),
    height: Math.round(size * 0.7),
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ ...badgeStyle, background: "#3478f6" }} aria-hidden>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: size * 0.5, letterSpacing: -0.5 }}>O</span>
      </span>
      <span style={{ color: "#999", fontWeight: 600 }}>→</span>
      <span style={{ ...badgeStyle, background: "#0f172a" }} aria-hidden>
        <img src="/poke.svg" alt="" style={inner} />
      </span>
      <span style={{ marginLeft: 6, fontWeight: 700, fontSize: 16 }}>omi-poke bridge</span>
    </div>
  );
}
