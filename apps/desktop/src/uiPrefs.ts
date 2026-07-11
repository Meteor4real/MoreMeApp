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
  infoClock: boolean;          // live clock + date
  infoMoreMe: boolean;         // MoreMe streak + today progress
  infoBroBot: boolean;         // BroBot gallery recent
  infoGithub: boolean;         // GitHub open PRs pulse
  infoVercel: boolean;         // Vercel latest deploy state
  infoMusic: boolean;          // currently playing music track
  infoNetwork: boolean;        // online/offline + connection type
  infoUptime: boolean;         // hub session uptime
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

  // ── Profile (additional fields used by Settings → Profile) ──────────────
  ownerAvatar: string;          // base64 data URL or external URL
  ownerPronouns: string;
  ownerLocation: string;
  ownerTimezone: string;        // IANA name, defaults to system tz
  ownerBirthday: string;        // ISO date, optional

  // ── Feedback (the HALOS feel layer) ─────────────────────────────────────
  sfxEnabled: boolean;          // procedural UI sounds on actions + rewards

  // ── Appearance ─────────────────────────────────────────────────────────
  reduceMotion: boolean;        // disable shimmer / scanlines / particle anims
  fontSize: "small" | "normal" | "large";
  accentIntensity: "soft" | "normal" | "loud";
  showRailLabels: boolean;      // expand rail to show labels next to icons
  compactDensity: boolean;      // tighten padding across the app

  // ── Browser ────────────────────────────────────────────────────────────
  defaultNewTabPage: "start" | "homepage" | "blank";
  blockPopups: boolean;
  blockAutoplay: boolean;
  restoreTabsOnLaunch: boolean;

  // ── AI Group Chat ──────────────────────────────────────────────────────
  chatDefaultTone: "casual" | "professional" | "hype" | "short";
  chatResponseLength: "short" | "medium" | "long";
  chatChainDepth: number;        // how many @mention hops the chain follows (1-4)
  chatAutoScroll: boolean;       // auto-scroll on new messages
  chatShowSilent: boolean;       // show silent (mention-only) anchors in roster

  // ── House AI ───────────────────────────────────────────────────────────
  llmTemperature: number;        // 0..1.5
  llmMaxTokens: number;
  llmSystemPrefix: string;       // user-supplied text prepended to every system prompt

  // ── Music ──────────────────────────────────────────────────────────────
  musicAutoplay: boolean;        // start playing on app launch
  musicDefaultVolume: number;    // 0..1
  musicDefaultTrack: string;     // track id from ost.ts
  musicFadeIn: boolean;          // fade in over a few seconds

  // ── Notifications ──────────────────────────────────────────────────────
  notificationsEnabled: boolean;
  notificationDurationMs: number;
  notificationPosition: "tr" | "br" | "tl" | "bl";
  notificationSound: boolean;

  // ── Privacy / Security ─────────────────────────────────────────────────
  privacyClearHistoryOnQuit: boolean;
  privacyClearDownloadsOnQuit: boolean;
  privacyBlock3pCookies: boolean;
  privacyDntGpc: boolean;
};

export const DEFAULT_PREFS: UiPrefs = {
  infoBreaking: true,
  infoNextUp: true,
  infoOrigin: true,
  infoSystem: true,
  infoCrew: true,
  infoClock: true,
  infoMoreMe: true,
  infoBroBot: false,
  infoGithub: false,
  infoVercel: false,
  infoMusic: true,
  infoNetwork: true,
  infoUptime: false,
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
  ownerAvatar: "",
  ownerPronouns: "",
  ownerLocation: "",
  ownerTimezone: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { return ""; } })(),
  ownerBirthday: "",
  sfxEnabled: true,
  reduceMotion: false,
  fontSize: "normal",
  accentIntensity: "normal",
  showRailLabels: false,
  compactDensity: false,
  defaultNewTabPage: "start",
  blockPopups: true,
  blockAutoplay: true,
  restoreTabsOnLaunch: true,
  chatDefaultTone: "casual",
  chatResponseLength: "medium",
  chatChainDepth: 3,
  chatAutoScroll: true,
  chatShowSilent: true,
  llmTemperature: 0.7,
  llmMaxTokens: 1024,
  llmSystemPrefix: "",
  musicAutoplay: false,
  musicDefaultVolume: 0.45,
  musicDefaultTrack: "hub",
  musicFadeIn: true,
  notificationsEnabled: true,
  notificationDurationMs: 5000,
  notificationPosition: "tr",
  notificationSound: false,
  privacyClearHistoryOnQuit: false,
  privacyClearDownloadsOnQuit: false,
  privacyBlock3pCookies: true,
  privacyDntGpc: true,
};

// Apply the visual / appearance prefs to the document so they actually take
// effect: body classes for CSS hooks, a root font-size scale, and accent
// glow intensity. Also pushes the session-level privacy state to the main
// process. Called on boot and on every prefs change.
export function applyUiPrefs(p: UiPrefs = loadPrefs()): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const body = document.body;
  // Font size scale.
  root.style.setProperty("--ui-scale", p.fontSize === "small" ? "0.92" : p.fontSize === "large" ? "1.12" : "1");
  // Accent glow intensity — derive the live --glow from the theme's raw
  // --glow-base so every `var(--glow)` shadow across the app dims (soft) or
  // brightens (loud) without touching individual rules.
  const base = getComputedStyle(root).getPropertyValue("--glow-base").trim() || "#ff3355";
  const glow =
    p.accentIntensity === "soft" ? `color-mix(in srgb, ${base} 45%, transparent)`
    : p.accentIntensity === "loud" ? `color-mix(in srgb, ${base} 80%, white)`
    : base;
  root.style.setProperty("--glow", glow);
  // Body classes (CSS in theme.css reacts to these).
  body.classList.toggle("reduce-motion", p.reduceMotion);
  body.classList.toggle("compact-density", p.compactDensity);
  // Push privacy state to the main session.
  try { window.hub.privacy?.apply({ dntGpc: p.privacyDntGpc, block3p: p.privacyBlock3pCookies }); } catch { /* ignore */ }
}

// Compose the owner-profile block injected into every AI system prompt.
// Keep it compact but rich enough to ground a small local model.
export function ownerProfileContext(p: UiPrefs = loadPrefs()): string {
  const lines: string[] = [];
  if (p.ownerName) lines.push(`Operator's name: ${p.ownerName}${p.ownerPronouns ? ` (${p.ownerPronouns})` : ""}.`);
  if (p.ownerLocation) lines.push(`Lives in: ${p.ownerLocation}.`);
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
