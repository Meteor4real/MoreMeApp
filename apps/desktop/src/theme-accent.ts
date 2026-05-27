// Live accent theming — sets the CSS variables the glow/strip/rail read.
export const ACCENTS: Record<string, { red: string; pink: string; orange: string; glow: string; label: string }> = {
  crimson: { label: "Crimson (default)", red: "#ff2d4a", pink: "#ff5577", orange: "#ff7a2d", glow: "#ff3355" },
  cyber: { label: "Cyber", red: "#0093c4", pink: "#22d3ee", orange: "#3b82f6", glow: "#00e5ff" },
  toxic: { label: "Toxic", red: "#15a34a", pink: "#22c55e", orange: "#a3e635", glow: "#22c55e" },
  royal: { label: "Royal", red: "#7c3aed", pink: "#a855f7", orange: "#d946ef", glow: "#a855f7" },
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
  try {
    localStorage.setItem(KEY, name);
  } catch {
    /* ignore */
  }
}
