// Tools the Group Terminal crew can call. Each agent turn may emit a tool call
// as a fenced ```tool {json}``` block; the chat executes it, shows the call +
// result, and lets the agent continue with the result. Everything here is the
// same machine access the Terminal has, plus web + memory.

import { cpLiveSummaries, cpRecentEvents } from "../controlPanelFeed";

export type ToolResult = { ok: boolean; output: string };

export type ToolSpec = {
  name: string;
  args: string;          // human-readable arg shape for the prompt
  desc: string;
  run: (args: Record<string, unknown>, ctx: ToolCtx) => Promise<ToolResult>;
};

export type ToolCtx = {
  agentId: string;       // for per-agent memory
};

const str = (v: unknown) => (v == null ? "" : String(v));

// ── per-agent memory ────────────────────────────────────────────────────────
const MEM_KEY = "nchub.ai.memory.v1";
type MemMap = Record<string, string[]>;
export function loadMemory(): MemMap {
  try { const r = localStorage.getItem(MEM_KEY); if (r) return JSON.parse(r) as MemMap; } catch { /* ignore */ }
  return {};
}
export function saveMemory(m: MemMap) { try { localStorage.setItem(MEM_KEY, JSON.stringify(m)); } catch { /* ignore */ } }
export function agentMemory(agentId: string): string[] { return loadMemory()[agentId] || []; }
export function rememberFact(agentId: string, fact: string) {
  const m = loadMemory();
  const list = m[agentId] || [];
  if (fact.trim() && !list.includes(fact.trim())) { list.push(fact.trim()); m[agentId] = list.slice(-40); saveMemory(m); }
}
export function setAgentMemory(agentId: string, facts: string[]) {
  const m = loadMemory(); m[agentId] = facts.filter((f) => f.trim()).slice(-40); saveMemory(m);
}

// ── tool registry ─────────────────────────────────────────────────────────
export const TOOLS: ToolSpec[] = [
  {
    name: "run_shell", args: '{"command": "ls -la"}',
    desc: "Run a shell command on the user's machine and read stdout/stderr.",
    run: async (a) => {
      const r = await window.hub.tool.exec(str(a.command));
      return { ok: r.ok, output: `exit ${r.code}\n${r.stdout}${r.stderr ? "\n[stderr]\n" + r.stderr : ""}`.trim() || "(no output)" };
    },
  },
  {
    name: "read_file", args: '{"path": "C:/path/file.txt"}',
    desc: "Read a text file from disk.",
    run: async (a) => { const r = await window.hub.tool.readFile(str(a.path)); return r.ok ? { ok: true, output: r.content || "(empty)" } : { ok: false, output: r.error || "read failed" }; },
  },
  {
    name: "write_file", args: '{"path": "...", "content": "..."}',
    desc: "Write/overwrite a text file on disk.",
    run: async (a) => { const r = await window.hub.tool.writeFile(str(a.path), str(a.content)); return r.ok ? { ok: true, output: "wrote " + str(a.path) } : { ok: false, output: r.error || "write failed" }; },
  },
  {
    name: "list_dir", args: '{"path": "C:/Users/Davis"}',
    desc: "List the entries in a directory.",
    run: async (a) => {
      const r = await window.hub.tool.listDir(str(a.path));
      if (!r.ok) return { ok: false, output: r.error || "list failed" };
      return { ok: true, output: (r.entries || []).map((e) => (e.dir ? "[dir] " : "      ") + e.name).join("\n") || "(empty)" };
    },
  },
  {
    name: "web_search", args: '{"query": "..."}',
    desc: "Search the web (DuckDuckGo) and read the top results.",
    run: async (a) => {
      const r = await window.hub.net({ method: "GET", url: "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(str(a.query)), headers: { "User-Agent": "Mozilla/5.0 NetworkChuckHub/1.0" } });
      if (!r.ok || typeof r.data !== "string") return { ok: false, output: "search failed" };
      const hits = parseDdg(r.data).slice(0, 5);
      return { ok: true, output: hits.length ? hits.map((h, i) => `${i + 1}. ${h.title}\n   ${h.url}\n   ${h.snippet}`).join("\n") : "(no results)" };
    },
  },
  {
    name: "http_get", args: '{"url": "https://..."}',
    desc: "Fetch a URL and return the response body (truncated).",
    run: async (a) => {
      const r = await window.hub.net({ method: "GET", url: str(a.url), headers: { "User-Agent": "Mozilla/5.0 NetworkChuckHub/1.0" } });
      const body = typeof r.data === "string" ? r.data : JSON.stringify(r.data);
      return { ok: r.ok, output: (body || "").slice(0, 6000) };
    },
  },
  {
    name: "system_pulse", args: "{}",
    desc: "Read live CPU / memory / disk stats for this machine.",
    run: async () => { const s = await window.hub.sys.pulse(); return { ok: true, output: `CPU ${s.cpuPct}% · MEM ${s.memPct}% · ${s.memFreeGb.toFixed(1)}GB free RAM · ${s.diskFreeGb.toFixed(1)}/${s.diskTotalGb.toFixed(1)}GB free disk` }; },
  },
  {
    name: "http_request", args: '{"method":"POST","url":"https://...","headers":{"Content-Type":"application/json"},"body":{"k":"v"}}',
    desc: "Make a full HTTP request (any method, headers, JSON body) and read the status + response. For testing APIs and webhooks.",
    run: async (a) => {
      const method = (str(a.method) || "GET").toUpperCase();
      const headers = (a.headers && typeof a.headers === "object") ? a.headers as Record<string, string> : undefined;
      const r = await window.hub.net({ method, url: str(a.url), headers, body: a.body });
      const body = typeof r.data === "string" ? r.data : JSON.stringify(r.data, null, 2);
      return { ok: r.ok, output: `HTTP ${r.status}\n${(body || "").slice(0, 6000)}` };
    },
  },
  {
    name: "dns_lookup", args: '{"host":"example.com","type":"A"}',
    desc: "Resolve a hostname via DNS-over-HTTPS (Cloudflare). type can be A, AAAA, MX, TXT, NS, CNAME.",
    run: async (a) => {
      const host = str(a.host).trim(); const type = (str(a.type) || "A").toUpperCase();
      const r = await window.hub.net({ method: "GET", url: `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`, headers: { Accept: "application/dns-json" } });
      const ans = (r.data as { Answer?: { name: string; type: number; data: string; TTL: number }[] } | null)?.Answer || [];
      if (!ans.length) return { ok: true, output: `No ${type} records for ${host}.` };
      return { ok: true, output: ans.map((x) => `${x.name} ${x.TTL}s ${x.data}`).join("\n") };
    },
  },
  {
    name: "whois_ip", args: '{"ip":"8.8.8.8"}',
    desc: "Look up geolocation + network owner (ASN/org) for an IP address or domain.",
    run: async (a) => {
      const r = await window.hub.net({ method: "GET", url: `https://ipapi.co/${encodeURIComponent(str(a.ip).trim())}/json/` });
      const d = r.data as Record<string, unknown> | null;
      if (!d) return { ok: false, output: "lookup failed" };
      return { ok: true, output: `${d.ip}\norg: ${d.org}\nASN: ${d.asn}\nloc: ${d.city}, ${d.region}, ${d.country_name}\ntimezone: ${d.timezone}` };
    },
  },
  {
    name: "list_services", args: "{}",
    desc: "List which Control Panel services the user has connected (so you know what live infra you can query).",
    run: async () => {
      const list = await window.hub.vault.list();
      const connected = list.filter((s) => s.hasToken || s.baseUrl).map((s) => s.service);
      return { ok: true, output: connected.length ? "Connected services: " + connected.join(", ") : "No services connected yet." };
    },
  },
  {
    name: "remember", args: '{"fact": "Davis prefers concise replies"}',
    desc: "Save a durable note to YOUR own memory so you recall it in future chats.",
    run: async (a, ctx) => { rememberFact(ctx.agentId, str(a.fact)); return { ok: true, output: "remembered." }; },
  },
  {
    name: "control_panel_status", args: "{}",
    desc: "Get the live Control Panel board: one line per connected service with summary, row count, push-channel kind, and hot-row count. Use this before answering 'what's deploying / how's the homelab / any errors right now'.",
    run: async () => {
      const live = cpLiveSummaries();
      if (!live.length) return { ok: true, output: "(no services connected, or the Control Panel hasn't been opened yet)" };
      const lines = live.map((s) => {
        const head = `${s.service}: ${s.error ? "ERROR " + s.error : s.summary || "(no summary)"} · ${s.rowCount} rows`;
        const tags: string[] = [];
        if (s.pushKind) tags.push(`push:${s.pushKind}`);
        if (s.hotRowCount) tags.push(`hot:${s.hotRowCount}`);
        return tags.length ? `${head} [${tags.join(" ")}]` : head;
      });
      return { ok: true, output: lines.join("\n") };
    },
  },
  {
    name: "control_panel_service", args: '{"service": "Vercel"}',
    desc: "Get the detailed rows for one Control Panel service (table groups, up to 12 rows each). Use after control_panel_status to drill into specifics.",
    run: async (a) => {
      const name = str(a.service).trim().toLowerCase();
      const live = cpLiveSummaries();
      const s = live.find((x) => x.service.toLowerCase() === name) || live.find((x) => x.service.toLowerCase().includes(name));
      if (!s) return { ok: false, output: `no connected service matches "${str(a.service)}". Try control_panel_status first.` };
      if (s.error) return { ok: true, output: `${s.service}: ERROR ${s.error}` };
      const parts: string[] = [`${s.service}: ${s.summary} (${s.rowCount} rows)`];
      for (const g of s.groups) {
        parts.push(`\n# ${g.title}`);
        for (const r of g.rows) parts.push(`- ${r.cells.join(" · ")}`);
      }
      return { ok: true, output: parts.join("\n") };
    },
  },
  {
    name: "control_panel_events", args: '{"limit": 10}',
    desc: "Get recent Control Panel events (pull errors, hot-row arrivals, action results). Use to answer 'what just happened in my homelab/deploys'.",
    run: async (a) => {
      const limit = Math.max(1, Math.min(40, Number(a.limit) || 10));
      const evs = cpRecentEvents(limit);
      if (!evs.length) return { ok: true, output: "(no recent CP events)" };
      return { ok: true, output: evs.map((e) => `[${new Date(e.ts).toLocaleTimeString()}] ${e.severity.toUpperCase()} · ${e.service}: ${e.text}`).join("\n") };
    },
  },
  {
    name: "list_docs", args: "{}",
    desc: "List the user's Documents (Google Docs) that are allowed for AI access.",
    run: async () => {
      const docs = loadDocsForAI();
      if (!docs.length) return { ok: true, output: "(no allowed docs — the user hasn't added any, or has blocked them)" };
      return { ok: true, output: docs.map((d) => `${d.title} [id ${d.id}]`).join("\n") };
    },
  },
  {
    name: "read_doc", args: '{"id_or_title": "Project plan"}',
    desc: "Read the text of one of the user's allowed Documents (by id or title). Blocked docs are refused.",
    run: async (a) => {
      const key = str(a.id_or_title).trim().toLowerCase();
      const docs = loadDocsForAI();
      const doc = docs.find((d) => d.id.toLowerCase() === key || d.title.toLowerCase().includes(key));
      if (!doc) return { ok: false, output: "No allowed doc matches that. It may be blocked, or not added in the Documents tab." };
      const r = await window.hub.docs.read(doc.id);
      if (!r.ok) return { ok: false, output: r.error || "couldn't read doc" };
      return { ok: true, output: (r.text || "").slice(0, 12000) };
    },
  },
];

// Documents the AIs are allowed to see (connected + not individually blocked).
function loadDocsForAI(): { id: string; title: string }[] {
  try {
    const r = localStorage.getItem("nchub.documents.v1");
    if (!r) return [];
    const s = JSON.parse(r) as { connected?: boolean; docs?: { id: string; title: string; blocked?: boolean }[] };
    if (!s.connected) return [];
    return (s.docs || []).filter((d) => !d.blocked).map((d) => ({ id: d.id, title: d.title }));
  } catch { return []; }
}

export function toolsPromptBlock(): string {
  const list = TOOLS.map((t) => `- ${t.name} ${t.args} — ${t.desc}`).join("\n");
  return [
    "You have TOOLS. To use one, reply with ONLY a fenced block and nothing else:",
    "```tool",
    '{"tool":"run_shell","args":{"command":"echo hi"}}',
    "```",
    "You'll get the result, then continue. Use tools when they genuinely help (checking a fact, reading a file, running a command). Don't fake tool output. Available tools:",
    list,
  ].join("\n");
}

// Parse the first ```tool {...}``` block from a model reply.
export function parseToolCall(text: string): { tool: string; args: Record<string, unknown> } | null {
  const m = text.match(/```tool\s*([\s\S]*?)```/i) || text.match(/```json\s*([\s\S]*?)```/i);
  let body = m ? m[1] : "";
  if (!body) {
    // bare json object that looks like a tool call
    const j = text.match(/\{[\s\S]*"tool"[\s\S]*\}/);
    if (j) body = j[0];
  }
  if (!body) return null;
  try {
    const o = JSON.parse(body.trim());
    if (o && typeof o.tool === "string") return { tool: o.tool, args: (o.args && typeof o.args === "object") ? o.args : {} };
  } catch { /* ignore */ }
  return null;
}

export async function runTool(name: string, args: Record<string, unknown>, ctx: ToolCtx): Promise<ToolResult> {
  const t = TOOLS.find((x) => x.name === name);
  if (!t) return { ok: false, output: `unknown tool: ${name}` };
  try { return await t.run(args, ctx); } catch (e) { return { ok: false, output: String(e) }; }
}

function parseDdg(html: string): { title: string; url: string; snippet: string }[] {
  const out: { title: string; url: string; snippet: string }[] = [];
  const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<a\s+class="result__snippet"[^>]*>([\s\S]*?)<\/a>)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (out.length >= 8) break;
    let url = m[1]; const enc = url.match(/[?&]uddg=([^&]+)/);
    if (enc) { try { url = decodeURIComponent(enc[1]); } catch { /* keep */ } }
    const title = m[2].replace(/<[^>]+>/g, "").trim();
    const snippet = (m[3] || "").replace(/<[^>]+>/g, "").trim().slice(0, 200);
    if (title && url) out.push({ title, url, snippet });
  }
  return out;
}
