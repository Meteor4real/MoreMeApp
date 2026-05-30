import { useState } from "react";
import { NT5Broadcast } from "../shell/NT5Broadcast";
import { NT5Studio } from "./NT5Studio";

// Embedded NT5 — wire (the bundled site + live anchor articles) on one
// subtab; Studio (the broadcast authoring tool — Pexels clips, 3D scenes,
// title cards, timeline reel) on the other. The Studio composes, never
// generates: every frame is sourced from real media the user picks.

export function NT5() {
  const [tab, setTab] = useState<"wire" | "studio">("wire");
  return (
    <div className="stage" style={{ background: "#05050d", padding: 0, display: "flex", flexDirection: "column" }}>
      <NT5Header tab={tab} onTab={setTab} />
      {tab === "wire" ? (
        <>
          <NT5Broadcast />
          <iframe
            title="NT5 — S.P.A.C.E. News"
            src="embedded/nt5/index.html"
            style={{ flex: 1, width: "100%", border: "none", display: "block" }}
          />
        </>
      ) : (
        <NT5Studio />
      )}
    </div>
  );
}

function NT5Header({ tab, onTab }: { tab: "wire" | "studio"; onTab: (t: "wire" | "studio") => void }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "10px 16px",
        borderBottom: "1px solid rgba(168,85,247,0.4)",
        background:
          "linear-gradient(90deg, #06061a 0%, #0a0820 25%, #06061a 75%, #06061a 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <svg width={44} height={44} viewBox="0 0 64 64" aria-label="NT5">
        <defs>
          <linearGradient id="nt5-hdr-grad" x1="0" y1="0" x2="64" y2="64">
            <stop offset="0" stopColor="#d946ef" />
            <stop offset="0.5" stopColor="#7c3aed" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
          <filter id="nt5-hdr-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d="M32 3 L58 17 L58 47 L32 61 L6 47 L6 17 Z" fill="#0a0820" stroke="url(#nt5-hdr-grad)" strokeWidth="2.5" filter="url(#nt5-hdr-glow)" />
        <text x="32" y="38" textAnchor="middle"
          fontFamily="'Orbitron','Space Grotesk',sans-serif" fontWeight={800} fontSize="18" letterSpacing="2"
          fill="url(#nt5-hdr-grad)" filter="url(#nt5-hdr-glow)">NT5</text>
        <circle cx="6" cy="17" r="1.6" fill="#22d3ee" />
        <circle cx="58" cy="17" r="1.6" fill="#d946ef" />
        <circle cx="6" cy="47" r="1.6" fill="#d946ef" />
        <circle cx="58" cy="47" r="1.6" fill="#22d3ee" />
      </svg>
      <div style={{ lineHeight: 1.15 }}>
        <div
          style={{
            fontFamily: "'Orbitron','Space Grotesk',sans-serif",
            fontWeight: 800,
            letterSpacing: 4,
            fontSize: 16,
            color: "#fff",
            textShadow: "0 0 12px rgba(217,70,239,0.45)",
          }}
        >
          S.P.A.C.E. NEWS
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono','Chakra Petch',monospace",
            fontSize: 10,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: "#22d3ee",
            marginTop: 2,
          }}
        >
          NT5 · NOVA TERRIS 5 · UNIFIED WIRE · 24/7
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", gap: 6, marginRight: 10 }}>
        {(["wire", "studio"] as const).map((t) => (
          <button
            key={t}
            onClick={() => onTab(t)}
            className="btn"
            style={{
              padding: "4px 12px",
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: tab === t ? "#22d3ee" : "var(--mute)",
              borderColor: tab === t ? "rgba(34,211,238,0.55)" : undefined,
            }}>{t}</button>
        ))}
      </div>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: 10,
          letterSpacing: 1.5,
          color: "#ef4444",
          textTransform: "uppercase",
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 10px rgba(239,68,68,0.9)", animation: "nt5pulse 2s ease-in-out infinite" }} />
        On Air
      </span>
      <style>{`@keyframes nt5pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
    </div>
  );
}
