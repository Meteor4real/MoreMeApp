// The Hermes spine. Hermes is NCH's required AI: the user points NCH at a
// Hermes URL, and Hermes becomes the default conversational partner + the
// long-term memory curator for the whole crew. Every other agent's memory
// entries (the `remember` tool), every user/agent message in every chat,
// and every Command Center event get piped to Hermes here so he can build
// and curate the shared memory pool on his side.
//
// Wire contract (matches the user's Hermes today):
//   POST {url}/chat   { system, messages:[{role,content}] } -> { text }
//   POST {url}/memory { entries:[{ agent, fact, source, ts }] } -> { ok }
//
// URL persistence: encrypted on-device in the keychain vault as the synthetic
// service "hermes" — same plumbing every other service uses, no Accounts
// involvement, no bundled secret. Ready-state is in localStorage as a mirror
// for instant boot.

const READY_KEY = "nchub.hermes.readyMirror.v1";
const VAULT_ID = "hermes";

type Subscriber = (state: HermesState) => void;
const subs = new Set<Subscriber>();

export type HermesState = {
  url: string;           // empty = not configured
  configured: boolean;   // url set + at least one /chat round-trip succeeded
  lastError?: string;
  lastOkAt?: number;
};

let state: HermesState = (() => {
  try {
    const raw = localStorage.getItem(READY_KEY);
    if (raw) return { configured: false, url: "", ...JSON.parse(raw) as Partial<HermesState> };
  } catch { /* ignore */ }
  return { url: "", configured: false };
})();

function notify() {
  try { localStorage.setItem(READY_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  subs.forEach((fn) => { try { fn(state); } catch { /* ignore */ } });
}

export function getHermesState(): HermesState { return state; }
export function subscribeHermes(fn: Subscriber): () => void {
  subs.add(fn); fn(state); return () => subs.delete(fn);
}

// Boot: load the URL from the keychain. Async, so callers get the mirror
// instantly and the real state lands once the keychain answers.
let hydrated = false;
export async function ensureHermesHydrated(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  try {
    const v = await window.hub.vault.get(VAULT_ID);
    const url = (v.baseUrl || "").trim();
    if (url !== state.url) { state = { ...state, url, configured: !!url && state.configured }; notify(); }
  } catch { /* keychain unavailable — keep mirror */ }
}

// Save / clear the URL. Persists in the keychain (per-user, on-device).
export async function setHermesUrl(url: string): Promise<void> {
  const clean = url.trim().replace(/\/+$/, "");
  await window.hub.vault.set(VAULT_ID, "", clean);
  state = { ...state, url: clean, configured: false };
  notify();
}
export async function clearHermes(): Promise<void> {
  await window.hub.vault.remove(VAULT_ID);
  state = { url: "", configured: false };
  notify();
}

// Round-trip a tiny request to confirm the URL actually points at a Hermes.
// Marks `configured: true` on success so chat / memory paths can lean on it.
export async function pingHermes(): Promise<{ ok: boolean; detail: string }> {
  await ensureHermesHydrated();
  if (!state.url) return { ok: false, detail: "no URL set" };
  try {
    const r = await window.hub.net({
      method: "POST",
      url: `${state.url}/chat`,
      headers: { "Content-Type": "application/json" },
      body: { system: "Reply with the single word: ok.", messages: [{ role: "user", content: "ping" }] },
    });
    if (!r.ok) {
      state = { ...state, configured: false, lastError: `HTTP ${r.status}` };
      notify();
      return { ok: false, detail: `HTTP ${r.status}` };
    }
    state = { ...state, configured: true, lastOkAt: Date.now(), lastError: undefined };
    notify();
    return { ok: true, detail: "reachable" };
  } catch (e) {
    const detail = String(e);
    state = { ...state, configured: false, lastError: detail };
    notify();
    return { ok: false, detail };
  }
}

// Hermes chat. Used by the AI Crew when Hermes is the active speaker, and
// by anything else that wants the curated brain. Returns { ok, text? } in the
// same shape as window.hub.llm.chat so callers can swap transports.
export async function hermesChat(system: string, messages: { role: "user" | "assistant"; content: string }[]): Promise<{ ok: boolean; text?: string; error?: string }> {
  await ensureHermesHydrated();
  if (!state.url) return { ok: false, error: "Hermes URL not set" };
  try {
    const r = await window.hub.net({
      method: "POST", url: `${state.url}/chat`,
      headers: { "Content-Type": "application/json" },
      body: { system, messages },
    });
    if (!r.ok) {
      state = { ...state, lastError: `HTTP ${r.status}` }; notify();
      return { ok: false, error: `Hermes HTTP ${r.status}` };
    }
    state = { ...state, configured: true, lastOkAt: Date.now(), lastError: undefined }; notify();
    const text = (r.data as { text?: string } | null)?.text ?? (typeof r.data === "string" ? r.data : "");
    return { ok: true, text };
  } catch (e) {
    state = { ...state, lastError: String(e) }; notify();
    return { ok: false, error: String(e) };
  }
}

// ── Memory pipe — flavor (c): explicit remember + chat traffic + CP events ──
// Entries get batched + flushed periodically to /memory so Hermes can dedup,
// rank, and curate them on his side. Failures are queued; lossy is fine.

export type MemoryEntry = {
  agent: string;          // "meteor" (the user), an agent id, or "system"
  fact: string;           // the content
  source: MemorySource;   // where it came from
  ts: number;
};
export type MemorySource = "explicit" | "chat" | "control-panel" | "event";

const FLUSH_INTERVAL_MS = 30_000;
const QUEUE_KEY = "nchub.hermes.memQueue.v1";

function loadQueue(): MemoryEntry[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]") as MemoryEntry[]; } catch { return []; }
}
function saveQueue(q: MemoryEntry[]) { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-500))); } catch { /* ignore */ } }

export function pushMemory(entry: Omit<MemoryEntry, "ts"> & { ts?: number }): void {
  const e: MemoryEntry = { ...entry, ts: entry.ts ?? Date.now() };
  if (!e.fact || !e.fact.trim()) return;
  // Bound a single entry so a 50KB tool dump doesn't dominate the pipe.
  e.fact = e.fact.slice(0, 4000);
  const q = loadQueue();
  q.push(e); saveQueue(q);
}

let flushing = false;
let flushTimer: ReturnType<typeof setInterval> | null = null;
async function flushNow(): Promise<void> {
  if (flushing) return;
  await ensureHermesHydrated();
  if (!state.url) return; // no Hermes yet — keep queueing
  const q = loadQueue();
  if (q.length === 0) return;
  flushing = true;
  // Drain in chunks so one flush isn't an unbounded body.
  const batch = q.slice(0, 80);
  try {
    const r = await window.hub.net({
      method: "POST", url: `${state.url}/memory`,
      headers: { "Content-Type": "application/json" },
      body: { entries: batch },
    });
    if (r.ok) {
      // Pop what we sent.
      saveQueue(q.slice(batch.length));
      state = { ...state, configured: true, lastOkAt: Date.now(), lastError: undefined }; notify();
    } else {
      state = { ...state, lastError: `memory HTTP ${r.status}` }; notify();
    }
  } catch (e) {
    state = { ...state, lastError: String(e) }; notify();
  } finally { flushing = false; }
}

export function startHermesPipe(): void {
  if (flushTimer) return;
  flushTimer = setInterval(() => { void flushNow(); }, FLUSH_INTERVAL_MS);
  // Best-effort drain on tab teardown.
  window.addEventListener("beforeunload", () => { void flushNow(); });
}

// Manual flush hook for callers that want it (e.g. after a big tool result).
export async function flushHermesMemory(): Promise<void> { await flushNow(); }
