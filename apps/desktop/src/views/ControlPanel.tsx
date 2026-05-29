import { useEffect, useState } from "react";

// The Control Panel, reimplemented natively in-app (Option 2). Each user
// connects THEIR OWN services here; tokens are stored in the OS-keychain vault
// (main process), never bundled or committed. Connected services expose a
// deep-link to their console; live per-service panels layer on top of this.

type Service = {
  id: string;
  name: string;
  group: string;
  tokenLabel: string;
  needsBaseUrl?: boolean;
  console?: string; // deep-link to the native UI
  hint: string;
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
];

type Status = { service: string; hasToken: boolean; baseUrl: string };

export function ControlPanel() {
  const [status, setStatus] = useState<Status[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [baseUrl, setBaseUrl] = useState("");

  const [live, setLive] = useState<Record<string, string[]>>({});
  const [loadingLive, setLoadingLive] = useState<string | null>(null);

  async function refresh() {
    setStatus(await window.hub.vault.list());
  }
  useEffect(() => {
    void refresh();
  }, []);

  // Live data for the headline dev integrations, using the user's own token.
  async function loadLive(id: string) {
    setLoadingLive(id);
    try {
      const { token, baseUrl } = await window.hub.vault.get(id);
      if (!token && !baseUrl) return;
      if (id === "github") {
        const r = await window.hub.net({
          method: "GET",
          url: "https://api.github.com/user/repos?per_page=100&sort=pushed",
          headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "NetworkChuckHub" },
        });
        const repos = Array.isArray(r.data) ? (r.data as { full_name: string; stargazers_count: number }[]) : [];
        setLive((p) => ({ ...p, github: [`${repos.length} repositories`, ...repos.slice(0, 8).map((x) => `★ ${x.stargazers_count}  ${x.full_name}`)] }));
      } else if (id === "vercel") {
        // Vercel scopes deployments by team. A bare /v6/deployments call only
        // sees the token's PERSONAL scope, which is why many users see "no
        // recent deployments". Fix: list teams first, then fetch deployments
        // for the personal scope AND each team, merge, sort by createdAt desc.
        const auth = { Authorization: `Bearer ${token}` };
        type Dep = { name: string; url: string; state?: string; readyState?: string; created?: number; createdAt?: number; teamLabel?: string };
        const all: Dep[] = [];
        async function pullDeps(label: string, qs: string) {
          const r = await window.hub.net({ method: "GET", url: `https://api.vercel.com/v6/deployments?limit=8${qs}`, headers: auth });
          const deps = ((r.data as { deployments?: Dep[] })?.deployments) || [];
          for (const d of deps) all.push({ ...d, teamLabel: label });
        }
        await pullDeps("personal", "");
        const teamsRes = await window.hub.net({ method: "GET", url: "https://api.vercel.com/v2/teams?limit=20", headers: auth });
        const teams = ((teamsRes.data as { teams?: { id: string; name: string; slug: string }[] })?.teams) || [];
        for (const t of teams) await pullDeps(t.slug || t.name, `&teamId=${encodeURIComponent(t.id)}`);
        all.sort((a, b) => (b.created ?? b.createdAt ?? 0) - (a.created ?? a.createdAt ?? 0));
        const lines = all.slice(0, 12).map((d) => {
          const state = (d.state || d.readyState || "?").toLowerCase();
          return `${state.padEnd(10)} · ${d.teamLabel} · ${d.name}`;
        });
        if (!lines.length && teams.length === 0) lines.push("no deployments and no teams reachable — token may be too narrow");
        else if (!lines.length) lines.push(`scopes seen: personal, ${teams.map((t) => t.slug || t.name).join(", ")} — none have recent deployments`);
        setLive((p) => ({ ...p, vercel: lines }));
      } else if (id === "cloudflare") {
        const r = await window.hub.net({
          method: "GET",
          url: "https://api.cloudflare.com/client/v4/zones?per_page=50",
          headers: { Authorization: `Bearer ${token}` },
        });
        const zones = ((r.data as { result?: { name: string; status: string }[] })?.result) || [];
        setLive((p) => ({ ...p, cloudflare: zones.length ? zones.map((z) => `${z.status} · ${z.name}`) : ["no zones"] }));
      } else if (id === "tailscale") {
        const r = await window.hub.net({
          method: "GET",
          url: "https://api.tailscale.com/api/v2/tailnet/-/devices",
          headers: { Authorization: `Bearer ${token}` },
        });
        const devices = ((r.data as { devices?: { name: string; os: string }[] })?.devices) || [];
        setLive((p) => ({ ...p, tailscale: devices.length ? [`${devices.length} devices`, ...devices.slice(0, 8).map((d) => `${d.os} · ${d.name}`)] : ["no devices"] }));
      } else if (id === "n8n") {
        if (!baseUrl) { setLive((p) => ({ ...p, n8n: ["set the n8n base URL first"] })); return; }
        const r = await window.hub.net({
          method: "GET",
          url: `${baseUrl.replace(/\/$/, "")}/api/v1/workflows`,
          headers: { "X-N8N-API-KEY": token, Accept: "application/json" },
        });
        const wf = ((r.data as { data?: { name: string; active: boolean }[] })?.data) || [];
        setLive((p) => ({ ...p, n8n: wf.length ? wf.slice(0, 10).map((w) => `${w.active ? "active" : "off"} · ${w.name}`) : ["no workflows"] }));
      }
    } catch {
      setLive((p) => ({ ...p, [id]: ["could not load — check the token / base URL"] }));
    } finally {
      setLoadingLive(null);
    }
  }

  const LIVE_SERVICES = ["github", "vercel", "cloudflare", "tailscale", "n8n"];

  function isConnected(id: string) {
    const s = status.find((x) => x.service === id);
    const svc = SERVICES.find((x) => x.id === id)!;
    if (!s) return false;
    return svc.needsBaseUrl ? !!s.baseUrl : s.hasToken;
  }

  async function openEdit(id: string) {
    const cur = await window.hub.vault.get(id);
    setToken(cur.token);
    setBaseUrl(cur.baseUrl);
    setEditing(id);
  }
  async function saveEdit(id: string) {
    await window.hub.vault.set(id, token, baseUrl);
    setEditing(null);
    setToken("");
    setBaseUrl("");
    void refresh();
  }
  async function disconnect(id: string) {
    await window.hub.vault.remove(id);
    void refresh();
  }

  const connected = SERVICES.filter((s) => isConnected(s.id)).length;
  const groups = Array.from(new Set(SERVICES.map((s) => s.group)));

  return (
    <div className="stage">
      <div className="mono" style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "var(--mute)", display: "flex", justifyContent: "space-between" }}>
        <span>The Control Panel <span className="glow-text">· everything in one place</span></span>
        <span style={{ color: "var(--pink)" }}>{connected} / {SERVICES.length} connected</span>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        <p style={{ color: "var(--mute)", fontSize: 13, marginTop: 0, maxWidth: 680 }}>
          Connect your own services. Credentials are encrypted on this device via
          the OS keychain — they never leave your machine, are never bundled into
          the app, and are never sent anywhere except directly to that service.
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
                  <div key={s.id} className={on ? "panel-hot panel" : "panel"} style={{ padding: 12, borderColor: on ? "rgba(255,87,119,0.4)" : undefined }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="mono" style={{ fontSize: 14 }}>{s.name}</span>
                      <span className="mono" style={{ fontSize: 10, color: on ? "var(--pink)" : "var(--mute)" }}>{on ? "CONNECTED" : "OFF"}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--mute)", margin: "4px 0 10px" }}>{s.hint}</div>

                    {editing === s.id ? (
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
                          {on && <button className="btn" onClick={() => void disconnect(s.id)}>Disconnect</button>}
                          {on && LIVE_SERVICES.includes(s.id) && (
                            <button className="btn" onClick={() => void loadLive(s.id)}>{loadingLive === s.id ? "…" : "Load live"}</button>
                          )}
                          {s.console && (
                            <a className="btn" href={s.console} target="_blank" rel="noreferrer">Get token</a>
                          )}
                        </div>
                        {live[s.id] && (
                          <div className="mono" style={{ marginTop: 8, fontSize: 11, color: "var(--mute)", lineHeight: 1.5 }}>
                            {live[s.id].map((line, i) => (
                              <div key={i} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                <span className="glow-text">›</span> {line}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 6,
  color: "var(--ink)", padding: "6px 8px", fontSize: 12, fontFamily: "ui-monospace, monospace", outline: "none",
};
