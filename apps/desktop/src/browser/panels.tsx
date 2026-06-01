import { useEffect, useState } from "react";
import {
  type Bookmark, type Group, type HistoryEntry, type Password,
  addBookmark, addGroup, bookmarksSorted, clearHistory, getGroups, getHistory,
  getPasswords, removeBookmark, removeGroup, removeHistoryEntry, removePassword,
  reorderBookmarks, setPassword, getPasswordSecret, saveGroups, subscribeBookmarks,
  updateBookmark,
} from "./store";
import { EXTENSIONS, addCustomExtension, loadCustomExtensions, loadEnabled, removeCustomExtension, saveEnabled, subscribeCustomExtensions } from "../extensions";

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

const BOOKMARK_COLORS = ["#ff5577", "#ff7a2d", "#fbbf24", "#22c55e", "#22d3ee", "#3b82f6", "#a78bfa", "#ec4899", "#9ca3af"];

type SortMode = "custom" | "alpha" | "recent";

export function BookmarksPanel({ onGo }: { onGo: (url: string) => void }) {
  const [items, setItems] = useState<Bookmark[]>(bookmarksSorted());
  const [sortMode, setSortMode] = useState<SortMode>("custom");
  const [editing, setEditing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editFolder, setEditFolder] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  useEffect(() => subscribeBookmarks(() => setItems(bookmarksSorted())), []);

  const sorted = (() => {
    const copy = [...items];
    if (sortMode === "alpha") copy.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortMode === "recent") copy.sort((a, b) => b.ts - a.ts);
    return copy;
  })();
  const folders = Array.from(new Set(sorted.map((b) => b.folder || "Saved")));

  function startEdit(b: Bookmark) { setEditing(b.id); setEditTitle(b.title); setEditUrl(b.url); setEditFolder(b.folder || ""); }
  function commitEdit(id: string) {
    updateBookmark(id, { title: editTitle.trim() || editUrl, url: editUrl.trim(), folder: editFolder.trim() || undefined });
    setEditing(null);
  }
  function setColor(id: string, c: string) { updateBookmark(id, { color: c }); }

  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId || sortMode !== "custom") { setDragId(null); setOverId(null); return; }
    const ids = sorted.map((b) => b.id).filter((id) => id !== dragId);
    const idx = ids.indexOf(targetId);
    ids.splice(idx, 0, dragId);
    reorderBookmarks(ids);
    setDragId(null); setOverId(null);
  }

  return (
    <div style={wrap}>
      <Header title="Bookmarks" sub="Click to open. Drag to reorder. Click the title to rename. Pick a color tag." />
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <span className="mono" style={{ fontSize: 11, color: "var(--mute)", letterSpacing: 1, textTransform: "uppercase" }}>Sort</span>
        {(["custom", "alpha", "recent"] as const).map((m) => (
          <button key={m} className="btn" style={{ padding: "3px 10px", fontSize: 11, color: sortMode === m ? "var(--pink)" : undefined, borderColor: sortMode === m ? "rgba(255,87,119,0.6)" : undefined }} onClick={() => setSortMode(m)}>
            {m === "custom" ? "Manual" : m === "alpha" ? "A–Z" : "Newest"}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: "var(--mute)" }}>{items.length} saved</span>
      </div>
      {items.length === 0 && <div style={{ ...cardStyle, color: "var(--mute)" }}>Nothing saved yet. Hit the ★ in the address bar on any page.</div>}
      {folders.map((f) => (
        <div key={f} style={cardStyle}>
          <div className="mono" style={{ fontSize: 11, color: "var(--mute)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>{f}</div>
          {sorted.filter((b) => (b.folder || "Saved") === f).map((b) => {
            const isEdit = editing === b.id;
            const isOver = overId === b.id && dragId && dragId !== b.id;
            return (
              <div key={b.id}
                draggable={sortMode === "custom" && !isEdit}
                onDragStart={() => setDragId(b.id)}
                onDragOver={(e) => { if (dragId && sortMode === "custom") { e.preventDefault(); setOverId(b.id); } }}
                onDragLeave={() => { if (overId === b.id) setOverId(null); }}
                onDrop={(e) => { e.preventDefault(); onDrop(b.id); }}
                onDragEnd={() => { setDragId(null); setOverId(null); }}
                onContextMenu={(e) => { e.preventDefault(); removeBookmark(b.id); }}
                style={{ ...rowStyle, position: "relative", borderTop: isOver ? "2px solid var(--pink)" : undefined, opacity: dragId === b.id ? 0.5 : 1, cursor: sortMode === "custom" && !isEdit ? "grab" : undefined }}>
                <span style={{ width: 4, height: 28, borderRadius: 2, background: b.color || "var(--mute)", boxShadow: b.color ? `0 0 6px ${b.color}88` : undefined }} />
                {isEdit ? (
                  <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                    <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="title" style={inp} onKeyDown={(e) => { if (e.key === "Enter") commitEdit(b.id); if (e.key === "Escape") setEditing(null); }} autoFocus />
                    <input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="https://…" style={inp} onKeyDown={(e) => { if (e.key === "Enter") commitEdit(b.id); }} />
                    <input value={editFolder} onChange={(e) => setEditFolder(e.target.value)} placeholder="folder (optional)" style={inp} onKeyDown={(e) => { if (e.key === "Enter") commitEdit(b.id); }} />
                  </div>
                ) : (
                  <span style={{ flex: 1, cursor: "pointer", color: "var(--ink)" }} onClick={() => onGo(b.url)}>
                    <div>{b.title}</div>
                    <div style={{ fontSize: 11, color: "var(--mute)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.url}</div>
                  </span>
                )}
                <ColorPicker value={b.color} onChange={(c) => setColor(b.id, c)} />
                {isEdit ? (
                  <>
                    <button className="btn" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => commitEdit(b.id)}>Save</button>
                    <button className="btn" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => setEditing(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button className="btn" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => startEdit(b)}>Rename</button>
                    <button className="btn" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => removeBookmark(b.id)}>Remove</button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ColorPicker({ value, onChange }: { value?: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button className="btn" title="color tag" style={{ padding: "4px 8px", fontSize: 10, borderColor: value ? `${value}88` : undefined, color: value || undefined }} onClick={() => setOpen((o) => !o)}>● color</button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: 30, background: "#0e0e14", border: "1px solid var(--line)", borderRadius: 8, padding: 6, zIndex: 10, display: "flex", gap: 4, boxShadow: "0 12px 28px rgba(0,0,0,0.55)" }}>
          {BOOKMARK_COLORS.map((c) => (
            <span key={c} onClick={() => { onChange(c); setOpen(false); }} style={{ width: 18, height: 18, borderRadius: 4, background: c, cursor: "pointer", border: value === c ? "2px solid #fff" : "2px solid transparent", boxShadow: `0 0 6px ${c}66` }} />
          ))}
          <span onClick={() => { onChange(""); setOpen(false); }} title="clear" style={{ width: 18, height: 18, borderRadius: 4, background: "transparent", border: "1px dashed var(--mute)", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--mute)", fontSize: 12, lineHeight: 1 }}>×</span>
        </div>
      )}
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
  const [custom, setCustom] = useState(loadCustomExtensions);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => subscribeCustomExtensions(() => setCustom(loadCustomExtensions())), []);

  function toggle(id: string) {
    const next = new Set(enabled);
    next.has(id) ? next.delete(id) : next.add(id);
    setEnabled(next);
    saveEnabled(next);
  }
  async function pickFile() {
    const i = document.createElement("input");
    i.type = "file"; i.accept = ".js,text/javascript";
    i.onchange = async () => {
      const f = i.files?.[0]; if (!f) return;
      setCode(await f.text());
      if (!name) setName(f.name.replace(/\.[^.]+$/, ""));
    };
    i.click();
  }
  function save() {
    setErr(null);
    if (!code.trim()) { setErr("Paste JavaScript or upload a .js file first."); return; }
    if (!name.trim()) { setErr("Give your extension a name."); return; }
    addCustomExtension(name, desc, code);
    setName(""); setDesc(""); setCode("");
  }

  return (
    <div style={wrap}>
      <Header title="Extensions" sub="House-made + your own. Toggle one on and it injects into every page; toggle off and it cleanly strips itself." />
      {/* Add your own */}
      <div style={{ ...cardStyle, borderColor: "rgba(255,87,119,0.35)" }}>
        <div className="mono glow-text" style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>+ Write or upload your own</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8, marginBottom: 8 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" style={inp} />
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)" style={inp} />
        </div>
        <textarea value={code} onChange={(e) => setCode(e.target.value)} placeholder={"// Any JS — runs on every page at dom-ready.\n// Example: document.body.style.background = 'pink';"}
          spellCheck={false}
          style={{ ...inp, width: "100%", minHeight: 140, fontFamily: "ui-monospace,monospace", lineHeight: 1.5, whiteSpace: "pre" }} />
        {err && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 6 }}>{err}</div>}
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <button className="btn" onClick={save}>Add extension</button>
          <button className="btn" onClick={() => void pickFile()}>Upload .js file</button>
          <span style={{ flex: 1 }} />
          <button className="btn" onClick={() => { setName(""); setDesc(""); setCode(""); setErr(null); }}>Clear</button>
        </div>
      </div>
      {custom.length > 0 && (
        <div style={cardStyle}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: 1.5, color: "var(--mute)", textTransform: "uppercase", marginBottom: 6 }}>Your extensions</div>
          {custom.map((e) => (
            <div key={e.id} style={rowStyle}>
              <div style={{ flex: 1 }}>
                <div className="mono" style={{ fontSize: 13 }}>◈ {e.name}</div>
                <div style={{ fontSize: 11, color: "var(--mute)" }}>{e.desc}</div>
              </div>
              <button className="btn" onClick={() => toggle(e.id)} style={enabled.has(e.id) ? { color: "var(--pink)", borderColor: "rgba(255,87,119,0.6)" } : undefined}>{enabled.has(e.id) ? "On" : "Off"}</button>
              <button className="btn" onClick={() => { if (confirm("Remove " + e.name + "?")) removeCustomExtension(e.id); }}>Remove</button>
            </div>
          ))}
        </div>
      )}
      <div style={cardStyle}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: 1.5, color: "var(--mute)", textTransform: "uppercase", marginBottom: 6 }}>House extensions</div>
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
type SearchMode = "web" | "images" | "videos" | "news" | "shopping";

const SEARCH_TABS: { id: SearchMode; label: string }[] = [
  { id: "web",      label: "Web" },
  { id: "images",   label: "Images" },
  { id: "videos",   label: "Videos" },
  { id: "news",     label: "News" },
  { id: "shopping", label: "Shopping" },
];

type ImgHit = { thumb: string; image: string; source: string; title: string };
type VidHit = { url: string; title: string; thumb: string; duration: string; source: string };
type ShopHit = { title: string; price: string; source: string; url: string; thumb?: string };

export function SearchPanel({ query, onGo }: { query: string; onGo: (url: string) => void }) {
  const [mode, setMode] = useState<SearchMode>("web");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [news, setNews] = useState<SearchHit[]>([]);
  const [images, setImages] = useState<ImgHit[]>([]);
  const [videos, setVideos] = useState<VidHit[]>([]);
  const [shopping, setShopping] = useState<ShopHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState(query);
  useEffect(() => { setQ(query); void run(query, mode); }, [query, mode]);

  async function run(text: string, m: SearchMode) {
    setErr(null);
    if (!text.trim()) { setHits([]); setImages([]); setVideos([]); setNews([]); setShopping([]); return; }
    setBusy(true);
    try {
      if (m === "web") {
        const r = await window.hub.net({ method: "GET", url: "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(text), headers: { "User-Agent": "Mozilla/5.0 NetworkChuckHub/1.0" } });
        if (!r.ok) { setErr(`Search backend returned ${r.status}`); setHits([]); return; }
        setHits(parseDdg(typeof r.data === "string" ? r.data : ""));
      } else if (m === "news") {
        const r = await window.hub.net({ method: "GET", url: "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(text + " news") + "&iar=news", headers: { "User-Agent": "Mozilla/5.0 NetworkChuckHub/1.0" } });
        if (!r.ok) { setErr(`News backend returned ${r.status}`); setNews([]); return; }
        setNews(parseDdg(typeof r.data === "string" ? r.data : ""));
      } else if (m === "images") {
        // DDG image search: hit i.js for JSON results (needs a vqd token from the HTML page first).
        const tok = await window.hub.net({ method: "GET", url: "https://duckduckgo.com/?q=" + encodeURIComponent(text) + "&t=h_&iax=images&ia=images", headers: { "User-Agent": "Mozilla/5.0 NetworkChuckHub/1.0" } });
        const html = typeof tok.data === "string" ? tok.data : "";
        const v = html.match(/vqd=['"]?([\d-]+)['"]?/) || html.match(/vqd=([\d-]+)&/);
        const vqd = v ? v[1] : "";
        if (!vqd) { setErr("Couldn't initialise image search."); setImages([]); return; }
        const r = await window.hub.net({ method: "GET", url: `https://duckduckgo.com/i.js?q=${encodeURIComponent(text)}&o=json&vqd=${vqd}&l=us-en&p=-1`, headers: { "User-Agent": "Mozilla/5.0 NetworkChuckHub/1.0", Referer: "https://duckduckgo.com/" } });
        const j = (typeof r.data === "object" ? r.data : null) as { results?: { thumbnail: string; image: string; url: string; title: string }[] } | null;
        const items = (j?.results || []).slice(0, 40).map((x): ImgHit => ({ thumb: x.thumbnail, image: x.image, source: x.url, title: x.title }));
        setImages(items);
      } else if (m === "videos") {
        const tok = await window.hub.net({ method: "GET", url: "https://duckduckgo.com/?q=" + encodeURIComponent(text) + "&iax=videos&ia=videos", headers: { "User-Agent": "Mozilla/5.0 NetworkChuckHub/1.0" } });
        const html = typeof tok.data === "string" ? tok.data : "";
        const v = html.match(/vqd=['"]?([\d-]+)['"]?/) || html.match(/vqd=([\d-]+)&/);
        const vqd = v ? v[1] : "";
        if (!vqd) { setErr("Couldn't initialise video search."); setVideos([]); return; }
        const r = await window.hub.net({ method: "GET", url: `https://duckduckgo.com/v.js?q=${encodeURIComponent(text)}&o=json&vqd=${vqd}&l=us-en`, headers: { "User-Agent": "Mozilla/5.0 NetworkChuckHub/1.0", Referer: "https://duckduckgo.com/" } });
        const j = (typeof r.data === "object" ? r.data : null) as { results?: { content: string; title: string; images?: { medium?: string; small?: string }; duration?: string; publisher?: string }[] } | null;
        setVideos((j?.results || []).slice(0, 24).map((x) => ({ url: x.content, title: x.title, thumb: x.images?.medium || x.images?.small || "", duration: x.duration || "", source: x.publisher || "" })));
      } else if (m === "shopping") {
        // No first-party shopping API on DDG; use a web-style search with a shopping qualifier.
        const r = await window.hub.net({ method: "GET", url: "https://html.duckduckgo.com/html/?q=" + encodeURIComponent("buy " + text + " price"), headers: { "User-Agent": "Mozilla/5.0 NetworkChuckHub/1.0" } });
        if (!r.ok) { setErr(`Shopping backend returned ${r.status}`); setShopping([]); return; }
        const raw = parseDdg(typeof r.data === "string" ? r.data : "");
        // Heuristic: pull a $-marked price from the snippet if present.
        const items: ShopHit[] = raw.slice(0, 24).map((h) => {
          const pm = (h.snippet || "").match(/\$[\d.,]+(?:\.\d+)?/);
          return { title: h.title, price: pm ? pm[0] : "", source: new URL(h.url, "https://x.x").hostname.replace(/^www\./, ""), url: h.url };
        });
        setShopping(items);
      }
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  }

  function hostOf(url: string): string { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } }
  function crumbOf(url: string): string {
    try {
      const u = new URL(url);
      const path = u.pathname.replace(/\/$/, "").split("/").filter(Boolean).slice(0, 3).map(decodeURIComponent).join(" › ");
      const host = u.hostname.replace(/^www\./, "");
      return path ? `${host} › ${path}` : host;
    } catch { return url; }
  }
  function favicon(url: string): string {
    try { const u = new URL(url); return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`; } catch { return ""; }
  }

  const sourceTallies = (() => {
    const counts = new Map<string, number>();
    for (const h of hits) { const host = hostOf(h.url); if (host) counts.set(host, (counts.get(host) || 0) + 1); }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  })();

  return (
    <div style={wrap}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Header title={`Search · ${query}`} sub="Web, Images, Videos, News, Shopping — DuckDuckGo's results, in our chrome." />
        {!busy && !err && mode === "web" && hits.length > 0 && (
          <span className="mono" style={{ fontSize: 11, color: "var(--mute)", marginLeft: "auto" }}>{hits.length} results</span>
        )}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input style={{ ...inp, fontSize: 14, padding: "10px 14px" }} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") onGo("about:search?q=" + encodeURIComponent(q)); }} placeholder="search again" autoFocus />
        <button className="btn" style={{ padding: "8px 18px", color: "var(--pink)", borderColor: "rgba(255,87,119,0.55)", boxShadow: "0 0 12px rgba(255,87,119,0.2)" }} onClick={() => onGo("about:search?q=" + encodeURIComponent(q))}>Go</button>
      </div>
      <div style={{ display: "flex", gap: 4, margin: "4px 0 0", borderBottom: "1px solid var(--line)", paddingBottom: 6 }}>
        {SEARCH_TABS.map((t) => (
          <button key={t.id} className="btn" style={{ padding: "5px 14px", fontSize: 12, borderRadius: "8px 8px 0 0", borderBottom: mode === t.id ? "2px solid var(--pink)" : "2px solid transparent", color: mode === t.id ? "var(--pink)" : undefined, background: mode === t.id ? "rgba(255,87,119,0.06)" : undefined, borderColor: mode === t.id ? "rgba(255,87,119,0.5)" : undefined }} onClick={() => setMode(t.id)}>{t.label}</button>
        ))}
      </div>
      {err && <div style={{ ...cardStyle, color: "#ef4444", borderColor: "rgba(239,68,68,0.4)" }}>Couldn&apos;t reach the engine: {err}</div>}
      {busy && <div style={{ ...cardStyle, color: "var(--mute)" }}>Searching DuckDuckGo for &ldquo;{query}&rdquo;…</div>}

      {/* Top sources rail — only on web search */}
      {!busy && !err && mode === "web" && sourceTallies.length > 1 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "4px 2px" }}>
          <span className="mono" style={{ fontSize: 10, color: "var(--mute)", letterSpacing: 1, textTransform: "uppercase", alignSelf: "center" }}>Sources:</span>
          {sourceTallies.map(([host, count]) => (
            <button key={host} className="btn" style={{ padding: "3px 8px", fontSize: 11 }} onClick={() => onGo(`about:search?q=${encodeURIComponent(query + " site:" + host)}`)}>
              <img src={`https://www.google.com/s2/favicons?domain=${host}&sz=16`} alt="" style={{ width: 13, height: 13, marginRight: 5, verticalAlign: "-2px" }} />
              {host} <span style={{ color: "var(--mute)", marginLeft: 4 }}>{count}</span>
            </button>
          ))}
        </div>
      )}

      {!busy && !err && mode === "web" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {hits.length === 0 ? <div style={{ ...cardStyle, color: "var(--mute)" }}>No results.</div> : hits.map((h, i) => (
            <SearchResult key={i} hit={h} hostOf={hostOf} crumbOf={crumbOf} favicon={favicon} onGo={onGo} />
          ))}
        </div>
      )}
      {!busy && !err && mode === "news" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {news.length === 0 ? <div style={{ ...cardStyle, color: "var(--mute)" }}>No news results.</div> : news.map((h, i) => (
            <SearchResult key={i} hit={h} hostOf={hostOf} crumbOf={crumbOf} favicon={favicon} onGo={onGo} />
          ))}
        </div>
      )}
      {!busy && !err && mode === "images" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8, padding: 14 }}>
          {images.length === 0 ? <div style={{ color: "var(--mute)" }}>No image results.</div> : images.map((h, i) => (
            <div key={i} onClick={() => onGo(h.image)} style={{ cursor: "pointer", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden", background: "rgba(0,0,0,0.4)" }} title={h.title}>
              <div style={{ aspectRatio: "1 / 1", background: `center / cover no-repeat url("${h.thumb}")` }} />
              <div className="mono" style={{ fontSize: 10, color: "var(--mute)", padding: "4px 6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{(() => { try { return new URL(h.source).hostname.replace(/^www\./, ""); } catch { return ""; } })()}</div>
            </div>
          ))}
        </div>
      )}
      {!busy && !err && mode === "videos" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10, padding: 14 }}>
          {videos.length === 0 ? <div style={{ color: "var(--mute)" }}>No video results.</div> : videos.map((v, i) => (
            <div key={i} onClick={() => onGo(v.url)} style={{ cursor: "pointer", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden", background: "rgba(0,0,0,0.4)" }}>
              <div style={{ aspectRatio: "16 / 9", background: v.thumb ? `center / cover no-repeat url("${v.thumb}")` : "rgba(0,0,0,0.6)", position: "relative" }}>
                {v.duration && <span style={{ position: "absolute", right: 4, bottom: 4, fontSize: 10, padding: "1px 4px", background: "rgba(0,0,0,0.7)", color: "white" }}>{v.duration}</span>}
              </div>
              <div style={{ padding: "6px 8px" }}>
                <div style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>{v.title}</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--mute)", marginTop: 3 }}>{v.source}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {!busy && !err && mode === "shopping" && (
        <div style={cardStyle}>
          {shopping.length === 0 ? <div style={{ color: "var(--mute)" }}>No shopping results.</div> : shopping.map((s, i) => (
            <div key={i} style={{ ...rowStyle, alignItems: "flex-start" }}>
              <div style={{ flex: 1, cursor: "pointer" }} onClick={() => onGo(s.url)}>
                <div style={{ color: "var(--pink)", fontSize: 14, fontWeight: 600 }}>{s.title}</div>
                <div style={{ fontSize: 11, color: "var(--mute)", marginTop: 2 }}>{s.source}</div>
              </div>
              {s.price && <div className="mono glow-text" style={{ fontSize: 16, marginLeft: 8 }}>{s.price}</div>}
              <button className="btn" onClick={() => onGo(s.url)}>Open</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SearchResult({ hit, hostOf, crumbOf, favicon, onGo }: {
  hit: SearchHit;
  hostOf: (u: string) => string;
  crumbOf: (u: string) => string;
  favicon: (u: string) => string;
  onGo: (u: string) => void;
}) {
  const host = hostOf(hit.url);
  const crumb = crumbOf(hit.url);
  return (
    <div style={{ padding: "10px 14px", border: "1px solid transparent", borderRadius: 10, transition: "border-color .15s, background .15s, box-shadow .15s" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,87,119,0.25)"; e.currentTarget.style.background = "rgba(255,87,119,0.03)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <img src={favicon(hit.url)} alt="" style={{ width: 16, height: 16, borderRadius: 3, background: "rgba(255,255,255,0.04)" }} onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden"; }} />
        <span style={{ fontSize: 11, color: "var(--mute)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{crumb}</span>
      </div>
      <div onClick={() => onGo(hit.url)} style={{ cursor: "pointer", fontSize: 17, color: "#9eb7ff", fontWeight: 500, lineHeight: 1.3, marginBottom: 4 }}
        onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
        onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}>
        {hit.title || hit.url}
      </div>
      {hit.snippet && <div style={{ fontSize: 13, color: "#cfcfd6", lineHeight: 1.5 }}>{hit.snippet}</div>}
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button className="btn" style={{ padding: "3px 10px", fontSize: 11 }} onClick={() => onGo(hit.url)}>Open</button>
        <button className="btn" style={{ padding: "3px 10px", fontSize: 11 }} onClick={() => addBookmark(hit.title || hit.url, hit.url)}>★ Save</button>
        <button className="btn" style={{ padding: "3px 10px", fontSize: 11 }} onClick={() => navigator.clipboard?.writeText(hit.url)}>Copy link</button>
        <span style={{ flex: 1 }} />
        <button className="btn" style={{ padding: "3px 10px", fontSize: 11, color: "var(--mute)" }} onClick={() => onGo("about:search?q=" + encodeURIComponent("site:" + host))}>more from {host}</button>
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
