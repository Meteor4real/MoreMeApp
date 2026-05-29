import { useEffect, useState } from "react";

// The Control Panel, reimplemented natively in-app (Option 2). Each user
// connects THEIR OWN services here; tokens are stored in the OS-keychain vault
// (main process), never bundled or committed.
//
// Two subtabs:
//   Connect — the cards. Connect/disconnect/edit each service. Includes the
//     local-app launchers (Modrinth, Blockbench) so they live in one place.
//   Manage — the overview. Pulls live data from every connected service in
//     parallel and shows a stat-board: counts, recent items, quick actions.

type Service = {
  id: string;
  name: string;
  group: string;
  tokenLabel?: string;
  needsBaseUrl?: boolean;
  console?: string;        // deep-link to the native UI / token mgmt page
  hint: string;
  launcher?: "modrinth" | "blockbench"; // local app launcher card
  noAuth?: boolean;        // launcher cards don't need credentials
};

const SERVICES: Service[] = [
  { id: "github", name: "GitHub", group: "Dev & Deploy", tokenLabel: "Personal access token", console: "https://github.com/settings/tokens", hint: "repos, PRs, Actions" },
  { id: "vercel", name: "Vercel", group: "Dev & Deploy", tokenLabel: "API token", console: "https://vercel.com/account/tokens", hint: "deployments, env vars, redeploy" },
  { id: "supabase", name: "Supabase", group: "Dev & Deploy", tokenLabel: "Access token", console: "https://supabase.com/dashboard/account/tokens", hint: "projects, tables, keys" },
  { id: "cloudflare", name: "Cloudflare", group: "Networking", tokenLabel: "API token", console: "https://dash.cloudflare.com/profile/api-tokens", hint: "zones, DNS, cache" },
  { id: "tailscale", name: "Tailscale", group: "Networking", tokenLabel: "API key", console: "https://login.tailscale.com/admin/settings/keys", hint: "devices / tailnet" },
  { id: "twingate", name: "Twingate", group: "Networking", tokenLabel: "API key", needsBaseUrl: true, hint: "zero-trust resources & tunnels" },
  { id: "n8n", name: "n8n", group: "Automation", tokenLabel: "API key", needsBaseUrl: true, hint: "workflows & executions" },
  { id: "youtube", name: "YouTube", group: "Content", tokenLabel: "Data API key", console: "https://console.cloud.google.com/apis/credentials", hint: "channel stats & uploads" },
  { id: "homeassistant", name: "Home Assistant", group: "Homelab", tokenLabel: "Long-lived token", needsBaseUrl: true, hint: "entities, scenes, automations" },
  { id: "proxmox", name: "Proxmox", group: "Homelab", tokenLabel: "API token", needsBaseUrl: true, hint: "VMs / LXC" },
  { id: "portainer", name: "Portainer", group: "Homelab", tokenLabel: "API key", needsBaseUrl: true, hint: "containers & stacks" },
  { id: "pihole", name: "Pi-hole", group: "Homelab", tokenLabel: "App password", needsBaseUrl: true, hint: "DNS & blocklists" },
  { id: "frigate", name: "Frigate", group: "Homelab", tokenLabel: "(base URL only)", needsBaseUrl: true, hint: "cameras & detections" },
  { id: "zimacube", name: "ZimaCube", group: "Homelab", tokenLabel: "SSH host/token", needsBaseUrl: true, hint: "disks & SMART health" },
  { id: "hermes", name: "Hermes", group: "AI & Hosting", tokenLabel: "Bearer (optional)", needsBaseUrl: true, hint: "co-boss AI on Hostinger — also in the group chat" },
  { id: "hostinger", name: "Hostinger", group: "AI & Hosting", tokenLabel: "API token", hint: "VPS / hosting inventory" },
  { id: "elevenlabs", name: "ElevenLabs", group: "Media", tokenLabel: "API key", console: "https://elevenlabs.io/app/settings/api-keys", hint: "real anchor voices for NT5 broadcasts" },
  { id: "pexels", name: "Pexels", group: "Media", tokenLabel: "API key", console: "https://www.pexels.com/api/new/", hint: "stock video B-roll for NT5 broadcasts" },
  { id: "modrinth", name: "Modrinth", group: "Local Apps", launcher: "modrinth", noAuth: true, hint: "launch the Modrinth desktop client" },
  { id: "blockbench", name: "Blockbench", group: "Local Apps", launcher: "blockbench", noAuth: true, hint: "launch Blockbench for low-poly modeling" },
];

type Status = { service: string; hasToken: boolean; baseUrl: string };

// Live data the Manage tab assembles per connected service.
type Live = {
  github?: { count: number; topRepos: { name: string; stars: number }[]; error?: string };
  vercel?: { count: number; recent: { name: string; state: string; scope: string }[]; error?: string };
  cloudflare?: { zones: number; active: number; error?: string };
  tailscale?: { devices: number; online: number; error?: string };
  n8n?: { workflows: number; active: number; error?: string };
};

const LIVE_SERVICES = ["github", "vercel", "cloudflare", "tailscale", "n8n"];

export function ControlPanel() {
  const [tab, setTab] = useState<"connect" | "manage">("connect");
  const [status, setStatus] = useState<Status[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [live, setLive] = useState<Live>({});
  const [loading, setLoading] = useState(false);

  async function refresh() { setStatus(await window.hub.vault.list()); }
  useEffect(() => { void refresh(); }, []);

  function isConnected(id: string) {
    const svc = SERVICES.find((x) => x.id === id);
    if (!svc) return false;
    if (svc.noAuth) return true; // launcher cards: always "available"
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

  // Pull live data for every connected service in parallel. Uses each
  // service's real API. Failures land in the per-service error field
  // so the Manage card can still render.
  async function pullManage() {
    setLoading(true);
    const out: Live = {};
    const conn = SERVICES.filter((s) => isConnected(s.id) && LIVE_SERVICES.includes(s.id));
    await Promise.all(conn.map(async (svc) => {
      try {
        const cred = await window.hub.vault.get(svc.id);
        if (svc.id === "github") {
          const r = await window.hub.net({ method: "GET", url: "https://api.github.com/user/repos?per_page=100&sort=pushed", headers: { Authorization: `Bearer ${cred.token}`, Accept: "application/vnd.github+json", "User-Agent": "NetworkChuckHub" } });
          const repos = Array.isArray(r.data) ? (r.data as { full_name: string; stargazers_count: number }[]) : [];
          const top = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 5).map((x) => ({ name: x.full_name, stars: x.stargazers_count }));
          out.github = { count: repos.length, topRepos: top };
        } else if (svc.id === "vercel") {
          const auth = { Authorization: `Bearer ${cred.token}` };
          type Dep = { name: string; state?: string; readyState?: string; created?: number; createdAt?: number };
          const all: { d: Dep; scope: string }[] = [];
          const personalR = await window.hub.net({ method: "GET", url: "https://api.vercel.com/v6/deployments?limit=5", headers: auth });
          ((personalR.data as { deployments?: Dep[] })?.deployments || []).forEach((d) => all.push({ d, scope: "personal" }));
          const teamsR = await window.hub.net({ method: "GET", url: "https://api.vercel.com/v2/teams?limit=20", headers: auth });
          const teams = ((teamsR.data as { teams?: { id: string; slug: string; name: string }[] })?.teams) || [];
          for (const t of teams) {
            const r = await window.hub.net({ method: "GET", url: `https://api.vercel.com/v6/deployments?limit=5&teamId=${encodeURIComponent(t.id)}`, headers: auth });
            ((r.data as { deployments?: Dep[] })?.deployments || []).forEach((d) => all.push({ d, scope: t.slug || t.name }));
          }
          all.sort((a, b) => (b.d.created ?? b.d.createdAt ?? 0) - (a.d.created ?? a.d.createdAt ?? 0));
          out.vercel = {
            count: all.length,
            recent: all.slice(0, 5).map(({ d, scope }) => ({ name: d.name, state: (d.state || d.readyState || "?").toLowerCase(), scope })),
          };
        } else if (svc.id === "cloudflare") {
          const r = await window.hub.net({ method: "GET", url: "https://api.cloudflare.com/client/v4/zones?per_page=50", headers: { Authorization: `Bearer ${cred.token}` } });
          const zones = ((r.data as { result?: { name: string; status: string }[] })?.result) || [];
          out.cloudflare = { zones: zones.length, active: zones.filter((z) => z.status === "active").length };
        } else if (svc.id === "tailscale") {
          const r = await window.hub.net({ method: "GET", url: "https://api.tailscale.com/api/v2/tailnet/-/devices", headers: { Authorization: `Bearer ${cred.token}` } });
          const devices = ((r.data as { devices?: { name: string; os: string; lastSeen?: string }[] })?.devices) || [];
          const recent = devices.filter((d) => { if (!d.lastSeen) return false; return Date.now() - new Date(d.lastSeen).getTime() < 24 * 3600 * 1000; }).length;
          out.tailscale = { devices: devices.length, online: recent };
        } else if (svc.id === "n8n") {
          if (!cred.baseUrl) { out.n8n = { workflows: 0, active: 0, error: "set base URL" }; return; }
          const r = await window.hub.net({ method: "GET", url: `${cred.baseUrl.replace(/\/$/, "")}/api/v1/workflows`, headers: { "X-N8N-API-KEY": cred.token, Accept: "application/json" } });
          const wf = ((r.data as { data?: { name: string; active: boolean }[] })?.data) || [];
          out.n8n = { workflows: wf.length, active: wf.filter((w) => w.active).length };
        }
      } catch (e) {
        if (svc.id === "github") out.github = { count: 0, topRepos: [], error: String(e) };
        if (svc.id === "vercel") out.vercel = { count: 0, recent: [], error: String(e) };
        if (svc.id === "cloudflare") out.cloudflare = { zones: 0, active: 0, error: String(e) };
        if (svc.id === "tailscale") out.tailscale = { devices: 0, online: 0, error: String(e) };
        if (svc.id === "n8n") out.n8n = { workflows: 0, active: 0, error: String(e) };
      }
    }));
    setLive(out);
    setLoading(false);
  }

  useEffect(() => { if (tab === "manage" && Object.keys(live).length === 0) void pullManage(); }, [tab]);

  function launchLauncher(kind: "modrinth" | "blockbench") {
    void window.hub.launchUri(kind === "modrinth" ? "https://launcher.modrinth.com/" : "https://www.blockbench.net/launcher");
  }

  const connected = SERVICES.filter((s) => !s.noAuth && isConnected(s.id)).length;
  const connectableCount = SERVICES.filter((s) => !s.noAuth).length;
  const groups = Array.from(new Set(SERVICES.map((s) => s.group)));

  return (
    <div className="stage">
      <div className="mono" style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "var(--mute)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <span>Control Panel</span>
        <div style={{ display: "flex", gap: 6 }}>
          {(["connect", "manage"] as const).map((t) => (
            <button key={t} className="btn" style={{ padding: "2px 12px", color: tab === t ? "var(--pink)" : undefined, borderColor: tab === t ? "rgba(255,87,119,0.6)" : undefined }} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
        <span style={{ color: "var(--pink)" }}>{connected} / {connectableCount} connected</span>
      </div>

      {tab === "connect" ? (
        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          <p style={{ color: "var(--mute)", fontSize: 13, marginTop: 0, maxWidth: 680 }}>
            Connect your own services. Credentials are encrypted on this device via the OS
            keychain — they never leave your machine, are never bundled into the app, and
            are never sent anywhere except directly to that service.
          </p>
          {groups.map((g) => (
            <div key={g} style={{ marginBottom: 18 }}>
              <div className="mono" style={{ fontSize: 11, letterSpacing: 2, color: "var(--ink)", textTransform: "uppercase", margin: "8px 0", display: "flex", alignItems: "center", gap: 10 }}>
                {g}
                <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
                {SERVICES.filter((s) => s.group === g).map((s) => {
                  const on = isConnected(s.id);
                  return (
                    <div key={s.id} className={on && !s.noAuth ? "panel-hot panel" : "panel"} style={{ padding: 12, borderColor: on && !s.noAuth ? "rgba(255,87,119,0.4)" : undefined }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className="mono" style={{ fontSize: 14 }}>{s.name}</span>
                        <span className="mono" style={{ fontSize: 10, color: on ? "var(--pink)" : "var(--mute)" }}>
                          {s.noAuth ? "LAUNCHER" : on ? "CONNECTED" : "OFF"}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--mute)", margin: "4px 0 10px" }}>{s.hint}</div>

                      {s.launcher ? (
                        <button className="btn" onClick={() => launchLauncher(s.launcher!)}>Launch {s.name}</button>
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
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button className="btn" onClick={() => void openEdit(s.id)}>{on ? "Edit" : "Connect"}</button>
                          {on && <button className="btn" onClick={() => void disconnect(s.id)}>Disconnect</button>}
                          {s.console && <a className="btn" href={s.console} target="_blank" rel="noreferrer">Get token</a>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <p style={{ color: "var(--mute)", fontSize: 13, margin: 0, flex: 1, maxWidth: 580 }}>
              Live stat-board across everything you&apos;ve connected. Counts, recent activity,
              quick actions. Reloads on demand — nothing is cached server-side.
            </p>
            <button className="btn" onClick={() => void pullManage()} disabled={loading}>{loading ? "Loading…" : "Refresh all"}</button>
          </div>

          {connected === 0 && (
            <div className="panel" style={{ padding: 16, color: "var(--mute)" }}>
              Nothing connected yet. Switch to the Connect tab to plug in GitHub, Vercel, Cloudflare, Tailscale, or n8n — they all surface here once they have a token.
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14 }}>
            {live.github && (
              <ManageCard title="GitHub" stat={`${live.github.count} repos`} error={live.github.error}>
                {live.github.topRepos.map((r) => (
                  <div key={r.name} className="mono" style={{ fontSize: 11, color: "var(--mute)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>★ {r.stars}  {r.name}</div>
                ))}
              </ManageCard>
            )}
            {live.vercel && (
              <ManageCard title="Vercel" stat={`${live.vercel.count} deployments`} error={live.vercel.error}>
                {live.vercel.recent.map((d, i) => (
                  <div key={i} className="mono" style={{ fontSize: 11, color: "var(--mute)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.state.padEnd(8)} · {d.scope} · {d.name}</div>
                ))}
              </ManageCard>
            )}
            {live.cloudflare && (
              <ManageCard title="Cloudflare" stat={`${live.cloudflare.active} / ${live.cloudflare.zones} zones active`} error={live.cloudflare.error} />
            )}
            {live.tailscale && (
              <ManageCard title="Tailscale" stat={`${live.tailscale.online} of ${live.tailscale.devices} devices online`} error={live.tailscale.error} />
            )}
            {live.n8n && (
              <ManageCard title="n8n" stat={`${live.n8n.active} / ${live.n8n.workflows} workflows active`} error={live.n8n.error} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ManageCard({ title, stat, error, children }: { title: string; stat: string; error?: string; children?: React.ReactNode }) {
  return (
    <div className="panel" style={{ padding: 14 }}>
      <div className="mono" style={{ fontSize: 11, color: "var(--mute)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>{title}</div>
      <div className="mono glow-text" style={{ fontSize: 18, marginBottom: 8 }}>{error ? "error" : stat}</div>
      {error && <div style={{ fontSize: 11, color: "var(--mute)" }}>{error}</div>}
      {!error && children}
    </div>
  );
}

const inp: React.CSSProperties = {
  background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 6,
  color: "var(--ink)", padding: "6px 8px", fontSize: 12, fontFamily: "ui-monospace, monospace", outline: "none",
};
