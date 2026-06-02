// Feature gating via dev codes. NCH's identity is "operator's cockpit + AI
// crew" — Terminal, AI Group Chat, and Command Center are the only default
// surfaces. Everything else ships hidden behind a code so the default
// experience stays focused; power users (or the owner) can unlock the rest.
//
//   2089 → the operator unlock: NT5, MoreMe, DigitalBlueprint, BroBot,
//          HALOS, SignalFinder, IT Toolbox, Documents, Library, and the
//          embedded Browser. NT5 may graduate later.
//   2078 → kept for backwards compatibility; same effective scope as 2089.
//
// Codes persist encrypted in the OS keychain (with a localStorage mirror for
// instant boot). Unlocking is permanent until the user explicitly relocks.

const KEY = "nchub.unlockedCodes.v1";
const subs = new Set<(codes: Set<string>) => void>();
let cache: Set<string> | null = null;

// One wide unlock covers every non-core surface. Both codes flip the same
// scope so older installs that used 2078 keep working.
const WIDE_UNLOCK = ["halos", "brobot", "moreme", "blueprint", "nt5", "signalfinder", "toolbox", "documents", "library", "browser"] as const;

export const KNOWN_CODES = {
  "2089": { label: "Operator unlock", unlocks: WIDE_UNLOCK, kind: "internal" as const },
  "2078": { label: "Beta Test Software", unlocks: WIDE_UNLOCK, kind: "beta" as const },
} as const;

export type CodeKey = keyof typeof KNOWN_CODES;
export const ALL_GATED_APPS = WIDE_UNLOCK;
export type GatedAppId = typeof ALL_GATED_APPS[number];

// Codes are stored encrypted in the OS keychain via the main process
// (gate:get / gate:set). We keep a synchronous in-memory cache so render
// paths stay sync; the cache hydrates from the keychain once on boot and
// notifies subscribers, so a late hydration re-renders the rail / roster.
// A localStorage mirror is kept only as an instant-boot fallback before the
// async keychain read returns.
let hydrated = false;
export function loadCodes(): Set<string> {
  if (cache) {
    if (!hydrated) void hydrateFromKeychain();
    return cache;
  }
  try {
    const raw = localStorage.getItem(KEY);
    cache = new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
  } catch { cache = new Set<string>(); }
  void hydrateFromKeychain();
  return cache;
}
async function hydrateFromKeychain() {
  if (hydrated) return;
  hydrated = true;
  try {
    const codes = await window.hub.gate.get();
    if (Array.isArray(codes)) {
      cache = new Set<string>(codes);
      try { localStorage.setItem(KEY, JSON.stringify(codes)); } catch { /* ignore */ }
      subs.forEach((fn) => fn(new Set(cache!)));
    }
  } catch { /* keychain unavailable — keep localStorage fallback */ }
}
function persist() {
  if (!cache) return;
  const arr = [...cache];
  try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch { /* ignore */ }
  void window.hub.gate.set(arr).catch(() => undefined);
  subs.forEach((fn) => fn(new Set(cache!)));
}

// Try to unlock a code. Returns { ok, message } so the UI can show feedback.
export function tryUnlock(input: string): { ok: boolean; message: string } {
  const code = input.trim();
  if (!code) return { ok: false, message: "Enter a code." };
  if (!(code in KNOWN_CODES)) return { ok: false, message: "That code isn't recognized." };
  const set = loadCodes();
  if (set.has(code)) return { ok: false, message: "That code is already active." };
  set.add(code); cache = set; persist();
  const meta = KNOWN_CODES[code as CodeKey];
  return { ok: true, message: `Unlocked: ${meta.label} (${meta.unlocks.join(", ")}).` };
}
export function relock(code: string) {
  const set = loadCodes();
  set.delete(code); cache = set; persist();
}
export function isUnlocked(code: CodeKey): boolean { return loadCodes().has(code); }

// Is a given app id currently allowed to surface in the rail / group chat?
export function appUnlocked(appId: string): boolean {
  if (!(ALL_GATED_APPS as readonly string[]).includes(appId)) return true; // not gated
  const codes = loadCodes();
  for (const code of Object.keys(KNOWN_CODES) as CodeKey[]) {
    const meta = KNOWN_CODES[code];
    if ((meta.unlocks as readonly string[]).includes(appId) && codes.has(code)) return true;
  }
  return false;
}

export function subscribeCodes(fn: (codes: Set<string>) => void): () => void {
  subs.add(fn);
  fn(new Set(loadCodes()));
  return () => subs.delete(fn);
}
