// Live theme system. A theme controls the accent palette (red / pink /
// orange / glow), an optional vibe class added to <body> for decorative
// effects (scanlines, shimmer, parchment, …), and an optional display
// font that overrides the heading typography. The dark base is preserved
// across themes so panels keep their contrast.

export type Theme = {
  label: string;
  red: string;
  pink: string;
  orange: string;
  glow: string;
  ink?: string;
  mute?: string;
  bg?: string;
  vibeClass?: string;     // applied as "vibe-<x>" on <body>
  displayFont?: string;   // used for h1/h2/.glow-text titles
};

export const ACCENTS: Record<string, Theme> = {
  crimson:     { label: "Crimson (default)",  red: "#ff2d4a", pink: "#ff5577", orange: "#ff7a2d", glow: "#ff3355" },
  cyber:       { label: "Cyber",               red: "#0093c4", pink: "#22d3ee", orange: "#3b82f6", glow: "#00e5ff" },
  toxic:       { label: "Toxic",               red: "#15a34a", pink: "#22c55e", orange: "#a3e635", glow: "#22c55e" },
  royal:       { label: "Royal",               red: "#7c3aed", pink: "#a855f7", orange: "#d946ef", glow: "#a855f7" },
  // Animated / dynamic vibes
  retro:       { label: "Retro (CRT scanlines)",   red: "#ff9f1a", pink: "#ffd166", orange: "#f97316", glow: "#ffd166", vibeClass: "retro",       displayFont: "'VT323', 'Courier New', monospace" },
  futuristic:  { label: "Futuristic (holo shimmer)", red: "#06b6d4", pink: "#22d3ee", orange: "#a78bfa", glow: "#22d3ee", vibeClass: "futuristic",  displayFont: "'Orbitron','Space Grotesk',sans-serif" },
  prehistoric: { label: "Prehistoric (parchment)", red: "#a16207", pink: "#ca8a04", orange: "#dc8d3a", glow: "#d97706", vibeClass: "prehistoric", displayFont: "'Cormorant Garamond', Georgia, serif" },
  oddball:     { label: "Oddball (chaos)",      red: "#ec4899", pink: "#f472b6", orange: "#facc15", glow: "#84cc16", vibeClass: "oddball",     displayFont: "'Comic Sans MS', 'Chalkboard SE', cursive" },
  midnight:    { label: "Midnight (deep blue)", red: "#1e3a8a", pink: "#3b82f6", orange: "#60a5fa", glow: "#3b82f6" },
  rose:        { label: "Rose (warm pink)",     red: "#be185d", pink: "#ec4899", orange: "#f472b6", glow: "#ec4899" },
};

const KEY = "nchub.accent.v1";
export function loadAccent(): string {
  return localStorage.getItem(KEY) || "crimson";
}
export function applyAccent(name: string) {
  const a = ACCENTS[name] || ACCENTS.crimson;
  const r = document.documentElement.style;
  r.setProperty("--red", a.red);
  r.setProperty("--pink", a.pink);
  r.setProperty("--orange", a.orange);
  r.setProperty("--glow", a.glow);
  if (a.ink) r.setProperty("--ink", a.ink);
  if (a.mute) r.setProperty("--mute", a.mute);
  if (a.bg) r.setProperty("--bg", a.bg);
  r.setProperty("--display-font", a.displayFont || "ui-monospace, Menlo, monospace");
  // Vibe class on <body>
  const body = document.body;
  body.classList.forEach((c) => { if (c.startsWith("vibe-")) body.classList.remove(c); });
  if (a.vibeClass) body.classList.add(`vibe-${a.vibeClass}`);
  try { localStorage.setItem(KEY, name); } catch { /* ignore */ }
}
