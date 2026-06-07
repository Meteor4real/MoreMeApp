// MoreMe — Plans. The reference bucket: freeform notes for ideas, ARG
// planning, meeting talking points, and the unannounced plans you're not
// ready to schedule yet. Pin the important ones; mark the secret ones hidden.

import { useState } from "react";
import { T } from "./styles";
import type { Note, State } from "./types";
import { blankNote, removeNote, upsertNote } from "./store";

export function PlansView({ s }: { s: State }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const notes = [...s.notes].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.updatedAt - a.updatedAt);
  const editing = notes.find((n) => n.id === openId) ?? null;

  return (
    <div style={{ maxWidth: 940, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div className="serif" style={{ fontSize: 22, lineHeight: 1 }}>Plans</div>
          <div style={{ fontSize: 11, color: T.inkTiny, letterSpacing: ".08em", textTransform: "uppercase", marginTop: 4 }}>
            Ideas, drafts, and the things you haven't announced yet
          </div>
        </div>
        <button className="mm-btn mm-btn-primary" onClick={() => { const n = blankNote(); upsertNote(n); setOpenId(n.id); }}>+ New plan</button>
      </div>

      {notes.length === 0 && <Empty>Nothing here yet. Capture a plan, a draft, a secret.</Empty>}

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
        {notes.map((n) => {
          const proj = s.projects.find((p) => p.id === n.linkedProjectId);
          return (
            <div key={n.id} className="mm-card" style={{ padding: 14, cursor: "pointer", borderColor: n.pinned ? T.mint : T.line, opacity: n.hidden ? 0.7 : 1 }} onClick={() => setOpenId(n.id)}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                {n.pinned && <span style={{ color: T.mint }}>★</span>}
                <b style={{ fontSize: 14, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.title || "(untitled)"}</b>
                {n.hidden && <span className="mm-pill" style={{ background: "#FFD23E22", color: "#FFD23E" }}>Hidden</span>}
              </div>
              <div style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.5, maxHeight: 66, overflow: "hidden" }}>
                {n.body || <span style={{ fontStyle: "italic", color: T.inkTiny }}>Empty</span>}
              </div>
              {proj && <div style={{ fontSize: 10, color: T.inkTiny, marginTop: 8 }}>◆ {proj.name}</div>}
            </div>
          );
        })}
      </div>

      {editing && <NoteEditor s={s} note={editing} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function NoteEditor({ s, note, onClose }: { s: State; note: Note; onClose: () => void }) {
  const [n, setN] = useState<Note>(note);
  const set = <K extends keyof Note>(k: K, v: Note[K]) => setN((p) => ({ ...p, [k]: v }));
  const save = () => { upsertNote(n); onClose(); };
  return (
    <div className="mm-modal-back" onClick={() => { upsertNote(n); onClose(); }}>
      <div className="mm-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <input value={n.title} placeholder="Title" onChange={(e) => set("title", e.target.value)} style={{ flex: 1, fontSize: 16, fontWeight: 600 }} autoFocus />
          <button className="mm-btn" onClick={save}>Close</button>
        </div>
        <textarea value={n.body} placeholder="Write the plan…" onChange={(e) => set("body", e.target.value)} rows={12} style={{ width: "100%", resize: "vertical", lineHeight: 1.6 }} />
        <div className="mm-row" style={{ marginTop: 12, alignItems: "center" }}>
          <button className={"mm-tab" + (n.pinned ? " active" : "")} onClick={() => set("pinned", !n.pinned)}>★ Pin</button>
          <button className={"mm-tab" + (n.hidden ? " active" : "")} onClick={() => set("hidden", !n.hidden)}>Unannounced</button>
          <select value={n.linkedProjectId ?? ""} onChange={(e) => set("linkedProjectId", e.target.value || undefined)}>
            <option value="">No project</option>
            {s.projects.map((p) => <option key={p.id} value={p.id}>{p.name || "(untitled)"}</option>)}
          </select>
          <div style={{ flex: 1 }} />
          <button className="mm-btn mm-btn-danger" onClick={() => { removeNote(n.id); onClose(); }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color: T.inkTiny, fontStyle: "italic", padding: 16 }}>{children}</div>;
}
