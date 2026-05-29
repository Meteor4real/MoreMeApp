// Group-chat projects. Each project has a goal, a task checklist, owner
// preferences, optional deadline, the set of assigned agent IDs, and its
// own scoped chat history. The crew sees all of those on every turn so
// they actually know what they're working toward.

export type ProjectMsg = {
  id: string;
  agentId: string;       // "meteor" for the owner, "system" for kickoff/notes
  name: string;
  kind: "user" | "agent" | "system";
  content: string;
  ts: number;
};

export type ProjectTask = { id: string; text: string; done?: boolean };

export type Project = {
  id: string;
  title: string;
  agents: string[];      // agent IDs assigned
  goal: string;          // end goal
  tasks: ProjectTask[];
  preferences: string;   // tone, constraints, style notes
  deadline?: string;     // YYYY-MM-DD
  messages: ProjectMsg[];
  createdAt: number;
  updatedAt: number;
};

const KEY = "nchub.gc.projects.v1";
const subs = new Set<(p: Project[]) => void>();
let cache: Project[] | null = null;

function rid() { return Math.random().toString(36).slice(2, 10); }

export function loadProjects(): Project[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Project[]) : [];
  } catch { cache = []; }
  return cache!;
}
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(cache || [])); } catch { /* ignore */ }
  subs.forEach((fn) => fn(cache || []));
}
export function subscribeProjects(fn: (p: Project[]) => void): () => void {
  loadProjects();
  subs.add(fn);
  fn(cache!);
  return () => subs.delete(fn);
}

export function createProject(input: { title: string; goal: string; agents: string[]; tasks?: string[]; preferences?: string; deadline?: string }): Project {
  loadProjects();
  const p: Project = {
    id: rid(),
    title: input.title.trim() || "Untitled project",
    goal: input.goal.trim(),
    agents: input.agents,
    tasks: (input.tasks || []).map((t) => ({ id: rid(), text: t.trim() })).filter((t) => t.text),
    preferences: input.preferences || "",
    deadline: input.deadline,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  cache = [...(cache || []), p];
  persist();
  return p;
}
export function updateProject(id: string, patch: Partial<Omit<Project, "id" | "messages" | "createdAt">>) {
  if (!cache) loadProjects();
  cache = (cache || []).map((p) => p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p);
  persist();
}
export function removeProject(id: string) {
  if (!cache) loadProjects();
  cache = (cache || []).filter((p) => p.id !== id);
  persist();
}

export function addTask(id: string, text: string) {
  if (!cache) loadProjects();
  const t = text.trim();
  if (!t) return;
  cache = (cache || []).map((p) => p.id === id ? { ...p, tasks: [...p.tasks, { id: rid(), text: t }], updatedAt: Date.now() } : p);
  persist();
}
export function toggleTask(id: string, taskId: string) {
  if (!cache) loadProjects();
  cache = (cache || []).map((p) => p.id === id ? { ...p, tasks: p.tasks.map((t) => t.id === taskId ? { ...t, done: !t.done } : t), updatedAt: Date.now() } : p);
  persist();
}
export function removeTask(id: string, taskId: string) {
  if (!cache) loadProjects();
  cache = (cache || []).map((p) => p.id === id ? { ...p, tasks: p.tasks.filter((t) => t.id !== taskId), updatedAt: Date.now() } : p);
  persist();
}
export function appendMessage(id: string, m: Omit<ProjectMsg, "id" | "ts">) {
  if (!cache) loadProjects();
  const full: ProjectMsg = { ...m, id: rid(), ts: Date.now() };
  cache = (cache || []).map((p) => p.id === id ? { ...p, messages: [...p.messages.slice(-200), full], updatedAt: Date.now() } : p);
  persist();
  return full;
}

export function projectContext(p: Project): string {
  const tasks = p.tasks.length
    ? p.tasks.map((t, i) => `${i + 1}. [${t.done ? "x" : " "}] ${t.text}`).join("\n")
    : "(no explicit tasks; figure out what's next)";
  const due = p.deadline ? `\nDeadline: ${p.deadline}` : "";
  const prefs = p.preferences ? `\nOwner preferences:\n${p.preferences}` : "";
  return `PROJECT: ${p.title}\nGoal: ${p.goal || "(no explicit goal; ask the owner if needed)"}\nTasks:\n${tasks}${due}${prefs}`;
}
