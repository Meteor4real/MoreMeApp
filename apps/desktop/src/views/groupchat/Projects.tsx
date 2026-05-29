import { useEffect, useMemo, useRef, useState } from "react";
import { AGENTS, type AgentDef, effectiveTransport } from "../../ai/agents";
import { loadConfig, type ConfigMap } from "../../ai/store";
import {
  type Project, type ProjectMsg, addTask, appendMessage, createProject,
  loadProjects, projectContext, removeProject, removeTask, subscribeProjects,
  toggleTask, updateProject,
} from "./projectStore";

type Status = { ready: boolean; downloading: boolean; progress: number };

// Crew project board. Each project carries its own chat thread; the crew
// gets the goal + tasks + preferences + deadline as standing context on
// every turn, so they actually work toward something instead of vibing.

export function ProjectsView({ availableIds, onBackToChat }: {
  availableIds: string[];
  onBackToChat: () => void;
}) {
  const [projects, setProjects] = useState<Project[]>(loadProjects);
  const [selId, setSelId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => subscribeProjects(setProjects), []);

  const selected = useMemo(() => projects.find((p) => p.id === selId) || null, [projects, selId]);

  return (
    <div style={{ flex: 1, display: "flex", minWidth: 0, minHeight: 0 }}>
      {/* List rail */}
      <div style={{ width: 240, borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: 10, display: "flex", gap: 6 }}>
          <button className="btn" style={{ flex: 1, justifyContent: "center" }} onClick={() => { setCreating(true); setSelId(null); }}>+ New project</button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "0 8px 8px" }}>
          {projects.length === 0 && <div style={{ fontSize: 12, color: "var(--mute)", padding: 8 }}>No projects yet. Hit +New project to assign a goal to part of the crew.</div>}
          {projects.map((p) => (
            <button key={p.id}
              onClick={() => { setSelId(p.id); setCreating(false); }}
              className="panel"
              style={{
                display: "block", width: "100%", textAlign: "left", padding: 10, marginBottom: 6,
                cursor: "pointer", color: "var(--ink)",
                borderColor: selId === p.id ? "rgba(255,87,119,0.6)" : undefined,
              }}>
              <div className="mono" style={{ fontSize: 12 }}>{p.title}</div>
              <div style={{ fontSize: 10, color: "var(--mute)", marginTop: 2 }}>
                {p.agents.length} assigned · {p.tasks.filter((t) => t.done).length}/{p.tasks.length} tasks
                {p.deadline && ` · due ${p.deadline}`}
              </div>
            </button>
          ))}
        </div>
        <div style={{ padding: 10, borderTop: "1px solid var(--line)" }}>
          <button className="btn" style={{ width: "100%", justifyContent: "center" }} onClick={onBackToChat}>← Back to chat</button>
        </div>
      </div>

      {/* Detail */}
      <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {creating && <CreateForm availableIds={availableIds} onCreated={(p) => { setCreating(false); setSelId(p.id); }} onCancel={() => setCreating(false)} />}
        {!creating && !selected && (
          <div className="placeholder">
            <div>
              <div className="glow-text mono">Pick a project</div>
              <p style={{ maxWidth: 460, fontSize: 13 }}>
                Or start a new one. Assign agents, give them the goal + tasks + your
                preferences, and they&apos;ll work through it together using @mentions to
                coordinate. Project chat is separate from the main thread.
              </p>
            </div>
          </div>
        )}
        {!creating && selected && <ProjectDetail key={selected.id} project={selected} availableIds={availableIds} />}
      </div>
    </div>
  );
}

function CreateForm({ availableIds, onCreated, onCancel }: {
  availableIds: string[];
  onCreated: (p: Project) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [tasks, setTasks] = useState<string[]>([]);
  const [task, setTask] = useState("");
  const [prefs, setPrefs] = useState("");
  const [deadline, setDeadline] = useState("");
  const [agents, setAgents] = useState<string[]>([]);

  function toggleAgent(id: string) {
    setAgents((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }
  function addTaskNow() {
    const t = task.trim();
    if (!t) return;
    setTasks((p) => [...p, t]);
    setTask("");
  }
  function commit() {
    if (!title.trim()) return;
    const p = createProject({ title, goal, agents, tasks, preferences: prefs, deadline: deadline || undefined });
    onCreated(p);
  }

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 18 }}>
      <div className="mono glow-text" style={{ fontSize: 13, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>New project</div>

      <Field label="title">
        <input style={inp} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Pizzaface Pizza Tower mod" />
      </Field>

      <Field label="goal">
        <textarea style={{ ...inp, height: 70, resize: "vertical" }} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="What does done look like?" />
      </Field>

      <Field label="assigned agents">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {AGENTS.filter((a) => availableIds.includes(a.id)).map((a) => {
            const on = agents.includes(a.id);
            return (
              <button key={a.id} className="btn" onClick={() => toggleAgent(a.id)}
                style={{ padding: "4px 10px", fontSize: 11, color: on ? "var(--pink)" : undefined, borderColor: on ? "rgba(255,87,119,0.55)" : undefined }}>
                {a.name}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="tasks">
        <div style={{ display: "flex", gap: 6 }}>
          <input style={{ ...inp, flex: 1 }} value={task} onChange={(e) => setTask(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addTaskNow(); }} placeholder="add a task" />
          <button className="btn" onClick={addTaskNow}>+</button>
        </div>
        {tasks.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {tasks.map((t, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--mute)", padding: "2px 0" }}>
                <span>{i + 1}. {t}</span>
                <button onClick={() => setTasks((p) => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "var(--mute)", cursor: "pointer" }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </Field>

      <Field label="preferences">
        <textarea style={{ ...inp, height: 60, resize: "vertical" }} value={prefs} onChange={(e) => setPrefs(e.target.value)} placeholder="tone, constraints, style notes — anything the crew should respect" />
      </Field>

      <Field label="deadline (optional)">
        <input type="date" style={inp} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </Field>

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button className="btn" style={{ color: "var(--pink)", borderColor: "rgba(255,87,119,0.6)" }} onClick={commit}>Create</button>
        <button className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function ProjectDetail({ project, availableIds }: { project: Project; availableIds: string[] }) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [houseReady, setHouseReady] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const cfg: ConfigMap = useMemo(() => loadConfig(), []);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try { const s: Status = await window.hub.llm.status(); if (!cancelled) setHouseReady(!!s.ready); } catch { /* ignore */ }
    }
    void tick();
    const t = setInterval(tick, 4000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);
  useEffect(() => {
    const el = scroller.current; if (el) el.scrollTop = el.scrollHeight;
  }, [project.messages.length, busy]);

  function patchTitle(v: string) { updateProject(project.id, { title: v }); }
  function patchGoal(v: string) { updateProject(project.id, { goal: v }); }
  function patchPrefs(v: string) { updateProject(project.id, { preferences: v }); }
  function patchDeadline(v: string) { updateProject(project.id, { deadline: v || undefined }); }
  function patchAgents(ids: string[]) { updateProject(project.id, { agents: ids }); }

  const assigned = AGENTS.filter((a) => project.agents.includes(a.id));

  async function callAgent(a: AgentDef, task: string) {
    const system = a.system
      + "\n\nYou are part of an ACTIVE PROJECT — keep the goal, tasks, and preferences in mind every turn."
      + "\n" + projectContext(project)
      + "\n\nParticipants: " + assigned.map((x) => x.name).join(", ") + ", Meteor (boss)."
      + "\nRespond only as " + a.name + ". Be concrete and brief. To pull in a teammate, @mention them.";
    const transcript = project.messages.slice(-30).map((m) => `${m.name}: ${m.content}`).join("\n");
    const userContent = (transcript ? `Project chat so far:\n${transcript}\n\n` : "") + `New input: ${task}\n\nRespond as ${a.name}:`;

    const c = cfg[a.id];
    const t = effectiveTransport(a, c);
    let res: { ok: boolean; text?: string; error?: string };
    if (t === "house") {
      res = await window.hub.llm.chat(system, userContent);
    } else if (t === "cli") {
      res = await window.hub.agentRun(c?.cmd || a.defaultCmd || "", `${system}\n\n${userContent}`);
    } else {
      res = await window.hub.aiChat({
        provider: c?.provider ?? a.defaultProvider,
        endpoint: c?.endpoint,
        apiKey: c?.apiKey,
        model: c?.model || a.defaultModel,
        system,
        messages: [{ role: "user", content: userContent }],
      });
    }
    appendMessage(project.id, {
      agentId: a.id,
      name: a.name,
      kind: "agent",
      content: res.ok ? res.text || "(no output)" : `[${a.name} couldn't reach their tool: ${res.error}]`,
    });
  }

  async function send() {
    const task = input.trim();
    if (!task || busy) return;
    setInput("");
    appendMessage(project.id, { agentId: "meteor", name: "Meteor", kind: "user", content: task });

    // Mentions in the user's message — same routing rules as the main chat.
    const mentions = (task.match(/@([A-Za-z]+)/g) || []).map((m) => m.slice(1).toLowerCase());
    const explicit = AGENTS.filter((a) => mentions.includes(a.name.toLowerCase()) && availableIds.includes(a.id));
    const everyone = mentions.length === 0 || mentions.includes("everyone");
    // Default: every assigned agent (silent or not — the project assignment is consent).
    const targets = explicit.length > 0 ? explicit : (everyone ? assigned : []);

    if (targets.length === 0) {
      appendMessage(project.id, { agentId: "system", name: "Hub", kind: "system", content: "No matching agent. Assign more in the project header, or @mention one specifically." });
      return;
    }

    try {
      for (const a of targets) {
        setBusy(a.name);
        await callAgent(a, task);
      }
      // AI-to-AI chaining inside the project — same shape as the main chat.
      const seen = new Set<string>(targets.map((a) => a.id));
      for (let depth = 0; depth < 3; depth++) {
        const recent = (loadProjects().find((p) => p.id === project.id)?.messages || []).slice(-Math.max(targets.length, 1)).filter((m) => m.kind === "agent");
        const chained: AgentDef[] = [];
        for (const m of recent) {
          for (const a of assigned) {
            if (m.agentId === a.id) continue;
            if (seen.has(a.id)) continue;
            const re = new RegExp(`@${a.name}\\b`, "i");
            if (re.test(m.content)) { chained.push(a); seen.add(a.id); }
          }
        }
        if (chained.length === 0) break;
        for (const a of chained) {
          setBusy(a.name);
          await callAgent(a, "[AI-to-AI · address the prior messages directly]");
        }
      }
    } finally {
      setBusy(null);
    }
  }

  async function kickoff() {
    if (busy || assigned.length === 0) return;
    const summary = "Kickoff. Plan how to attack the project. Each assigned agent: one paragraph on what you'll do. Mention teammates by name when handing off.";
    appendMessage(project.id, { agentId: "system", name: "Hub", kind: "system", content: summary });
    try {
      for (const a of assigned) {
        setBusy(a.name);
        await callAgent(a, summary);
      }
    } finally { setBusy(null); }
  }

  const isAvailable = (id: string) => availableIds.includes(id);
  void houseReady; // referenced indirectly through availableIds upstream

  return (
    <>
      {/* Header */}
      <div style={{ padding: 14, borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <input style={{ ...inp, fontSize: 16, fontWeight: 600, flex: 1, minWidth: 220 }} value={project.title} onChange={(e) => patchTitle(e.target.value)} />
          <input type="date" style={inp} value={project.deadline || ""} onChange={(e) => patchDeadline(e.target.value)} />
          <button className="btn" onClick={() => void kickoff()} disabled={!!busy || assigned.length === 0}>Kickoff</button>
          <button className="btn" onClick={() => { if (confirm("Delete this project?")) removeProject(project.id); }} style={{ borderColor: "rgba(255,87,119,0.5)" }}>Delete</button>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--mute)" }}>
          Goal
          <textarea style={{ ...inp, height: 50, marginTop: 3, resize: "vertical" }} value={project.goal} onChange={(e) => patchGoal(e.target.value)} placeholder="What does done look like?" />
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--mute)" }}>
          Preferences
          <textarea style={{ ...inp, height: 44, marginTop: 3, resize: "vertical" }} value={project.preferences} onChange={(e) => patchPrefs(e.target.value)} placeholder="tone, constraints, style notes" />
        </div>
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: "var(--mute)" }}>Assigned</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 3 }}>
            {AGENTS.map((a) => {
              const on = project.agents.includes(a.id);
              const avail = isAvailable(a.id);
              return (
                <button key={a.id} className="btn" disabled={!avail && !on}
                  onClick={() => patchAgents(on ? project.agents.filter((x) => x !== a.id) : [...project.agents, a.id])}
                  style={{ padding: "2px 8px", fontSize: 10, color: on ? "var(--pink)" : undefined, opacity: avail ? 1 : 0.45 }}>
                  {a.name}
                </button>
              );
            })}
          </div>
        </div>
        <Tasks project={project} />
      </div>

      {/* Chat */}
      <div ref={scroller} style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 16 }}>
        {project.messages.length === 0 && (
          <div className="placeholder">
            <div>
              <div className="glow-text mono">Crew chat is empty</div>
              <p style={{ maxWidth: 460, fontSize: 13 }}>
                Hit Kickoff to have every assigned agent plan first. Then drop in inputs,
                @mention specific teammates, and the crew will work the project together.
              </p>
            </div>
          </div>
        )}
        {project.messages.map((m: ProjectMsg) => (
          <div key={m.id} style={{ marginBottom: 14, opacity: m.kind === "system" ? 0.7 : 1 }}>
            <div className="mono" style={{ fontSize: 11, color: m.kind === "user" ? "var(--orange)" : "var(--pink)" }}>{m.name}</div>
            <div style={{ fontSize: 14, marginTop: 2, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{m.content}</div>
          </div>
        ))}
        {busy && <div className="mono" style={{ fontSize: 12, color: "var(--mute)" }}>{busy} is working…</div>}
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid var(--line)" }}>
        <input className="omni-input"
          style={{ flex: 1, background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink)", padding: "9px 12px", fontSize: 13, outline: "none" }}
          placeholder="Drop a new input — or @Name to hand off to a specific teammate"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
          disabled={!!busy} />
        <button className="btn" onClick={() => void send()} disabled={!!busy}>Send</button>
      </div>
    </>
  );
}

function Tasks({ project }: { project: Project }) {
  const [add, setAdd] = useState("");
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 11, color: "var(--mute)" }}>Tasks ({project.tasks.filter((t) => t.done).length}/{project.tasks.length} done)</div>
      <div style={{ marginTop: 6 }}>
        {project.tasks.map((t) => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
            <input type="checkbox" checked={!!t.done} onChange={() => toggleTask(project.id, t.id)} />
            <span style={{ flex: 1, fontSize: 13, textDecoration: t.done ? "line-through" : "none", color: t.done ? "var(--mute)" : "var(--ink)" }}>{t.text}</span>
            <button onClick={() => removeTask(project.id, t.id)} style={{ background: "none", border: "none", color: "var(--mute)", cursor: "pointer", fontSize: 12 }}>✕</button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        <input style={{ ...inp, flex: 1 }} value={add} onChange={(e) => setAdd(e.target.value)} placeholder="add a task" onKeyDown={(e) => { if (e.key === "Enter" && add.trim()) { addTask(project.id, add); setAdd(""); } }} />
        <button className="btn" onClick={() => { if (add.trim()) { addTask(project.id, add); setAdd(""); } }}>+</button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, color: "var(--mute)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

const inp: React.CSSProperties = {
  background: "rgba(0,0,0,0.4)", border: "1px solid var(--line)", borderRadius: 8,
  color: "var(--ink)", padding: "7px 10px", fontSize: 12, fontFamily: "ui-monospace, monospace",
  outline: "none", width: "100%",
};
