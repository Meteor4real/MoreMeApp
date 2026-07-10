// NT5 ambient ticker — the "always-on" layer. A thin strip pinned above the
// tab content, scrolling the latest wire headlines across MoreMe + News so
// NT5 isn't out of sight when you're working. Click any headline to jump
// into the News tab. Styled on the NT5 token system: quiet dark strip,
// red LIVE tag, muted mono text.

import { useEffect, useState } from "react";
import { subscribeWire, type WireArticle } from "../services/nt5Wire";
import { NT, NT_CAT } from "../embedded/nt5/nt5theme";

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
      title="Open NT5"
      style={{
        height: 26,
        flex: "none",
        cursor: "pointer",
        background: NT.bg2,
        borderBottom: `1px solid ${NT.border}`,
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div className="mono" style={{
        fontSize: 9, letterSpacing: 2, textTransform: "uppercase",
        color: NT.live, padding: "0 10px", flex: "none",
        borderRight: `1px solid ${NT.border}`,
        height: "100%", display: "flex", alignItems: "center", gap: 5,
      }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: NT.live, animation: "nt5ambient-pulse 2s ease-in-out infinite" }} />
        NT5 · LIVE
      </div>
      <div style={{ flex: 1, overflow: "hidden", whiteSpace: "nowrap", position: "relative" }}>
        <div className="mono" style={{
          display: "inline-block",
          animation: "nt5ambient 90s linear infinite",
          fontSize: 11, color: NT.ink2, letterSpacing: 1,
        }}>
          {train.map((a, i) => {
            const cat = NT_CAT[a.category] ?? { label: a.category, color: NT.purple };
            return (
              <span key={a.id + "-" + i} style={{ marginRight: 28 }}>
                <span style={{ color: cat.color, marginRight: 8 }}>◆</span>
                <span style={{ color: NT.ink }}>{a.title}</span>
                <span style={{ opacity: 0.5, marginLeft: 8 }}>— {a.author_display}</span>
              </span>
            );
          })}
        </div>
      </div>
      <style>{`
        @keyframes nt5ambient { from { transform: translateX(0%); } to { transform: translateX(-50%); } }
        @keyframes nt5ambient-pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
      `}</style>
    </div>
  );
}
