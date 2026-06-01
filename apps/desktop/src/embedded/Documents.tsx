import { useEffect, useState } from "react";
import {
  loadDocs, subscribeDocs, addDoc, removeDoc, setDocBlocked, renameDoc,
  setConnected, docUrl, type DocEntry,
} from "./documents/docsStore";

// Documents — our chrome over Google Docs. Connect once (sign into Google in
// the embedded view); add docs by pasting their share link. The full Docs
// editor loads in a webview — nothing is taken away — but the sidebar, AI
// access, and per-doc blocking are ours. NCH-colored Docs mark in the header.

export function Documents() {
  const [state, setState] = useState(loadDocs);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [link, setLink] = useState("");
  const [title, setTitle] = useState("");

  useEffect(() => subscribeDocs(setState), []);
  useEffect(() => { if (!activeId && state.docs[0]) setActiveId(state.docs[0].id); }, [state.docs, activeId]);

  const active = state.docs.find((d) => d.id === activeId) || null;

  function doAdd() {
    const e = addDoc(link, title);
    if (e) { setActiveId(e.id); setLink(""); setTitle(""); setAdding(false); }
  }

  const [importing, setImporting] = useState(false);
  const [importNote, setImportNote] = useState<string | null>(null);
  async function importFromDrive() {
    setImporting(true); setImportNote(null);
    try {
      const r = await window.hub.docs.listMine();
      if (!r.ok || !r.docs.length) { setImportNote(r.error ? `Couldn't list (${r.error}).` : "No docs found — open https://docs.google.com once in the editor here so you're signed in, then try again."); return; }
      let added = 0;
      for (const d of r.docs) if (addDoc(d.id, d.title)) added++;
      setImportNote(added ? `Imported ${added} docs from your Drive.` : "Everything was already in your list.");
    } finally { setImporting(false); }
  }

  if (!state.connected) {
    return (
      <div className="stage" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <DocsHeader />
        <div style={{ flex: 1, display: "grid", placeItems: "center", padding: 40, textAlign: "center" }}>
          <div style={{ maxWidth: 460 }}>
            <div className="glow-text" style={{ fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontWeight: 800, fontSize: 20, marginBottom: 10 }}>Connect Google Docs</div>
            <p style={{ fontSize: 13, color: "var(--mute)", lineHeight: 1.6 }}>
              Documents wraps your real Google Docs in NCH chrome — nothing taken away, just more visible. Connect once: sign into Google in the embedded view, then add docs by pasting their share link. You can also connect from the Control Panel.
            </p>
            <button className="btn" style={{ marginTop: 14, color: "var(--pink)", borderColor: "rgba(255,87,119,0.6)" }} onClick={() => setConnected(true)}>Connect &amp; sign in</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stage" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      <DocsHeader>
        {active && <a className="btn" href={docUrl(active.id)} target="_blank" rel="noreferrer" style={{ fontSize: 11 }}>open in browser</a>}
        <a className="btn" href="https://docs.google.com/document/create" target="_blank" rel="noreferrer" style={{ fontSize: 11 }}>+ New doc</a>
      </DocsHeader>
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Sidebar */}
        <div style={{ width: 240, borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ display: "flex", gap: 6, margin: 10 }}>
            <button className="btn" style={{ flex: 1 }} onClick={() => setAdding((a) => !a)}>{adding ? "Cancel" : "+ Add a doc"}</button>
            <button className="btn" disabled={importing} title="Auto-list from your Google Drive (uses the signed-in session)" onClick={() => void importFromDrive()}>{importing ? "…" : "Sync"}</button>
          </div>
          {adding && (
            <div style={{ padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
              <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="paste Google Doc link" style={inp} />
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="title (optional)" style={inp} />
              <button className="btn" onClick={doAdd}>Add</button>
            </div>
          )}
          {importNote && <div style={{ fontSize: 11, color: importNote.startsWith("Couldn") ? "#ef4444" : "var(--mute)", padding: "0 10px 8px" }}>{importNote}</div>}
          <div style={{ flex: 1, overflow: "auto", padding: "0 8px 8px" }}>
            {state.docs.length === 0 && <div style={{ fontSize: 11, color: "var(--mute)", padding: 8 }}>No docs yet. Paste a share link to add one.</div>}
            {state.docs.map((d) => (
              <DocRow key={d.id} d={d} active={d.id === activeId} onOpen={() => setActiveId(d.id)} />
            ))}
          </div>
          <div style={{ padding: 8, borderTop: "1px solid var(--line)" }}>
            <button className="btn" style={{ width: "100%", fontSize: 11 }} onClick={() => setConnected(false)}>Disconnect</button>
          </div>
        </div>
        {/* Editor */}
        <div style={{ flex: 1, minWidth: 0, background: "#fff" }}>
          {active ? (
            <webview key={active.id} src={docUrl(active.id)} partition="persist:hub" allowpopups={true as unknown as undefined}
              style={{ width: "100%", height: "100%", border: "none", display: "block" }} />
          ) : (
            <div style={{ height: "100%", display: "grid", placeItems: "center", color: "#666" }}>Select or add a document.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function DocRow({ d, active, onOpen }: { d: DocEntry; active: boolean; onOpen: () => void }) {
  const [editing, setEditing] = useState(false);
  return (
    <div onClick={onOpen} className={active ? "panel-hot panel" : "panel"}
      style={{ padding: "8px 10px", marginBottom: 6, cursor: "pointer", borderColor: active ? "rgba(255,87,119,0.5)" : undefined, background: active ? "rgba(255,87,119,0.06)" : undefined }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {editing ? (
          <input autoFocus defaultValue={d.title} onClick={(e) => e.stopPropagation()} onBlur={(e) => { renameDoc(d.id, e.target.value); setEditing(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") { renameDoc(d.id, (e.target as HTMLInputElement).value); setEditing(false); } }}
            style={{ ...inp, flex: 1 }} />
        ) : (
          <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}>{d.title}</span>
        )}
        <span onClick={(e) => { e.stopPropagation(); removeDoc(d.id); }} title="remove" style={{ color: "var(--mute)", fontSize: 11, cursor: "pointer" }}>✕</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
        <button onClick={(e) => { e.stopPropagation(); setDocBlocked(d.id, !d.blocked); }}
          className="btn" style={{ fontSize: 9, padding: "2px 7px", color: d.blocked ? "#ef4444" : "#22c55e", borderColor: d.blocked ? "rgba(239,68,68,0.5)" : "rgba(34,197,94,0.4)" }}>
          {d.blocked ? "AI: blocked" : "AI: allowed"}
        </button>
      </div>
    </div>
  );
}

function DocsHeader({ children }: { children?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: "1px solid var(--line)", background: "linear-gradient(90deg, #1a0a10, #120a12)" }}>
      <DocsLogo size={28} />
      <div style={{ lineHeight: 1.15 }}>
        <div className="glow-text" style={{ fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: 2 }}>DOCUMENTS</div>
        <div className="mono" style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "var(--mute)" }}>Google Docs · NCH</div>
      </div>
      <div style={{ flex: 1 }} />
      {children}
    </div>
  );
}

// Google-Docs-shaped mark in NCH colors (red->orange gradient, folded corner,
// text lines) — the Docs silhouette, our palette.
export function DocsLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-label="Documents">
      <defs>
        <linearGradient id="nch-docs" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0" stopColor="#ff2d4a" /><stop offset="0.55" stopColor="#ff5577" /><stop offset="1" stopColor="#ff7a2d" />
        </linearGradient>
      </defs>
      <path d="M12 3 h18 l10 10 v30 a2 2 0 0 1-2 2 H12 a2 2 0 0 1-2-2 V5 a2 2 0 0 1 2-2 z" fill="url(#nch-docs)" />
      <path d="M30 3 l10 10 h-9 a1 1 0 0 1-1-1 z" fill="#0a0810" opacity="0.35" />
      <g stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.92">
        <line x1="16" y1="22" x2="34" y2="22" /><line x1="16" y1="28" x2="34" y2="28" /><line x1="16" y1="34" x2="28" y2="34" />
      </g>
    </svg>
  );
}

const inp: React.CSSProperties = {
  background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 6,
  color: "var(--ink)", padding: "6px 8px", fontSize: 12, fontFamily: "ui-monospace, monospace", outline: "none", width: "100%",
};
