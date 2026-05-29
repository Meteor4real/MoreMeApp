// Hub-wide UI preferences. Stored in localStorage; mutations notify
// subscribers so toggles update across the whole app in real time.

export type SearchEngine = "duckduckgo" | "brave" | "google" | "startpage";

export type UiPrefs = {
  // Floating info overlays — toggleable, sit on top of the canvas
  infoBreaking: boolean;       // NT5 "Breaking" cards
  infoNextUp: boolean;         // MoreMe "next up" reminder
  infoOrigin: boolean;         // Origin Realms server pulse
  infoSystem: boolean;         // CPU/mem/disk pulse
  infoCrew: boolean;           // recent group-chat activity
  // Ticker
  tickerEnabled: boolean;
  // Browser
  searchEngine: SearchEngine;
  showBookmarksBar: boolean;
  homePage: string;            // empty = the hub's own start page
  // NT5 wire
  wireMinutes: number;         // how often the in-app wire generates articles
  // NT5 broadcast — ElevenLabs voice per anchor (empty = Web Speech)
  anchorVoices: { voss: string; zara: string; dex: string; lena: string; orin: string };
  // NT5 broadcast — Pexels B-roll on the full broadcast view
  brollEnabled: boolean;
  // NT5 broadcast — use a DigitalBlueprint scene as a 3D B-roll backdrop
  blueprintBackdrop: boolean;
};

export const DEFAULT_PREFS: UiPrefs = {
  infoBreaking: true,
  infoNextUp: true,
  infoOrigin: true,
  infoSystem: true,
  infoCrew: true,
  tickerEnabled: true,
  searchEngine: "duckduckgo",
  showBookmarksBar: true,
  homePage: "",
  wireMinutes: 20,
  anchorVoices: { voss: "", zara: "", dex: "", lena: "", orin: "" },
  brollEnabled: true,
  blueprintBackdrop: false,
};

const KEY = "nchub.uiprefs.v1";

let cache: UiPrefs | null = null;
const subs = new Set<(p: UiPrefs) => void>();

export function loadPrefs(): UiPrefs {
  if (cache) return cache;
  let result: UiPrefs;
  try {
    const raw = localStorage.getItem(KEY);
    result = raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<UiPrefs>) } : { ...DEFAULT_PREFS };
  } catch {
    result = { ...DEFAULT_PREFS };
  }
  cache = result;
  return result;
}

export function savePrefs(next: Partial<UiPrefs>): UiPrefs {
  const merged: UiPrefs = { ...loadPrefs(), ...next };
  cache = merged;
  try { localStorage.setItem(KEY, JSON.stringify(merged)); } catch { /* ignore */ }
  subs.forEach((fn) => fn(merged));
  return merged;
}

export function subscribePrefs(fn: (p: UiPrefs) => void): () => void {
  subs.add(fn);
  return () => subs.delete(fn);
}

export const SEARCH_ENGINES: Record<SearchEngine, { name: string; url: (q: string) => string }> = {
  duckduckgo: { name: "DuckDuckGo", url: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}` },
  brave:      { name: "Brave",      url: (q) => `https://search.brave.com/search?q=${encodeURIComponent(q)}` },
  google:     { name: "Google",     url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
  startpage:  { name: "Startpage",  url: (q) => `https://www.startpage.com/do/search?q=${encodeURIComponent(q)}` },
};
