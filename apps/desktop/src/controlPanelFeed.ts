// Control Panel event + live-state store. The Control Panel pushes events
// here (push fires, pull errors, action results); the unified feed surfaces
// them as ticker lines + toast notifications, and the AI tools query the
// live state so agents can answer "what's deploying?" without scraping HTML.

import type { FeedItem } from "./feeds";

export type CpSeverity = "info" | "warn" | "error";
export type CpEvent = { id: string; ts: number; service: string; text: string; severity: CpSeverity };

const EVENTS: CpEvent[] = [];
const MAX_EVENTS = 80;
const subs = new Set<() => void>();

export function subscribeCpEvents(fn: () => void): () => void {
  subs.add(fn); return () => subs.delete(fn);
}

export function pushCpEvent(service: string, text: string, severity: CpSeverity = "info"): void {
  const id = `cp-${service}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  EVENTS.unshift({ id, ts: Date.now(), service, text, severity });
  if (EVENTS.length > MAX_EVENTS) EVENTS.length = MAX_EVENTS;
  subs.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
}

export function cpRecentEvents(limit = 12): CpEvent[] {
  return EVENTS.slice(0, limit);
}

// Feed items for the unified ticker. Only recent events (last 30 min), most
// recent first, capped to a handful so they don't dominate the wire.
export function cpFeedItems(): FeedItem[] {
  const cutoff = Date.now() - 30 * 60 * 1000;
  return EVENTS
    .filter((e) => e.ts >= cutoff)
    .slice(0, 5)
    .map((e) => ({ id: e.id, source: `CP · ${e.service}`, text: e.text, kind: e.severity === "error" ? "system" : "ticker" }));
}

// Live state snapshot — the Control Panel updates this whenever pullManage
// finishes. Read by AI tools so agents can answer status questions.
export type CpLiveSummary = {
  service: string;
  summary: string;
  error?: string;
  rowCount: number;
  groups: { title: string; rows: { id: string; cells: string[] }[] }[];
  pushKind?: "ws" | "hot-poll" | "none";
  hotRowCount: number;
};

let LIVE: CpLiveSummary[] = [];
export function setCpLiveSummaries(list: CpLiveSummary[]): void { LIVE = list; }
export function cpLiveSummaries(): CpLiveSummary[] { return LIVE.slice(); }
