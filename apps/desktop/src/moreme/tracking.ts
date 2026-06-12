// MoreMe tracking — renderer-side surface for the OS-level foreground
// tracker living in electron/tracking.ts. Exposes get/set/report/clear and a
// subscribe() hook. Also owns the siren-when-disabled audio loop: as long
// as tracking is OFF, a short siren tone fires every few seconds. The user
// is the only thing that can silence it (by flipping tracking ON).

export type TrackingCurrent = {
  app: string; title: string; tab?: string; browser?: string; start: number;
};
export type TrackingReport = {
  sessions: { app: string; title: string; tab?: string; browser?: string; start: number; end: number; durationMs: number }[];
};

type Hub = {
  tracking?: {
    get(): Promise<{ prefs: { enabled: boolean }; current: TrackingCurrent | null }>;
    set(p: Partial<{ enabled: boolean }>): Promise<{ enabled: boolean }>;
    report(sinceMs?: number): Promise<TrackingReport>;
    clear(): Promise<{ ok: boolean }>;
    onTick(fn: (msg: { enabled: boolean; current: TrackingCurrent | null }) => void): () => void;
  };
};

function hub(): Hub["tracking"] | undefined {
  return (window as unknown as { hub: Hub }).hub?.tracking;
}

export async function getTracking(): Promise<{ enabled: boolean; current: TrackingCurrent | null }> {
  const h = hub();
  if (!h) return { enabled: false, current: null };
  const r = await h.get().catch(() => null);
  return r ? { enabled: r.prefs.enabled, current: r.current } : { enabled: false, current: null };
}
export async function setTrackingEnabled(on: boolean): Promise<void> {
  const h = hub();
  if (!h) return;
  await h.set({ enabled: on }).catch(() => undefined);
  // Silence the siren immediately when enabling; start it immediately when
  // disabling (rather than waiting for the next tick).
  if (on) stopSiren(); else startSiren();
}
export async function trackingReport(sinceMs?: number): Promise<TrackingReport> {
  const h = hub();
  if (!h) return { sessions: [] };
  return h.report(sinceMs).catch(() => ({ sessions: [] }));
}
export async function clearTracking(): Promise<void> {
  const h = hub();
  if (!h) return;
  await h.clear().catch(() => undefined);
}
export function subscribeTracking(fn: (s: { enabled: boolean; current: TrackingCurrent | null }) => void): () => void {
  const h = hub();
  if (!h) { fn({ enabled: false, current: null }); return () => undefined; }
  return h.onTick(fn);
}

// ── Siren ────────────────────────────────────────────────────────────────
// Two-tone air-raid sweep, ~0.7s long, looped every 4s. WebAudio so no
// asset to ship and no copyrighted sound. Loud but not deafening — the
// gain is held below clipping. User can mute their OS if they need to.

let ctx: AudioContext | null = null;
let timer: number | null = null;
let firing = false;

function ensureCtx(): AudioContext {
  if (!ctx) {
    const Ctor = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    ctx = new (Ctor as typeof AudioContext)();
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
  return ctx;
}

function blast() {
  const c = ensureCtx();
  const now = c.currentTime;
  // Up-sweep then down-sweep, classic air-raid shape.
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.linearRampToValueAtTime(880, now + 0.35);
  osc.frequency.linearRampToValueAtTime(440, now + 0.7);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.45, now + 0.05);
  gain.gain.linearRampToValueAtTime(0.4, now + 0.65);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
  osc.connect(gain).connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.72);
}

export function startSiren() {
  if (firing) return;
  firing = true;
  // First blast on the next paint so it doesn't fire mid-render.
  setTimeout(() => { if (firing) blast(); }, 50);
  timer = window.setInterval(() => { if (firing) blast(); }, 4000);
}
export function stopSiren() {
  firing = false;
  if (timer != null) { window.clearInterval(timer); timer = null; }
}
export function sirenActive(): boolean { return firing; }

// On boot, fetch tracking state. If disabled, start the siren. Also
// subscribe to ticks so a desync (user changes the pref elsewhere) doesn't
// leave the siren on/off when it shouldn't be.
export function initTrackingSiren() {
  if (!hub()) return; // browser dev mode — nothing to do
  void getTracking().then((s) => { if (!s.enabled) startSiren(); else stopSiren(); });
  subscribeTracking((s) => { if (!s.enabled) startSiren(); else stopSiren(); });
}
