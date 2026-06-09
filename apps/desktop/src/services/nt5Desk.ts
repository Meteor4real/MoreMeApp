// NT5 anchor desk — the autonomous scheduler. Each anchor runs on their own
// cadence (configurable per-anchor), pulls THEIR topics on their own
// schedule, and files non-stop. No clicks required.
//
// 24/7 in practice: backgroundThrottling:false + close-to-tray keep the
// renderer (and this scheduler) alive even when the window is closed, so the
// desk keeps filing even while you're not looking.

import { ALL_ANCHORS, type AnchorId } from "./nt5Lore";
import { enabledTopics } from "./nt5Topics";
import { runTopicOnce } from "./nt5Wire";

const KEY = "nt5.desk.v1";

export type LastFiled = { count: number; topicLabels: string[]; at: number };
export type AnchorStatus = {
  id: AnchorId;
  cadenceMinutes: number;       // how often this anchor files
  lastFiledAt: number;          // when they last finished a shift (0 = never)
  nextFileAt: number;           // computed: lastFiledAt + cadence*60s
  lastFiled: LastFiled | null;  // summary of the last shift
  filing: boolean;              // currently mid-shift
};

type DeskState = {
  cadences: Record<AnchorId, number>;
  lastFiledAt: Record<AnchorId, number>;
  lastFiled: Record<AnchorId, LastFiled | null>;
};

// Sensible per-anchor defaults — breaking is fastest, deeper desks are slower.
// Tune in the UI; persisted per-user.
export const DEFAULT_CADENCE: Record<AnchorId, number> = {
  voss: 5,   // breaking — fastest
  dex:  8,   // gaming — frequent meta + patches
  zara: 10,  // culture — keeps a pulse
  lena: 12,  // field — fewer items, more depth
  orin: 15,  // tech / space — deeper, slower
};

function emptyState(): DeskState {
  return {
    cadences: { ...DEFAULT_CADENCE },
    lastFiledAt: { voss: 0, lena: 0, dex: 0, orin: 0, zara: 0 },
    lastFiled:   { voss: null, lena: null, dex: null, orin: null, zara: null },
  };
}

let state: DeskState | null = null;
const filing: Record<AnchorId, boolean> = { voss: false, lena: false, dex: false, orin: false, zara: false };
const subs = new Set<() => void>();

function load(): DeskState {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<DeskState>;
      state = {
        cadences:    { ...DEFAULT_CADENCE,                                       ...(p.cadences ?? {}) } as Record<AnchorId, number>,
        lastFiledAt: { voss: 0,    lena: 0,    dex: 0,    orin: 0,    zara: 0,    ...(p.lastFiledAt ?? {}) } as Record<AnchorId, number>,
        lastFiled:   { voss: null, lena: null, dex: null, orin: null, zara: null, ...(p.lastFiled   ?? {}) } as Record<AnchorId, LastFiled | null>,
      };
      return state;
    }
  } catch { /* ignore */ }
  state = emptyState();
  return state;
}
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
}
function notify() { for (const fn of subs) fn(); }

export function subscribeDesk(fn: () => void): () => void {
  subs.add(fn);
  return () => subs.delete(fn);
}

export function getDeskStatuses(): AnchorStatus[] {
  const s = load();
  return ALL_ANCHORS.map((a) => {
    const cadence = s.cadences[a.id] ?? DEFAULT_CADENCE[a.id];
    const last = s.lastFiledAt[a.id] ?? 0;
    // If never filed, schedule the first shift shortly after boot rather than
    // immediately so the model has a moment to come up.
    const nextFileAt = last ? last + cadence * 60_000 : Date.now() + 8_000;
    return {
      id: a.id, cadenceMinutes: cadence, lastFiledAt: last, nextFileAt,
      lastFiled: s.lastFiled[a.id] ?? null, filing: filing[a.id],
    };
  });
}

export function setAnchorCadence(anchor: AnchorId, minutes: number) {
  const s = load();
  s.cadences[anchor] = Math.max(1, Math.min(180, Math.round(minutes)));
  persist();
  notify();
}

// Kick an anchor's shift right now (manual override). Ignored if they're
// already filing.
export async function kickAnchor(anchor: AnchorId): Promise<void> {
  if (filing[anchor]) return;
  await fileShift(anchor);
}

let started = false;
let timer: ReturnType<typeof setInterval> | null = null;

export function startDesk() {
  if (started) return;
  started = true;
  // Initial tick a moment after start so the rest of the app boots first.
  setTimeout(() => { void tick(); }, 5_000);
  // 30s heartbeat — each anchor independently picks up a shift when their
  // cadence has elapsed.
  timer = setInterval(() => { void tick(); }, 30_000);
}

export function stopDesk() {
  if (timer) clearInterval(timer);
  timer = null;
  started = false;
}

async function tick() {
  const s = load();
  for (const a of ALL_ANCHORS) {
    if (filing[a.id]) continue;
    const cadenceMs = (s.cadences[a.id] ?? DEFAULT_CADENCE[a.id]) * 60_000;
    const elapsed = Date.now() - (s.lastFiledAt[a.id] ?? 0);
    if (elapsed < cadenceMs) continue;
    // Serial: only one anchor files per tick so the network isn't burst-loaded.
    // Other anchors who're also due will pick up on the next 30s heartbeat.
    await fileShift(a.id);
    break;
  }
}

async function fileShift(anchorId: AnchorId) {
  const s = load();
  const topics = enabledTopics().filter((t) => t.anchor === anchorId);
  filing[anchorId] = true;
  notify();
  try {
    if (!topics.length) {
      // Nothing assigned to this anchor — mark a shift anyway so we don't
      // tight-loop reconsidering them every tick.
      s.lastFiledAt[anchorId] = Date.now();
      s.lastFiled[anchorId] = { count: 0, topicLabels: [], at: Date.now() };
      persist();
      return;
    }
    let added = 0;
    const topicLabels: string[] = [];
    for (const topic of topics) {
      const r = await runTopicOnce(topic).catch(() => ({ added: [] as unknown[] }));
      const c = (r.added ?? []).length;
      added += c;
      if (c > 0) topicLabels.push(topic.label || topic.query);
    }
    s.lastFiledAt[anchorId] = Date.now();
    s.lastFiled[anchorId] = { count: added, topicLabels, at: Date.now() };
    persist();
  } finally {
    filing[anchorId] = false;
    notify();
  }
}
