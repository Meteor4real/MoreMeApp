import { EXTENSIONS } from "../extensions";

export function ExtensionsView({
  enabled,
  onToggle,
}: {
  enabled: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="stage">
      <div
        className="mono"
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--line)",
          fontSize: 12,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: "var(--mute)",
        }}
      >
        House Extensions <span className="glow-text">· {enabled.size} on</span>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        <p style={{ color: "var(--mute)", fontSize: 13, maxWidth: 620, marginTop: 0 }}>
          Only extensions we make — no third-party store. Toggle one on and it
          runs in every browser tab on its next load (reload a tab to apply).
          They are all deeply unserious.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 12,
            marginTop: 8,
          }}
        >
          {EXTENSIONS.map((e) => {
            const on = enabled.has(e.id);
            return (
              <button
                key={e.id}
                className="panel"
                onClick={() => onToggle(e.id)}
                style={{
                  textAlign: "left",
                  padding: 14,
                  cursor: "pointer",
                  borderColor: on ? "rgba(255,87,119,0.6)" : undefined,
                  boxShadow: on ? "0 0 18px rgba(255,51,85,0.25)" : undefined,
                  color: "var(--ink)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="glow-text" style={{ fontSize: 18 }}>◆</span>
                  <span
                    className="mono"
                    style={{
                      fontSize: 10,
                      letterSpacing: 1,
                      padding: "2px 8px",
                      borderRadius: 4,
                      border: "1px solid var(--line)",
                      color: on ? "var(--pink)" : "var(--mute)",
                    }}
                  >
                    {on ? "ON" : "OFF"}
                  </span>
                </div>
                <div className="mono" style={{ marginTop: 8, fontSize: 13, fontWeight: 700 }}>
                  {e.name}
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: "var(--mute)", lineHeight: 1.4 }}>
                  {e.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
