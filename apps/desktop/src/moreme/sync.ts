// MoreMe — Supabase sync. Follows the user across devices.
//
// Server table: public.moreme_state (user_id uuid PK, state jsonb,
// updated_at timestamptz). RLS limits each row to its owner. Guest mode
// skips sync entirely; only authed users sync.
//
// Loop:
//   1. On start (and on sign-in), pull the remote row. If it's newer than
//      what we have locally, install it and re-broadcast to subscribers.
//   2. After every local change, debounce-push the full state (≤ 4s).
//   3. Report status (synced / pushing / pulling / offline / error) so the
//      header can show a discreet pip.

import type { State } from "./types";
import { loadState, subscribeState, updateState } from "./store";
import { getSession, loadCfg, isGuest } from "../auth/supabase";

const LOCAL_TS = "nchub.moreme.lastSync.v1";

export type SyncStatus = "off" | "idle" | "pulling" | "pushing" | "error";
let status: SyncStatus = "off";
let lastError = "";
let lastSyncAt: number | null = null;
const statusSubs = new Set<(s: { status: SyncStatus; error: string; at: number | null }) => void>();
function setStatus(next: SyncStatus, err = "") {
  status = next; lastError = err;
  for (const fn of statusSubs) fn({ status, error: lastError, at: lastSyncAt });
}
export function subscribeSync(fn: (s: { status: SyncStatus; error: string; at: number | null }) => void): () => void {
  statusSubs.add(fn); fn({ status, error: lastError, at: lastSyncAt }); return () => statusSubs.delete(fn);
}

function localTs(): number { try { return Number(localStorage.getItem(LOCAL_TS) || "0"); } catch { return 0; } }
function setLocalTs(ts: number) { try { localStorage.setItem(LOCAL_TS, String(ts)); } catch { /* ignore */ } }

// Set while we're applying a remote update so the resulting subscribe
// fire-back doesn't schedule another push. Otherwise every poll would write.
let applyingRemote = false;

async function restGet(path: string, token: string) {
  const { url, anon } = loadCfg();
  return window.hub.net({
    method: "GET",
    url: `${url.replace(/\/$/, "")}${path}`,
    headers: {
      apikey: anon,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
}
async function restPost(path: string, token: string, body: unknown, prefer = "resolution=merge-duplicates,return=representation") {
  const { url, anon } = loadCfg();
  return window.hub.net({
    method: "POST",
    url: `${url.replace(/\/$/, "")}${path}`,
    headers: {
      apikey: anon,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: prefer,
    },
    body,
  });
}

type Row = { user_id: string; state: State; updated_at: string };

export async function pullOnce(): Promise<{ ok: boolean; row?: Row; error?: string }> {
  const sess = getSession();
  if (!sess) return { ok: false, error: "not signed in" };
  setStatus("pulling");
  const r = await restGet(`/rest/v1/moreme_state?user_id=eq.${sess.userId}&select=*`, sess.token);
  if (!r.ok) { setStatus("error", String((r.data as { message?: string })?.message ?? "pull failed")); return { ok: false, error: lastError }; }
  const rows = (r.data as Row[]) ?? [];
  if (!rows.length) { setStatus("idle"); return { ok: true }; }
  const row = rows[0];
  const remoteTs = new Date(row.updated_at).getTime();
  if (remoteTs > localTs()) {
    // Server is newer — adopt it. Suppress the resulting push so we don't
    // bounce the just-pulled state right back over the wire.
    applyingRemote = true;
    try { updateState(() => row.state); } finally { applyingRemote = false; }
    setLocalTs(remoteTs);
    lastSyncAt = remoteTs;
  }
  setStatus("idle");
  return { ok: true, row };
}

export async function pushOnce(): Promise<{ ok: boolean; error?: string }> {
  const sess = getSession();
  if (!sess) return { ok: false, error: "not signed in" };
  setStatus("pushing");
  const s = loadState();
  const r = await restPost(`/rest/v1/moreme_state`, sess.token, { user_id: sess.userId, state: s });
  if (!r.ok) { setStatus("error", String((r.data as { message?: string })?.message ?? "push failed")); return { ok: false, error: lastError }; }
  // Server stamps updated_at; reflect it.
  const rows = (r.data as Row[]) ?? [];
  if (rows.length) {
    const ts = new Date(rows[0].updated_at).getTime();
    setLocalTs(ts);
    lastSyncAt = ts;
  } else {
    lastSyncAt = Date.now();
  }
  setStatus("idle");
  return { ok: true };
}

// Module-level debouncer so multiple rapid mutations coalesce into one push.
let pushTimer: number | null = null;
function schedulePush(delay = 4000) {
  if (pushTimer != null) window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => { pushTimer = null; void pushOnce(); }, delay);
}

let started = false;
let stopSubscription: (() => void) | null = null;
let pollTimer: number | null = null;

// Kick off sync. Idempotent: safe to call repeatedly. Skips entirely in
// guest mode, and tears down cleanly on signOut() via stopSync().
export function startSync() {
  if (started) return;
  if (isGuest()) return;
  if (!getSession()) return;
  started = true;
  // First pull: hydrate from server, then push so a fresh signup persists.
  void (async () => {
    await pullOnce();
    schedulePush(800);
  })();
  // Push on every local mutation, debounced. Skip if we're currently
  // applying a remote pull (otherwise we'd echo the row right back).
  stopSubscription = subscribeState(() => { if (started && !applyingRemote) schedulePush(); });
  // Light polling so a write from another device shows up here within a minute.
  pollTimer = window.setInterval(() => { void pullOnce(); }, 60_000);
}
export function stopSync() {
  started = false;
  if (stopSubscription) { stopSubscription(); stopSubscription = null; }
  if (pollTimer != null) { window.clearInterval(pollTimer); pollTimer = null; }
  if (pushTimer != null) { window.clearTimeout(pushTimer); pushTimer = null; }
  setStatus("off");
}
