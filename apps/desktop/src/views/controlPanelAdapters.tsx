// Control Panel service adapters. One entry per service: how to TEST a stored
// credential, how to PULL a live summary + drill-down groups, and the per-row
// WRITE actions. The Control Panel shell renders whatever shape these return,
// so adding a service or an action never touches the shell.
//
// Everything goes through window.hub.net (a CORS-free fetch in the main
// process) so we can talk to any of the user's own services with their own
// stored token. Nothing is bundled; creds come from the OS-keychain vault.

import type { ReactNode } from "react";

export type Cred = { token: string; baseUrl: string };

type NetResp<T = unknown> = { ok: boolean; status: number; data?: T; error?: string };
async function net<T = unknown>(opts: { method: string; url: string; headers?: Record<string, string>; body?: unknown }): Promise<NetResp<T>> {
  return (await window.hub.net(opts)) as NetResp<T>;
}

// A row action is either a one-click button (run) or an inline composer
// that pops a tiny form right under the row, collects a value, then runs.
export type RowAction = {
  label: string;
  danger?: boolean;
  run?: () => Promise<string>;
  // For inline composer-style actions (replaces window.prompt).
  prompt?: { placeholder: string; initial?: string; submitLabel?: string };
  runWith?: (value: string) => Promise<string>;
};
export type ManageRow = {
  id: string;
  cells: ReactNode[];
  actions?: RowAction[];
  // Optional drill-down: returns nested groups rendered when the row expands.
  expand?: () => Promise<ManageGroup[]>;
};
export type ManageGroup = { title: string; columns: string[]; rows: ManageRow[]; note?: string };
// A small inline form (create issue, new workflow, …).
export type Composer = {
  title: string;
  fields: { key: string; placeholder: string }[];
  submitLabel: string;
  submit: (vals: Record<string, string>) => Promise<string>;
};
export type ManageResult = { summary: string; groups: ManageGroup[]; composers?: Composer[]; error?: string };

export type Adapter = {
  id: string;
  hasLive: boolean;
  test?: (cred: Cred) => Promise<{ ok: boolean; detail: string }>;
  pull?: (cred: Cred) => Promise<ManageResult>;
};

const trim = (u: string) => u.replace(/\/+$/, "");
const ago = (ms: number) => {
  if (!ms) return "—";
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
const okMsg = (r: NetResp, good: string) => (r.ok ? good : `failed (${r.status}${r.error ? `: ${r.error}` : ""})`);

// ── GitHub ──────────────────────────────────────────────────────────────────
const gh = (t: string) => ({ Authorization: `Bearer ${t}`, Accept: "application/vnd.github+json", "User-Agent": "NetworkChuckHub" });
const github: Adapter = {
  id: "github", hasLive: true,
  test: async (c) => {
    const r = await net<{ login?: string }>({ method: "GET", url: "https://api.github.com/user", headers: gh(c.token) });
    return { ok: r.ok, detail: r.ok ? `authenticated as ${r.data?.login}` : `HTTP ${r.status}` };
  },
  pull: async (c) => {
    const reposR = await net<{ full_name: string; stargazers_count: number; pushed_at: string }[]>({ method: "GET", url: "https://api.github.com/user/repos?per_page=100&sort=pushed", headers: gh(c.token) });
    if (!reposR.ok) return { summary: "", groups: [], error: `HTTP ${reposR.status}` };
    const repos = Array.isArray(reposR.data) ? reposR.data : [];
    const prR = await net<{ items?: { number: number; title: string; html_url: string; repository_url: string }[] }>({ method: "GET", url: "https://api.github.com/search/issues?per_page=20&q=" + encodeURIComponent("is:open is:pr author:@me"), headers: gh(c.token) });
    const prs = prR.data?.items || [];
    // Recent action runs across the 6 most-recently-pushed repos.
    const runRows: ManageRow[] = [];
    await Promise.all(repos.slice(0, 6).map(async (rp) => {
      const r = await net<{ workflow_runs?: { id: number; name: string; status: string; conclusion: string | null; html_url: string }[] }>({ method: "GET", url: `https://api.github.com/repos/${rp.full_name}/actions/runs?per_page=2`, headers: gh(c.token) });
      (r.data?.workflow_runs || []).forEach((it) => runRows.push({
        id: `${rp.full_name}#${it.id}`,
        cells: [dot(it.status !== "completed" ? "amber" : it.conclusion === "success" ? "green" : it.conclusion === "failure" ? "red" : "grey"), it.name || "workflow", rp.full_name, it.conclusion || it.status],
        actions: [
          { label: "open", run: async () => { window.open(it.html_url, "_blank"); return "opened"; } },
          { label: "re-run", run: async () => okMsg(await net({ method: "POST", url: `https://api.github.com/repos/${rp.full_name}/actions/runs/${it.id}/rerun`, headers: gh(c.token) }), "re-run queued") },
        ],
      }));
    }));
    return {
      summary: `${repos.length} repos · ${prs.length} open PRs · ${runRows.length} recent runs`,
      composers: [{
        title: "New issue", submitLabel: "Create", fields: [{ key: "repo", placeholder: "owner/repo" }, { key: "title", placeholder: "issue title" }, { key: "body", placeholder: "body (optional)" }],
        submit: async (v) => { if (!v.repo || !v.title) return "repo + title required"; return okMsg(await net({ method: "POST", url: `https://api.github.com/repos/${v.repo}/issues`, headers: gh(c.token), body: { title: v.title, body: v.body || "" } }), `issue opened in ${v.repo}`); },
      }],
      groups: [
        { title: "Top repos", columns: ["repo", "stars", ""], rows: [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 6).map((r) => ({ id: r.full_name, cells: [r.full_name, `★ ${r.stargazers_count}`, ""], actions: [{ label: "open", run: async () => { window.open(`https://github.com/${r.full_name}`, "_blank"); return "opened"; } }] })) },
        { title: "Your open PRs", columns: ["pr", "title", ""], note: prs.length ? undefined : "No open PRs.", rows: prs.map((p) => ({
          id: p.html_url,
          cells: [`#${p.number}`, p.title, (p.repository_url || "").replace("https://api.github.com/repos/", "")],
          actions: [
            { label: "open", run: async () => { window.open(p.html_url, "_blank"); return "opened"; } },
            { label: "close", danger: true, run: async () => { const repo = (p.repository_url || "").replace("https://api.github.com/repos/", ""); return okMsg(await net({ method: "PATCH", url: `https://api.github.com/repos/${repo}/pulls/${p.number}`, headers: gh(c.token), body: { state: "closed" } }), `#${p.number} closed`); } },
          ],
        })) },
        { title: "Recent Action runs", columns: ["", "workflow", "repo", "result"], note: runRows.length ? undefined : "No recent runs.", rows: runRows },
      ],
    };
  },
};

// ── Vercel ──────────────────────────────────────────────────────────────────
const vercel: Adapter = {
  id: "vercel", hasLive: true,
  test: async (c) => {
    const r = await net<{ user?: { username?: string } }>({ method: "GET", url: "https://api.vercel.com/v2/user", headers: { Authorization: `Bearer ${c.token}` } });
    return { ok: r.ok, detail: r.ok ? `authenticated as ${r.data?.user?.username || "user"}` : `HTTP ${r.status}` };
  },
  pull: async (c) => {
    const auth = { Authorization: `Bearer ${c.token}` };
    const teamsR = await net<{ teams?: { id: string; slug: string; name: string }[] }>({ method: "GET", url: "https://api.vercel.com/v2/teams?limit=20", headers: auth });
    if (!teamsR.ok) return { summary: "", groups: [], error: `HTTP ${teamsR.status}` };
    const teams = teamsR.data?.teams || [];
    const scopes: { id?: string; slug: string }[] = [{ slug: "personal" }, ...teams];
    type Dep = { uid?: string; name: string; state?: string; readyState?: string; created?: number; createdAt?: number; url?: string; meta?: { githubCommitRef?: string; githubCommitMessage?: string } };
    type Proj = { id: string; name: string; framework?: string };
    const deps: { d: Dep; team?: string; scope: string }[] = [];
    const projs: { p: Proj; team?: string; scope: string }[] = [];
    for (const sc of scopes) {
      const qs = sc.id ? `&teamId=${encodeURIComponent(sc.id)}` : "";
      const dR = await net<{ deployments?: Dep[] }>({ method: "GET", url: `https://api.vercel.com/v6/deployments?limit=10${qs}`, headers: auth });
      (dR.data?.deployments || []).forEach((d) => deps.push({ d, team: sc.id, scope: sc.slug }));
      const pR = await net<{ projects?: Proj[] }>({ method: "GET", url: `https://api.vercel.com/v9/projects?limit=20${qs}`, headers: auth });
      (pR.data?.projects || []).forEach((p) => projs.push({ p, team: sc.id, scope: sc.slug }));
    }
    deps.sort((a, b) => (b.d.created ?? b.d.createdAt ?? 0) - (a.d.created ?? a.d.createdAt ?? 0));
    const teamQs = (team?: string) => (team ? `?teamId=${encodeURIComponent(team)}` : "");
    return {
      summary: `${deps.length} deployments · ${projs.length} projects · ${teams.length} teams`,
      groups: [
        { title: "Recent deployments", columns: ["", "project", "scope", "branch / commit", "age", ""], rows: deps.slice(0, 16).map(({ d, team, scope }) => {
          const state = (d.state || d.readyState || "?").toLowerCase();
          return {
            id: d.uid || d.name + (d.created || 0),
            cells: [dot(state === "ready" ? "green" : state === "error" || state === "canceled" ? "red" : state === "building" || state === "queued" || state === "initializing" ? "amber" : "grey"), d.name, scope, `${d.meta?.githubCommitRef || ""} ${d.meta?.githubCommitMessage ? "· " + d.meta.githubCommitMessage.slice(0, 32) : ""}`, ago(d.created ?? d.createdAt ?? 0), state],
            actions: [
              ...(d.url ? [{ label: "open", run: async () => { window.open(`https://${d.url}`, "_blank"); return "opened"; } }] : []),
              { label: "redeploy", run: async () => okMsg(await net({ method: "POST", url: `https://api.vercel.com/v13/deployments${teamQs(team)}`, headers: auth, body: { name: d.name, deploymentId: d.uid, target: "production" } }), `redeploy queued for ${d.name}`) },
              { label: "promote", run: async () => {
                const projR = await net<{ id?: string }>({ method: "GET", url: `https://api.vercel.com/v9/projects/${encodeURIComponent(d.name)}${teamQs(team)}`, headers: auth });
                if (!projR.data?.id) return "couldn't resolve project";
                return okMsg(await net({ method: "POST", url: `https://api.vercel.com/v10/projects/${projR.data.id}/promote/${d.uid}${teamQs(team)}`, headers: auth }), `${d.name} promoted`);
              } },
              ...((state === "building" || state === "queued" || state === "initializing") ? [{ label: "cancel", danger: true, run: async () => okMsg(await net({ method: "PATCH", url: `https://api.vercel.com/v12/deployments/${d.uid}/cancel${teamQs(team)}`, headers: auth }), `${d.name} cancelled`) }] : []),
            ],
          };
        }) },
        { title: "Projects", columns: ["project", "framework", "scope"], rows: projs.map(({ p, team, scope }) => ({
          id: p.id,
          cells: [p.name, p.framework || "—", scope],
          actions: [{ label: "open", run: async () => { window.open(`https://vercel.com/${scope === "personal" ? "" : scope + "/"}${p.name}`, "_blank"); return "opened"; } }],
          expand: async () => {
            const envR = await net<{ envs?: { id: string; key: string; target?: string[]; type: string }[] }>({ method: "GET", url: `https://api.vercel.com/v9/projects/${p.id}/env${teamQs(team)}`, headers: auth });
            const envs = envR.data?.envs || [];
            return [{ title: `Environment variables (${envs.length})`, columns: ["key", "type", "targets"], note: envs.length ? "Values are write-only via the API; keys + targets shown." : "No env vars.", rows: envs.map((e) => ({ id: e.id, cells: [e.key, e.type, (e.target || []).join(", ")] })) }];
          },
        })) },
      ],
    };
  },
};

// ── Cloudflare ───────────────────────────────────────────────────────────────
const cloudflare: Adapter = {
  id: "cloudflare", hasLive: true,
  test: async (c) => {
    const r = await net<{ result?: { status?: string } }>({ method: "GET", url: "https://api.cloudflare.com/client/v4/user/tokens/verify", headers: { Authorization: `Bearer ${c.token}` } });
    return { ok: r.ok && r.data?.result?.status === "active", detail: r.ok ? `token ${r.data?.result?.status}` : `HTTP ${r.status}` };
  },
  pull: async (c) => {
    const auth = { Authorization: `Bearer ${c.token}` };
    const r = await net<{ result?: { id: string; name: string; status: string; development_mode?: number }[] }>({ method: "GET", url: "https://api.cloudflare.com/client/v4/zones?per_page=50", headers: auth });
    if (!r.ok) return { summary: "", groups: [], error: `HTTP ${r.status}` };
    const zones = r.data?.result || [];
    return {
      summary: `${zones.filter((z) => z.status === "active").length} / ${zones.length} zones active`,
      groups: [{ title: "Zones", columns: ["zone", "status", ""], rows: zones.map((z) => ({
        id: z.id,
        cells: [z.name, z.status, z.development_mode ? "dev mode ON" : ""],
        actions: [
          { label: "purge cache", danger: true, run: async () => okMsg(await net({ method: "POST", url: `https://api.cloudflare.com/client/v4/zones/${z.id}/purge_cache`, headers: auth, body: { purge_everything: true } }), `purged ${z.name}`) },
          { label: z.development_mode ? "dev off" : "dev on", run: async () => okMsg(await net({ method: "PATCH", url: `https://api.cloudflare.com/client/v4/zones/${z.id}/settings/development_mode`, headers: auth, body: { value: z.development_mode ? "off" : "on" } }), `dev mode toggled`) },
        ],
        expand: async () => {
          const dnsR = await net<{ result?: { id: string; type: string; name: string; content: string; proxied: boolean }[] }>({ method: "GET", url: `https://api.cloudflare.com/client/v4/zones/${z.id}/dns_records?per_page=100`, headers: auth });
          const recs = dnsR.data?.result || [];
          return [{ title: `DNS records (${recs.length})`, columns: ["type", "name", "content", "proxied"], rows: recs.map((d) => ({ id: d.id, cells: [d.type, d.name, d.content, d.proxied ? "yes" : "no"] })) }];
        },
      })) }],
    };
  },
};

// ── Tailscale ────────────────────────────────────────────────────────────────
const tailscale: Adapter = {
  id: "tailscale", hasLive: true,
  test: async (c) => {
    const r = await net({ method: "GET", url: "https://api.tailscale.com/api/v2/tailnet/-/devices", headers: { Authorization: `Bearer ${c.token}` } });
    return { ok: r.ok, detail: r.ok ? "key valid" : `HTTP ${r.status}` };
  },
  pull: async (c) => {
    const auth = { Authorization: `Bearer ${c.token}` };
    const r = await net<{ devices?: { id: string; name: string; os: string; lastSeen?: string; addresses?: string[]; authorized?: boolean; tags?: string[] }[] }>({ method: "GET", url: "https://api.tailscale.com/api/v2/tailnet/-/devices", headers: auth });
    if (!r.ok) return { summary: "", groups: [], error: `HTTP ${r.status}` };
    const devices = r.data?.devices || [];
    const online = devices.filter((d) => d.lastSeen && Date.now() - new Date(d.lastSeen).getTime() < 5 * 60 * 1000).length;
    return {
      summary: `${online} of ${devices.length} devices recently online`,
      groups: [{ title: "Devices", columns: ["", "device", "os", "ip", "last seen", ""], rows: devices.map((d) => {
        const seen = d.lastSeen ? new Date(d.lastSeen).getTime() : 0;
        const isOn = seen > 0 && Date.now() - seen < 5 * 60 * 1000;
        return {
          id: d.id,
          cells: [dot(isOn ? "green" : "grey"), d.name, d.os, (d.addresses || [])[0] || "", d.lastSeen ? ago(seen) : "—", (d.tags || []).join(", ")],
          actions: [
            ...(d.authorized === false ? [{ label: "authorize", run: async () => okMsg(await net({ method: "POST", url: `https://api.tailscale.com/api/v2/device/${d.id}/authorized`, headers: auth, body: { authorized: true } }), "authorized") }] : []),
            { label: "set tag",
              prompt: { placeholder: "tag:server", initial: (d.tags || [])[0] || "tag:", submitLabel: "Apply" },
              runWith: async (tag) => {
                if (!tag.trim()) return "cancelled";
                return okMsg(await net({ method: "POST", url: `https://api.tailscale.com/api/v2/device/${d.id}/tags`, headers: auth, body: { tags: [tag.trim()] } }), `tag set on ${d.name}`);
              } },
            { label: "delete", danger: true, run: async () => okMsg(await net({ method: "DELETE", url: `https://api.tailscale.com/api/v2/device/${d.id}`, headers: auth }), `${d.name} removed`) },
          ],
        };
      }) }],
    };
  },
};

// ── n8n ──────────────────────────────────────────────────────────────────────
const n8n: Adapter = {
  id: "n8n", hasLive: true,
  test: async (c) => {
    if (!c.baseUrl) return { ok: false, detail: "set base URL" };
    const r = await net({ method: "GET", url: `${trim(c.baseUrl)}/api/v1/workflows?limit=1`, headers: { "X-N8N-API-KEY": c.token, Accept: "application/json" } });
    return { ok: r.ok, detail: r.ok ? "key valid" : `HTTP ${r.status}` };
  },
  pull: async (c) => {
    if (!c.baseUrl) return { summary: "", groups: [], error: "set base URL" };
    const h = { "X-N8N-API-KEY": c.token, Accept: "application/json" };
    const wfR = await net<{ data?: { id: string; name: string; active: boolean }[] }>({ method: "GET", url: `${trim(c.baseUrl)}/api/v1/workflows`, headers: h });
    if (!wfR.ok) return { summary: "", groups: [], error: `HTTP ${wfR.status}` };
    const wf = wfR.data?.data || [];
    const exR = await net<{ data?: { id: string; finished: boolean; mode: string; status?: string; startedAt?: string; workflowId?: string }[] }>({ method: "GET", url: `${trim(c.baseUrl)}/api/v1/executions?limit=10`, headers: h });
    const ex = exR.data?.data || [];
    return {
      summary: `${wf.filter((w) => w.active).length} / ${wf.length} workflows active`,
      groups: [
        { title: "Workflows", columns: ["workflow", "state", ""], rows: wf.map((w) => ({
          id: w.id,
          cells: [w.name, w.active ? "active" : "inactive", ""],
          actions: [
            { label: w.active ? "deactivate" : "activate", run: async () => okMsg(await net({ method: "POST", url: `${trim(c.baseUrl)}/api/v1/workflows/${w.id}/${w.active ? "deactivate" : "activate"}`, headers: h }), `${w.name} toggled`) },
            { label: "run now", run: async () => okMsg(await net({ method: "POST", url: `${trim(c.baseUrl)}/api/v1/workflows/${w.id}/execute`, headers: h }), `${w.name} executed`) },
          ],
        })) },
        { title: "Recent executions", columns: ["id", "workflow", "mode", "result", "when"], note: ex.length ? undefined : "No executions.", rows: ex.map((e) => ({
          id: e.id,
          cells: [e.id, wf.find((w) => w.id === e.workflowId)?.name || e.workflowId || "—", e.mode, e.finished ? (e.status || "done") : "running", e.startedAt ? ago(Date.parse(e.startedAt)) : "—"],
        })) },
      ],
    };
  },
};

// ── Supabase ─────────────────────────────────────────────────────────────────
const supabase: Adapter = {
  id: "supabase", hasLive: true,
  test: async (c) => {
    const r = await net({ method: "GET", url: "https://api.supabase.com/v1/projects", headers: { Authorization: `Bearer ${c.token}` } });
    return { ok: r.ok, detail: r.ok ? "token valid" : `HTTP ${r.status}` };
  },
  pull: async (c) => {
    const r = await net<{ id: string; name: string; region: string; status: string; created_at: string }[]>({ method: "GET", url: "https://api.supabase.com/v1/projects", headers: { Authorization: `Bearer ${c.token}` } });
    if (!r.ok) return { summary: "", groups: [], error: `HTTP ${r.status}` };
    const projects = Array.isArray(r.data) ? r.data : [];
    return {
      summary: `${projects.length} project${projects.length === 1 ? "" : "s"}`,
      groups: [{ title: "Projects", columns: ["", "name", "region", "status", "created"], rows: projects.map((p) => ({
        id: p.id,
        cells: [dot(p.status === "ACTIVE_HEALTHY" ? "green" : "amber"), p.name, p.region, p.status, ago(Date.parse(p.created_at))],
        actions: [{ label: "open", run: async () => { window.open(`https://supabase.com/dashboard/project/${p.id}`, "_blank"); return "opened"; } }],
      })) }],
    };
  },
};

// ── YouTube (Data API key → most-popular as a health/sample panel) ───────────
const youtube: Adapter = {
  id: "youtube", hasLive: true,
  test: async (c) => {
    const r = await net({ method: "GET", url: `https://www.googleapis.com/youtube/v3/videos?part=id&chart=mostPopular&maxResults=1&key=${encodeURIComponent(c.token)}` });
    return { ok: r.ok, detail: r.ok ? "key valid" : `HTTP ${r.status}` };
  },
  pull: async (c) => {
    const r = await net<{ items?: { id: string; snippet?: { title: string; channelTitle: string }; statistics?: { viewCount: string } }[] }>({ method: "GET", url: `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&maxResults=10&key=${encodeURIComponent(c.token)}` });
    if (!r.ok) return { summary: "", groups: [], error: `HTTP ${r.status}` };
    const items = r.data?.items || [];
    return {
      summary: "Data API key valid · trending sample",
      groups: [{ title: "Trending now", columns: ["title", "channel", "views", ""], note: "A Data API key can't read 'my channel' (needs OAuth); showing trending as a key-health sample.", rows: items.map((v) => ({
        id: v.id,
        cells: [v.snippet?.title || "—", v.snippet?.channelTitle || "—", Number(v.statistics?.viewCount || 0).toLocaleString(), ""],
        actions: [{ label: "open", run: async () => { window.open(`https://youtube.com/watch?v=${v.id}`, "_blank"); return "opened"; } }],
      })) }],
    };
  },
};

// ── Home Assistant ───────────────────────────────────────────────────────────
const homeassistant: Adapter = {
  id: "homeassistant", hasLive: true,
  test: async (c) => {
    if (!c.baseUrl) return { ok: false, detail: "set base URL" };
    const r = await net<{ message?: string }>({ method: "GET", url: `${trim(c.baseUrl)}/api/`, headers: { Authorization: `Bearer ${c.token}` } });
    return { ok: r.ok, detail: r.ok ? (r.data?.message || "API running") : `HTTP ${r.status}` };
  },
  pull: async (c) => {
    if (!c.baseUrl) return { summary: "", groups: [], error: "set base URL" };
    const auth = { Authorization: `Bearer ${c.token}` };
    const r = await net<{ entity_id: string; state: string; attributes?: { friendly_name?: string } }[]>({ method: "GET", url: `${trim(c.baseUrl)}/api/states`, headers: auth });
    if (!r.ok) return { summary: "", groups: [], error: `HTTP ${r.status}` };
    const states = Array.isArray(r.data) ? r.data : [];
    const controllable = states.filter((s) => /^(light|switch|fan|input_boolean|cover)\./.test(s.entity_id));
    const byDomain: Record<string, typeof states> = {};
    for (const s of states) { const d = s.entity_id.split(".")[0]; (byDomain[d] ||= []).push(s); }
    const domainSummary = Object.entries(byDomain).sort((a, b) => b[1].length - a[1].length).slice(0, 6).map(([d, arr]) => `${d}:${arr.length}`).join(" · ");
    return {
      summary: `${states.length} entities · ${domainSummary}`,
      groups: [{ title: "Controllable entities", columns: ["", "entity", "state", ""], note: controllable.length ? undefined : "No light/switch/fan/cover entities.", rows: controllable.slice(0, 60).map((s) => {
        const domain = s.entity_id.split(".")[0];
        const on = ["on", "open", "true"].includes(s.state);
        return {
          id: s.entity_id,
          cells: [dot(on ? "green" : "grey"), s.attributes?.friendly_name || s.entity_id, s.state, ""],
          actions: [{ label: "toggle", run: async () => okMsg(await net({ method: "POST", url: `${trim(c.baseUrl)}/api/services/${domain}/toggle`, headers: auth, body: { entity_id: s.entity_id } }), `${s.entity_id} toggled`) }],
        };
      }) }],
    };
  },
};

// ── Proxmox ──────────────────────────────────────────────────────────────────
const proxmox: Adapter = {
  id: "proxmox", hasLive: true,
  test: async (c) => {
    if (!c.baseUrl) return { ok: false, detail: "set base URL" };
    const r = await net<{ data?: { version?: string } }>({ method: "GET", url: `${trim(c.baseUrl)}/api2/json/version`, headers: { Authorization: `PVEAPIToken=${c.token}` } });
    return { ok: r.ok, detail: r.ok ? `PVE ${r.data?.data?.version || "ok"}` : `HTTP ${r.status}` };
  },
  pull: async (c) => {
    if (!c.baseUrl) return { summary: "", groups: [], error: "set base URL" };
    const auth = { Authorization: `PVEAPIToken=${c.token}` };
    const r = await net<{ data?: { node: string; status: string; maxmem?: number; mem?: number; cpu?: number }[] }>({ method: "GET", url: `${trim(c.baseUrl)}/api2/json/nodes`, headers: auth });
    if (!r.ok) return { summary: "", groups: [], error: `HTTP ${r.status}` };
    const nodes = r.data?.data || [];
    return {
      summary: `${nodes.filter((n) => n.status === "online").length} / ${nodes.length} nodes online`,
      groups: [{ title: "Nodes", columns: ["", "node", "status", "mem", "cpu"], rows: nodes.map((n) => ({
        id: n.node,
        cells: [dot(n.status === "online" ? "green" : "grey"), n.node, n.status, n.maxmem ? `${((n.mem || 0) / (n.maxmem || 1) * 100).toFixed(0)}%` : "—", n.cpu != null ? `${(n.cpu * 100).toFixed(0)}%` : "—"],
        expand: async () => {
          const vmR = await net<{ data?: { vmid: number; name: string; status: string }[] }>({ method: "GET", url: `${trim(c.baseUrl)}/api2/json/nodes/${n.node}/qemu`, headers: auth });
          const vms = vmR.data?.data || [];
          return [{ title: `VMs on ${n.node} (${vms.length})`, columns: ["", "vmid", "name", "status", ""], rows: vms.map((vm) => ({
            id: `${n.node}-${vm.vmid}`,
            cells: [dot(vm.status === "running" ? "green" : "grey"), String(vm.vmid), vm.name, vm.status, ""],
            actions: [
              { label: vm.status === "running" ? "stop" : "start", danger: vm.status === "running", run: async () => okMsg(await net({ method: "POST", url: `${trim(c.baseUrl)}/api2/json/nodes/${n.node}/qemu/${vm.vmid}/status/${vm.status === "running" ? "stop" : "start"}`, headers: auth }), `${vm.name} ${vm.status === "running" ? "stopping" : "starting"}`) },
              { label: "reboot", run: async () => okMsg(await net({ method: "POST", url: `${trim(c.baseUrl)}/api2/json/nodes/${n.node}/qemu/${vm.vmid}/status/reboot`, headers: auth }), `${vm.name} rebooting`) },
            ],
          })) }];
        },
      })) }],
    };
  },
};

// ── Portainer ────────────────────────────────────────────────────────────────
const portainer: Adapter = {
  id: "portainer", hasLive: true,
  test: async (c) => {
    if (!c.baseUrl) return { ok: false, detail: "set base URL" };
    const r = await net({ method: "GET", url: `${trim(c.baseUrl)}/api/status`, headers: { "X-API-Key": c.token } });
    return { ok: r.ok, detail: r.ok ? "key valid" : `HTTP ${r.status}` };
  },
  pull: async (c) => {
    if (!c.baseUrl) return { summary: "", groups: [], error: "set base URL" };
    const auth = { "X-API-Key": c.token };
    const r = await net<{ Id: number; Name: string }[]>({ method: "GET", url: `${trim(c.baseUrl)}/api/endpoints`, headers: auth });
    if (!r.ok) return { summary: "", groups: [], error: `HTTP ${r.status}` };
    const endpoints = Array.isArray(r.data) ? r.data : [];
    return {
      summary: `${endpoints.length} environment${endpoints.length === 1 ? "" : "s"}`,
      groups: [{ title: "Environments", columns: ["endpoint", ""], rows: endpoints.map((ep) => ({
        id: String(ep.Id),
        cells: [ep.Name, ""],
        expand: async () => {
          const cR = await net<{ Id: string; Names: string[]; State: string; Image: string }[]>({ method: "GET", url: `${trim(c.baseUrl)}/api/endpoints/${ep.Id}/docker/containers/json?all=1`, headers: auth });
          const containers = Array.isArray(cR.data) ? cR.data : [];
          return [{ title: `Containers (${containers.length})`, columns: ["", "name", "image", "state", ""], rows: containers.map((ct) => ({
            id: ct.Id,
            cells: [dot(ct.State === "running" ? "green" : "grey"), (ct.Names[0] || "").replace(/^\//, ""), ct.Image, ct.State, ""],
            actions: [
              { label: ct.State === "running" ? "stop" : "start", danger: ct.State === "running", run: async () => okMsg(await net({ method: "POST", url: `${trim(c.baseUrl)}/api/endpoints/${ep.Id}/docker/containers/${ct.Id}/${ct.State === "running" ? "stop" : "start"}`, headers: auth }), "done") },
              { label: "restart", run: async () => okMsg(await net({ method: "POST", url: `${trim(c.baseUrl)}/api/endpoints/${ep.Id}/docker/containers/${ct.Id}/restart`, headers: auth }), "restarting") },
            ],
          })) }];
        },
      })) }],
    };
  },
};

// ── Pi-hole (v5 admin API) ────────────────────────────────────────────────────
const pihole: Adapter = {
  id: "pihole", hasLive: true,
  test: async (c) => {
    if (!c.baseUrl) return { ok: false, detail: "set base URL" };
    const r = await net<{ status?: string }>({ method: "GET", url: `${trim(c.baseUrl)}/admin/api.php?summaryRaw&auth=${encodeURIComponent(c.token)}` });
    return { ok: r.ok && !!r.data?.status, detail: r.ok ? `Pi-hole ${r.data?.status}` : `HTTP ${r.status}` };
  },
  pull: async (c) => {
    if (!c.baseUrl) return { summary: "", groups: [], error: "set base URL" };
    const base = trim(c.baseUrl);
    const r = await net<{ status?: string; dns_queries_today?: number; ads_blocked_today?: number; ads_percentage_today?: number; domains_being_blocked?: number }>({ method: "GET", url: `${base}/admin/api.php?summaryRaw&auth=${encodeURIComponent(c.token)}` });
    if (!r.ok) return { summary: "", groups: [], error: `HTTP ${r.status}` };
    const d = r.data || {};
    return {
      summary: `${d.status || "?"} · ${(d.ads_percentage_today || 0).toFixed(1)}% blocked today`,
      groups: [{ title: "Today", columns: ["metric", "value", ""], rows: [
        { id: "queries", cells: ["DNS queries", (d.dns_queries_today || 0).toLocaleString(), ""] },
        { id: "blocked", cells: ["Ads blocked", (d.ads_blocked_today || 0).toLocaleString(), ""] },
        { id: "list", cells: ["Domains on blocklist", (d.domains_being_blocked || 0).toLocaleString(), ""] },
        { id: "status", cells: ["Status", d.status || "?", ""], actions: [
          { label: "disable 60s", danger: true, run: async () => okMsg(await net({ method: "GET", url: `${base}/admin/api.php?disable=60&auth=${encodeURIComponent(c.token)}` }), "disabled 60s") },
          { label: "enable", run: async () => okMsg(await net({ method: "GET", url: `${base}/admin/api.php?enable&auth=${encodeURIComponent(c.token)}` }), "enabled") },
        ] },
      ] }],
    };
  },
};

// ── Frigate (base URL only) ───────────────────────────────────────────────────
const frigate: Adapter = {
  id: "frigate", hasLive: true,
  test: async (c) => {
    if (!c.baseUrl) return { ok: false, detail: "set base URL" };
    const r = await net({ method: "GET", url: `${trim(c.baseUrl)}/api/version` });
    return { ok: r.ok, detail: r.ok ? "reachable" : `HTTP ${r.status}` };
  },
  pull: async (c) => {
    if (!c.baseUrl) return { summary: "", groups: [], error: "set base URL" };
    const base = trim(c.baseUrl);
    const statsR = await net<Record<string, { camera_fps?: number; detection_fps?: number }>>({ method: "GET", url: `${base}/api/stats` });
    if (!statsR.ok) return { summary: "", groups: [], error: `HTTP ${statsR.status}` };
    const stats = statsR.data || {};
    const cams = Object.entries(stats).filter(([k]) => !["detectors", "service", "cpu_usages", "gpu_usages", "processes"].includes(k));
    return {
      summary: `${cams.length} camera${cams.length === 1 ? "" : "s"}`,
      groups: [{ title: "Cameras", columns: ["camera", "camera fps", "detection fps", ""], rows: cams.map(([name, s]) => ({
        id: name,
        cells: [name, String(s.camera_fps ?? "—"), String(s.detection_fps ?? "—"), ""],
        actions: [{ label: "open", run: async () => { window.open(`${base}/cameras/${name}`, "_blank"); return "opened"; } }],
      })) }],
    };
  },
};

// ── Hermes (OpenAI-compatible self-hosted AI) ─────────────────────────────────
const hermes: Adapter = {
  id: "hermes", hasLive: true,
  test: async (c) => {
    if (!c.baseUrl) return { ok: false, detail: "set base URL" };
    const h = c.token ? { Authorization: `Bearer ${c.token}` } : undefined;
    const r = await net({ method: "GET", url: `${trim(c.baseUrl)}/v1/models`, headers: h });
    return { ok: r.ok, detail: r.ok ? "reachable" : `HTTP ${r.status}` };
  },
  pull: async (c) => {
    if (!c.baseUrl) return { summary: "", groups: [], error: "set base URL" };
    const h = c.token ? { Authorization: `Bearer ${c.token}` } : undefined;
    const r = await net<{ data?: { id: string; owned_by?: string }[] }>({ method: "GET", url: `${trim(c.baseUrl)}/v1/models`, headers: h });
    if (!r.ok) return { summary: "", groups: [], error: `HTTP ${r.status}` };
    const models = r.data?.data || [];
    return {
      summary: `${models.length} model${models.length === 1 ? "" : "s"} available`,
      groups: [{ title: "Models", columns: ["model", "owner"], note: "Hermes also rides in the AI Group Chat as a co-boss.", rows: models.map((m) => ({ id: m.id, cells: [m.id, m.owned_by || "—"] })) }],
    };
  },
};

// ── Hostinger (VPS API) ───────────────────────────────────────────────────────
const hostinger: Adapter = {
  id: "hostinger", hasLive: true,
  test: async (c) => {
    const r = await net({ method: "GET", url: "https://api.hostinger.com/api/vps/v1/virtual-machines", headers: { Authorization: `Bearer ${c.token}` } });
    return { ok: r.ok, detail: r.ok ? "token valid" : `HTTP ${r.status}` };
  },
  pull: async (c) => {
    const auth = { Authorization: `Bearer ${c.token}` };
    const r = await net<{ id: number; hostname?: string; state?: string; plan?: string }[]>({ method: "GET", url: "https://api.hostinger.com/api/vps/v1/virtual-machines", headers: auth });
    if (!r.ok) return { summary: "", groups: [], error: `HTTP ${r.status}` };
    const vms = Array.isArray(r.data) ? r.data : [];
    return {
      summary: `${vms.length} VPS instance${vms.length === 1 ? "" : "s"}`,
      groups: [{ title: "Virtual machines", columns: ["", "hostname", "plan", "state", ""], rows: vms.map((vm) => ({
        id: String(vm.id),
        cells: [dot(vm.state === "running" ? "green" : "grey"), vm.hostname || `vm-${vm.id}`, vm.plan || "—", vm.state || "?", ""],
        actions: [
          { label: "restart", run: async () => okMsg(await net({ method: "POST", url: `https://api.hostinger.com/api/vps/v1/virtual-machines/${vm.id}/restart`, headers: auth }), "restarting") },
          { label: vm.state === "running" ? "stop" : "start", danger: vm.state === "running", run: async () => okMsg(await net({ method: "POST", url: `https://api.hostinger.com/api/vps/v1/virtual-machines/${vm.id}/${vm.state === "running" ? "stop" : "start"}`, headers: auth }), "done") },
        ],
      })) }],
    };
  },
};

// ── Pexels (key health) ───────────────────────────────────────────────────────
const pexels: Adapter = {
  id: "pexels", hasLive: true,
  test: async (c) => {
    const r = await net({ method: "GET", url: "https://api.pexels.com/v1/curated?per_page=1", headers: { Authorization: c.token } });
    return { ok: r.ok, detail: r.ok ? "key valid" : `HTTP ${r.status}` };
  },
  pull: async (c) => {
    const r = await net<{ total_results?: number; photos?: { id: number; photographer: string; alt: string }[] }>({ method: "GET", url: "https://api.pexels.com/v1/curated?per_page=6", headers: { Authorization: c.token } });
    if (!r.ok) return { summary: "", groups: [], error: `HTTP ${r.status}` };
    return {
      summary: "key valid · powers NT5 Studio B-roll",
      groups: [{ title: "Curated sample", columns: ["photographer", "description"], note: "Pexels is used as a media source in NT5 Studio; this just confirms the key works.", rows: (r.data?.photos || []).map((p) => ({ id: String(p.id), cells: [p.photographer, p.alt || "—"] })) }],
    };
  },
};

// ── Twingate (GraphQL) ────────────────────────────────────────────────────────
const twingate: Adapter = {
  id: "twingate", hasLive: true,
  test: async (c) => {
    if (!c.baseUrl) return { ok: false, detail: "set base URL (https://<tenant>.twingate.com)" };
    const r = await net({ method: "POST", url: `${trim(c.baseUrl)}/api/graphql/`, headers: { "X-API-KEY": c.token, "Content-Type": "application/json" }, body: { query: "{ resources(first: 1) { edges { node { id } } } }" } });
    return { ok: r.ok, detail: r.ok ? "key valid" : `HTTP ${r.status}` };
  },
  pull: async (c) => {
    if (!c.baseUrl) return { summary: "", groups: [], error: "set base URL" };
    const r = await net<{ data?: { resources?: { edges?: { node: { id: string; name: string; address?: { value: string } } }[] } } }>({ method: "POST", url: `${trim(c.baseUrl)}/api/graphql/`, headers: { "X-API-KEY": c.token, "Content-Type": "application/json" }, body: { query: "{ resources(first: 50) { edges { node { id name address { value } } } } }" } });
    if (!r.ok) return { summary: "", groups: [], error: `HTTP ${r.status}` };
    const edges = r.data?.data?.resources?.edges || [];
    return {
      summary: `${edges.length} resource${edges.length === 1 ? "" : "s"}`,
      groups: [{ title: "Resources", columns: ["name", "address"], rows: edges.map((e) => ({ id: e.node.id, cells: [e.node.name, e.node.address?.value || "—"] })) }],
    };
  },
};

// ── ZimaCube (no REST API — SSH only) ─────────────────────────────────────────
const zimacube: Adapter = {
  id: "zimacube", hasLive: true,
  pull: async () => ({
    summary: "managed over SSH",
    groups: [{ title: "ZimaCube", columns: ["note"], note: "ZimaCube (CasaOS) has no stable public REST API. Manage it over SSH from the Terminal tab, or open its web UI from the base URL you stored.", rows: [] }],
  }),
};

// ── Launchers (Modrinth / Blockbench) ─────────────────────────────────────────
function launcher(id: string, name: string, uri: string): Adapter {
  return {
    id, hasLive: true,
    pull: async () => ({
      summary: "local launcher",
      groups: [{ title: name, columns: ["action"], rows: [{ id: "launch", cells: [`Open ${name} on this machine`], actions: [{ label: `Launch ${name}`, run: async () => { await window.hub.launchUri(uri); return `launching ${name}`; } }] }] }],
    }),
  };
}

export const ADAPTERS: Record<string, Adapter> = {
  github, vercel, cloudflare, tailscale, n8n, supabase, youtube,
  homeassistant, proxmox, portainer, pihole, frigate, hermes, hostinger,
  pexels, twingate, zimacube,
  modrinth: launcher("modrinth", "Modrinth", "https://launcher.modrinth.com/"),
  blockbench: launcher("blockbench", "Blockbench", "https://www.blockbench.net/launcher"),
};

// A status dot token the shell renders into a colored bullet.
export function dot(color: "green" | "red" | "amber" | "grey"): ReactNode {
  const map = { green: "#22c55e", red: "#ef4444", amber: "#f59e0b", grey: "#888" };
  return { __dot: map[color] } as unknown as ReactNode;
}
