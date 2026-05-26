// HALOS realtime collaboration cloud — talks to the Supabase REST API
// (PostgREST) with the app's anon key (or the signed-in user's token), via the
// CORS-free main-process fetch. Shared tables: hub_messages (chat),
// hub_data (projects/workspace/docs key-value), hub_signals (WebRTC).
import { loadCfg, getSession } from "../auth/supabase";

export function cloudConfigured(): boolean {
  const c = loadCfg();
  return !!(c.url && c.anon);
}
export function whoAmI(): string {
  return getSession()?.email || "Agent";
}

async function rest(
  path: string,
  opts: { method?: string; body?: unknown; prefer?: string } = {}
): Promise<{ ok: boolean; data?: unknown }> {
  const c = loadCfg();
  const r = await window.hub.net({
    method: opts.method || "GET",
    url: `${c.url.replace(/\/$/, "")}/rest/v1/${path}`,
    headers: {
      apikey: c.anon,
      Authorization: `Bearer ${getSession()?.token || c.anon}`,
      "Content-Type": "application/json",
      ...(opts.prefer ? { Prefer: opts.prefer } : {}),
    },
    body: opts.body,
  });
  return { ok: r.ok, data: r.data };
}

export type ChatMsg = { id: string; channel: string; author: string; body: string; created_at: string };

export async function fetchMessages(channel: string): Promise<ChatMsg[]> {
  const r = await rest(`hub_messages?channel=eq.${encodeURIComponent(channel)}&order=created_at.asc&limit=200`);
  return r.ok && Array.isArray(r.data) ? (r.data as ChatMsg[]) : [];
}
export async function sendMessage(channel: string, author: string, body: string): Promise<void> {
  await rest("hub_messages", { method: "POST", body: { channel, author, body } });
}

export async function getData<T>(key: string, fallback: T): Promise<T> {
  const r = await rest(`hub_data?key=eq.${encodeURIComponent(key)}&select=value`);
  const row = Array.isArray(r.data) ? (r.data[0] as { value?: T } | undefined) : undefined;
  return row && row.value !== undefined ? row.value : fallback;
}
export async function setData(key: string, value: unknown): Promise<void> {
  await rest("hub_data", {
    method: "POST",
    prefer: "resolution=merge-duplicates",
    body: { key, value, updated_at: new Date().toISOString() },
  });
}

// --- WebRTC signaling for Meet ---
export async function sendSignal(room: string, sender: string, recipient: string | null, payload: unknown): Promise<void> {
  await rest("hub_signals", { method: "POST", body: { room, sender, recipient, payload } });
}
export async function fetchSignals(room: string, sinceISO: string): Promise<{ sender: string; payload: unknown; created_at: string }[]> {
  const r = await rest(`hub_signals?room=eq.${encodeURIComponent(room)}&created_at=gt.${encodeURIComponent(sinceISO)}&order=created_at.asc&limit=100`);
  return r.ok && Array.isArray(r.data) ? (r.data as { sender: string; payload: unknown; created_at: string }[]) : [];
}
