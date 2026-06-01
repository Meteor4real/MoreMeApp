// Ambient notifier — what used to live in the on-screen FloatingInfo widgets
// now arrives as proper toast notifications + ticker items via the unified
// feed. Each source is polled on its own cadence and a change (not the
// current state) emits an event. Idle states don't spam; only real activity.
//
// Wires into useFeed via the cpFeedItems-style pattern (pushAmbient + a
// subscriber that useFeed re-ticks on). Notifications respect Settings →
// Notifications → enabled.

import type { FeedItem } from "../feeds";

type AmbientEvent = {
  id: string;
  source: string;
  text: string;
  ts: number;
  kind: FeedItem["kind"];
};

const EVENTS: AmbientEvent[] = [];
const MAX = 60;
const subs = new Set<() => void>();

function push(source: string, text: string, kind: FeedItem["kind"] = "ticker"): void {
  const id = `amb-${source}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  EVENTS.unshift({ id, source, text, ts: Date.now(), kind });
  if (EVENTS.length > MAX) EVENTS.length = MAX;
  subs.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
}

export function subscribeAmbient(fn: () => void): () => void { subs.add(fn); return () => subs.delete(fn); }

export function ambientFeedItems(): FeedItem[] {
  const cutoff = Date.now() - 30 * 60 * 1000;
  return EVENTS.filter((e) => e.ts >= cutoff).slice(0, 8).map((e) => ({ id: e.id, source: e.source, text: e.text, kind: e.kind }));
}

// Last-seen state per source so we only emit on *changes*. Pulse only emits
// when a threshold is crossed, MoreMe only on completed-item count change,
// etc. — this is the whole point: no noise, just real activity.
type SysState = { cpuHigh: boolean; memHigh: boolean };
let sysSt: SysState = { cpuHigh: false, memHigh: false };

let lastMoreMeDone = -1;
let lastBroBotCount = -1;
let lastGithubPrs = -1;
let lastVercelState = "";
let lastOriginOnline: number | null = null;
let started = false;

export function startAmbientNotifier(): void {
  if (started) return;
  started = true;

  // System pulse — only ping when CPU/MEM cross 85%, and again when they
  // drop back under 70% (hysteresis stops a flapping ping). No noise when
  // everything is calm.
  setInterval(async () => {
    try {
      const s = await window.hub.sys.pulse();
      const cpuHigh = s.cpuPct > 85;
      const memHigh = s.memPct > 85;
      if (cpuHigh && !sysSt.cpuHigh) push("System", `CPU spiked to ${s.cpuPct}%`, "system");
      else if (!cpuHigh && sysSt.cpuHigh && s.cpuPct < 70) push("System", `CPU calmed (${s.cpuPct}%)`);
      if (memHigh && !sysSt.memHigh) push("System", `Memory at ${s.memPct}% (${s.memFreeGb.toFixed(1)} GB free)`, "system");
      else if (!memHigh && sysSt.memHigh && s.memPct < 70) push("System", `Memory pressure eased (${s.memPct}%)`);
      sysSt = { cpuHigh, memHigh };
    } catch { /* ignore */ }
  }, 10000);

  // MoreMe progress — emit when items get completed today.
  setInterval(() => {
    try {
      const raw = localStorage.getItem("moreme.v1");
      if (!raw) return;
      const m = JSON.parse(raw) as { streak?: number; days?: Record<string, { items?: { done?: boolean }[] }> };
      const today = new Date().toISOString().slice(0, 10);
      const items = m.days?.[today]?.items || [];
      const done = items.filter((x) => x.done).length;
      if (lastMoreMeDone === -1) { lastMoreMeDone = done; return; }
      if (done > lastMoreMeDone) {
        const total = items.length;
        push("More Me", done === total ? `Day complete — ${m.streak || 0}-day streak` : `Knocked one out · ${done}/${total} today`);
        lastMoreMeDone = done;
      } else if (done < lastMoreMeDone) {
        lastMoreMeDone = done; // rollback / new day
      }
    } catch { /* ignore */ }
  }, 15000);

  // BroBot gallery — fires when a new image lands.
  setInterval(() => {
    try {
      const raw = localStorage.getItem("brobot.gallery.v1");
      if (!raw) return;
      const g = JSON.parse(raw) as { items?: { title?: string; addedAt?: number }[] };
      const items = g.items || [];
      if (lastBroBotCount === -1) { lastBroBotCount = items.length; return; }
      if (items.length > lastBroBotCount) {
        const newest = [...items].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))[0];
        push("BroBot", newest?.title ? `Added: ${newest.title}` : `${items.length - lastBroBotCount} new in gallery`);
        lastBroBotCount = items.length;
      } else if (items.length < lastBroBotCount) {
        lastBroBotCount = items.length;
      }
    } catch { /* ignore */ }
  }, 20000);

  // GitHub PRs — pings on PR-count change.
  setInterval(async () => {
    try {
      const v = await window.hub.vault.get("github");
      if (!v.token) return;
      const r = await window.hub.net({
        method: "GET",
        url: "https://api.github.com/search/issues?per_page=10&q=" + encodeURIComponent("is:open is:pr author:@me"),
        headers: { Authorization: `Bearer ${v.token}`, Accept: "application/vnd.github+json", "User-Agent": "NetworkChuckHub" },
      });
      const j = r.data as { items?: { title: string }[] } | null;
      const prs = (j?.items || []).length;
      if (lastGithubPrs === -1) { lastGithubPrs = prs; return; }
      if (prs !== lastGithubPrs) {
        const delta = prs - lastGithubPrs;
        push("GitHub", delta > 0 ? `+${delta} open PR${delta === 1 ? "" : "s"} (now ${prs})` : `${Math.abs(delta)} PR${delta === -1 ? "" : "s"} closed (now ${prs})`);
        lastGithubPrs = prs;
      }
    } catch { /* ignore */ }
  }, 5 * 60 * 1000);

  // Vercel — pings on deploy-state change.
  setInterval(async () => {
    try {
      const v = await window.hub.vault.get("vercel");
      if (!v.token) return;
      const r = await window.hub.net({
        method: "GET",
        url: "https://api.vercel.com/v6/deployments?limit=1",
        headers: { Authorization: `Bearer ${v.token}` },
      });
      const j = r.data as { deployments?: { name: string; state?: string; readyState?: string }[] } | null;
      const d = j?.deployments?.[0]; if (!d) return;
      const state = (d.state || d.readyState || "").toLowerCase();
      if (lastVercelState && state !== lastVercelState) {
        push("Vercel", `${d.name} → ${state}`, state === "error" ? "system" : "ticker");
      }
      lastVercelState = state;
    } catch { /* ignore */ }
  }, 2 * 60 * 1000);

  // Origin Realms — server-state changes only.
  setInterval(async () => {
    try {
      const r = await window.hub.net({ method: "GET", url: "https://api.mcstatus.io/v2/status/java/play.originrealms.com" });
      const j = r.data as { online?: boolean; players?: { online?: number; max?: number } } | null;
      if (!j) return;
      const online = j.online ? (j.players?.online ?? 0) : -1;
      if (lastOriginOnline === null) { lastOriginOnline = online; return; }
      if (online === -1 && lastOriginOnline !== -1) push("Origin Realms", "Server went offline", "system");
      else if (online !== -1 && lastOriginOnline === -1) push("Origin Realms", `Back online — ${online} players`);
      lastOriginOnline = online;
    } catch { /* ignore */ }
  }, 90000);
}
