// NT5 ambient ticker — the "always-on" layer. A thin strip pinned above the
// tab content, scrolling the latest wire headlines across MoreMe + News so
// NT5 isn't out of sight when you're working. Click any headline to jump
// into the Broadcast tab.

import { useEffect, useState } from "react";
import { subscribeWire, type WireArticle } from "../services/nt5Wire";
import { ANCHORS, type AnchorId } from "../services/nt5Lore";

export function NT5AmbientTicker({ onOpen }: { onOpen: () => void }) {
  const [arts, setArts] = useState<WireArticle[]>([]);
  useEffect(() => subscribeWire(setArts), []);
  if (arts.length === 0) return null;
  const items = arts.slice(0, 14);
  // Repeat the train so the marquee never shows a gap at the seam.
  const train = [...items, ...items];
  return (
    <div
      onClick={onOpen}
      title="Open NT5 Broadcast"
      style={{
        height: 26,
        flex: "none",
        cursor: "pointer",
        background: "linear-gradient(90deg, #06061a 0%, #0a0820 50%, #06061a 100%)",
        borderBottom: "1px solid rgba(168,85,247,0.35)",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div className="mono" style={{
        fontSize: 9, letterSpacing: 2, textTransform: "uppercase",
        color: "#22d3ee", padding: "0 10px", flex: "none",
        background: "linear-gradient(90deg, rgba(34,211,238,0.18), transparent)",
        height: "100%", display: "flex", alignItems: "center",
        textShadow: "0 0 6px rgba(34,211,238,0.6)",
      }}>NT5 · LIVE</div>
      <div style={{ flex: 1, overflow: "hidden", whiteSpace: "nowrap", position: "relative" }}>
        <div className="mono" style={{
          display: "inline-block",
          animation: "nt5ambient 90s linear infinite",
          fontSize: 11, color: "#cbd5e1", letterSpacing: 1,
        }}>
          {train.map((a, i) => {
            const anchor = ANCHORS[(a.anchor_id as AnchorId)] ?? ANCHORS.voss;
            const tag = `[${a.category.toUpperCase().replace(/_/g, " ")}]`;
            return (
              <span key={a.id + "-" + i} style={{ marginRight: 28 }}>
                <span style={{ color: anchor.color, marginRight: 8 }}>{tag}</span>
                {a.title}
                <span style={{ opacity: 0.5, marginLeft: 8 }}>— {anchor.name}</span>
                <span style={{ opacity: 0.35, margin: "0 18px" }}>◆</span>
              </span>
            );
          })}
        </div>
      </div>
      <style>{`@keyframes nt5ambient { from { transform: translateX(0%); } to { transform: translateX(-50%); } }`}</style>
    </div>
  );
}
