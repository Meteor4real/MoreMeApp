import { useEffect, useMemo, useRef, useState } from "react";

// The IT Toolbox — the swiss-army surface NetworkChuck Hub is for. Real,
// working utilities aimed at IT / dev / homelab people: network diagnostics
// (using the machine's actual ping/dig/etc. via the shell bridge), an HTTP
// request builder, a subnet calculator, and a stack of encoder/decoder/format
// converters. Nothing here is a stub.

type Tool =
  | "http" | "dns" | "ip" | "ping" | "ports" | "subnet"
  | "base64" | "jwt" | "hash" | "json" | "url" | "time" | "uuid" | "regex" | "color" | "case";

const GROUPS: { label: string; tools: { id: Tool; name: string; desc: string }[] }[] = [
  {
    label: "Network",
    tools: [
      { id: "http", name: "HTTP Request", desc: "Build + send any request, read the response" },
      { id: "dns", name: "DNS Lookup", desc: "Resolve A/AAAA/MX/TXT/NS over DoH" },
      { id: "ip", name: "IP / WHOIS", desc: "Geo + ASN + network owner for an IP or host" },
      { id: "ping", name: "Ping / Trace", desc: "Run real ping & traceroute on this machine" },
      { id: "ports", name: "Port Check", desc: "Scan common ports on a host (via the shell)" },
      { id: "subnet", name: "Subnet Calc", desc: "CIDR → range, mask, hosts, broadcast" },
    ],
  },
  {
    label: "Encode / Decode",
    tools: [
      { id: "base64", name: "Base64", desc: "Encode / decode text and data URLs" },
      { id: "jwt", name: "JWT Decoder", desc: "Decode header + payload, show claims" },
      { id: "hash", name: "Hash", desc: "SHA-1/256/384/512 of any text" },
      { id: "url", name: "URL Encode", desc: "Percent-encode / decode + parse params" },
    ],
  },
  {
    label: "Format / Convert",
    tools: [
      { id: "json", name: "JSON", desc: "Format, minify, validate" },
      { id: "time", name: "Timestamp", desc: "Unix ↔ ISO ↔ local, any zone" },
      { id: "uuid", name: "UUID / Token", desc: "Generate v4 UUIDs + random tokens" },
      { id: "regex", name: "Regex Tester", desc: "Live match + capture groups" },
      { id: "color", name: "Color", desc: "HEX ↔ RGB ↔ HSL with a swatch" },
      { id: "case", name: "Text Case", desc: "camel / snake / kebab / title / etc." },
    ],
  },
];

export function Toolbox() {
  const [tool, setTool] = useState<Tool>("http");
  return (
    <div className="stage" style={{ display: "flex", flexDirection: "row", minHeight: 0, padding: 0 }}>
      {/* sidebar */}
      <div style={{ width: 220, borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", minHeight: 0, background: "rgba(0,0,0,0.25)" }}>
        <div className="mono glow-text" style={{ padding: "12px 14px", fontSize: 13, letterSpacing: 2, textTransform: "uppercase", borderBottom: "1px solid var(--line)" }}>IT Toolbox</div>
        <div style={{ flex: 1, overflow: "auto", padding: "8px 8px 16px" }}>
          {GROUPS.map((g) => (
            <div key={g.label} style={{ marginBottom: 10 }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--mute)", textTransform: "uppercase", padding: "6px 8px 4px" }}>{g.label}</div>
              {g.tools.map((t) => (
                <div key={t.id} onClick={() => setTool(t.id)} title={t.desc}
                  style={{ padding: "7px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12, marginBottom: 2,
                    color: tool === t.id ? "var(--pink)" : "var(--ink)",
                    background: tool === t.id ? "rgba(255,87,119,0.1)" : "transparent",
                    borderLeft: tool === t.id ? "2px solid var(--pink)" : "2px solid transparent" }}
                  onMouseEnter={(e) => { if (tool !== t.id) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={(e) => { if (tool !== t.id) e.currentTarget.style.background = "transparent"; }}>
                  {t.name}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      {/* panel */}
      <div style={{ flex: 1, minWidth: 0, overflow: "auto", padding: 20 }}>
        {tool === "http" && <HttpTool />}
        {tool === "dns" && <DnsTool />}
        {tool === "ip" && <IpTool />}
        {tool === "ping" && <PingTool />}
        {tool === "ports" && <PortsTool />}
        {tool === "subnet" && <SubnetTool />}
        {tool === "base64" && <Base64Tool />}
        {tool === "jwt" && <JwtTool />}
        {tool === "hash" && <HashTool />}
        {tool === "json" && <JsonTool />}
        {tool === "url" && <UrlTool />}
        {tool === "time" && <TimeTool />}
        {tool === "uuid" && <UuidTool />}
        {tool === "regex" && <RegexTool />}
        {tool === "color" && <ColorTool />}
        {tool === "case" && <CaseTool />}
      </div>
    </div>
  );
}

// ── shared bits ──────────────────────────────────────────────────────────────
function Head({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="glow-text" style={{ fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: 1 }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
const inp: React.CSSProperties = { background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink)", padding: "9px 11px", fontSize: 13, fontFamily: "ui-monospace,monospace", outline: "none", width: "100%" };
const out: React.CSSProperties = { ...inp, minHeight: 120, whiteSpace: "pre-wrap", wordBreak: "break-all", resize: "vertical" as const };
function Copy({ text }: { text: string }) {
  const [c, setC] = useState(false);
  return <button className="btn" style={{ fontSize: 11, padding: "4px 10px" }} disabled={!text} onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 1200); }}>{c ? "copied" : "copy"}</button>;
}
function Mono({ children, color }: { children: React.ReactNode; color?: string }) {
  return <pre style={{ ...out, color: color || "var(--ink)", margin: 0 }}>{children}</pre>;
}

// ── HTTP Request builder ─────────────────────────────────────────────────────
function HttpTool() {
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("https://api.github.com/zen");
  const [headers, setHeaders] = useState("");
  const [body, setBody] = useState("");
  const [resp, setResp] = useState<{ status: number; ms: number; body: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send() {
    setBusy(true); setErr(null); setResp(null);
    const t0 = performance.now();
    try {
      let h: Record<string, string> | undefined;
      if (headers.trim()) {
        h = {};
        for (const line of headers.split("\n")) { const i = line.indexOf(":"); if (i > 0) h[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
      }
      let parsedBody: unknown;
      if (body.trim() && method !== "GET" && method !== "HEAD") { try { parsedBody = JSON.parse(body); } catch { parsedBody = body; } }
      const r = await window.hub.net({ method, url: url.trim(), headers: h, body: parsedBody });
      const text = typeof r.data === "string" ? r.data : JSON.stringify(r.data, null, 2);
      setResp({ status: r.status, ms: Math.round(performance.now() - t0), body: text || "(empty)" });
      if (!r.ok && r.status === 0) setErr(r.error || "request failed");
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  }

  const statusColor = !resp ? "#888" : resp.status < 300 ? "#22c55e" : resp.status < 400 ? "#f59e0b" : "#ef4444";
  return (
    <div>
      <Head title="HTTP Request" sub="A Postman-lite. Runs through the Hub's network bridge — no CORS limits." />
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <select value={method} onChange={(e) => setMethod(e.target.value)} style={{ ...inp, width: 110 }}>
          {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].map((m) => <option key={m}>{m}</option>)}
        </select>
        <input style={inp} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" onKeyDown={(e) => { if (e.key === "Enter") void send(); }} />
        <button className="btn" disabled={busy} onClick={() => void send()} style={{ color: "var(--pink)", borderColor: "rgba(255,87,119,0.5)", padding: "0 18px" }}>{busy ? "…" : "Send"}</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <Label>Headers (one per line, Key: Value)</Label>
          <textarea style={{ ...inp, minHeight: 90, resize: "vertical" as const }} value={headers} onChange={(e) => setHeaders(e.target.value)} placeholder={"Authorization: Bearer …\nContent-Type: application/json"} />
        </div>
        <div>
          <Label>Body (JSON or raw)</Label>
          <textarea style={{ ...inp, minHeight: 90, resize: "vertical" as const }} value={body} onChange={(e) => setBody(e.target.value)} placeholder={'{ "key": "value" }'} disabled={method === "GET" || method === "HEAD"} />
        </div>
      </div>
      {err && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 10 }}>{err}</div>}
      {resp && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span className="mono" style={{ color: statusColor, fontWeight: 700, fontSize: 14, textShadow: `0 0 8px ${statusColor}66` }}>{resp.status || "ERR"}</span>
            <span style={{ fontSize: 11, color: "var(--mute)" }}>{resp.ms} ms · {resp.body.length.toLocaleString()} bytes</span>
            <span style={{ flex: 1 }} />
            <Copy text={resp.body} />
          </div>
          <Mono>{resp.body.slice(0, 20000)}</Mono>
        </div>
      )}
    </div>
  );
}
function Label({ children }: { children: React.ReactNode }) { return <div style={{ fontSize: 10, color: "var(--mute)", letterSpacing: 1, textTransform: "uppercase", margin: "0 0 4px" }}>{children}</div>; }

// ── DNS ──────────────────────────────────────────────────────────────────────
function DnsTool() {
  const [host, setHost] = useState("github.com");
  const [type, setType] = useState("A");
  const [res, setRes] = useState<string>("");
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      const r = await window.hub.net({ method: "GET", url: `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host.trim())}&type=${type}`, headers: { Accept: "application/dns-json" } });
      const ans = (r.data as { Answer?: { name: string; data: string; TTL: number }[]; Status?: number } | null);
      if (!ans?.Answer?.length) setRes(`No ${type} records (status ${ans?.Status ?? "?"}).`);
      else setRes(ans.Answer.map((a) => `${a.name}\t${a.TTL}s\t${a.data}`).join("\n"));
    } catch (e) { setRes(String(e)); } finally { setBusy(false); }
  }
  return (
    <div>
      <Head title="DNS Lookup" sub="DNS-over-HTTPS via Cloudflare (1.1.1.1)." />
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <input style={inp} value={host} onChange={(e) => setHost(e.target.value)} placeholder="hostname" onKeyDown={(e) => { if (e.key === "Enter") void run(); }} />
        <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...inp, width: 110 }}>{["A", "AAAA", "MX", "TXT", "NS", "CNAME", "SOA", "CAA"].map((t) => <option key={t}>{t}</option>)}</select>
        <button className="btn" disabled={busy} onClick={() => void run()} style={{ padding: "0 18px" }}>{busy ? "…" : "Resolve"}</button>
      </div>
      {res && <Mono color="#22d3ee">{res}</Mono>}
    </div>
  );
}

// ── IP / WHOIS ───────────────────────────────────────────────────────────────
function IpTool() {
  const [ip, setIp] = useState("");
  const [res, setRes] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function run(target?: string) {
    setBusy(true); setErr(null);
    try {
      const path = (target ?? ip).trim();
      const r = await window.hub.net({ method: "GET", url: `https://ipapi.co/${path ? encodeURIComponent(path) + "/" : ""}json/` });
      const d = r.data as Record<string, unknown> | null;
      if (!d || (d as { error?: boolean }).error) setErr("Lookup failed — check the address.");
      else setRes(d);
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  }
  const fields: [string, string][] = res ? [
    ["IP", String(res.ip ?? "")], ["Org / ISP", String(res.org ?? "")], ["ASN", String(res.asn ?? "")],
    ["City", String(res.city ?? "")], ["Region", String(res.region ?? "")], ["Country", `${res.country_name ?? ""} (${res.country ?? ""})`],
    ["Postal", String(res.postal ?? "")], ["Timezone", String(res.timezone ?? "")], ["Lat/Lon", `${res.latitude ?? ""}, ${res.longitude ?? ""}`],
  ] : [];
  return (
    <div>
      <Head title="IP / WHOIS" sub="Geolocation, network owner, and ASN for an IP or domain (ipapi.co)." />
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <input style={inp} value={ip} onChange={(e) => setIp(e.target.value)} placeholder="IP or domain — blank = your own" onKeyDown={(e) => { if (e.key === "Enter") void run(); }} />
        <button className="btn" disabled={busy} onClick={() => void run()} style={{ padding: "0 18px" }}>{busy ? "…" : "Look up"}</button>
        <button className="btn" disabled={busy} onClick={() => { setIp(""); void run(""); }} style={{ padding: "0 14px" }}>My IP</button>
      </div>
      {err && <div style={{ color: "#ef4444", fontSize: 12 }}>{err}</div>}
      {res && (
        <div className="panel" style={{ padding: 14 }}>
          {fields.map(([k, v]) => (
            <div key={k} style={{ display: "flex", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ width: 130, fontSize: 11, color: "var(--mute)", textTransform: "uppercase", letterSpacing: 1 }}>{k}</span>
              <span className="mono" style={{ flex: 1, fontSize: 13, color: "var(--ink)" }}>{v || "—"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Ping / Traceroute (real, via the shell bridge) ───────────────────────────
function PingTool() {
  const [host, setHost] = useState("1.1.1.1");
  const [res, setRes] = useState("");
  const [busy, setBusy] = useState<"ping" | "trace" | null>(null);
  const isWin = navigator.userAgent.includes("Windows");
  async function go(kind: "ping" | "trace") {
    setBusy(kind); setRes("running…");
    const h = host.trim().replace(/[^\w.\-:]/g, "");
    const cmd = kind === "ping"
      ? (isWin ? `ping -n 4 ${h}` : `ping -c 4 ${h}`)
      : (isWin ? `tracert -h 15 ${h}` : `traceroute -m 15 ${h}`);
    try {
      const r = await window.hub.tool.exec(cmd);
      setRes((r.stdout || "") + (r.stderr ? "\n[stderr]\n" + r.stderr : "") || "(no output)");
    } catch (e) { setRes(String(e)); } finally { setBusy(null); }
  }
  return (
    <div>
      <Head title="Ping / Traceroute" sub="Runs your machine's real ping & traceroute through the shell bridge." />
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <input style={inp} value={host} onChange={(e) => setHost(e.target.value)} placeholder="host or IP" onKeyDown={(e) => { if (e.key === "Enter") void go("ping"); }} />
        <button className="btn" disabled={!!busy} onClick={() => void go("ping")} style={{ padding: "0 16px" }}>{busy === "ping" ? "…" : "Ping"}</button>
        <button className="btn" disabled={!!busy} onClick={() => void go("trace")} style={{ padding: "0 16px" }}>{busy === "trace" ? "…" : "Traceroute"}</button>
      </div>
      {res && <Mono>{res}</Mono>}
    </div>
  );
}

// ── Port check (via the shell, cross-platform best-effort) ───────────────────
function PortsTool() {
  const [host, setHost] = useState("localhost");
  const [ports, setPorts] = useState("22,80,443,3306,5432,6379,8080,8443");
  const [res, setRes] = useState("");
  const [busy, setBusy] = useState(false);
  const isWin = navigator.userAgent.includes("Windows");
  async function scan() {
    setBusy(true); setRes("scanning…");
    const h = host.trim().replace(/[^\w.\-:]/g, "");
    const list = ports.split(",").map((p) => p.trim()).filter((p) => /^\d+$/.test(p)).slice(0, 40);
    const lines: string[] = [];
    for (const p of list) {
      // PowerShell Test-NetConnection on Windows; bash /dev/tcp elsewhere.
      const cmd = isWin
        ? `powershell -NoProfile -Command "(Test-NetConnection -ComputerName ${h} -Port ${p} -WarningAction SilentlyContinue).TcpTestSucceeded"`
        : `timeout 2 bash -c '</dev/tcp/${h}/${p}' 2>/dev/null && echo open || echo closed`;
      try {
        const r = await window.hub.tool.exec(cmd);
        const o = (r.stdout || "").toLowerCase();
        const open = o.includes("true") || o.includes("open");
        lines.push(`${p.padEnd(6)} ${open ? "OPEN" : "closed"}`);
      } catch { lines.push(`${p.padEnd(6)} error`); }
      setRes(lines.join("\n"));
    }
    setBusy(false);
  }
  return (
    <div>
      <Head title="Port Check" sub="TCP reachability via your machine's shell. Common service ports preloaded." />
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <input style={{ ...inp, flex: "0 0 220px" }} value={host} onChange={(e) => setHost(e.target.value)} placeholder="host" />
        <input style={inp} value={ports} onChange={(e) => setPorts(e.target.value)} placeholder="comma-separated ports" />
        <button className="btn" disabled={busy} onClick={() => void scan()} style={{ padding: "0 18px" }}>{busy ? "…" : "Scan"}</button>
      </div>
      {res && <Mono>{res.split("\n").map((l) => l).join("\n")}</Mono>}
    </div>
  );
}

// ── Subnet calculator (pure, no network) ─────────────────────────────────────
function SubnetTool() {
  const [cidr, setCidr] = useState("192.168.1.0/24");
  const calc = useMemo(() => {
    try {
      const [ip, bitsStr] = cidr.trim().split("/");
      const bits = Number(bitsStr);
      const octs = ip.split(".").map(Number);
      if (octs.length !== 4 || octs.some((o) => o < 0 || o > 255 || Number.isNaN(o)) || bits < 0 || bits > 32) return null;
      const ipNum = ((octs[0] << 24) >>> 0) + (octs[1] << 16) + (octs[2] << 8) + octs[3];
      const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
      const network = (ipNum & mask) >>> 0;
      const broadcast = (network | (~mask >>> 0)) >>> 0;
      const toIp = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
      const total = bits >= 31 ? 2 ** (32 - bits) : 2 ** (32 - bits);
      const usable = bits >= 31 ? total : Math.max(0, total - 2);
      return {
        network: toIp(network), broadcast: toIp(broadcast), mask: toIp(mask),
        wildcard: toIp(~mask >>> 0), bits,
        first: bits >= 31 ? toIp(network) : toIp(network + 1),
        last: bits >= 31 ? toIp(broadcast) : toIp(broadcast - 1),
        total, usable,
      };
    } catch { return null; }
  }, [cidr]);
  return (
    <div>
      <Head title="Subnet Calculator" sub="CIDR → network, broadcast, mask, usable range, host count." />
      <input style={{ ...inp, marginBottom: 12 }} value={cidr} onChange={(e) => setCidr(e.target.value)} placeholder="10.0.0.0/24" />
      {!calc ? <div style={{ color: "#ef4444", fontSize: 12 }}>Enter a valid CIDR, e.g. 192.168.1.0/24</div> : (
        <div className="panel" style={{ padding: 14 }}>
          {([["Network", calc.network], ["Broadcast", calc.broadcast], ["Netmask", calc.mask], ["Wildcard", calc.wildcard], ["First host", calc.first], ["Last host", calc.last], ["Total addresses", calc.total.toLocaleString()], ["Usable hosts", calc.usable.toLocaleString()]] as [string, string][]).map(([k, v]) => (
            <div key={k} style={{ display: "flex", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ width: 150, fontSize: 11, color: "var(--mute)", textTransform: "uppercase", letterSpacing: 1 }}>{k}</span>
              <span className="mono glow-text" style={{ flex: 1, fontSize: 14, color: "var(--pink)" }}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Base64 ───────────────────────────────────────────────────────────────────
function Base64Tool() {
  const [text, setText] = useState("");
  const [b64, setB64] = useState("");
  function enc() { try { setB64(btoa(unescape(encodeURIComponent(text)))); } catch { setB64("(cannot encode)"); } }
  function dec() { try { setText(decodeURIComponent(escape(atob(b64.trim())))); } catch { setText("(invalid base64)"); } }
  return (
    <div>
      <Head title="Base64" sub="Encode and decode UTF-8 text." />
      <Label>Plain text</Label>
      <textarea style={{ ...out }} value={text} onChange={(e) => setText(e.target.value)} />
      <div style={{ display: "flex", gap: 6, margin: "8px 0" }}>
        <button className="btn" onClick={enc}>↓ Encode</button>
        <button className="btn" onClick={dec}>↑ Decode</button>
        <span style={{ flex: 1 }} /><Copy text={b64} />
      </div>
      <Label>Base64</Label>
      <textarea style={{ ...out }} value={b64} onChange={(e) => setB64(e.target.value)} />
    </div>
  );
}

// ── JWT ──────────────────────────────────────────────────────────────────────
function JwtTool() {
  const [jwt, setJwt] = useState("");
  const parsed = useMemo(() => {
    const parts = jwt.trim().split(".");
    if (parts.length < 2) return null;
    const dec = (s: string) => { try { return JSON.stringify(JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))))), null, 2); } catch { return "(unreadable)"; } };
    const payloadObj = (() => { try { return JSON.parse(decodeURIComponent(escape(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))))); } catch { return null; } })();
    const exp = payloadObj?.exp ? new Date(payloadObj.exp * 1000) : null;
    return { header: dec(parts[0]), payload: dec(parts[1]), exp, expired: exp ? exp.getTime() < Date.now() : null };
  }, [jwt]);
  return (
    <div>
      <Head title="JWT Decoder" sub="Decodes header + payload locally. Never validates a signature server-side." />
      <textarea style={{ ...inp, minHeight: 80, resize: "vertical" as const, marginBottom: 12 }} value={jwt} onChange={(e) => setJwt(e.target.value)} placeholder="paste a JWT — eyJhbGci…" />
      {parsed ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div><Label>Header</Label><Mono color="#22d3ee">{parsed.header}</Mono></div>
          <div>
            <Label>Payload</Label><Mono color="#39d98a">{parsed.payload}</Mono>
            {parsed.exp && <div style={{ marginTop: 6, fontSize: 12, color: parsed.expired ? "#ef4444" : "#22c55e" }}>exp: {parsed.exp.toLocaleString()} — {parsed.expired ? "EXPIRED" : "valid"}</div>}
          </div>
        </div>
      ) : <div style={{ color: "var(--mute)", fontSize: 12 }}>Paste a token to decode it.</div>}
    </div>
  );
}

// ── Hash ─────────────────────────────────────────────────────────────────────
function HashTool() {
  const [text, setText] = useState("");
  const [hashes, setHashes] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!text) { setHashes({}); return; }
      const algos = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"];
      const data = new TextEncoder().encode(text);
      const next: Record<string, string> = {};
      for (const algo of algos) {
        try { const d = await crypto.subtle.digest(algo, data); next[algo] = [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join(""); } catch { /* ignore */ }
      }
      if (alive) setHashes(next);
    })();
    return () => { alive = false; };
  }, [text]);
  return (
    <div>
      <Head title="Hash" sub="SHA family, computed locally with WebCrypto." />
      <textarea style={{ ...out, marginBottom: 12 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="text to hash" />
      {Object.entries(hashes).map(([algo, hex]) => (
        <div key={algo} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <Label>{algo}</Label><span style={{ flex: 1 }} /><Copy text={hex} />
          </div>
          <div className="mono" style={{ fontSize: 12, color: "#22d3ee", wordBreak: "break-all", background: "rgba(0,0,0,0.4)", border: "1px solid var(--line)", borderRadius: 6, padding: "8px 10px" }}>{hex}</div>
        </div>
      ))}
    </div>
  );
}

// ── JSON ─────────────────────────────────────────────────────────────────────
function JsonTool() {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  function fmt(min: boolean) {
    try { const o = JSON.parse(text); setText(JSON.stringify(o, null, min ? 0 : 2)); setMsg({ ok: true, text: min ? "minified" : "formatted" }); }
    catch (e) { setMsg({ ok: false, text: String(e).replace(/^SyntaxError:\s*/, "") }); }
  }
  return (
    <div>
      <Head title="JSON" sub="Format, minify, validate." />
      <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
        <button className="btn" onClick={() => fmt(false)}>Format</button>
        <button className="btn" onClick={() => fmt(true)}>Minify</button>
        <Copy text={text} />
        {msg && <span style={{ fontSize: 12, color: msg.ok ? "#22c55e" : "#ef4444" }}>{msg.ok ? "✓ " : "✕ "}{msg.text}</span>}
      </div>
      <textarea style={{ ...out, minHeight: 280, fontSize: 13 }} value={text} onChange={(e) => { setText(e.target.value); setMsg(null); }} placeholder='{ "paste": "json here" }' />
    </div>
  );
}

// ── URL ──────────────────────────────────────────────────────────────────────
function UrlTool() {
  const [text, setText] = useState("");
  const [enc, setEnc] = useState("");
  const params = useMemo(() => {
    try { const u = new URL(text); return [...u.searchParams.entries()]; } catch { return []; }
  }, [text]);
  return (
    <div>
      <Head title="URL Encode" sub="Percent-encode / decode, and break a URL into its query params." />
      <Label>Text / URL</Label>
      <textarea style={out} value={text} onChange={(e) => setText(e.target.value)} />
      <div style={{ display: "flex", gap: 6, margin: "8px 0" }}>
        <button className="btn" onClick={() => setEnc(encodeURIComponent(text))}>Encode</button>
        <button className="btn" onClick={() => { try { setText(decodeURIComponent(enc)); } catch { setText("(invalid)"); } }}>Decode →</button>
        <span style={{ flex: 1 }} /><Copy text={enc} />
      </div>
      <Label>Encoded</Label>
      <textarea style={out} value={enc} onChange={(e) => setEnc(e.target.value)} />
      {params.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <Label>Query params</Label>
          <div className="panel" style={{ padding: 10 }}>
            {params.map(([k, v], i) => <div key={i} style={{ display: "flex", gap: 8, padding: "3px 0", fontSize: 12 }}><span className="mono" style={{ color: "var(--pink)", width: 160, overflow: "hidden", textOverflow: "ellipsis" }}>{k}</span><span className="mono" style={{ color: "var(--ink)", wordBreak: "break-all" }}>{v}</span></div>)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Timestamp ────────────────────────────────────────────────────────────────
function TimeTool() {
  const [val, setVal] = useState(String(Math.floor(Date.now() / 1000)));
  const d = useMemo(() => {
    const s = val.trim();
    if (/^\d{10}$/.test(s)) return new Date(Number(s) * 1000);
    if (/^\d{13}$/.test(s)) return new Date(Number(s));
    const parsed = new Date(s);
    return isNaN(parsed.getTime()) ? null : parsed;
  }, [val]);
  return (
    <div>
      <Head title="Timestamp" sub="Unix seconds / millis ↔ ISO ↔ local. Auto-detects the input." />
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <input style={inp} value={val} onChange={(e) => setVal(e.target.value)} placeholder="1700000000 or an ISO date" />
        <button className="btn" onClick={() => setVal(String(Math.floor(Date.now() / 1000)))} style={{ padding: "0 14px", whiteSpace: "nowrap" }}>Now</button>
      </div>
      {d ? (
        <div className="panel" style={{ padding: 14 }}>
          {([["Unix (s)", String(Math.floor(d.getTime() / 1000))], ["Unix (ms)", String(d.getTime())], ["ISO 8601", d.toISOString()], ["Local", d.toLocaleString()], ["UTC", d.toUTCString()], ["Relative", relTime(d.getTime())]] as [string, string][]).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ width: 110, fontSize: 11, color: "var(--mute)", textTransform: "uppercase", letterSpacing: 1 }}>{k}</span>
              <span className="mono" style={{ flex: 1, fontSize: 13, color: "var(--ink)" }}>{v}</span>
              <Copy text={v} />
            </div>
          ))}
        </div>
      ) : <div style={{ color: "#ef4444", fontSize: 12 }}>Unrecognized date/timestamp.</div>}
    </div>
  );
}
function relTime(ms: number): string {
  const diff = ms - Date.now(); const abs = Math.abs(diff);
  const units: [number, string][] = [[86400e3, "day"], [3600e3, "hour"], [60e3, "minute"], [1000, "second"]];
  for (const [u, label] of units) { if (abs >= u) { const n = Math.round(abs / u); return `${diff < 0 ? "" : "in "}${n} ${label}${n === 1 ? "" : "s"}${diff < 0 ? " ago" : ""}`; } }
  return "just now";
}

// ── UUID / token ─────────────────────────────────────────────────────────────
function UuidTool() {
  const [uuids, setUuids] = useState<string[]>([]);
  const [tokens, setTokens] = useState<string[]>([]);
  function genUuids(n: number) { setUuids(Array.from({ length: n }, () => crypto.randomUUID())); }
  function genTokens(n: number, len: number) {
    setTokens(Array.from({ length: n }, () => { const b = new Uint8Array(len); crypto.getRandomValues(b); return [...b].map((x) => x.toString(16).padStart(2, "0")).join(""); }));
  }
  useEffect(() => { genUuids(5); genTokens(3, 32); }, []);
  return (
    <div>
      <Head title="UUID / Token" sub="Cryptographically-random v4 UUIDs and hex tokens." />
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <button className="btn" onClick={() => genUuids(5)}>5 UUIDs</button>
        <button className="btn" onClick={() => genUuids(1)}>1 UUID</button>
        <span style={{ flex: 1 }} /><Copy text={uuids.join("\n")} />
      </div>
      <Mono color="#39d98a">{uuids.join("\n")}</Mono>
      <div style={{ display: "flex", gap: 6, margin: "14px 0 8px" }}>
        <button className="btn" onClick={() => genTokens(3, 16)}>16-byte</button>
        <button className="btn" onClick={() => genTokens(3, 32)}>32-byte</button>
        <button className="btn" onClick={() => genTokens(3, 64)}>64-byte</button>
        <span style={{ flex: 1 }} /><Copy text={tokens.join("\n")} />
      </div>
      <Mono color="#22d3ee">{tokens.join("\n")}</Mono>
    </div>
  );
}

// ── Regex ────────────────────────────────────────────────────────────────────
function RegexTool() {
  const [pattern, setPattern] = useState("(\\w+)@(\\w+\\.\\w+)");
  const [flags, setFlags] = useState("g");
  const [text, setText] = useState("contact: hi@example.com or sales@acme.io");
  const result = useMemo(() => {
    try {
      const re = new RegExp(pattern, flags);
      const matches = [...text.matchAll(flags.includes("g") ? re : new RegExp(pattern, flags + "g"))];
      return { ok: true as const, count: matches.length, matches: matches.slice(0, 50).map((m) => ({ full: m[0], groups: m.slice(1) })) };
    } catch (e) { return { ok: false as const, error: String(e).replace(/^.*?:\s*/, ""), count: 0, matches: [] as { full: string; groups: string[] }[] }; }
  }, [pattern, flags, text]);
  return (
    <div>
      <Head title="Regex Tester" sub="Live matching with capture groups. JavaScript flavor." />
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <input style={inp} value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="pattern" />
        <input style={{ ...inp, width: 90 }} value={flags} onChange={(e) => setFlags(e.target.value.replace(/[^gimsuy]/g, ""))} placeholder="gim" />
      </div>
      <textarea style={{ ...out, marginBottom: 10 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="test string" />
      {!result.ok ? <div style={{ color: "#ef4444", fontSize: 12 }}>{result.error}</div> : (
        <div>
          <div style={{ fontSize: 12, color: result.count ? "#22c55e" : "var(--mute)", marginBottom: 6 }}>{result.count} match{result.count === 1 ? "" : "es"}</div>
          {result.matches.map((m, i) => (
            <div key={i} className="panel" style={{ padding: "8px 10px", marginBottom: 5 }}>
              <span className="mono" style={{ color: "var(--pink)", fontSize: 13 }}>{m.full}</span>
              {m.groups.length > 0 && <div style={{ marginTop: 4, fontSize: 11, color: "var(--mute)" }}>{m.groups.map((g, j) => <span key={j} style={{ marginRight: 10 }}>[{j + 1}] <span className="mono" style={{ color: "#22d3ee" }}>{g}</span></span>)}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Color ────────────────────────────────────────────────────────────────────
function ColorTool() {
  const [hex, setHex] = useState("#ff5577");
  const rgb = useMemo(() => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }, [hex]);
  const hsl = useMemo(() => {
    if (!rgb) return null;
    const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b); let h = 0, s = 0; const l = (max + min) / 2;
    if (max !== min) { const d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min); h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }, [rgb]);
  return (
    <div>
      <Head title="Color" sub="HEX ↔ RGB ↔ HSL with a live swatch." />
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
        <input type="color" value={rgb ? hex : "#000000"} onChange={(e) => setHex(e.target.value)} style={{ width: 56, height: 40, border: "1px solid var(--line)", borderRadius: 8, background: "transparent", cursor: "pointer" }} />
        <input style={{ ...inp, width: 160 }} value={hex} onChange={(e) => setHex(e.target.value)} placeholder="#rrggbb" />
        {rgb && <div style={{ width: 80, height: 40, borderRadius: 8, background: hex, boxShadow: `0 0 16px ${hex}88`, border: "1px solid var(--line)" }} />}
      </div>
      {rgb && hsl ? (
        <div className="panel" style={{ padding: 14 }}>
          {([["HEX", hex.toUpperCase().startsWith("#") ? hex.toUpperCase() : "#" + hex.toUpperCase()], ["RGB", `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`], ["HSL", `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`]] as [string, string][]).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ width: 60, fontSize: 11, color: "var(--mute)", textTransform: "uppercase", letterSpacing: 1 }}>{k}</span>
              <span className="mono" style={{ flex: 1, fontSize: 14, color: "var(--ink)" }}>{v}</span>
              <Copy text={v} />
            </div>
          ))}
        </div>
      ) : <div style={{ color: "#ef4444", fontSize: 12 }}>Enter a 6-digit hex color.</div>}
    </div>
  );
}

// ── Text case ────────────────────────────────────────────────────────────────
function CaseTool() {
  const [text, setText] = useState("");
  const words = useMemo(() => text.trim().split(/[\s_\-./]+|(?<=[a-z])(?=[A-Z])/).filter(Boolean), [text]);
  const cases: [string, string][] = [
    ["camelCase", words.map((w, i) => i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()).join("")],
    ["PascalCase", words.map((w) => w[0]?.toUpperCase() + w.slice(1).toLowerCase()).join("")],
    ["snake_case", words.map((w) => w.toLowerCase()).join("_")],
    ["kebab-case", words.map((w) => w.toLowerCase()).join("-")],
    ["CONSTANT_CASE", words.map((w) => w.toUpperCase()).join("_")],
    ["Title Case", words.map((w) => w[0]?.toUpperCase() + w.slice(1).toLowerCase()).join(" ")],
    ["lower", text.toLowerCase()],
    ["UPPER", text.toUpperCase()],
  ];
  return (
    <div>
      <Head title="Text Case" sub="Convert between every common identifier case." />
      <textarea style={{ ...out, marginBottom: 12 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="type or paste any text" />
      {text.trim() && (
        <div className="panel" style={{ padding: 14 }}>
          {cases.map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ width: 140, fontSize: 11, color: "var(--mute)" }}>{k}</span>
              <span className="mono" style={{ flex: 1, fontSize: 13, color: "var(--ink)", wordBreak: "break-all" }}>{v}</span>
              <Copy text={v} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
