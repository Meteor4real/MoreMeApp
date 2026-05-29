import { useEffect, useState } from "react";
import { loadPrefs, subscribePrefs } from "../uiPrefs";
import { subscribeWire, type WireArticle } from "../services/nt5Wire";
import { subscribeOriginPulse, type OriginPulse } from "../services/originRealms";

// Floating, toggleable info pieces. They sit on top of the canvas, rotate
// gently, and can be turned off per-type in Settings. Drives from the in-app
// NT5 wire (breaking + filed-now) and the live Origin Realms pulse.

const CARD_BG = "linear-gradient(140deg, rgba(20,8,12,0.96), rgba(8,8,14,0.96))";

export function FloatingInfo() {
  const [prefs, setPrefs] = useState(loadPrefs);
  const [arts, setArts] = useState<WireArticle[]>([]);
  const [origin, setOrigin] = useState<OriginPulse | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [tick, setTick] = useState(0);

  useEffect(() => subscribePrefs(setPrefs), []);
  useEffect(() => subscribeWire(setArts), []);
  useEffect(() => subscribeOriginPulse(setOrigin), []);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 11000);
    return () => clearInterval(t);
  }, []);

  const breaking = arts.filter((a) => a.category === "breaking").slice(0, 4);
  const latest = arts.slice(0, 6);

  const cards: { id: string; show: boolean; node: React.ReactNode }[] = [];

  if (prefs.infoBreaking && breaking.length) {
    const a = breaking[tick % breaking.length];
    cards.push({
      id: "breaking-" + a.id, show: true,
      node: (
        <InfoCard key={a.id} tag="Breaking · NT5" color="#ff2d4a">
          <div className="mono" style={{ fontSize: 13, color: "#ffe5ec", lineHeight: 1.35 }}>{a.title}</div>
          <div style={{ fontSize: 11, color: "#c79da7", marginTop: 4 }}>Tune in for {a.author_display}'s special report.</div>
        </InfoCard>
      ),
    });
  }
  if (prefs.infoNextUp && latest.length) {
    const a = latest[(tick + 1) % latest.length];
    cards.push({
      id: "filed-" + a.id, show: true,
      node: (
        <InfoCard key={a.id} tag={`Filed · ${a.author_display}`} color="#d946ef">
          <div className="mono" style={{ fontSize: 13, color: "#f3dcff", lineHeight: 1.35 }}>{a.title}</div>
          <div style={{ fontSize: 11, color: "#b896c4", marginTop: 4 }}>{a.body.slice(0, 96)}{a.body.length > 96 ? "…" : ""}</div>
        </InfoCard>
      ),
    });
  }
  if (prefs.infoOrigin && origin) {
    cards.push({
      id: "origin", show: true,
      node: (
        <InfoCard key="origin" tag="Origin Realms · live" color="#22c55e">
          <div className="mono" style={{ fontSize: 13, color: "#dbffe7", lineHeight: 1.35 }}>{origin.online ? `${origin.players} / ${origin.max} online` : "server offline"}</div>
          <div style={{ fontSize: 11, color: "#9bd4ad", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{origin.motd}</div>
        </InfoCard>
      ),
    });
  }

  const visible = cards.filter((c) => !dismissed.has(c.id));
  if (!visible.length) return null;

  return (
    <div
      data-tour="floating-info"
      style={{
        position: "fixed",
        right: 14,
        bottom: 70,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      {visible.map((c) => (
        <div key={c.id} style={{ pointerEvents: "auto" }} onContextMenu={(e) => { e.preventDefault(); setDismissed((d) => new Set([...d, c.id])); }}>
          {c.node}
        </div>
      ))}
    </div>
  );

  function InfoCard({ tag, color, children }: { tag: string; color: string; children: React.ReactNode }) {
    return (
      <div
        style={{
          maxWidth: 260,
          padding: "10px 12px",
          borderRadius: 10,
          border: `1px solid ${color}66`,
          background: CARD_BG,
          boxShadow: `0 0 18px ${color}22, 0 0 32px rgba(0,0,0,0.55)`,
        }}
      >
        <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color, marginBottom: 4 }}>{tag}</div>
        {children}
      </div>
    );
  }
}
