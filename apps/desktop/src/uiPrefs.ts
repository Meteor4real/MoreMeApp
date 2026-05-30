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
  // Owner profile — fed into every AI call as system context so the model
  // actually knows who it's talking to (Minecraft fan, what they make, etc.)
  // instead of guessing.
  ownerName: string;
  ownerInterests: string;       // free-text: games, hobbies, focus areas
  ownerStack: string;           // free-text: tools, languages, services they use
  ownerBio: string;             // free-text: one-paragraph about-me
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
  ownerName: "",
  ownerInterests: "",
  ownerStack: "",
  ownerBio: "",
};

// Compose the owner-profile block injected into every AI system prompt.
// Keep it compact but rich enough to ground a small local model.
export function ownerProfileContext(p: UiPrefs = loadPrefs()): string {
  const lines: string[] = [];
  if (p.ownerName) lines.push(`Operator's name: ${p.ownerName}.`);
  if (p.ownerBio) lines.push(`About them: ${p.ownerBio}`);
  if (p.ownerInterests) lines.push(`Interests / things they care about: ${p.ownerInterests}.`);
  if (p.ownerStack) lines.push(`Tools and services they use: ${p.ownerStack}.`);
  if (!lines.length) return "";
  return [
    "Background on who you're working with (use this; do not contradict it):",
    ...lines,
    // Tiny world-knowledge primer so small local models don't blank on obvious terms.
    "Reference: Minecraft is the sandbox game by Mojang. Modrinth is the Minecraft mod platform. Blockbench is a low-poly modeling tool. Origin Realms is a Minecraft server with custom RPG content. Hostinger is a VPS / hosting provider. Tailscale is a wireguard-based mesh VPN. n8n is an open-source workflow automation tool. Hermes is the operator's custom self-hosted AI. NT5 is the operator's in-universe newsroom.",
  ].join("\n");
}

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
