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

  async function refresh() {
    setStatus(await window.hub.vault.list());
  }
  useEffect(() => {
    void refresh();
  }, []);

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
        <span>The Control Panel <span className="glow-text">· personal-ops</span></span>
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
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button className="btn" onClick={() => void openEdit(s.id)}>{on ? "Edit" : "Connect"}</button>
                        {on && <button className="btn" onClick={() => void disconnect(s.id)}>Disconnect</button>}
                        {s.console && (
                          <a className="btn" href={s.console} target="_blank" rel="noreferrer">Get token</a>
                        )}
                      </div>
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
