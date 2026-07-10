// NT5 design tokens — the HALOS discipline applied to the news network.
//
// HALOS gets its feel from a small token sheet used consistently: four
// background elevation levels, three text tiers, ONE primary accent with
// centralized glow applied only to key elements, and three fonts with
// strict roles (display / body / data). NT5 shares the same dark
// foundation (sibling S.P.A.C.E. products) but its accent is BROADCAST
// RED — red means live/breaking and nothing else, so it still means
// something when you see it.
//
// Rules of use:
//  - fontD (Orbitron) is for wordmarks, kickers, and headlines ONLY.
//    Body copy is fontB. Data (timestamps, tickers, counts) is fontM.
//  - glow() is applied to at most ONE element per view region.
//  - Category colors tint hairlines and kickers, never whole surfaces.

export const NT = {
  // backgrounds — elevation ladder, darkest is the page
  bg: "#07050f",
  bg2: "#0c0918",
  bg3: "#130f25",
  bg4: "#1a1535",
  // hairlines
  border: "rgba(124,63,255,0.16)",
  border2: "rgba(124,63,255,0.30)",
  // text tiers
  ink: "#cce8f5",
  ink2: "#5a7898",
  ink3: "#2e4460",
  // THE accent — broadcast red. live dots, breaking, active nav.
  live: "#ff3b5c",
  liveDim: "rgba(255,59,92,0.14)",
  // family secondaries (shared with HALOS) — used sparingly
  cyan: "#00e5ff",
  purple: "#7c3fff",
  success: "#39ff14",
  warn: "#ffb800",
  radius: 8,
  fontD: "'Orbitron', 'Space Grotesk', sans-serif",
  fontB: "'Syne', 'Inter', system-ui, sans-serif",
  fontM: "'JetBrains Mono', ui-monospace, Menlo, monospace",
};

export const glowRed = `0 0 8px ${NT.live}, 0 0 20px rgba(255,59,92,0.35)`;
export const glowCyan = `0 0 8px ${NT.cyan}, 0 0 20px rgba(0,229,255,0.35)`;

// Category presentation — muted hue per desk. Tints kickers + hairlines only.
export const NT_CAT: Record<string, { label: string; color: string }> = {
  breaking:       { label: "Breaking",       color: NT.live },
  field:          { label: "Field",          color: "#ffb800" },
  latest:         { label: "Latest",         color: "#a07fff" },
  space:          { label: "Space",          color: "#00e5ff" },
  gaming:         { label: "Gaming",         color: "#39d98a" },
  tech:           { label: "Tech",           color: "#7c3fff" },
  earth_trending: { label: "Earth",          color: "#ffb800" },
  culture:        { label: "Culture",        color: "#ff7ab8" },
  cc_lore:        { label: "Network",        color: "#a07fff" },
};

// Article shape presentation — label + how the reader should hold it.
export const NT_KIND: Record<string, { label: string; tone: string }> = {
  brief:     { label: "Brief",     tone: "wire brief" },
  article:   { label: "Article",   tone: "full report" },
  broadcast: { label: "Bulletin",  tone: "breaking bulletin" },
  blog:      { label: "Column",    tone: "opinion" },
  social:    { label: "Post",      tone: "anchor post" },
  ticker:    { label: "Ticker",    tone: "crawl line" },
};

// Shared shell CSS — fonts, keyframes, scrollbars. Injected once by NT5.tsx.
export const NT5_SHELL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800&family=Syne:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
.nt5-shell { background: ${NT.bg}; color: ${NT.ink}; font-family: ${NT.fontB}; }
.nt5-shell ::-webkit-scrollbar { width: 4px; height: 4px; }
.nt5-shell ::-webkit-scrollbar-track { background: transparent; }
.nt5-shell ::-webkit-scrollbar-thumb { background: rgba(124,63,255,0.35); border-radius: 99px; }
.nt5-shell .nt5-btn {
  background: ${NT.bg3}; border: 1px solid ${NT.border}; color: ${NT.ink2};
  border-radius: 6px; padding: 6px 12px; font-family: ${NT.fontM}; font-size: 11px;
  letter-spacing: 0.08em; text-transform: uppercase; cursor: pointer;
  transition: color .18s, border-color .18s, background .18s;
}
.nt5-shell .nt5-btn:hover:not(:disabled) { color: ${NT.ink}; border-color: ${NT.border2}; }
.nt5-shell .nt5-btn:disabled { opacity: .45; cursor: default; }
.nt5-shell .nt5-btn.hot { color: ${NT.live}; border-color: rgba(255,59,92,0.45); }
.nt5-shell .nt5-btn.hot:hover:not(:disabled) { background: ${NT.liveDim}; }
.nt5-shell .nt5-input {
  background: ${NT.bg2}; border: 1px solid ${NT.border}; color: ${NT.ink};
  border-radius: 6px; padding: 7px 10px; font-family: ${NT.fontM}; font-size: 12px; outline: none;
}
.nt5-shell .nt5-input:focus { border-color: ${NT.border2}; }
.nt5-shell .nt5-kicker {
  font-family: ${NT.fontD}; font-weight: 600; font-size: 10px;
  letter-spacing: 0.22em; text-transform: uppercase;
}
.nt5-shell .nt5-card {
  background: ${NT.bg2}; border: 1px solid ${NT.border}; border-radius: ${NT.radius}px;
  transition: border-color .18s, background .18s;
}
.nt5-shell .nt5-card.clickable { cursor: pointer; }
.nt5-shell .nt5-card.clickable:hover { border-color: ${NT.border2}; background: ${NT.bg3}; }
@keyframes nt5pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
@keyframes nt5crawl { from { transform: translate3d(0,0,0); } to { transform: translate3d(-50%,0,0); } }
@keyframes nt5in { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
`;

// A typographic stand-in for stories with no image: category-tinted panel
// with the wordmark ghosted. Used by hero + cards for lore items and real
// items whose source page yielded no og:image.
export function textPlateStyle(color: string): React.CSSProperties {
  return {
    background: `linear-gradient(140deg, ${NT.bg3} 0%, ${NT.bg2} 60%), radial-gradient(ellipse at 20% 20%, ${color}22, transparent 60%)`,
    backgroundBlendMode: "normal",
    border: `1px solid ${NT.border}`,
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    position: "relative",
  };
}
