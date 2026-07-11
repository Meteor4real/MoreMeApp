// MoreMe theme tokens. Two palettes you can switch at runtime:
//   dp       — Dude Perfect: turquoise on deep navy + panda black/white.
//   papatui  — The Rock's Papatui: warm Polynesian earth (sand/cream, deep
//              teal-green, bronze, espresso black). Interpreted from the
//              brand's documented earthy identity (no public hex guide).
//
// `T` is a LIVE object: setTheme() reassigns its fields in place, so every
// component that reads `T.mint` (incl. `T.mint + "55"` alpha math) picks up
// the new palette on the next render. The class-based CSS is rebuilt from
// `T` via buildMMStyle(); the desktop chrome follows via root CSS vars.

export type ThemeName = "dp" | "papatui" | "sports" | "custom";

export type Palette = {
  bg: string; elev: string; sunk: string;
  ink: string; inkSoft: string; inkTiny: string; line: string;
  mint: string; mintDeep: string; mintHi: string;  // primary accent family
  warn: string; cool: string;
  // Optional decorative hero image — shown as a faint backdrop on Today.
  // External URL by design (so we don't ship copyrighted photos); set "" or
  // omit to render no backdrop. CustomTheme exposes this as a user field.
  heroImage?: string;
};

// Hero image cycles per theme — resolved at READ time by heroImageUrl()
// (not baked into the palette at module load), so an app left running for
// days still rotates at midnight. All Unsplash, no shipped assets.
const THEME_HEROES: Record<Exclude<ThemeName, "custom">, string[]> = {
  dp: [
    "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&w=1600&q=70",   // court
    "https://images.unsplash.com/photo-1518614368389-1f9b9c8c2b15?auto=format&w=1600&q=70", // arena lights
    "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&w=1600&q=70", // ball + hoop
  ],
  papatui: [
    "https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?auto=format&w=1600&q=70", // ocean
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&w=1600&q=70", // beach
    "https://images.unsplash.com/photo-1571260899304-425eee4c7efc?auto=format&w=1600&q=70", // palm grove
  ],
  sports: [
    "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&w=1600&q=70", // track lights
    "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&w=1600&q=70", // stadium
    "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&w=1600&q=70",   // gym
  ],
};
function dailyPick<T>(list: T[], salt: string): T {
  // Hash salt + YYYY-MM-DD → stable index for the day. The salt (theme name)
  // de-lockstops the themes so they don't all sit on the same slot index.
  const d = new Date();
  const key = `${salt}:${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = ((h << 5) - h + key.charCodeAt(i)) | 0;
  return list[Math.abs(h) % list.length];
}

const DP_PALETTE: Palette = {
  bg: "#0C1422", elev: "#16223A", sunk: "#080E1A",
  ink: "#FFFFFF", inkSoft: "#A6B6CC", inkTiny: "#5E6E86", line: "#233247",
  mint: "#3EFBB7", mintDeep: "#15D6A0", mintHi: "#8BFFDD",
  warn: "#FF5C5F", cool: "#1E90FF",
};
const PAPATUI_PALETTE: Palette = {
  bg: "#19140F", elev: "#241C15", sunk: "#0F0B08",
  ink: "#F4EAD9", inkSoft: "#C8B59B", inkTiny: "#8A7355", line: "#3A2E22",
  mint: "#2FA98A", mintDeep: "#1E7D66", mintHi: "#5CCBB0",
  warn: "#D9603B", cool: "#C9A24B",
};
// Sports — high-contrast scoreboard / SportsCenter look. Carbon black, ESPN
// red, athletic gold. Designed for clean number displays.
const SPORTS_PALETTE: Palette = {
  bg: "#06080B", elev: "#101317", sunk: "#02040A",
  ink: "#FFFFFF", inkSoft: "#B5BFCC", inkTiny: "#5E6675", line: "#1F252D",
  mint: "#FFB400", mintDeep: "#D99100", mintHi: "#FFCD3C",  // gold accent
  warn: "#E1153B",                                         // ESPN red
  cool: "#1FA9FF",
};
export const PALETTES: Record<ThemeName, Palette> = {
  dp: DP_PALETTE,
  papatui: PAPATUI_PALETTE,
  sports: SPORTS_PALETTE,
  // "custom" never reads from PALETTES — the resolver fetches the user's
  // palette from state — but the type contract needs a value here. We
  // mirror Papatui (the app default) as a fallback for safety (if the
  // resolver is somehow unregistered, this keeps the UI usable).
  custom: PAPATUI_PALETTE,
};

export const THEME_META: Record<ThemeName, { label: string; note: string; swatch: string[] }> = {
  dp:      { label: "Dude Perfect", note: "Turquoise on navy. Panda energy.",         swatch: ["#3EFBB7", "#0C1422", "#1E90FF"] },
  papatui: { label: "Papatui",      note: "Warm Polynesian earth. The Rock.",         swatch: ["#2FA98A", "#19140F", "#C9A24B"] },
  sports:  { label: "Sports",       note: "Scoreboard high-contrast. Gold + ESPN red.", swatch: ["#FFB400", "#06080B", "#E1153B"] },
  custom:  { label: "Custom",       note: "Your palette. Set the colors yourself.",    swatch: ["#888888", "#000000", "#CCCCCC"] },
};

// The live token object every component imports.
// Papatui is the default look — the owner's pick for the app's identity.
export const T: Palette = { ...PALETTES.papatui };

// Active hero image (decorative backdrop). Resolved at read time: custom
// themes use their own explicit heroImage; built-in themes rotate through
// their pool by day, so a long-running app still changes backdrop at
// midnight (components re-render at least once a day via the reminder tick).
export function heroImageUrl(): string {
  const name = currentThemeName();
  if (name === "custom") return T.heroImage && T.heroImage.trim() ? T.heroImage.trim() : "";
  const pool = THEME_HEROES[name];
  return pool && pool.length ? dailyPick(pool, name) : "";
}

const KEY = "nchub.moreme.theme.v1";
const subs = new Set<() => void>();

// A pluggable hook so the store can supply the user's custom palette
// without styles.ts having to import the store (which would cycle).
let customResolver: (() => Palette | null) = () => null;
export function setCustomThemeResolver(fn: () => Palette | null) {
  customResolver = fn;
}

export function currentThemeName(): ThemeName {
  try {
    const n = localStorage.getItem(KEY);
    if (n === "dp" || n === "papatui" || n === "sports" || n === "custom") return n;
  } catch { /* ignore */ }
  return "papatui";
}

// Push the palette onto the desktop chrome's CSS vars so the topbar / login
// shell follow the MoreMe theme too. The token names (--red etc.) are legacy
// aliases; only the values matter.
function applyRootVars(p: Palette) {
  const r = document.documentElement.style;
  r.setProperty("--bg", p.bg);
  r.setProperty("--panel", p.elev);
  r.setProperty("--line", p.line);
  r.setProperty("--ink", p.ink);
  r.setProperty("--mute", p.inkSoft);
  r.setProperty("--red", p.mint);
  r.setProperty("--pink", p.mintHi);
  r.setProperty("--orange", p.cool);
  r.setProperty("--glow", p.mint);
}

export function setTheme(name: ThemeName) {
  // "custom" pulls from the store via the resolver; falls back to dp if
  // the user has the toggle on but hasn't actually defined one yet.
  const next = name === "custom" ? (customResolver() ?? PALETTES.papatui) : PALETTES[name];
  Object.assign(T, next);
  try { localStorage.setItem(KEY, name); } catch { /* ignore */ }
  applyRootVars(T);
  subs.forEach((fn) => fn());
}
export function refreshTheme() {
  // Re-apply the active theme — for when the user edits their custom palette
  // and we need a live update without changing the name.
  setTheme(currentThemeName());
}
export function subscribeTheme(fn: () => void): () => void {
  subs.add(fn); return () => subs.delete(fn);
}
// Call once on boot so the persisted choice is live before first paint.
export function initTheme() {
  const name = currentThemeName();
  const pal = name === "custom" ? (customResolver() ?? PALETTES.papatui) : PALETTES[name];
  Object.assign(T, pal);
  applyRootVars(T);
}

// Class-based MoreMe CSS, rebuilt from the current palette. Called inside the
// embed component and re-run on theme change.
export function buildMMStyle(): string {
  return `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Inter:wght@400;500;600;700&family=Barlow+Condensed:wght@600;700;800&display=swap');
.moreme-embed { background: ${T.bg}; color: ${T.ink}; font-family: "Inter", system-ui, sans-serif; }
.moreme-embed .serif { font-family: "Cormorant Garamond", Georgia, serif; font-weight: 600; letter-spacing: .01em; }
.moreme-embed .condensed { font-family: "Barlow Condensed", "Inter", sans-serif; text-transform: uppercase; letter-spacing: .04em; }
.moreme-embed .mm-card { background: ${T.elev}; border: 1px solid ${T.line}; border-radius: 14px; box-shadow: 0 1px 2px rgba(0,0,0,.3), 0 8px 24px rgba(0,0,0,.35); }
.moreme-embed .mm-card-mint { background: ${T.elev}; border: 1px solid ${T.mint}55; border-radius: 14px; box-shadow: 0 0 24px ${T.mint}11 inset, 0 8px 24px rgba(0,0,0,.35); animation: mmGlow 6s ease-in-out infinite; }
@keyframes mmGlow { 0%, 100% { box-shadow: 0 0 24px ${T.mint}11 inset, 0 8px 24px rgba(0,0,0,.35); } 50% { box-shadow: 0 0 30px ${T.mint}22 inset, 0 0 30px ${T.mint}22, 0 8px 24px rgba(0,0,0,.35); } }
@keyframes mmToastIn { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.moreme-embed .mm-toast-in { animation: mmToastIn .25s ease-out; }
/* The HALOS feel layer: controls physically respond to being pressed, and
   a completed checkbox pops. Guarded by body.reduce-motion. */
.moreme-embed .mm-btn:active:not(:disabled), .moreme-embed .mm-tab:active, .moreme-embed .mm-action:active { transform: translateY(1px); }
@keyframes mmPop { 0% { transform: scale(1); } 45% { transform: scale(1.35); } 100% { transform: scale(1); } }
.moreme-embed .mm-donebtn[data-done="true"] { animation: mmPop .22s ease; }
body.reduce-motion .moreme-embed .mm-donebtn[data-done="true"] { animation: none; }
body.reduce-motion .moreme-embed .mm-card-mint { animation: none; }
.moreme-embed .mm-action { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border: 1px solid ${T.line}; border-radius: 10px; background: ${T.sunk}; transition: border-color .15s, background .15s; width: 100%; text-align: left; }
.moreme-embed .mm-action:hover:not(:disabled) { border-color: ${T.mint}; }
.moreme-embed .mm-action.done { opacity: .6; }
.moreme-embed .mm-action.locked { background: ${T.bg}; }
.moreme-embed .mm-tab { font-family: "Inter", sans-serif; font-size: 12px; padding: 5px 14px; border-radius: 999px; border: 1px solid ${T.line}; background: transparent; color: ${T.inkSoft}; cursor: pointer; transition: all .15s; text-transform: capitalize; }
.moreme-embed .mm-tab:hover { color: ${T.ink}; border-color: ${T.mint}; }
.moreme-embed .mm-tab.active { background: ${T.mint}; border-color: ${T.mint}; color: ${T.bg}; font-weight: 600; }
.moreme-embed .mm-btn { font-family: "Inter", sans-serif; font-size: 12px; padding: 8px 14px; border-radius: 10px; border: 1px solid ${T.line}; background: ${T.sunk}; color: ${T.ink}; cursor: pointer; transition: all .15s; }
.moreme-embed .mm-btn:hover { border-color: ${T.mint}; }
.moreme-embed .mm-btn-primary { background: ${T.mint}; border-color: ${T.mint}; color: ${T.bg}; font-weight: 600; }
.moreme-embed .mm-btn-danger { background: transparent; border-color: ${T.warn}; color: ${T.warn}; }
.moreme-embed .mm-pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.moreme-embed input, .moreme-embed select, .moreme-embed textarea { background: ${T.bg}; border: 1px solid ${T.line}; border-radius: 10px; color: ${T.ink}; padding: 8px 10px; font: inherit; outline: none; }
.moreme-embed input:focus, .moreme-embed select:focus, .moreme-embed textarea:focus { border-color: ${T.mint}; }
.moreme-embed .mm-h1 { font-family: "Cormorant Garamond", Georgia, serif; font-weight: 600; }
.moreme-embed .mm-progress { position: relative; height: 12px; background: ${T.bg}; border: 1px solid ${T.line}; border-radius: 6px; overflow: hidden; }
.moreme-embed .mm-progress-fill { position: absolute; inset: 0; background: linear-gradient(90deg, ${T.mintHi}, ${T.mint}); transition: width .35s ease; }
.moreme-embed .mm-progress-text { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; color: ${T.inkSoft}; letter-spacing: .04em; mix-blend-mode: luminosity; }
.moreme-embed .mm-cal { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.moreme-embed .mm-dow { text-align: center; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: ${T.inkTiny}; padding-bottom: 4px; }
.moreme-embed .mm-day { position: relative; min-height: 86px; background: ${T.sunk}; border: 1px solid ${T.line}; border-radius: 10px; padding: 6px; cursor: pointer; transition: border-color .12s, background .12s; overflow: hidden; display: flex; flex-direction: column; gap: 3px; }
.moreme-embed .mm-day:hover { border-color: ${T.mint}; }
.moreme-embed .mm-day.other { opacity: .4; }
.moreme-embed .mm-day.today { border-color: ${T.mint}; box-shadow: 0 0 0 1px ${T.mint}, 0 0 16px ${T.mint}33; }
.moreme-embed .mm-day.selected { background: ${T.elev}; border-color: ${T.mintHi}; }
.moreme-embed .mm-daynum { font-size: 12px; font-weight: 700; color: ${T.inkSoft}; }
.moreme-embed .mm-day.today .mm-daynum { color: ${T.mint}; }
.moreme-embed .mm-chip { display: flex; align-items: center; gap: 4px; font-size: 10px; line-height: 1.2; padding: 1px 5px; border-radius: 5px; background: rgba(255,255,255,.04); border-left: 3px solid var(--c, ${T.mint}); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.moreme-embed .mm-chip.done { opacity: .45; text-decoration: line-through; }
.moreme-embed .mm-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--c, ${T.mint}); flex: none; }
.moreme-embed .mm-modal-back { position: absolute; inset: 0; background: rgba(0,0,0,.62); display: grid; place-items: center; z-index: 50; padding: 20px; }
.moreme-embed .mm-modal { width: min(560px, 96%); max-height: 92%; overflow: auto; background: ${T.elev}; border: 1px solid ${T.mint}55; border-radius: 16px; padding: 20px; box-shadow: 0 20px 60px rgba(0,0,0,.6); }
.moreme-embed .mm-field { display: flex; flex-direction: column; gap: 5px; }
.moreme-embed .mm-field > label { font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: ${T.inkTiny}; }
.moreme-embed .mm-row { display: flex; gap: 10px; flex-wrap: wrap; }
.moreme-embed .mm-seg { display: inline-flex; border: 1px solid ${T.line}; border-radius: 8px; overflow: hidden; flex-wrap: wrap; }
.moreme-embed .mm-seg button { background: transparent; border: none; color: ${T.inkSoft}; padding: 6px 10px; font-size: 11px; cursor: pointer; }
.moreme-embed .mm-seg button.on { background: ${T.mint}; color: ${T.bg}; font-weight: 700; }
.moreme-embed .mm-conflict { border-color: ${T.warn} !important; box-shadow: 0 0 0 1px ${T.warn}55; }
.moreme-embed .mm-ach { display: flex; gap: 12px; align-items: center; padding: 12px; border-radius: 12px; border: 1px solid ${T.line}; background: ${T.sunk}; }
.moreme-embed .mm-ach.unlocked { border-color: ${T.mint}; background: ${T.mint}0d; }
.moreme-embed .mm-medal { width: 38px; height: 38px; border-radius: 10px; display: grid; place-items: center; font-size: 18px; flex: none; background: ${T.bg}; border: 1px solid ${T.line}; color: ${T.inkTiny}; }
.moreme-embed .mm-ach.unlocked .mm-medal { background: ${T.mint}; color: ${T.bg}; border-color: ${T.mint}; }
.moreme-embed .scrolly { overflow: auto; }
.moreme-embed .scrolly::-webkit-scrollbar { width: 8px; height: 8px; }
.moreme-embed .scrolly::-webkit-scrollbar-thumb { background: ${T.line}; border-radius: 4px; }

/* Print: when printing, strip the dark theme to clean black-on-white and hide
   everything except the marked printable region. */
@media print {
  body * { visibility: hidden !important; }
  .mm-print, .mm-print * { visibility: visible !important; }
  .mm-print { position: absolute; inset: 0; background: #fff !important; color: #111 !important; padding: 24px; }
  .mm-print .mm-card, .mm-print .mm-action, .mm-print .mm-day { background: #fff !important; border-color: #ccc !important; box-shadow: none !important; color: #111 !important; }
  .mm-no-print { display: none !important; }
  .mm-print * { color: #111 !important; }
  .mm-print .mm-progress-fill { background: #888 !important; }
}
`;
}

// Back-compat: some modules still import MM_STYLE as a value. Provide the
// initial build; the embed re-renders with buildMMStyle() on theme change.
export const MM_STYLE = buildMMStyle();

export const inp: React.CSSProperties = {
  flex: 1, background: "rgba(0,0,0,0.4)", border: `1px solid ${T.line}`, borderRadius: 10,
  color: T.ink, padding: "8px 12px", fontSize: 13, outline: "none", width: "100%",
};
