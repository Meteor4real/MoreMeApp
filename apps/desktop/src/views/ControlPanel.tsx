import { useEffect, useRef, useState } from "react";
import { ADAPTERS, type ManageGroup, type ManageResult, type ManageRow, type RowAction } from "./controlPanelAdapters";
import { PUSH_APIS, detectHotRows, type PushHandle } from "./controlPanelPush";
import { docsConnected, setConnected as setDocsConnected, subscribeDocs } from "../embedded/documents/docsStore";
import { pushCpEvent, setCpLiveSummaries, type CpLiveSummary } from "../controlPanelFeed";

// The Control Panel, reimplemented natively in-app (Option 2). Each user
// connects THEIR OWN services here; tokens are stored in the OS-keychain vault
// (main process), never bundled or committed.
//
//   Connect — the cards. Connect / edit / disconnect, plus a per-card "Test"
//     button that round-trips the stored token against the real API.
//   Manage — live, auto-refreshing stat board. Every connected service with
//     an adapter renders a collapsible panel: summary, drill-down rows, and
//     real write actions (redeploy, purge, toggle, restart, start/stop, …).

type Service = {
  id: string;
  name: string;
  group: string;
  tokenLabel?: string;
  needsBaseUrl?: boolean;
  console?: string;
  hint: string;
  launcher?: "modrinth" | "blockbench";
  noAuth?: boolean;
};

const SERVICES: Service[] = [
  { id: "github", name: "GitHub", group: "Dev & Deploy", tokenLabel: "Personal access token", console: "https://github.com/settings/tokens", hint: "repos, PRs, Actions" },
  { id: "vercel", name: "Vercel", group: "Dev & Deploy", tokenLabel: "API token", console: "https://vercel.com/account/tokens", hint: "deployments, env vars, redeploy" },
  { id: "supabase", name: "Supabase", group: "Dev & Deploy", tokenLabel: "Access token", console: "https://supabase.com/dashboard/account/tokens", hint: "projects, status" },
  { id: "cloudflare", name: "Cloudflare", group: "Networking", tokenLabel: "API token", console: "https://dash.cloudflare.com/profile/api-tokens", hint: "zones, DNS, cache" },
  { id: "tailscale", name: "Tailscale", group: "Networking", tokenLabel: "API key", console: "https://login.tailscale.com/admin/settings/keys", hint: "devices / tailnet" },
  { id: "twingate", name: "Twingate", group: "Networking", tokenLabel: "API key", needsBaseUrl: true, hint: "zero-trust resources" },
  { id: "n8n", name: "n8n", group: "Automation", tokenLabel: "API key", needsBaseUrl: true, hint: "workflows & executions" },
  { id: "youtube", name: "YouTube", group: "Content", tokenLabel: "Data API key", console: "https://console.cloud.google.com/apis/credentials", hint: "trending / key health" },
  { id: "homeassistant", name: "Home Assistant", group: "Homelab", tokenLabel: "Long-lived token", needsBaseUrl: true, hint: "entities, scenes, toggle" },
  { id: "proxmox", name: "Proxmox", group: "Homelab", tokenLabel: "API token (user@realm!id=secret)", needsBaseUrl: true, hint: "nodes / VMs" },
  { id: "portainer", name: "Portainer", group: "Homelab", tokenLabel: "API key", needsBaseUrl: true, hint: "containers & stacks" },
  { id: "pihole", name: "Pi-hole", group: "Homelab", tokenLabel: "API token", needsBaseUrl: true, hint: "DNS & blocklists" },
  { id: "frigate", name: "Frigate", group: "Homelab", tokenLabel: "(base URL only)", needsBaseUrl: true, hint: "cameras & detections" },
  { id: "zimacube", name: "ZimaCube", group: "Homelab", tokenLabel: "SSH host/token", needsBaseUrl: true, hint: "managed over SSH" },
  { id: "hermes", name: "Hermes", group: "AI & Hosting", tokenLabel: "Bearer (optional)", needsBaseUrl: true, hint: "co-boss AI — models" },
  { id: "hostinger", name: "Hostinger", group: "AI & Hosting", tokenLabel: "API token", hint: "VPS inventory & power" },
  { id: "pexels", name: "Pexels", group: "Media", tokenLabel: "API key", console: "https://www.pexels.com/api/new/", hint: "NT5 Studio B-roll source" },
  { id: "googledocs", name: "Google Docs", group: "Content", tokenLabel: "", hint: "powers the Documents tab — sign in inside the app", noAuth: true },
  { id: "steam", name: "Steam", group: "Games", tokenLabel: "Web API key", needsBaseUrl: true, console: "https://steamcommunity.com/dev/apikey", hint: "Library playtime + achievements + dev news (paste your SteamID64 in the base URL)" },
  { id: "modrinth", name: "Modrinth", group: "Local Apps", launcher: "modrinth", noAuth: true, hint: "launch the Modrinth client", tokenLabel: "" },
  { id: "blockbench", name: "Blockbench", group: "Local Apps", launcher: "blockbench", noAuth: true, hint: "launch Blockbench", tokenLabel: "" },
];

type Status = { service: string; hasToken: boolean; baseUrl: string };
type TestState = "testing" | { ok: boolean; detail: string };
type DotToken = { __dot: string };

export function ControlPanel() {
  // Manage IS the point of this thing — start there whenever anything's
  // connected. First-time users land on Connect.
  const [tab, setTab] = useState<"connect" | "manage">(() => {
    try { return localStorage.getItem("nchub.cp.tab") as "connect" | "manage" || "manage"; } catch { return "manage"; }
  });
  function pickTab(t: "connect" | "manage") { setTab(t); try { localStorage.setItem("nchub.cp.tab", t); } catch { /* ignore */ } }
  const [status, setStatus] = useState<Status[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [tests, setTests] = useState<Record<string, TestState>>({});

  const [live, setLive] = useState<Record<string, ManageResult | "loading">>({});
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [rowExpand, setRowExpand] = useState<Record<string, ManageGroup[] | "loading">>({});
  const [rowPrompt, setRowPrompt] = useState<{ key: string; action: RowAction; value: string } | null>(null);
  const [actMsg, setActMsg] = useState<string | null>(null);

  const [autoRefresh, setAutoRefresh] = useState(true);
  const REFRESH_SEC = 20;
  const [countdown, setCountdown] = useState(REFRESH_SEC);
  const pullRef = useRef<(serviceId?: string) => void>(() => {});

  // Push subscriptions keyed by service id. Opened when the service first
  // shows up in the Manage tab, torn down on tab leave.
  const pushHandlesRef = useRef<Record<string, PushHandle>>({});
  const hotRowsRef = useRef<Record<string, Set<string>>>({});
  const [, setPushTick] = useState(0); // forces re-render so labelFn() refreshes

  async function refresh() { setStatus(await window.hub.vault.list()); }
  useEffect(() => { void refresh(); }, []);

  // First-load nudge: if the saved tab was "manage" but nothing is actually
  // connected, flip the user to Connect so the panel isn't an empty room.
  const flippedOnceRef = useRef(false);
  useEffect(() => {
    if (flippedOnceRef.current || status.length === 0) return;
    flippedOnceRef.current = true;
    const anyConnected = SERVICES.some((s) => !s.noAuth && status.find((x) => x.service === s.id && (s.needsBaseUrl ? !!x.baseUrl : x.hasToken)));
    if (!anyConnected && tab === "manage") pickTab("connect");
  }, [status]);

  function isConnected(id: string) {
    const svc = SERVICES.find((x) => x.id === id);
    if (!svc) return false;
    if (svc.noAuth) return true;
    const s = status.find((x) => x.service === id);
    if (!s) return false;
    return svc.needsBaseUrl ? !!s.baseUrl : s.hasToken;
  }

  async function openEdit(id: string) {
    const cur = await window.hub.vault.get(id);
    setToken(cur.token); setBaseUrl(cur.baseUrl); setEditing(id);
  }
  async function saveEdit(id: string) {
    await window.hub.vault.set(id, token, baseUrl);
    setEditing(null); setToken(""); setBaseUrl("");
    void refresh();
  }
  async function disconnect(id: string) { await window.hub.vault.remove(id); void refresh(); }

  async function testService(id: string) {
    const adapter = ADAPTERS[id];
    if (!adapter?.test) return;
    setTests((t) => ({ ...t, [id]: "testing" }));
    try {
      const cred = await window.hub.vault.get(id);
      const r = await adapter.test(cred);
      setTests((t) => ({ ...t, [id]: r }));
    } catch (e) {
      setTests((t) => ({ ...t, [id]: { ok: false, detail: String(e) } }));
    }
  }

  // Pull live data for every connected service that has an adapter, in parallel.
  // If serviceId is passed, pull only that one (used by push subscriptions).
  async function pullManage(showLoading = true, serviceId?: string) {
    const connected = SERVICES.filter((s) => isConnected(s.id) && ADAPTERS[s.id]?.pull && (!serviceId || s.id === serviceId));
    if (showLoading) setLive((l) => { const n = { ...l }; for (const s of connected) if (!n[s.id]) n[s.id] = "loading"; return n; });
    await Promise.all(connected.map(async (s) => {
      try {
        const cred = await window.hub.vault.get(s.id);
        const res = await ADAPTERS[s.id].pull!(cred);
        setLive((l) => ({ ...l, [s.id]: res }));
        // Recompute hot rows for the push layer. Capture which row IDs are
        // newly hot so we can notify exactly once per arrival.
        const allRows: { id: string; cells: unknown[] }[] = [];
        for (const g of res.groups) for (const r of g.rows) allRows.push({ id: r.id, cells: r.cells });
        const prev = hotRowsRef.current[s.id] || new Set<string>();
        const next = detectHotRows(s.id, allRows);
        hotRowsRef.current[s.id] = next;
        const fresh = [...next].filter((id) => !prev.has(id));
        if (fresh.length && prev.size > 0) {
          pushCpEvent(s.name, `${fresh.length} hot row${fresh.length === 1 ? "" : "s"} · ${res.summary}`, "info");
        }
      } catch (e) {
        const msg = String(e);
        setLive((l) => ({ ...l, [s.id]: { summary: "", groups: [], error: msg } }));
        pushCpEvent(s.name, `pull failed — ${msg.slice(0, 120)}`, "error");
      }
    }));
    if (!serviceId) setCountdown(REFRESH_SEC);
    // Publish a flat live-state snapshot for AI tools.
    setLive((l) => {
      const summaries: CpLiveSummary[] = SERVICES.filter((s) => isConnected(s.id)).map((s) => {
        const r = l[s.id];
        const handle = pushHandlesRef.current[s.id];
        if (!r || r === "loading") return { service: s.name, summary: "loading", rowCount: 0, groups: [], pushKind: handle?.kind, hotRowCount: hotRowsRef.current[s.id]?.size || 0 };
        if (r.error) return { service: s.name, summary: "", error: r.error, rowCount: 0, groups: [], pushKind: handle?.kind, hotRowCount: hotRowsRef.current[s.id]?.size || 0 };
        return {
          service: s.name, summary: r.summary,
          rowCount: r.groups.reduce((n, g) => n + g.rows.length, 0),
          groups: r.groups.map((g) => ({ title: g.title, rows: g.rows.slice(0, 12).map((rw) => ({ id: rw.id, cells: rw.cells.map((c) => typeof c === "string" || typeof c === "number" ? String(c) : (c && typeof c === "object" && "__dot" in (c as object)) ? "•" : "") })) })),
          pushKind: handle?.kind,
          hotRowCount: hotRowsRef.current[s.id]?.size || 0,
        };
      });
      setCpLiveSummaries(summaries);
      return l;
    });
  }
  pullRef.current = (serviceId?: string) => void pullManage(false, serviceId);

  // Open / close push subscriptions per service as the tab and connected
  // state change. Each subscription pulls only its own service when it
  // fires, so a flurry of HA events doesn't repull everything.
  useEffect(() => {
    if (tab !== "manage") {
      for (const id in pushHandlesRef.current) { try { pushHandlesRef.current[id].close(); } catch { /* ignore */ } }
      pushHandlesRef.current = {};
      return;
    }
    let cancelled = false;
    (async () => {
      for (const s of SERVICES) {
        if (cancelled) return;
        if (!isConnected(s.id)) continue;
        const api = PUSH_APIS[s.id];
        if (!api?.subscribe || pushHandlesRef.current[s.id]) continue;
        try {
          const cred = await window.hub.vault.get(s.id);
          const handle = await api.subscribe(
            cred,
            () => { pullRef.current(s.id); setPushTick((n) => n + 1); },
            () => hotRowsRef.current[s.id] || new Set<string>(),
          );
          pushHandlesRef.current[s.id] = handle;
        } catch { /* ignore — push is best-effort */ }
      }
    })();
    // Tick once a second so labelFn() (which is time-dependent for HA / Portainer)
    // updates in the panel header.
    const labelTick = setInterval(() => setPushTick((n) => n + 1), 1000);
    return () => {
      cancelled = true;
      clearInterval(labelTick);
      for (const id in pushHandlesRef.current) { try { pushHandlesRef.current[id].close(); } catch { /* ignore */ } }
      pushHandlesRef.current = {};
    };
  }, [tab, status]);

  useEffect(() => { if (tab === "manage" && Object.keys(live).length === 0) void pullManage(); }, [tab, status]);

  // Auto-refresh loop + 1-second countdown. Surfaces building→ready style
  // transitions without the user touching anything.
  useEffect(() => {
    if (tab !== "manage" || !autoRefresh) return;
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { pullRef.current(); return REFRESH_SEC; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [tab, autoRefresh]);

  async function runAction(a: RowAction, serviceId: string, rowKey?: string) {
    if (a.prompt && a.runWith && rowKey) {
      setRowPrompt({ key: rowKey, action: a, value: a.prompt.initial || "" });
      return;
    }
    if (!a.run) return;
    const svcName = SERVICES.find((s) => s.id === serviceId)?.name || serviceId;
    setActMsg("…");
    try {
      const msg = await a.run();
      setActMsg(msg);
      pushCpEvent(svcName, `${a.label}: ${msg}`.slice(0, 200), "info");
    } catch (e) { setActMsg(String(e)); pushCpEvent(svcName, `${a.label} failed — ${String(e).slice(0, 120)}`, "error"); }
    // Re-pull just this service so the row reflects the new state.
    try {
      const cred = await window.hub.vault.get(serviceId);
      const res = await ADAPTERS[serviceId].pull?.(cred);
      if (res) setLive((l) => ({ ...l, [serviceId]: res }));
    } catch { /* ignore */ }
  }
  async function submitRowPrompt() {
    if (!rowPrompt || !rowPrompt.action.runWith) return;
    setActMsg("…");
    try {
      const msg = await rowPrompt.action.runWith(rowPrompt.value);
      setActMsg(msg);
    } catch (e) { setActMsg(String(e)); }
    const serviceId = rowPrompt.key.split(":")[0];
    setRowPrompt(null);
    try {
      const cred = await window.hub.vault.get(serviceId);
      const res = await ADAPTERS[serviceId].pull?.(cred);
      if (res) setLive((l) => ({ ...l, [serviceId]: res }));
    } catch { /* ignore */ }
  }

  async function toggleRow(key: string, row: ManageRow) {
    if (!row.expand) return;
    if (rowExpand[key]) { setRowExpand((r) => { const n = { ...r }; delete n[key]; return n; }); return; }
    setRowExpand((r) => ({ ...r, [key]: "loading" }));
    try { const groups = await row.expand(); setRowExpand((r) => ({ ...r, [key]: groups })); }
    catch (e) { setRowExpand((r) => ({ ...r, [key]: [{ title: "error", columns: ["detail"], rows: [{ id: "e", cells: [String(e)] }] }] })); }
  }

  const connected = SERVICES.filter((s) => !s.noAuth && isConnected(s.id)).length;
  const connectableCount = SERVICES.filter((s) => !s.noAuth).length;
  const groups = Array.from(new Set(SERVICES.map((s) => s.group)));
  const liveServices = SERVICES.filter((s) => isConnected(s.id) && ADAPTERS[s.id]?.pull);

  // Roll-up stats for the techy stat strip.
  const liveCells = Object.values(live).reduce((n, r) => n + (r !== "loading" && r !== undefined && !r.error ? r.groups.reduce((m, g) => m + g.rows.length, 0) : 0), 0);
  const errorCount = Object.values(live).filter((r) => r !== "loading" && r !== undefined && r.error).length;
  const pushCount = Object.keys(pushHandlesRef.current).length;
  const hotCount = Object.values(hotRowsRef.current).reduce((n, s) => n + s.size, 0);

  return (
    <div className="stage">
      <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
          <span className="glow-text" style={{ fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: 3, color: "var(--pink)" }}>CONTROL PANEL</span>
          <span className="mono" style={{ fontSize: 10, letterSpacing: 2, color: "var(--mute)", textTransform: "uppercase" }}>Run your services from here · not the dashboards</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 6 }} data-tour="cp-tabs">
          {(["manage", "connect"] as const).map((t) => (
            <button key={t} className={"cp-pill" + (tab === t ? " active" : "")} onClick={() => pickTab(t)}>
              <span>{t === "manage" ? "◆ Manage" : "◇ Connect"}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "10px 16px 4px", borderBottom: "1px solid var(--line)" }}>
        <div className="cp-grid-stats">
          <StatTile label="Connected" value={`${connected}/${connectableCount}`} color="#ff5577" sub="services with creds" />
          <StatTile label="Live cells" value={String(liveCells)} color="#22d3ee" sub="rows across the board" />
          <StatTile label="Push live" value={String(pushCount)} color={pushCount ? "#22c55e" : "#666"} sub={pushCount ? "real-time channels" : "polling only"} />
          <StatTile label="Hot rows" value={String(hotCount)} color={hotCount ? "#f59e0b" : "#666"} sub={hotCount ? "recent activity" : "all quiet"} />
          <StatTile label="Errors" value={String(errorCount)} color={errorCount ? "#ef4444" : "#22c55e"} sub={errorCount ? "service failing" : "everything good"} />
        </div>
      </div>

      {tab === "connect" ? (
        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          <p style={{ color: "var(--mute)", fontSize: 13, marginTop: 0, maxWidth: 680 }}>
            Connect your own services. Credentials are encrypted on this device via the OS
            keychain — never bundled, never committed, never sent anywhere except directly
            to that service. Hit <b style={{ color: "var(--ink)" }}>Test</b> to round-trip the token.
          </p>
          {groups.map((g) => (
            <div key={g} style={{ marginBottom: 18 }}>
              <div className="mono" style={{ fontSize: 11, letterSpacing: 2, color: "var(--ink)", textTransform: "uppercase", margin: "8px 0", display: "flex", alignItems: "center", gap: 10 }}>
                {g}<span style={{ flex: 1, height: 1, background: "var(--line)" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 12 }}>
                {SERVICES.filter((s) => s.group === g).map((s) => {
                  const on = isConnected(s.id);
                  const test = tests[s.id];
                  const statusColor = s.noAuth ? "#a78bfa" : on ? "#22c55e" : "#666";
                  return (
                    <div key={s.id} className={on && !s.noAuth ? "panel-hot panel" : "panel"}
                      style={{ padding: 12, position: "relative", borderColor: on && !s.noAuth ? "rgba(255,87,119,0.4)" : undefined, boxShadow: on && !s.noAuth ? "0 0 18px rgba(255,87,119,0.12)" : undefined, transition: "border-color .15s, box-shadow .15s" }}>
                      <span style={{ position: "absolute", left: 0, top: 8, bottom: 8, width: 3, background: statusColor, borderRadius: "0 3px 3px 0", boxShadow: `0 0 8px ${statusColor}` }} />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingLeft: 8 }}>
                        <span className="mono" style={{ fontSize: 14 }}>{s.name}</span>
                        <span className="mono" style={{ fontSize: 9, color: statusColor, letterSpacing: 1.5, padding: "2px 6px", border: `1px solid ${statusColor}55`, borderRadius: 4, textShadow: `0 0 6px ${statusColor}88` }}>
                          {s.noAuth ? "LAUNCHER" : on ? "● LIVE" : "○ OFF"}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--mute)", margin: "4px 0 10px", paddingLeft: 8 }}>{s.hint}</div>

                      <div style={{ paddingLeft: 8 }}>
                      {s.id === "googledocs" ? (
                        <GoogleDocsConnect />
                      ) : s.launcher ? (
                        <button className="btn" onClick={() => void window.hub.launchUri(s.launcher === "modrinth" ? "https://launcher.modrinth.com/" : "https://www.blockbench.net/launcher")}>Launch {s.name}</button>
                      ) : editing === s.id ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <input type="password" placeholder={s.tokenLabel} value={token} onChange={(e) => setToken(e.target.value)} style={inp} />
                          {s.needsBaseUrl && <input placeholder="base URL (https://…)" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} style={inp} />}
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="btn" onClick={() => void saveEdit(s.id)}>Save</button>
                            <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <button className="btn" onClick={() => void openEdit(s.id)}>{on ? "Edit" : "Connect"}</button>
                            {on && ADAPTERS[s.id]?.test && <button className="btn" onClick={() => void testService(s.id)}>Test</button>}
                            {on && <button className="btn" onClick={() => void disconnect(s.id)}>Disconnect</button>}
                            {s.console && <a className="btn" href={s.console} target="_blank" rel="noreferrer">Get token</a>}
                          </div>
                          {test && (
                            <div className="mono" style={{ fontSize: 11, marginTop: 8, color: test === "testing" ? "var(--mute)" : test.ok ? "#22c55e" : "#ef4444" }}>
                              {test === "testing" ? "testing…" : `${test.ok ? "✓" : "✕"} ${test.detail}`}
                            </div>
                          )}
                        </>
                      )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
            <p style={{ color: "var(--mute)", fontSize: 13, margin: 0, flex: 1, minWidth: 260, maxWidth: 560 }}>
              Live board across everything connected. Real actions — redeploy, promote, cancel, purge cache, toggle entities, start/stop VMs &amp; containers, restart VPS. Expand a row to drill in.
            </p>
            <button className="btn" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => setCollapsed(new Set(liveServices.map((s) => s.id)))}>Collapse all</button>
            <button className="btn" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => setCollapsed(new Set())}>Expand all</button>
            <label className="mono" style={{ fontSize: 11, color: "var(--mute)", display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
              auto-refresh
            </label>
            {autoRefresh && (
              <div className="cp-countdown" title={`next pull in ${countdown}s`}>
                <div className="cp-countdown-bar" style={{ width: `${Math.max(0, Math.min(100, (countdown / REFRESH_SEC) * 100))}%` }} />
              </div>
            )}
            <button className="btn" onClick={() => void pullManage()} style={{ borderColor: "rgba(255,87,119,0.55)", color: "var(--pink)", boxShadow: "0 0 12px rgba(255,87,119,0.25)" }}>◆ Refresh all</button>
          </div>

          {actMsg && (
            <div className="panel" style={{ padding: 8, marginBottom: 10, fontSize: 12, color: "var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{actMsg}</span>
              <button className="btn" style={{ padding: "2px 8px" }} onClick={() => setActMsg(null)}>dismiss</button>
            </div>
          )}

          {/* Always-on local pulse — system, downloads, browser activity.
              These work without ANY external service connected so the panel
              is useful on first launch, not an empty room. */}
          <LocalPulsePanel />

          {liveServices.length === 0 && (
            <div className="panel" style={{ padding: 14, color: "var(--mute)", borderColor: "rgba(34,211,238,0.3)", background: "rgba(34,211,238,0.04)", marginBottom: 14 }}>
              <div className="mono glow-text" style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4, color: "#22d3ee" }}>Want more here?</div>
              Hop to the <b style={{ color: "var(--ink)" }}>Connect</b> tab and plug in any of the services above. GitHub, Vercel, Cloudflare, Home Assistant, Steam, Hostinger, Tailscale, Proxmox, Portainer, n8n — each one lights up its own panel with live data and real action buttons here the moment its token's saved.
            </div>
          )}

          {liveServices.map((s) => {
            const result = live[s.id];
            const isCollapsed = collapsed.has(s.id);
            const errored = result && result !== "loading" && !!result.error;
            const loading = result === "loading" || result === undefined;
            const rowCount = result && result !== "loading" && !result.error ? result.groups.reduce((n, g) => n + g.rows.length, 0) : 0;
            const svcHot = (hotRowsRef.current[s.id]?.size || 0) > 0;
            return (
              <div key={s.id} className="cp-svc" style={errored ? { borderColor: "rgba(239,68,68,0.45)" } : svcHot ? { borderColor: "rgba(245,158,11,0.55)" } : undefined}>
                <div
                  className={"cp-svc-head" + (isCollapsed ? " collapsed" : "")}
                  onClick={() => setCollapsed((c) => { const n = new Set(c); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n; })}>
                  <span style={{ display: "inline-block", width: 12, color: "var(--mute)", textAlign: "center" }}>{isCollapsed ? "▸" : "▾"}</span>
                  <span className="cp-svc-name">{s.name}</span>
                  {!loading && !errored && rowCount > 0 && (
                    <span className="mono" style={{ fontSize: 10, color: "var(--mute)", padding: "2px 7px", border: "1px solid var(--line)", borderRadius: 4 }}>{rowCount} rows</span>
                  )}
                  <span style={{ flex: 1 }} />
                  {pushHandlesRef.current[s.id] && (
                    <span className="cp-push-badge" style={{
                        color: pushHandlesRef.current[s.id].kind === "ws" ? "#22d3ee" : "#f59e0b",
                        border: `1px solid ${pushHandlesRef.current[s.id].kind === "ws" ? "rgba(34,211,238,0.4)" : "rgba(245,158,11,0.4)"}` }}>
                      {pushHandlesRef.current[s.id].labelFn()}
                    </span>
                  )}
                  <span className="cp-svc-summary" style={errored ? { color: "#ef4444" } : undefined}>
                    {loading ? "loading…" : errored ? `error: ${result.error}` : result.summary}
                  </span>
                  <button className="cp-action" onClick={(e) => { e.stopPropagation(); void pullManage(false, s.id); }} title="Re-pull just this service">↻</button>
                </div>
                {!isCollapsed && result && result !== "loading" && !result.error && (
                  <div style={{ padding: 14 }}>
                    {result.composers?.map((comp, ci) => <Composer key={ci} comp={comp} onDone={(m) => { setActMsg(m); pullRef.current(); }} />)}
                    {result.groups.map((grp, gi) => (
                      <GroupTable key={gi} group={grp} serviceId={s.id} prefix={`${s.id}:${gi}`}
                        rowExpand={rowExpand} onToggleRow={toggleRow} onAction={runAction}
                        rowPrompt={rowPrompt} setRowPromptValue={(v) => setRowPrompt((p) => p ? { ...p, value: v } : p)}
                        submitRowPrompt={submitRowPrompt} cancelRowPrompt={() => setRowPrompt(null)} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Always-on Local pulse — system stats, recent downloads, browser activity.
// No tokens, no setup; works on first launch. This is what stops the
// Control Panel from feeling empty until the user connects services.
function LocalPulsePanel() {
  const [sys, setSys] = useState<{ cpuPct: number; memPct: number; memFreeGb: number; diskFreeGb: number; diskTotalGb: number } | null>(null);
  const [downloads, setDownloads] = useState<{ id: string; filename: string; bytes: number; state: string; ts: number }[]>([]);
  const [historyCount, setHistoryCount] = useState(0);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [tabCount, setTabCount] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let cancel = false;
    async function pull() { try { const s = await window.hub.sys.pulse(); if (!cancel) setSys(s); } catch { /* ignore */ } }
    void pull();
    const t = setInterval(pull, 6000);
    return () => { cancel = true; clearInterval(t); };
  }, []);

  useEffect(() => {
    void window.hub.downloads.list().then(setDownloads);
    const off = window.hub.downloads.onUpdated(setDownloads);
    return () => { off(); };
  }, []);

  useEffect(() => {
    function read() {
      try { setHistoryCount((JSON.parse(localStorage.getItem("nchub.browser.history.v1") || "[]") as unknown[]).length); } catch { /* ignore */ }
      try { setBookmarkCount((JSON.parse(localStorage.getItem("nchub.browser.bookmarks.v1") || "[]") as unknown[]).length); } catch { /* ignore */ }
      try {
        const t = JSON.parse(localStorage.getItem("nchub.browser.tabs.v1") || "null") as { tabs?: unknown[] } | null;
        setTabCount(t?.tabs?.length || 0);
      } catch { /* ignore */ }
    }
    read();
    const t = setInterval(read, 10000);
    return () => clearInterval(t);
  }, []);

  const diskUsedPct = sys ? Math.round(((sys.diskTotalGb - sys.diskFreeGb) / sys.diskTotalGb) * 100) : 0;
  const memBar = sys ? sys.memPct : 0;
  const cpuBar = sys ? sys.cpuPct : 0;
  const recentDownloads = downloads.slice(0, 5);
  function fmt(b: number) { if (!b) return "0 B"; const u = ["B", "KB", "MB", "GB"]; let i = 0, n = b; while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; } return n.toFixed(n >= 100 ? 0 : 1) + " " + u[i]; }

  return (
    <div className="cp-svc" style={{ borderColor: "rgba(34,211,238,0.35)" }}>
      <div className="cp-svc-head" onClick={() => setCollapsed((c) => !c)}>
        <span style={{ display: "inline-block", width: 12, color: "var(--mute)", textAlign: "center" }}>{collapsed ? "▸" : "▾"}</span>
        <span className="cp-svc-name" style={{ color: "#22d3ee", textShadow: "0 0 8px rgba(34,211,238,0.4)" }}>Local</span>
        <span className="mono" style={{ fontSize: 10, color: "var(--mute)", padding: "2px 7px", border: "1px solid var(--line)", borderRadius: 4 }}>always-on</span>
        <span style={{ flex: 1 }} />
        <span className="cp-svc-summary">
          {sys ? `CPU ${sys.cpuPct}% · MEM ${sys.memPct}% · ${sys.diskFreeGb.toFixed(1)} GB free` : "reading sensors…"}
        </span>
      </div>
      {!collapsed && (
        <div style={{ padding: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {/* System */}
          <div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--mute)", textTransform: "uppercase", marginBottom: 8 }}>System</div>
            <CpBar label="CPU" pct={cpuBar} color={cpuBar > 80 ? "#ef4444" : cpuBar > 50 ? "#f59e0b" : "#22c55e"} />
            <CpBar label="RAM" pct={memBar} color="#22d3ee" />
            <CpBar label="DISK" pct={diskUsedPct} color={diskUsedPct > 85 ? "#ef4444" : "#a78bfa"} />
            {sys && (
              <div style={{ fontSize: 10, color: "var(--mute)", marginTop: 6 }}>
                {sys.memFreeGb.toFixed(1)} GB free RAM · {sys.diskFreeGb.toFixed(1)} / {sys.diskTotalGb.toFixed(1)} GB free disk
              </div>
            )}
          </div>
          {/* Browser */}
          <div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--mute)", textTransform: "uppercase", marginBottom: 8 }}>Browser</div>
            <CpRow label="Open tabs" value={String(tabCount)} />
            <CpRow label="Bookmarks" value={String(bookmarkCount)} />
            <CpRow label="History entries" value={String(historyCount)} />
          </div>
          {/* Downloads */}
          <div style={{ gridColumn: "1 / -1" }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--mute)", textTransform: "uppercase", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
              <span>Recent downloads</span>
              <span style={{ color: "var(--mute)", textTransform: "none", letterSpacing: 0 }}>{downloads.length} total</span>
            </div>
            {recentDownloads.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--mute)" }}>None yet. Anything downloaded through the browser shows up here.</div>
            ) : (
              <table className="ctab">
                <thead><tr><th>file</th><th>size</th><th>state</th><th>when</th><th /></tr></thead>
                <tbody>
                  {recentDownloads.map((d) => (
                    <tr key={d.id}>
                      <td style={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.filename}</td>
                      <td>{fmt(d.bytes)}</td>
                      <td>{d.state}</td>
                      <td>{new Date(d.ts).toLocaleTimeString()}</td>
                      <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                        <button className="cp-action" onClick={() => void window.hub.downloads.reveal((d as unknown as { path: string }).path)}>Reveal</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CpBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
      <span className="mono" style={{ fontSize: 9, color: "var(--mute)", width: 32 }}>{label}</span>
      <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, pct))}%`, background: `linear-gradient(90deg, ${color}, ${color}88)`, boxShadow: `0 0 6px ${color}88`, transition: "width .6s ease" }} />
      </div>
      <span className="mono" style={{ fontSize: 10, color, width: 32, textAlign: "right", textShadow: `0 0 6px ${color}66` }}>{pct}%</span>
    </div>
  );
}
function CpRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ fontSize: 11, color: "var(--mute)" }}>{label}</span>
      <span className="mono glow-text" style={{ fontSize: 12, color: "var(--pink)" }}>{value}</span>
    </div>
  );
}

function StatTile({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="cp-stat" style={{ "--cp-accent": color } as React.CSSProperties}>
      <span className="cp-stat-label">{label}</span>
      <span className="cp-stat-value">{value}</span>
      {sub && <span className="cp-stat-sub">{sub}</span>}
    </div>
  );
}

function GoogleDocsConnect() {
  const [connected, setConn] = useState(docsConnected());
  useEffect(() => subscribeDocs((s) => setConn(s.connected)), []);
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {connected ? (
        <>
          <span className="mono" style={{ fontSize: 11, color: "#22c55e" }}>connected</span>
          <button className="btn" onClick={() => setDocsConnected(false)}>Disconnect</button>
          <a className="btn" href="https://docs.google.com" target="_blank" rel="noreferrer">Open Docs</a>
        </>
      ) : (
        <button className="btn" onClick={() => setDocsConnected(true)}>Connect</button>
      )}
    </div>
  );
}

function GroupTable({ group, serviceId, prefix, rowExpand, onToggleRow, onAction, rowPrompt, setRowPromptValue, submitRowPrompt, cancelRowPrompt }: {
  group: ManageGroup; serviceId: string; prefix: string;
  rowExpand: Record<string, ManageGroup[] | "loading">;
  onToggleRow: (key: string, row: ManageRow) => void;
  onAction: (a: RowAction, serviceId: string, rowKey?: string) => void;
  rowPrompt: { key: string; action: RowAction; value: string } | null;
  setRowPromptValue: (v: string) => void;
  submitRowPrompt: () => void;
  cancelRowPrompt: () => void;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--mute)", margin: "4px 0 6px" }}>{group.title}</div>
      {group.note && <div style={{ fontSize: 11, color: "var(--mute)", marginBottom: 6 }}>{group.note}</div>}
      {group.rows.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--mute)" }}>—</div>
      ) : (
        <table className="ctab">
          <thead><tr>{group.columns.map((c, i) => <th key={i}>{c}</th>)}<th /></tr></thead>
          <tbody>
            {group.rows.map((row) => {
              const key = `${prefix}:${row.id}`;
              const ex = rowExpand[key];
              const promptHere = rowPrompt && rowPrompt.key === key;
              return (
                <RowFragment key={key}>
                  <tr onClick={() => onToggleRow(key, row)} style={{ cursor: row.expand ? "pointer" : "default" }}>
                    {row.cells.map((cell, i) => <td key={i}>{renderCell(cell)}</td>)}
                    <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                      {row.expand && <span className="mono" style={{ color: "var(--mute)", marginRight: 8 }}>{ex ? "▾" : "▸"}</span>}
                      {row.actions?.map((a, i) => (
                        <button key={i} className={"cp-action" + (a.danger ? " danger" : "")}
                          onClick={(e) => { e.stopPropagation(); onAction(a, serviceId, key); }}>{a.label}</button>
                      ))}
                    </td>
                  </tr>
                  {promptHere && (
                    <tr>
                      <td colSpan={group.columns.length + 1} style={{ background: "rgba(245,158,11,0.06)", padding: "8px 12px" }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input autoFocus value={rowPrompt!.value} placeholder={rowPrompt!.action.prompt?.placeholder}
                            onChange={(e) => setRowPromptValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") submitRowPrompt(); if (e.key === "Escape") cancelRowPrompt(); }}
                            style={{ ...inpInline, flex: 1 }} />
                          <button className="btn" onClick={submitRowPrompt}>{rowPrompt!.action.prompt?.submitLabel || "Apply"}</button>
                          <button className="btn" onClick={cancelRowPrompt}>cancel</button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {ex && (
                    <tr>
                      <td colSpan={group.columns.length + 1} style={{ background: "rgba(0,0,0,0.25)", padding: "8px 12px" }}>
                        {ex === "loading" ? <span className="mono" style={{ fontSize: 11, color: "var(--mute)" }}>loading…</span>
                          : ex.map((g, gi) => <GroupTable key={gi} group={g} serviceId={serviceId} prefix={`${key}:${gi}`}
                              rowExpand={rowExpand} onToggleRow={onToggleRow} onAction={onAction}
                              rowPrompt={rowPrompt} setRowPromptValue={setRowPromptValue}
                              submitRowPrompt={submitRowPrompt} cancelRowPrompt={cancelRowPrompt} />)}
                      </td>
                    </tr>
                  )}
                </RowFragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
const inpInline: React.CSSProperties = { background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 6, color: "var(--ink)", padding: "6px 8px", fontSize: 12, fontFamily: "ui-monospace, monospace", outline: "none" };

function RowFragment({ children }: { children: React.ReactNode }) { return <>{children}</>; }

function renderCell(cell: React.ReactNode): React.ReactNode {
  if (cell && typeof cell === "object" && "__dot" in (cell as unknown as Record<string, unknown>)) {
    const color = (cell as unknown as { __dot: string }).__dot;
    return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color }} />;
  }
  return cell;
}

function Composer({ comp, onDone }: { comp: { title: string; fields: { key: string; placeholder: string }[]; submitLabel: string; submit: (v: Record<string, string>) => Promise<string> }; onDone: (msg: string) => void }) {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  if (!open) return <button className="btn" style={{ marginBottom: 10 }} onClick={() => setOpen(true)}>+ {comp.title}</button>;
  return (
    <div className="panel" style={{ padding: 10, marginBottom: 10, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      <span className="mono" style={{ fontSize: 11, color: "var(--mute)" }}>{comp.title}</span>
      {comp.fields.map((f) => (
        <input key={f.key} placeholder={f.placeholder} value={vals[f.key] || ""} onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))} style={{ ...inp, width: 160 }} />
      ))}
      <button className="btn" disabled={busy} onClick={async () => { setBusy(true); const m = await comp.submit(vals); setBusy(false); setVals({}); setOpen(false); onDone(m); }}>{busy ? "…" : comp.submitLabel}</button>
      <button className="btn" onClick={() => setOpen(false)}>cancel</button>
    </div>
  );
}

const inp: React.CSSProperties = {
  background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 6,
  color: "var(--ink)", padding: "6px 8px", fontSize: 12, fontFamily: "ui-monospace, monospace", outline: "none", width: "100%",
};
