import { useEffect, useState } from "react";
import {
  type Bookmark, type Group, type HistoryEntry, type Password,
  addBookmark, addGroup, clearHistory, getBookmarks, getGroups, getHistory,
  getPasswords, removeBookmark, removeGroup, removeHistoryEntry, removePassword,
  setPassword, getPasswordSecret, saveGroups, subscribeBookmarks,
} from "./store";
import { EXTENSIONS, loadEnabled, saveEnabled } from "../extensions";

// In-browser panels rendered at about:* URLs. Same look as a native page.

const cardStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, rgba(20,8,12,0.6), rgba(8,8,14,0.6))",
  border: "1px solid var(--line)",
  borderRadius: 12,
  padding: 14,
};
const rowStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
  borderBottom: "1px solid var(--line)", fontSize: 13,
};
const wrap: React.CSSProperties = { flex: 1, overflow: "auto", padding: 22, display: "flex", flexDirection: "column", gap: 12 };

function Header({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <div className="mono glow-text" style={{ fontSize: 14, letterSpacing: 2, textTransform: "uppercase" }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export function BookmarksPanel({ onGo }: { onGo: (url: string) => void }) {
  const [items, setItems] = useState<Bookmark[]>(getBookmarks());
  useEffect(() => subscribeBookmarks(setItems), []);
  const folders = Array.from(new Set(items.map((b) => b.folder || "Saved")));
  return (
    <div style={wrap}>
      <Header title="Bookmarks" sub="Saved sites — click to open, right-click to remove." />
      {items.length === 0 && <div style={{ ...cardStyle, color: "var(--mute)" }}>Nothing saved yet. Hit the ★ in the address bar on any page.</div>}
      {folders.map((f) => (
        <div key={f} style={cardStyle}>
          <div className="mono" style={{ fontSize: 11, color: "var(--mute)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>{f}</div>
          {items.filter((b) => (b.folder || "Saved") === f).map((b) => (
            <div key={b.id} style={rowStyle} onContextMenu={(e) => { e.preventDefault(); removeBookmark(b.id); }}>
              <span style={{ flex: 1, cursor: "pointer", color: "var(--ink)" }} onClick={() => onGo(b.url)}>
                <div>{b.title}</div>
                <div style={{ fontSize: 11, color: "var(--mute)" }}>{b.url}</div>
              </span>
              <button className="btn" onClick={() => removeBookmark(b.id)}>Remove</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function HistoryPanel({ onGo }: { onGo: (url: string) => void }) {
  const [items, setItems] = useState<HistoryEntry[]>(getHistory());
  function refresh() { setItems(getHistory()); }
  return (
    <div style={wrap}>
      <Header title="History" sub={`${items.length} pages visited.`} />
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" onClick={() => { clearHistory(); refresh(); }}>Clear all</button>
      </div>
      {items.length === 0 && <div style={{ ...cardStyle, color: "var(--mute)" }}>No history yet.</div>}
      <div style={cardStyle}>
        {items.slice(0, 200).map((h) => (
          <div key={h.id} style={rowStyle}>
            <span style={{ flex: 1, cursor: "pointer" }} onClick={() => onGo(h.url)}>
              <div>{h.title}</div>
              <div style={{ fontSize: 11, color: "var(--mute)" }}>{h.url} · {new Date(h.ts).toLocaleString()}</div>
            </span>
            <button className="btn" onClick={() => { removeHistoryEntry(h.id); refresh(); }}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}

type Dl = { id: string; filename: string; path: string; url: string; bytes: number; state: string; ts: number };
export function DownloadsPanel() {
  const [items, setItems] = useState<Dl[]>([]);
  useEffect(() => {
    void window.hub.downloads.list().then(setItems);
    const off = window.hub.downloads.onUpdated(setItems);
    return () => { off(); };
  }, []);
  function fmt(b: number) {
    if (!b) return "0 B";
    const u = ["B", "KB", "MB", "GB"];
    let i = 0; let n = b;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return n.toFixed(n >= 100 ? 0 : 1) + " " + u[i];
  }
  return (
    <div style={wrap}>
      <Header title="Downloads" sub="Files saved through the Hub." />
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" onClick={() => void window.hub.downloads.clear()}>Clear list</button>
      </div>
      {items.length === 0 && <div style={{ ...cardStyle, color: "var(--mute)" }}>No downloads yet.</div>}
      <div style={cardStyle}>
        {items.map((d) => (
          <div key={d.id} style={rowStyle}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.filename}</div>
              <div style={{ fontSize: 11, color: "var(--mute)" }}>{d.state} · {fmt(d.bytes)} · {new Date(d.ts).toLocaleString()}</div>
            </div>
            <button className="btn" onClick={() => void window.hub.downloads.open(d.path)}>Open</button>
            <button className="btn" onClick={() => void window.hub.downloads.reveal(d.path)}>Show in folder</button>
            <button className="btn" onClick={() => void window.hub.downloads.remove(d.id)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PasswordsPanel() {
  const [items, setItems] = useState<Password[]>(getPasswords());
  const [host, setHost] = useState("");
  const [user, setUser] = useState("");
  const [secret, setSecret] = useState("");
  const [reveal, setReveal] = useState<Record<string, string>>({});
  async function add() {
    if (!host.trim() || !user.trim() || !secret.trim()) return;
    await setPassword(host.trim(), user.trim(), secret);
    setItems(getPasswords());
    setHost(""); setUser(""); setSecret("");
  }
  async function show(id: string) {
    const v = await getPasswordSecret(id);
    setReveal((r) => ({ ...r, [id]: v }));
  }
  async function del(id: string) {
    await removePassword(id);
    setItems(getPasswords());
    setReveal((r) => { const n = { ...r }; delete n[id]; return n; });
  }
  return (
    <div style={wrap}>
      <Header title="Passwords" sub="Encrypted on this device via the OS keychain — never leave your machine." />
      <div style={cardStyle}>
        <div className="mono" style={{ fontSize: 11, color: "var(--mute)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Save a new one</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8 }}>
          <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="site (e.g. github.com)" style={inp} />
          <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="username" style={inp} />
          <input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="password" type="password" style={inp} />
          <button className="btn" onClick={() => void add()}>Save</button>
        </div>
      </div>
      {items.length === 0 && <div style={{ ...cardStyle, color: "var(--mute)" }}>No saved passwords.</div>}
      <div style={cardStyle}>
        {items.map((p) => (
          <div key={p.id} style={rowStyle}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div>{p.host}</div>
              <div style={{ fontSize: 11, color: "var(--mute)" }}>{p.username} · saved {new Date(p.ts).toLocaleDateString()}</div>
              {reveal[p.id] && <div style={{ fontSize: 12, color: "var(--pink)", marginTop: 4 }}>{reveal[p.id]}</div>}
            </div>
            {!reveal[p.id] ? <button className="btn" onClick={() => void show(p.id)}>Reveal</button> : null}
            <button className="btn" onClick={() => void del(p.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GroupsPanel() {
  const [groups, setGroups] = useState<Group[]>(getGroups());
  const [name, setName] = useState("");
  const [color, setColor] = useState("#ff5577");
  function add() {
    if (!name.trim()) return;
    addGroup(name.trim(), color);
    setGroups(getGroups());
    setName("");
  }
  function rename(id: string, n: string) {
    const next = getGroups().map((g) => g.id === id ? { ...g, name: n } : g);
    saveGroups(next);
    setGroups(next);
  }
  function setGroupColor(id: string, c: string) {
    const next = getGroups().map((g) => g.id === id ? { ...g, color: c } : g);
    saveGroups(next);
    setGroups(next);
  }
  function del(id: string) {
    removeGroup(id);
    setGroups(getGroups());
  }
  return (
    <div style={wrap}>
      <Header title="Tab Groups" sub="Right-click any tab to assign it to a group." />
      <div style={cardStyle}>
        <div className="mono" style={{ fontSize: 11, color: "var(--mute)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Make a group</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="name" style={{ ...inp, flex: 1 }} />
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ ...inp, width: 64, padding: 2 }} />
          <button className="btn" onClick={add}>Add</button>
        </div>
      </div>
      {groups.length === 0 && <div style={{ ...cardStyle, color: "var(--mute)" }}>No groups.</div>}
      <div style={cardStyle}>
        {groups.map((g) => (
          <div key={g.id} style={rowStyle}>
            <span style={{ width: 14, height: 14, borderRadius: 4, background: g.color, boxShadow: `0 0 8px ${g.color}66` }} />
            <input value={g.name} onChange={(e) => rename(g.id, e.target.value)} style={{ ...inp, flex: 1 }} />
            <input type="color" value={g.color} onChange={(e) => setGroupColor(g.id, e.target.value)} style={{ ...inp, width: 56, padding: 2 }} />
            <button className="btn" onClick={() => del(g.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExtensionsPanel() {
  const [enabled, setEnabled] = useState<Set<string>>(loadEnabled());
  function toggle(id: string) {
    const next = new Set(enabled);
    next.has(id) ? next.delete(id) : next.add(id);
    setEnabled(next);
    saveEnabled(next);
  }
  return (
    <div style={wrap}>
      <Header title="Extensions" sub="House-made only. Toggle to inject on every page load." />
      <div style={cardStyle}>
        {EXTENSIONS.map((e) => (
          <div key={e.id} style={rowStyle}>
            <div style={{ flex: 1 }}>
              <div className="mono" style={{ fontSize: 13 }}>{e.name}</div>
              <div style={{ fontSize: 11, color: "var(--mute)" }}>{e.desc}</div>
            </div>
            <button className="btn" onClick={() => toggle(e.id)} style={enabled.has(e.id) ? { color: "var(--pink)", borderColor: "rgba(255,87,119,0.6)" } : undefined}>
              {enabled.has(e.id) ? "On" : "Off"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  background: "rgba(0,0,0,0.5)",
  border: "1px solid var(--line)",
  borderRadius: 8,
  color: "var(--ink)",
  padding: "8px 10px",
  fontSize: 13,
  fontFamily: "ui-monospace, monospace",
  outline: "none",
};

// In-app search-results page. Hits DuckDuckGo's HTML-only endpoint from the
// main process (CORS-free), parses the result links out, and renders them
// with the Hub's own chrome — the engine never sees our user, the user
// never sees DuckDuckGo's page.
type SearchHit = { title: string; url: string; snippet: string };
export function SearchPanel({ query, onGo }: { query: string; onGo: (url: string) => void }) {
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState(query);
  useEffect(() => { setQ(query); void run(query); }, [query]);

  async function run(text: string) {
    setErr(null);
    if (!text.trim()) { setHits([]); return; }
    setBusy(true);
    try {
      const r = await window.hub.net({
        method: "GET",
        url: "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(text),
        headers: { "User-Agent": "Mozilla/5.0 NetworkChuckHub/1.0" },
      });
      if (!r.ok) { setErr(`Search backend returned ${r.status}`); setHits([]); return; }
      const html = typeof r.data === "string" ? r.data : "";
      setHits(parseDdg(html));
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={wrap}>
      <Header title={`Search · ${query}`} sub="Results fetched from DuckDuckGo's HTML endpoint and rendered with the Hub's own chrome — no third-party UI on screen." />
      <div style={{ display: "flex", gap: 8 }}>
        <input style={inp} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") onGo("about:search?q=" + encodeURIComponent(q)); }} placeholder="search again" />
        <button className="btn" onClick={() => onGo("about:search?q=" + encodeURIComponent(q))}>Go</button>
      </div>
      {err && <div style={{ ...cardStyle, color: "var(--mute)" }}>Couldn&apos;t reach the engine: {err}</div>}
      {!err && !busy && hits.length === 0 && <div style={{ ...cardStyle, color: "var(--mute)" }}>No results.</div>}
      {busy && <div style={{ ...cardStyle, color: "var(--mute)" }}>Searching…</div>}
      <div style={cardStyle}>
        {hits.map((h, i) => (
          <div key={i} style={{ ...rowStyle, alignItems: "flex-start" }}>
            <div style={{ flex: 1, cursor: "pointer" }} onClick={() => onGo(h.url)}>
              <div style={{ color: "var(--pink)", fontSize: 14, fontWeight: 600 }}>{h.title || h.url}</div>
              <div style={{ fontSize: 11, color: "var(--mute)", marginTop: 2 }}>{h.url}</div>
              {h.snippet && <div style={{ fontSize: 12, color: "var(--ink)", opacity: 0.85, marginTop: 6, lineHeight: 1.4 }}>{h.snippet}</div>}
            </div>
            <button className="btn" onClick={() => onGo(h.url)}>Open</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Parse DuckDuckGo's static HTML results — result links live at
// .result__a wrapped in /l/?uddg=<encoded-url>&... links. Snippets are
// in .result__snippet. Titles are the link text. Regex-light to avoid a
// DOM parser dependency.
function parseDdg(html: string): SearchHit[] {
  const out: SearchHit[] = [];
  const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>([\s\S]*?)(?:<a\s+class="result__snippet"[^>]*>([\s\S]*?)<\/a>)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (out.length >= 30) break;
    const raw = m[1];
    let url = raw;
    // DDG wraps links in /l/?uddg=<encoded>; unwrap.
    const enc = url.match(/[?&]uddg=([^&]+)/);
    if (enc) {
      try { url = decodeURIComponent(enc[1]); } catch { /* keep raw */ }
    }
    if (url.startsWith("//")) url = "https:" + url;
    const title = stripTags(m[2]);
    const snippet = m[4] ? stripTags(m[4]) : "";
    if (!url || !title) continue;
    out.push({ title, url, snippet });
  }
  return out;
}
function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").trim();
}

// Help for the address bar to recognize internal pages.
export const PANEL_KEYS = ["about:start", "about:bookmarks", "about:history", "about:downloads", "about:passwords", "about:groups", "about:extensions", "about:search"] as const;
export type PanelKey = (typeof PANEL_KEYS)[number];
export const PANEL_NAMES: Record<PanelKey, string> = {
  "about:start": "New Tab",
  "about:bookmarks": "Bookmarks",
  "about:history": "History",
  "about:downloads": "Downloads",
  "about:passwords": "Passwords",
  "about:groups": "Tab Groups",
  "about:extensions": "Extensions",
  "about:search": "Search",
};
// about:search carries a ?q= query string — treat any URL whose base path
// matches a panel key as that panel.
export function isPanel(url: string): boolean {
  const base = url.split("?")[0];
  return (PANEL_KEYS as readonly string[]).includes(base);
}
export function panelBase(url: string): PanelKey | null {
  const base = url.split("?")[0] as PanelKey;
  return (PANEL_KEYS as readonly string[]).includes(base) ? base : null;
}
export function panelQuery(url: string, key: string): string {
  const q = url.split("?")[1];
  if (!q) return "";
  const params = new URLSearchParams(q);
  return params.get(key) || "";
}

export function addBookmarkHelper(title: string, url: string) {
  return addBookmark(title, url);
}
