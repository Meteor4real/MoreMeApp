// Feature gating via dev codes. Some apps ship hidden by default and are
// unlocked by typing a code in Settings → Dev codes:
//
//   2089 → HALOS Interface + BroBot (+ BroBot in the AI Group Chat roster)
//   2078 → MoreMe + DigitalBlueprint (under "Beta Test Software")
//
// NT5 News + SignalFinder + the core surfaces (Browser, Control Panel,
// Terminal, AI Group Chat, Library, Settings) are visible on default.
// Codes persist in localStorage; unlocking is permanent until the user
// explicitly relocks from Settings.

const KEY = "nchub.unlockedCodes.v1";
const subs = new Set<(codes: Set<string>) => void>();
let cache: Set<string> | null = null;

export const KNOWN_CODES = {
  "2089": { label: "Internal access", unlocks: ["halos", "brobot"] as const, kind: "internal" as const },
  "2078": { label: "Beta Test Software", unlocks: ["moreme", "blueprint"] as const, kind: "beta" as const },
} as const;

export type CodeKey = keyof typeof KNOWN_CODES;
export const ALL_GATED_APPS = ["halos", "brobot", "moreme", "blueprint"] as const;
export type GatedAppId = typeof ALL_GATED_APPS[number];

export function loadCodes(): Set<string> {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
  } catch { cache = new Set<string>(); }
  return cache;
}
function persist() {
  if (!cache) return;
  try { localStorage.setItem(KEY, JSON.stringify([...cache])); } catch { /* ignore */ }
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
