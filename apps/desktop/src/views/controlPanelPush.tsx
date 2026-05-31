// Real-time push layer for the Control Panel. Two paths:
//
//  1. TRUE PUSH — for services that expose a streaming protocol:
//       * Home Assistant: WebSocket /api/websocket → subscribe_events("state_changed")
//       * Portainer: Docker /events endpoint, since/until window
//     onChange fires (debounced) whenever an event lands; the shell re-pulls.
//
//  2. ADAPTIVE HOT-POLL — for HTTP-only services (Vercel, GitHub Actions,
//     n8n, Proxmox, Hostinger, Cloudflare). The shell hands us the set of
//     "hot" row IDs (anything in a transitioning state — building, queued,
//     restarting, in_progress, …). While that set is non-empty we re-pull
//     every few seconds; when it empties out we go silent and let the
//     normal 20-s auto-refresh take over.
//
// One subscribe() per service. Returns a handle the shell tears down on
// service-collapse or unmount.

import type { Cred } from "./controlPanelAdapters";

export type PushKind = "ws" | "hot-poll" | "none";

export type PushHandle = {
  kind: PushKind;
  // The shell calls labelFn() each render to show the current state in the
  // panel header ("PUSH · live", "PUSH · hot (2)", "POLL · 20s", …).
  labelFn: () => string;
  close: () => void;
};

export type PushAPI = {
  subscribe?: (cred: Cred, onChange: () => void, getHot: () => Set<string>) => Promise<PushHandle>;
};

// ── Home Assistant: real WebSocket push on state_changed ────────────────────
const homeassistant: PushAPI = {
  async subscribe(cred, onChange) {
    if (!cred.baseUrl) return noop("no base URL");
    const url = cred.baseUrl.replace(/^http/, "ws").replace(/\/+$/, "") + "/api/websocket";
    let ws: WebSocket | null = null;
    let cancelled = false;
    let id = 1;
    let lastEvent = 0;
    let debounce: ReturnType<typeof setTimeout> | null = null;

    function trigger() {
      lastEvent = Date.now();
      if (debounce) return;
      debounce = setTimeout(() => { debounce = null; onChange(); }, 1500);
    }
    function connect() {
      try { ws = new WebSocket(url); } catch { return; }
      ws.onmessage = (ev) => {
        try {
          const m = JSON.parse(String(ev.data));
          if (m.type === "auth_required") ws?.send(JSON.stringify({ type: "auth", access_token: cred.token }));
          else if (m.type === "auth_ok") ws?.send(JSON.stringify({ id: id++, type: "subscribe_events", event_type: "state_changed" }));
          else if (m.type === "event") trigger();
        } catch { /* ignore */ }
      };
      ws.onclose = () => { if (!cancelled) setTimeout(connect, 2500); };
      ws.onerror = () => { try { ws?.close(); } catch { /* ignore */ } };
    }
    connect();

    return {
      kind: "ws",
      labelFn: () => (Date.now() - lastEvent < 5000 ? "PUSH · live" : "PUSH · idle"),
      close: () => { cancelled = true; if (debounce) clearTimeout(debounce); try { ws?.close(); } catch { /* ignore */ } },
    };
  },
};

// ── Portainer: Docker /events with a sliding since/until window ─────────────
const portainer: PushAPI = {
  async subscribe(cred, onChange) {
    if (!cred.baseUrl) return noop("no base URL");
    let cancelled = false;
    let lastEvent = 0;
    let debounce: ReturnType<typeof setTimeout> | null = null;

    function trigger() {
      lastEvent = Date.now();
      if (debounce) return;
      debounce = setTimeout(() => { debounce = null; onChange(); }, 1200);
    }

    void (async () => {
      const epR = await window.hub.net({
        method: "GET",
        url: `${cred.baseUrl.replace(/\/+$/, "")}/api/endpoints`,
        headers: { "X-API-Key": cred.token },
      });
      const endpoints = Array.isArray(epR.data) ? (epR.data as { Id: number }[]) : [];
      let since = Math.floor(Date.now() / 1000);
      while (!cancelled) {
        for (const ep of endpoints) {
          try {
            const until = Math.floor(Date.now() / 1000);
            const r = await window.hub.net({
              method: "GET",
              url: `${cred.baseUrl.replace(/\/+$/, "")}/api/endpoints/${ep.Id}/docker/events?since=${since}&until=${until}`,
              headers: { "X-API-Key": cred.token },
            });
            const hadEvents =
              (Array.isArray(r.data) && r.data.length > 0) ||
              (typeof r.data === "string" && r.data.trim().length > 0);
            if (r.ok && hadEvents) trigger();
          } catch { /* ignore */ }
        }
        since = Math.floor(Date.now() / 1000);
        await new Promise((r) => setTimeout(r, 3000));
      }
    })();

    return {
      kind: "ws",
      labelFn: () => (Date.now() - lastEvent < 5000 ? "PUSH · docker events · live" : "PUSH · docker events"),
      close: () => { cancelled = true; if (debounce) clearTimeout(debounce); },
    };
  },
};

// ── Adaptive hot-poll for HTTP-only services ────────────────────────────────
function hotPoll(intervalMs: number): PushAPI {
  return {
    async subscribe(_cred, onChange, getHot) {
      let cancelled = false;
      let lastHotSize = 0;
      const t = setInterval(() => {
        if (cancelled) return;
        const hot = getHot();
        lastHotSize = hot.size;
        if (hot.size > 0) onChange();
      }, intervalMs);
      return {
        kind: "hot-poll",
        labelFn: () => (lastHotSize > 0 ? `PUSH · hot (${lastHotSize}) · ${Math.round(intervalMs / 1000)}s` : "POLL · 20s · idle"),
        close: () => { cancelled = true; clearInterval(t); },
      };
    },
  };
}

function noop(label: string): PushHandle {
  return { kind: "none", labelFn: () => label, close: () => undefined };
}

export const PUSH_APIS: Record<string, PushAPI> = {
  homeassistant,
  portainer,
  vercel:    hotPoll(3000),
  github:    hotPoll(5000),
  n8n:       hotPoll(3000),
  proxmox:   hotPoll(4000),
  hostinger: hotPoll(4000),
  cloudflare: hotPoll(5000),
};

// Decide whether a freshly-pulled row is "hot" (still transitioning) so the
// shell can include it in getHot(). Per-service heuristic over the row's
// rendered cell strings; conservative on purpose so idle services don't
// keep firing the hot-poll loop.
export function detectHotRows(serviceId: string, rows: { id: string; cells: unknown[] }[]): Set<string> {
  const hot = new Set<string>();
  for (const r of rows) {
    const cellsStr = r.cells.map((c) => (typeof c === "string" ? c.toLowerCase() : "")).join("|");
    if (serviceId === "vercel") {
      if (/\b(building|queued|initializing)\b/.test(cellsStr)) hot.add(r.id);
    } else if (serviceId === "github") {
      if (/\b(in_progress|queued|requested|waiting)\b/.test(cellsStr)) hot.add(r.id);
    } else if (serviceId === "n8n") {
      if (/\brunning\b/.test(cellsStr)) hot.add(r.id);
    } else if (serviceId === "proxmox") {
      if (/\b(stopping|starting|migrating)\b/.test(cellsStr)) hot.add(r.id);
    } else if (serviceId === "hostinger") {
      if (/\b(restarting|starting|stopping|installing|migrating)\b/.test(cellsStr)) hot.add(r.id);
    }
  }
  return hot;
}
