import { useEffect, useState } from "react";

// The Control Panel, reimplemented natively in-app (Option 2). Each user
// connects THEIR OWN services here; tokens are stored in the OS-keychain vault
// (main process), never bundled or committed. The Connect tab plugs services
// in; the Manage tab assembles real interactive panels per service — recent
// deployments with redeploy / cancel / promote, GitHub PRs with links, action
// runs, Cloudflare zones with cache purge, Tailscale devices, n8n workflows
// with activate / run actions.

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
  { id: "pexels", name: "Pexels", group: "Media", tokenLabel: "API key", console: "https://www.pexels.com/api/new/", hint: "stock video B-roll for NT5 broadcasts (optional)" },
  { id: "modrinth", name: "Modrinth", group: "Local Apps", launcher: "modrinth", noAuth: true, hint: "launch the Modrinth desktop client", tokenLabel: "" },
  { id: "blockbench", name: "Blockbench", group: "Local Apps", launcher: "blockbench", noAuth: true, hint: "launch Blockbench for low-poly modeling", tokenLabel: "" },
];

type Status = { service: string; hasToken: boolean; baseUrl: string };

type VercelDep = { uid: string; name: string; state: string; scope: string; team?: string; url?: string; created: number; branch?: string; commit?: string };
type VercelProj = { id: string; name: string; framework?: string; scope: string; team?: string; updated?: number };
type GhPr = { repo: string; number: number; title: string; user: string; url: string };
type GhRun = { repo: string; name: string; status: string; conclusion: string | null; url: string };
type TsDev = { name: string; os: string; ip: string; lastSeen: string; online: boolean };
type CfZone = { id: string; name: string; status: string };
type N8nWf = { id: string; name: string; active: boolean };

type Live = {
  github?: { count: number; topRepos: { name: string; stars: number }[]; prs: GhPr[]; runs: GhRun[]; error?: string };
  vercel?: { count: number; recent: VercelDep[]; projects: VercelProj[]; teams: { id: string; slug: string; name: string }[]; error?: string };
  cloudflare?: { zones: number; active: number; list: CfZone[]; error?: string };
  tailscale?: { devices: number; online: number; list: TsDev[]; error?: string };
  n8n?: { workflows: number; active: number; list: N8nWf[]; error?: string };
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
  const [actMsg, setActMsg] = useState<string | null>(null);

  async function refresh() { setStatus(await window.hub.vault.list()); }
  useEffect(() => { void refresh(); }, []);

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

  async function pullManage() {
    setLoading(true);
    const out: Live = {};
    const conn = SERVICES.filter((s) => isConnected(s.id) && LIVE_SERVICES.includes(s.id));
    await Promise.all(conn.map(async (svc) => {
      try {
        const cred = await window.hub.vault.get(svc.id);
        if (svc.id === "github") {
          const reposR = await window.hub.net({ method: "GET", url: "https://api.github.com/user/repos?per_page=100&sort=pushed", headers: { Authorization: `Bearer ${cred.token}`, Accept: "application/vnd.github+json", "User-Agent": "NetworkChuckHub" } });
          const repos = Array.isArray(reposR.data) ? (reposR.data as { full_name: string; stargazers_count: number }[]) : [];
          const top = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 5).map((x) => ({ name: x.full_name, stars: x.stargazers_count }));
          const prR = await window.hub.net({ method: "GET", url: "https://api.github.com/search/issues?per_page=20&q=" + encodeURIComponent("is:open is:pr author:@me"), headers: { Authorization: `Bearer ${cred.token}`, Accept: "application/vnd.github+json", "User-Agent": "NetworkChuckHub" } });
          const prItems = ((prR.data as { items?: { number: number; title: string; user?: { login: string }; html_url: string; repository_url: string }[] })?.items) || [];
          const prs: GhPr[] = prItems.slice(0, 8).map((p) => ({ number: p.number, title: p.title, user: p.user?.login || "", url: p.html_url, repo: (p.repository_url || "").replace("https://api.github.com/repos/", "") }));
          const runs: GhRun[] = [];
          await Promise.all(repos.slice(0, 5).map(async (rp) => {
            try {
              const r = await window.hub.net({ method: "GET", url: `https://api.github.com/repos/${rp.full_name}/actions/runs?per_page=3`, headers: { Authorization: `Bearer ${cred.token}`, Accept: "application/vnd.github+json", "User-Agent": "NetworkChuckHub" } });
              const items = ((r.data as { workflow_runs?: { name: string; status: string; conclusion: string | null; html_url: string }[] })?.workflow_runs) || [];
              items.slice(0, 2).forEach((it) => runs.push({ repo: rp.full_name, name: it.name, status: it.status, conclusion: it.conclusion, url: it.html_url }));
            } catch { /* ignore */ }
          }));
          out.github = { count: repos.length, topRepos: top, prs, runs };
        } else if (svc.id === "vercel") {
          const auth = { Authorization: `Bearer ${cred.token}` };
          type Dep = { uid?: string; name: string; state?: string; readyState?: string; created?: number; createdAt?: number; url?: string; meta?: { githubCommitRef?: string; githubCommitMessage?: string } };
          type Proj = { id: string; name: string; framework?: string; updatedAt?: number };
          const deps: VercelDep[] = [];
          const projs: VercelProj[] = [];
          const teamsR = await window.hub.net({ method: "GET", url: "https://api.vercel.com/v2/teams?limit=20", headers: auth });
          const teams = ((teamsR.data as { teams?: { id: string; slug: string; name: string }[] })?.teams) || [];
          const scopes: { id?: string; slug: string; name: string }[] = [{ slug: "personal", name: "personal" }, ...teams];
          for (const sc of scopes) {
            const qs = sc.id ? `&teamId=${encodeURIComponent(sc.id)}` : "";
            const dR = await window.hub.net({ method: "GET", url: `https://api.vercel.com/v6/deployments?limit=12${qs}`, headers: auth });
            ((dR.data as { deployments?: Dep[] })?.deployments || []).forEach((d) => deps.push({
              uid: d.uid || "", name: d.name, state: (d.state || d.readyState || "?").toLowerCase(),
              scope: sc.slug, team: sc.id, url: d.url, created: d.created ?? d.createdAt ?? 0,
              branch: d.meta?.githubCommitRef, commit: d.meta?.githubCommitMessage,
            }));
            const pR = await window.hub.net({ method: "GET", url: `https://api.vercel.com/v9/projects?limit=20${qs}`, headers: auth });
            ((pR.data as { projects?: Proj[] })?.projects || []).forEach((p) => projs.push({ id: p.id, name: p.name, framework: p.framework, scope: sc.slug, team: sc.id, updated: p.updatedAt }));
          }
          deps.sort((a, b) => b.created - a.created);
          out.vercel = { count: deps.length, recent: deps.slice(0, 20), projects: projs, teams };
        } else if (svc.id === "cloudflare") {
          const r = await window.hub.net({ method: "GET", url: "https://api.cloudflare.com/client/v4/zones?per_page=50", headers: { Authorization: `Bearer ${cred.token}` } });
          const zones = ((r.data as { result?: { id: string; name: string; status: string }[] })?.result) || [];
          out.cloudflare = { zones: zones.length, active: zones.filter((z) => z.status === "active").length, list: zones.map((z) => ({ id: z.id, name: z.name, status: z.status })) };
        } else if (svc.id === "tailscale") {
          const r = await window.hub.net({ method: "GET", url: "https://api.tailscale.com/api/v2/tailnet/-/devices", headers: { Authorization: `Bearer ${cred.token}` } });
          const devices = ((r.data as { devices?: { name: string; os: string; lastSeen?: string; addresses?: string[] }[] })?.devices) || [];
          const list: TsDev[] = devices.map((d) => {
            const seenMs = d.lastSeen ? new Date(d.lastSeen).getTime() : 0;
            return { name: d.name, os: d.os, ip: (d.addresses && d.addresses[0]) || "", lastSeen: d.lastSeen || "", online: seenMs > 0 && Date.now() - seenMs < 5 * 60 * 1000 };
          });
          out.tailscale = { devices: devices.length, online: list.filter((d) => d.online).length, list };
        } else if (svc.id === "n8n") {
          if (!cred.baseUrl) { out.n8n = { workflows: 0, active: 0, list: [], error: "set base URL" }; return; }
          const r = await window.hub.net({ method: "GET", url: `${cred.baseUrl.replace(/\/$/, "")}/api/v1/workflows`, headers: { "X-N8N-API-KEY": cred.token, Accept: "application/json" } });
          const wf = ((r.data as { data?: { id: string; name: string; active: boolean }[] })?.data) || [];
          out.n8n = { workflows: wf.length, active: wf.filter((w) => w.active).length, list: wf };
        }
      } catch (e) {
        if (svc.id === "github") out.github = { count: 0, topRepos: [], prs: [], runs: [], error: String(e) };
        if (svc.id === "vercel") out.vercel = { count: 0, recent: [], projects: [], teams: [], error: String(e) };
        if (svc.id === "cloudflare") out.cloudflare = { zones: 0, active: 0, list: [], error: String(e) };
        if (svc.id === "tailscale") out.tailscale = { devices: 0, online: 0, list: [], error: String(e) };
        if (svc.id === "n8n") out.n8n = { workflows: 0, active: 0, list: [], error: String(e) };
      }
    }));
    setLive(out);
    setLoading(false);
  }
  useEffect(() => { if (tab === "manage" && Object.keys(live).length === 0) void pullManage(); }, [tab]);

  async function vercelRedeploy(d: VercelDep) {
    const cred = await window.hub.vault.get("vercel");
    const teamQs = d.team ? `?teamId=${encodeURIComponent(d.team)}` : "";
    const r = await window.hub.net({ method: "POST", url: `https://api.vercel.com/v13/deployments${teamQs}`, headers: { Authorization: `Bearer ${cred.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ name: d.name, deploymentId: d.uid, target: "production" }) });
    setActMsg(r.ok ? `Redeploy queued for ${d.name}.` : `Redeploy failed (${r.status}).`);
    void pullManage();
  }
  async function vercelCancel(d: VercelDep) {
    const cred = await window.hub.vault.get("vercel");
    const teamQs = d.team ? `?teamId=${encodeURIComponent(d.team)}` : "";
    const r = await window.hub.net({ method: "PATCH", url: `https://api.vercel.com/v12/deployments/${d.uid}/cancel${teamQs}`, headers: { Authorization: `Bearer ${cred.token}` } });
    setActMsg(r.ok ? `Cancelled ${d.name}.` : `Cancel failed (${r.status}).`);
    void pullManage();
  }
  async function vercelPromote(d: VercelDep) {
    const cred = await window.hub.vault.get("vercel");
    const teamQs = d.team ? `?teamId=${encodeURIComponent(d.team)}` : "";
    const projR = await window.hub.net({ method: "GET", url: `https://api.vercel.com/v9/projects/${encodeURIComponent(d.name)}${teamQs}`, headers: { Authorization: `Bearer ${cred.token}` } });
    const proj = projR.data as { id?: string };
    if (!proj.id) { setActMsg(`Couldn't resolve project ${d.name}.`); return; }
    const r = await window.hub.net({ method: "POST", url: `https://api.vercel.com/v10/projects/${proj.id}/promote/${d.uid}${teamQs}`, headers: { Authorization: `Bearer ${cred.token}` } });
    setActMsg(r.ok ? `Promoted ${d.name} to production.` : `Promote failed (${r.status}).`);
    void pullManage();
  }
  async function cfPurgeAll(z: CfZone) {
    const cred = await window.hub.vault.get("cloudflare");
    const r = await window.hub.net({ method: "POST", url: `https://api.cloudflare.com/client/v4/zones/${z.id}/purge_cache`, headers: { Authorization: `Bearer ${cred.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ purge_everything: true }) });
    setActMsg(r.ok ? `Purged cache for ${z.name}.` : `Purge failed (${r.status}).`);
  }
  async function n8nToggle(w: N8nWf) {
    const cred = await window.hub.vault.get("n8n");
    const url = `${cred.baseUrl.replace(/\/$/, "")}/api/v1/workflows/${w.id}/${w.active ? "deactivate" : "activate"}`;
    const r = await window.hub.net({ method: "POST", url, headers: { "X-N8N-API-KEY": cred.token } });
    setActMsg(r.ok ? `${w.active ? "Deactivated" : "Activated"} ${w.name}.` : `Toggle failed (${r.status}).`);
    void pullManage();
  }
  async function n8nRun(w: N8nWf) {
    const cred = await window.hub.vault.get("n8n");
    const url = `${cred.baseUrl.replace(/\/$/, "")}/api/v1/workflows/${w.id}/execute`;
    const r = await window.hub.net({ method: "POST", url, headers: { "X-N8N-API-KEY": cred.token } });
    setActMsg(r.ok ? `Executed ${w.name}.` : `Execute failed (${r.status}).`);
  }
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
              Live stat-board across everything you&apos;ve connected. Real interactive actions — redeploy a Vercel build, cancel one mid-build, promote a preview to production, purge a Cloudflare zone cache, toggle / fire-and-forget an n8n workflow.
            </p>
            <button className="btn" onClick={() => void pullManage()} disabled={loading}>{loading ? "Loading…" : "Refresh all"}</button>
          </div>

          {connected === 0 && (
            <div className="panel" style={{ padding: 16, color: "var(--mute)" }}>
              Nothing connected yet. Switch to the Connect tab to plug in GitHub, Vercel, Cloudflare, Tailscale, or n8n — they all surface here once they have a token.
            </div>
          )}

          {actMsg && (
            <div className="panel" style={{ padding: 8, marginBottom: 10, fontSize: 12, color: "var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{actMsg}</span>
              <button className="btn" style={{ padding: "2px 8px" }} onClick={() => setActMsg(null)}>dismiss</button>
            </div>
          )}

          {live.vercel && (
            <ManagePanel title="Vercel" head={live.vercel.error ? "error" : `${live.vercel.count} deployments · ${live.vercel.projects.length} projects · ${live.vercel.teams.length} teams`} err={live.vercel.error}>
              <SubHead>Recent deployments</SubHead>
              <table className="ctab">
                <thead><tr><th>state</th><th>project</th><th>scope</th><th>branch / commit</th><th>when</th><th>actions</th></tr></thead>
                <tbody>
                  {live.vercel.recent.map((d) => (
                    <tr key={d.uid || d.name + d.created}>
                      <td><StateDot state={d.state} /> <span className="mono">{d.state}</span></td>
                      <td className="mono">{d.name}</td>
                      <td className="mono" style={{ color: "var(--mute)" }}>{d.scope}</td>
                      <td className="mono" style={{ color: "var(--mute)" }}>{d.branch ? d.branch : ""} {d.commit ? `· ${d.commit.slice(0, 40)}${d.commit.length > 40 ? "…" : ""}` : ""}</td>
                      <td className="mono" style={{ color: "var(--mute)" }}>{ago(d.created)}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {d.url && <a className="btn" href={`https://${d.url}`} target="_blank" rel="noreferrer" style={{ padding: "2px 8px" }}>open</a>}{" "}
                        <button className="btn" style={{ padding: "2px 8px" }} onClick={() => void vercelRedeploy(d)}>redeploy</button>{" "}
                        <button className="btn" style={{ padding: "2px 8px" }} onClick={() => void vercelPromote(d)}>promote</button>{" "}
                        {(d.state === "building" || d.state === "queued" || d.state === "initializing") &&
                          <button className="btn" style={{ padding: "2px 8px" }} onClick={() => void vercelCancel(d)}>cancel</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <SubHead>Projects</SubHead>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 6 }}>
                {live.vercel.projects.map((p) => (
                  <a key={p.id} className="panel" href={`https://vercel.com/${p.scope === "personal" ? "" : p.scope + "/"}${p.name}`} target="_blank" rel="noreferrer" style={{ padding: 8, textDecoration: "none" }}>
                    <div className="mono" style={{ fontSize: 12, color: "var(--ink)" }}>{p.name}</div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--mute)" }}>{p.framework || "—"} · {p.scope}</div>
                  </a>
                ))}
              </div>
            </ManagePanel>
          )}

          {live.github && (
            <ManagePanel title="GitHub" head={live.github.error ? "error" : `${live.github.count} repos · ${live.github.prs.length} open PRs`} err={live.github.error}>
              <SubHead>Top repos</SubHead>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 6 }}>
                {live.github.topRepos.map((r) => (
                  <a key={r.name} className="panel" href={`https://github.com/${r.name}`} target="_blank" rel="noreferrer" style={{ padding: 8, textDecoration: "none" }}>
                    <div className="mono" style={{ fontSize: 12, color: "var(--ink)" }}>{r.name}</div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--mute)" }}>★ {r.stars}</div>
                  </a>
                ))}
              </div>
              <SubHead>Your open PRs</SubHead>
              {live.github.prs.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--mute)" }}>No open PRs.</div>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {live.github.prs.map((p) => (
                    <li key={p.url} className="mono" style={{ fontSize: 12, padding: "3px 0", color: "var(--ink)" }}>
                      <a href={p.url} target="_blank" rel="noreferrer" style={{ color: "var(--pink)" }}>#{p.number}</a> {p.repo} · {p.title}
                    </li>
                  ))}
                </ul>
              )}
              <SubHead>Recent Action runs</SubHead>
              {live.github.runs.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--mute)" }}>No recent runs.</div>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {live.github.runs.map((r) => (
                    <li key={r.url} className="mono" style={{ fontSize: 12, padding: "3px 0", color: "var(--ink)", display: "flex", gap: 8 }}>
                      <RunDot status={r.status} conclusion={r.conclusion} />
                      <a href={r.url} target="_blank" rel="noreferrer" style={{ color: "var(--pink)" }}>{r.name || "workflow"}</a>
                      <span style={{ color: "var(--mute)" }}>{r.repo}</span>
                      <span style={{ color: "var(--mute)" }}>{r.conclusion || r.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </ManagePanel>
          )}

          {live.cloudflare && (
            <ManagePanel title="Cloudflare" head={live.cloudflare.error ? "error" : `${live.cloudflare.active} / ${live.cloudflare.zones} zones active`} err={live.cloudflare.error}>
              <SubHead>Zones</SubHead>
              <table className="ctab">
                <thead><tr><th>zone</th><th>status</th><th>actions</th></tr></thead>
                <tbody>
                  {live.cloudflare.list.map((z) => (
                    <tr key={z.id}>
                      <td className="mono">{z.name}</td>
                      <td className="mono" style={{ color: z.status === "active" ? "var(--pink)" : "var(--mute)" }}>{z.status}</td>
                      <td><button className="btn" style={{ padding: "2px 8px" }} onClick={() => void cfPurgeAll(z)}>purge cache</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ManagePanel>
          )}

          {live.tailscale && (
            <ManagePanel title="Tailscale" head={live.tailscale.error ? "error" : `${live.tailscale.online} of ${live.tailscale.devices} devices recently online`} err={live.tailscale.error}>
              <table className="ctab">
                <thead><tr><th>device</th><th>os</th><th>ip</th><th>last seen</th></tr></thead>
                <tbody>
                  {live.tailscale.list.map((d, i) => (
                    <tr key={d.name + i}>
                      <td className="mono">{d.online ? <span style={{ color: "var(--pink)" }}>● </span> : <span style={{ color: "var(--mute)" }}>○ </span>}{d.name}</td>
                      <td className="mono" style={{ color: "var(--mute)" }}>{d.os}</td>
                      <td className="mono" style={{ color: "var(--mute)" }}>{d.ip}</td>
                      <td className="mono" style={{ color: "var(--mute)" }}>{d.lastSeen ? ago(new Date(d.lastSeen).getTime()) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ManagePanel>
          )}

          {live.n8n && (
            <ManagePanel title="n8n" head={live.n8n.error ? "error" : `${live.n8n.active} / ${live.n8n.workflows} workflows active`} err={live.n8n.error}>
              <table className="ctab">
                <thead><tr><th>workflow</th><th>state</th><th>actions</th></tr></thead>
                <tbody>
                  {live.n8n.list.map((w) => (
                    <tr key={w.id}>
                      <td className="mono">{w.name}</td>
                      <td className="mono" style={{ color: w.active ? "var(--pink)" : "var(--mute)" }}>{w.active ? "active" : "inactive"}</td>
                      <td>
                        <button className="btn" style={{ padding: "2px 8px" }} onClick={() => void n8nToggle(w)}>{w.active ? "deactivate" : "activate"}</button>{" "}
                        <button className="btn" style={{ padding: "2px 8px" }} onClick={() => void n8nRun(w)}>run now</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ManagePanel>
          )}
        </div>
      )}
    </div>
  );
}

function ManagePanel({ title, head, err, children }: { title: string; head: string; err?: string; children?: React.ReactNode }) {
  return (
    <div className="panel" style={{ padding: 14, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <span className="mono" style={{ fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--pink)" }}>{title}</span>
        <span className="mono" style={{ fontSize: 12, color: "var(--mute)" }}>{head}</span>
      </div>
      {err ? <div style={{ fontSize: 12, color: "var(--mute)" }}>{err}</div> : children}
    </div>
  );
}
function SubHead({ children }: { children: React.ReactNode }) {
  return <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--mute)", margin: "10px 0 6px" }}>{children}</div>;
}
function StateDot({ state }: { state: string }) {
  const color = state === "ready" ? "#22c55e" : state === "error" || state === "canceled" ? "#ef4444" : state === "building" || state === "initializing" || state === "queued" ? "#f59e0b" : "#888";
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color, marginRight: 6, verticalAlign: "middle" }} />;
}
function RunDot({ status, conclusion }: { status: string; conclusion: string | null }) {
  const color = status !== "completed" ? "#f59e0b" : conclusion === "success" ? "#22c55e" : conclusion === "failure" ? "#ef4444" : "#888";
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color, marginTop: 6 }} />;
}
function ago(ms: number): string {
  if (!ms) return "—";
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const inp: React.CSSProperties = {
  background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 6,
  color: "var(--ink)", padding: "6px 8px", fontSize: 12, fontFamily: "ui-monospace, monospace", outline: "none",
};
