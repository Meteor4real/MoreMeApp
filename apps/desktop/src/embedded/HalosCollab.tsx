import { useEffect, useRef, useState } from "react";
import { fetchMessages, sendMessage, getData, setData, whoAmI, cloudConfigured, type ChatMsg } from "./haloscloud";

const CY = "#00e5ff";
const PU = "#a07fff";
const box: React.CSSProperties = { border: `1px solid ${CY}33`, borderRadius: 10, background: "rgba(0,20,28,0.35)" };
const inp: React.CSSProperties = {
  background: "rgba(0,0,0,0.5)", border: `1px solid ${CY}33`, borderRadius: 8, color: "#cfe9ff",
  padding: "8px 10px", fontSize: 13, fontFamily: "ui-monospace, monospace", outline: "none",
};
const btn: React.CSSProperties = {
  background: "none", border: `1px solid ${CY}55`, color: CY, borderRadius: 8, padding: "7px 12px",
  fontSize: 12, fontFamily: "ui-monospace, monospace", cursor: "pointer",
};

function OfflineNote() {
  return (
    <div style={{ flex: 1, display: "grid", placeItems: "center", color: "#6fa8bd", fontSize: 13, padding: 30, textAlign: "center" }}>
      Collaboration backend not configured. Sign in (or set the Supabase backend on the login screen) to use shared Chat, Projects, and Workspace.
    </div>
  );
}

// ---- Chat (shared general channel) ----
export function HalosChat() {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const me = whoAmI();

  useEffect(() => {
    if (!cloudConfigured()) return;
    let stop = false;
    const load = async () => {
      const m = await fetchMessages("general");
      if (!stop) {
        setMsgs(m);
        queueMicrotask(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight }));
      }
    };
    load();
    const iv = setInterval(load, 2500);
    return () => { stop = true; clearInterval(iv); };
  }, []);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setText("");
    await sendMessage("general", me, body);
    setMsgs(await fetchMessages("general"));
    queueMicrotask(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight }));
  }

  if (!cloudConfigured()) return <OfflineNote />;
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, padding: 16 }}>
      <div className="mono" style={{ fontSize: 11, letterSpacing: 2, color: PU, marginBottom: 8 }}>GENERAL CHANNEL · {me}</div>
      <div ref={scroller} style={{ ...box, flex: 1, overflow: "auto", padding: 12, minHeight: 0 }}>
        {msgs.length === 0 && <div style={{ color: "#6fa8bd", fontSize: 13 }}>No messages yet. Say hello.</div>}
        {msgs.map((m) => (
          <div key={m.id} style={{ marginBottom: 8 }}>
            <span className="mono" style={{ fontSize: 11, color: m.author === me ? CY : "#9fd3e6" }}>{m.author}</span>
            <div style={{ fontSize: 13, color: "#cfe9ff", whiteSpace: "pre-wrap" }}>{m.body}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input style={{ ...inp, flex: 1 }} value={text} placeholder="message the crew…" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void send()} />
        <button style={btn} onClick={() => void send()}>Send</button>
      </div>
    </div>
  );
}

// ---- Projects (shared board) ----
type Todo = { id: string; text: string; done: boolean };
type Project = { id: string; name: string; todos: Todo[] };
const PKEY = "halos:projects";

export function HalosProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [todoText, setTodoText] = useState<Record<string, string>>({});

  async function load() {
    setProjects(await getData<Project[]>(PKEY, []));
  }
  useEffect(() => {
    if (cloudConfigured()) void load();
  }, []);

  async function commit(next: Project[]) {
    setProjects(next);
    await setData(PKEY, next);
  }
  function addProject() {
    if (!name.trim()) return;
    void commit([...projects, { id: String(Date.now()), name: name.trim(), todos: [] }]);
    setName("");
  }

  if (!cloudConfigured()) return <OfflineNote />;
  return (
    <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
      <div className="mono" style={{ fontSize: 11, letterSpacing: 2, color: PU, marginBottom: 10 }}>MISSION BOARD · shared</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input style={{ ...inp, flex: 1 }} value={name} placeholder="new project / mission" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addProject()} />
        <button style={btn} onClick={addProject}>Add</button>
        <button style={btn} onClick={() => void load()} title="sync">⟳</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
        {projects.map((p) => {
          const open = p.todos.filter((t) => !t.done).length;
          return (
            <div key={p.id} style={{ ...box, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="mono" style={{ fontSize: 14, color: CY }}>{p.name}</span>
                <button onClick={() => void commit(projects.filter((x) => x.id !== p.id))} style={{ background: "none", border: "none", color: "#6fa8bd", cursor: "pointer" }}>✕</button>
              </div>
              <div style={{ fontSize: 11, color: "#6fa8bd", marginBottom: 6 }}>{open} open</div>
              {p.todos.map((t) => (
                <div key={t.id} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, padding: "2px 0" }}>
                  <button onClick={() => void commit(projects.map((x) => x.id === p.id ? { ...x, todos: x.todos.map((y) => y.id === t.id ? { ...y, done: !y.done } : y) } : x))}
                    style={{ width: 16, height: 16, border: `1px solid ${CY}55`, borderRadius: 4, background: "none", color: CY, cursor: "pointer", flex: "none" }}>{t.done ? "✓" : ""}</button>
                  <span style={{ color: t.done ? "#6fa8bd" : "#cfe9ff", textDecoration: t.done ? "line-through" : "none" }}>{t.text}</span>
                </div>
              ))}
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <input style={{ ...inp, flex: 1, padding: "4px 8px", fontSize: 12 }} value={todoText[p.id] || ""} placeholder="+ task"
                  onChange={(e) => setTodoText({ ...todoText, [p.id]: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (todoText[p.id] || "").trim()) {
                      void commit(projects.map((x) => x.id === p.id ? { ...x, todos: [...x.todos, { id: String(Date.now()), text: todoText[p.id].trim(), done: false }] } : x));
                      setTodoText({ ...todoText, [p.id]: "" });
                    }
                  }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Workspace (shared notes + documents) ----
type Doc = { id: string; title: string; body: string };
const NKEY = "halos:workspace:notes";
const DKEY = "halos:documents";

export function HalosWorkspace() {
  const [notes, setNotes] = useState("");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [activeDoc, setActiveDoc] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!cloudConfigured()) return;
    void (async () => {
      setNotes(await getData<string>(NKEY, ""));
      const d = await getData<Doc[]>(DKEY, []);
      setDocs(d);
      setActiveDoc(d[0]?.id ?? null);
    })();
  }, []);

  function saveNotes(v: string) {
    setNotes(v);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void setData(NKEY, v), 700);
  }
  function commitDocs(next: Doc[]) {
    setDocs(next);
    void setData(DKEY, next);
  }

  if (!cloudConfigured()) return <OfflineNote />;
  const doc = docs.find((d) => d.id === activeDoc) || null;
  return (
    <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
      {/* notes + doc list */}
      <div style={{ width: 240, borderRight: `1px solid ${CY}22`, padding: 14, overflow: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div className="mono" style={{ fontSize: 11, letterSpacing: 2, color: PU, marginBottom: 6 }}>SHARED NOTES</div>
          <textarea value={notes} onChange={(e) => saveNotes(e.target.value)} placeholder="shared scratchpad…" style={{ ...inp, width: "100%", height: 120, resize: "vertical" }} />
        </div>
        <div>
          <div className="mono" style={{ fontSize: 11, letterSpacing: 2, color: PU, marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
            DOCUMENTS
            <button style={{ ...btn, padding: "1px 8px", fontSize: 11 }} onClick={() => { const id = String(Date.now()); commitDocs([...docs, { id, title: "Untitled", body: "" }]); setActiveDoc(id); }}>+</button>
          </div>
          {docs.map((d) => (
            <div key={d.id} onClick={() => setActiveDoc(d.id)} className="mono"
              style={{ fontSize: 12, padding: "5px 8px", borderRadius: 6, cursor: "pointer", color: d.id === activeDoc ? CY : "#9fd3e6", background: d.id === activeDoc ? `${CY}14` : "transparent", display: "flex", justifyContent: "space-between" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.title || "Untitled"}</span>
              <span onClick={(e) => { e.stopPropagation(); commitDocs(docs.filter((x) => x.id !== d.id)); if (activeDoc === d.id) setActiveDoc(null); }} style={{ color: "#6fa8bd" }}>✕</span>
            </div>
          ))}
        </div>
      </div>
      {/* editor */}
      <div style={{ flex: 1, padding: 14, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {!doc ? (
          <div style={{ flex: 1, display: "grid", placeItems: "center", color: "#6fa8bd", fontSize: 13 }}>Select or create a document.</div>
        ) : (
          <>
            <input value={doc.title} onChange={(e) => commitDocs(docs.map((d) => d.id === doc.id ? { ...d, title: e.target.value } : d))}
              style={{ ...inp, marginBottom: 10, fontSize: 16, color: CY }} />
            <textarea value={doc.body} onChange={(e) => commitDocs(docs.map((d) => d.id === doc.id ? { ...d, body: e.target.value } : d))}
              placeholder="write…" style={{ ...inp, flex: 1, resize: "none" }} />
          </>
        )}
      </div>
    </div>
  );
}
