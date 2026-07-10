import { useState } from "react";
import { NT5Studio } from "./NT5Studio";
import { NT5Newsroom } from "./nt5/NT5Newsroom";
import { NT5Broadcast } from "./nt5/NT5Broadcast";
import { NT5TopicsManager } from "./nt5/NT5TopicsManager";
import { NT, NT5_SHELL_CSS, glowRed } from "./nt5/nt5theme";
import { NT5_TAGLINE } from "../services/nt5Lore";

// NT5 / S.P.A.C.E. News — organized like HALOS: a slim sidebar with the
// wordmark, labeled navigation, and operator access tucked at the bottom.
// The reader lands on the FRONT PAGE; Broadcast is turn-on-the-TV mode;
// Topics is the desk (and the control room for wire operations).
// Backstage (broadcast authoring) is a power tool — reachable from the
// sidebar footer, not a top-level destination.

type Tab = "frontpage" | "broadcast" | "topics" | "backstage";

const NAV: { id: Tab; label: string }[] = [
  { id: "frontpage", label: "Front Page" },
  { id: "broadcast", label: "Broadcast" },
  { id: "topics", label: "Topics" },
];

export function NT5() {
  const [tab, setTab] = useState<Tab>("frontpage");
  return (
    <div className="stage nt5-shell" style={{ background: NT.bg, padding: 0, display: "grid", gridTemplateColumns: "184px 1fr", minHeight: 0 }}>
      <style>{NT5_SHELL_CSS}</style>

      {/* ── sidebar ─────────────────────────────────────────────── */}
      <aside style={{ display: "flex", flexDirection: "column", borderRight: `1px solid ${NT.border}`, background: NT.bg2, minHeight: 0 }}>
        {/* wordmark */}
        <div style={{ padding: "16px 14px 12px", borderBottom: `1px solid ${NT.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width={34} height={34} viewBox="0 0 64 64" aria-label="NT5">
              <path d="M32 3 L58 17 L58 47 L32 61 L6 47 L6 17 Z" fill={NT.bg3} stroke={NT.live} strokeWidth="2.5" />
              <text x="32" y="38" textAnchor="middle" fontFamily="Orbitron, sans-serif" fontWeight={800} fontSize="17" letterSpacing="1" fill={NT.live}>NT5</text>
            </svg>
            <div style={{ lineHeight: 1.15 }}>
              <div className="nt5-kicker" style={{ fontSize: 12, color: NT.ink, textShadow: glowRed }}>NT5</div>
              <div style={{ fontFamily: NT.fontM, fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: NT.ink2, marginTop: 2 }}>S.P.A.C.E. NEWS</div>
            </div>
          </div>
          <div style={{ fontFamily: NT.fontM, fontSize: 8.5, letterSpacing: "0.14em", textTransform: "uppercase", color: NT.ink3, marginTop: 8 }}>{NT5_TAGLINE}</div>
        </div>

        {/* live status */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 14px", borderBottom: `1px solid ${NT.border}` }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: NT.live, boxShadow: `0 0 8px ${NT.live}`, animation: "nt5pulse 2s ease-in-out infinite" }} />
          <span style={{ fontFamily: NT.fontM, fontSize: 9.5, letterSpacing: "0.18em", textTransform: "uppercase", color: NT.live }}>On Air · 24/7</span>
        </div>

        {/* nav */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 8px" }}>
          {NAV.map((n) => {
            const active = tab === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "9px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                  background: active ? NT.liveDim : "transparent",
                  color: active ? NT.ink : NT.ink2,
                  fontFamily: NT.fontB, fontWeight: active ? 700 : 400, fontSize: 13,
                  textAlign: "left",
                  borderLeft: `2px solid ${active ? NT.live : "transparent"}`,
                  transition: "background .18s, color .18s",
                }}
              >
                {n.label}
              </button>
            );
          })}
        </nav>

        <div style={{ flex: 1 }} />

        {/* footer — operator access, demoted on purpose */}
        <div style={{ padding: "10px 14px", borderTop: `1px solid ${NT.border}` }}>
          <button
            onClick={() => setTab("backstage")}
            style={{
              background: "transparent", border: "none", cursor: "pointer", padding: 0,
              fontFamily: NT.fontM, fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase",
              color: tab === "backstage" ? NT.ink : NT.ink3,
            }}
            title="Broadcast authoring — power tool"
          >
            › Backstage
          </button>
        </div>
      </aside>

      {/* ── content ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
        {tab === "frontpage" && <NT5Newsroom />}
        {tab === "broadcast" && <NT5Broadcast />}
        {tab === "topics" && <NT5TopicsManager />}
        {tab === "backstage" && <NT5Studio />}
      </div>
    </div>
  );
}
