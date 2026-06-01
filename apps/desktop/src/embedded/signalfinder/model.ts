// SignalFinder data model, persistence, and scoring engine.
// Split out of SignalFinder.tsx to keep the view component manageable.
// Everything here is the user's own data — no fabricated entries — and all of
// it persists to localStorage.

export type Style = "concise" | "detailed";
export type Outreach = { date: string; style: Style; responded: boolean };

export const NETWORK_GOALS = [
  { id: "collab", label: "Creator collaborations", hint: "co-projects, splits, features" },
  { id: "career", label: "Career advancement", hint: "roles, intros, references" },
  { id: "startup", label: "Startup development", hint: "co-founders, hires, advisors" },
  { id: "community", label: "Community building", hint: "members, partners, sponsors" },
  { id: "mentor", label: "Mentorship acquisition", hint: "guidance, feedback, sponsorship" },
  { id: "recruit", label: "Project recruitment", hint: "contributors, talent, collaborators" },
] as const;
export type NetworkGoalId = typeof NETWORK_GOALS[number]["id"];

// Pipeline stages (Kanban). Order is meaningful: it's the funnel.
export const STAGES = [
  { id: "prospect", label: "Prospect", accent: "#7c8190" },
  { id: "contacted", label: "Contacted", accent: "#ff7a2d" },
  { id: "replied", label: "Replied", accent: "#ffd166" },
  { id: "talks", label: "In Talks", accent: "#ff5577" },
  { id: "won", label: "Won", accent: "#39d98a" },
  { id: "lost", label: "Lost", accent: "#5a5a66" },
] as const;
export type StageId = typeof STAGES[number]["id"];

export type Channel = { kind: "email" | "x" | "discord" | "site" | "phone"; value: string };
export type Note = { id: string; date: string; text: string };
export type Tag = { label: string; color: string };

export type Target = {
  id: string;
  name: string;
  type: string;
  niche: string;
  platform: string;
  audience: number;
  growth: number; // 1-5
  activity: number; // 1-5
  accessibility: number; // 1-5
  relevance: number; // 1-5
  goal: string; // per-target free-text context
  goalAlignment: NetworkGoalId[];
  outreach: Outreach[];
  // expanded fields:
  stage: StageId;
  tags: Tag[];
  notes: Note[];
  channels: Channel[];
  followup: string | null; // ISO date yyyy-mm-dd
  createdAt: number;
};

// Custom scoring weights — the owner wanted these fully tunable.
// Each factor's bar is computed from raw signals; `overall` is a weighted blend.
export type Weights = {
  response: number;
  collab: number;
  momentum: number;
  timing: number;
  relevance: number;
};
export const DEFAULT_WEIGHTS: Weights = {
  response: 30, collab: 20, momentum: 20, timing: 15, relevance: 15,
};

export type Template = { id: string; name: string; body: string };

export type Prefs = {
  goals: NetworkGoalId[];
  weights: Weights;
  templates: Template[];
};

export const KEY = "nchub.signalfinder.v2";
export const PREF_KEY = "nchub.signalfinder.prefs.v2";

export const TYPES = ["creator", "developer", "artist", "business", "mentor", "community", "collaborator"];
export const today = () => new Date().toISOString().slice(0, 10);
export const rid = () => Math.random().toString(36).slice(2, 10);

export const TAG_PALETTE = ["#ff5577", "#ff7a2d", "#ffd166", "#39d98a", "#4dd6ff", "#b07cff", "#ff9ec4", "#9aa0ad"];

export const CHANNEL_META: Record<Channel["kind"], { label: string; mark: string; href?: (v: string) => string }> = {
  email: { label: "Email", mark: "@", href: (v) => `mailto:${v}` },
  x: { label: "X", mark: "X", href: (v) => (v.startsWith("http") ? v : `https://x.com/${v.replace(/^@/, "")}`) },
  discord: { label: "Discord", mark: "◇" },
  site: { label: "Site", mark: "↗", href: (v) => (v.startsWith("http") ? v : `https://${v}`) },
  phone: { label: "Phone", mark: "☏", href: (v) => `tel:${v}` },
};

function defaultPrefs(): Prefs {
  return { goals: [], weights: { ...DEFAULT_WEIGHTS }, templates: [] };
}

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Prefs>;
      return {
        goals: p.goals ?? [],
        weights: { ...DEFAULT_WEIGHTS, ...(p.weights ?? {}) },
        templates: p.templates ?? [],
      };
    }
    // migrate from v1 prefs
    const v1 = localStorage.getItem("nchub.signalfinder.prefs.v1");
    if (v1) {
      const p = JSON.parse(v1) as { goals?: NetworkGoalId[] };
      return { ...defaultPrefs(), goals: p.goals ?? [] };
    }
  } catch { /* ignore */ }
  return defaultPrefs();
}
export function savePrefs(p: Prefs) {
  try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

export function load(): Target[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]") as unknown[];
    return raw.map(normalizeTarget);
  } catch {
    return [];
  }
}
export function normalizeTarget(r: unknown): Target {
  const t = r as Partial<Target> & Record<string, unknown>;
  return {
    id: (t.id as string) ?? rid(),
    name: t.name ?? "",
    type: t.type ?? "creator",
    niche: t.niche ?? "",
    platform: t.platform ?? "",
    audience: t.audience ?? 0,
    growth: t.growth ?? 3,
    activity: t.activity ?? 3,
    accessibility: t.accessibility ?? 3,
    relevance: t.relevance ?? 3,
    goal: t.goal ?? "",
    goalAlignment: t.goalAlignment ?? [],
    outreach: t.outreach ?? [],
    stage: (t.stage as StageId) ?? "prospect",
    tags: (t.tags as Tag[]) ?? [],
    notes: (t.notes as Note[]) ?? [],
    channels: (t.channels as Channel[]) ?? [],
    followup: (t.followup as string | null) ?? null,
    createdAt: (t.createdAt as number) ?? Date.now(),
  };
}
export function persist(t: Target[]) {
  try { localStorage.setItem(KEY, JSON.stringify(t)); } catch { /* ignore */ }
}

export type Scores = {
  response: number;
  collab: number;
  momentum: number;
  timing: number;
  relevance: number;
  overall: number;
};

// Factor sub-scores are intrinsic to the target; `overall` blends them using
// the user's custom weights (normalized so any weight set is valid).
export function score(t: Target, activeGoals: NetworkGoalId[], weights: Weights): Scores {
  const acc = t.accessibility / 5;
  const act = t.activity / 5;
  const grw = t.growth / 5;
  const rel = t.relevance / 5;
  const sizeFactor = 1 / (1 + Math.log10(Math.max(t.audience, 1)) / 6);
  const recentResponded = t.outreach.some((o) => o.responded);
  const attempted = t.outreach.length > 0;
  const warmthBoost = recentResponded ? 0.15 : attempted ? 0.05 : 0;
  const goalHits = activeGoals.length === 0 ? 1 : t.goalAlignment.filter((g) => activeGoals.includes(g)).length;
  const goalLift = activeGoals.length === 0 ? 0 : Math.min(0.3, goalHits * 0.12);

  const response = Math.round(Math.min(1, 0.6 * acc + 0.25 * act + 0.15 * sizeFactor + warmthBoost) * 100);
  const collab = Math.round(Math.min(1, 0.7 * rel + 0.3 * act + goalLift) * 100);
  const momentum = Math.round((0.6 * grw + 0.4 * act) * 100);
  const timing = Math.round((0.6 * act + 0.4 * grw) * 100);
  const relevance = Math.round(Math.min(1, rel + goalLift) * 100);

  const wsum = weights.response + weights.collab + weights.momentum + weights.timing + weights.relevance || 1;
  const overall = Math.round(
    (weights.response * response + weights.collab * collab + weights.momentum * momentum +
      weights.timing * timing + weights.relevance * relevance) / wsum
  );
  return { response, collab, momentum, timing, relevance, overall };
}

export function warmth(t: Target): "cold" | "warm" | "hot" {
  if (t.outreach.some((o) => o.responded)) return "hot";
  if (t.outreach.length > 0) return "warm";
  return "cold";
}
export function nextFollowup(t: Target): string | null {
  if (t.outreach.some((o) => o.responded) || t.outreach.length === 0) return null;
  const last = t.outreach[t.outreach.length - 1];
  const d = new Date(last.date);
  d.setDate(d.getDate() + 5);
  return d.toISOString().slice(0, 10);
}

export function followupStatus(t: Target): "none" | "upcoming" | "due" | "overdue" {
  if (!t.followup) return "none";
  const now = today();
  if (t.followup < now) return "overdue";
  if (t.followup === now) return "due";
  return "upcoming";
}

export function scoreColor(v: number): string {
  if (v >= 80) return "#39d98a";
  if (v >= 65) return "#ffd166";
  if (v >= 45) return "#ff7a2d";
  return "#ff5577";
}

export function goalLabel(g: NetworkGoalId): string {
  return NETWORK_GOALS.find((x) => x.id === g)?.label ?? g;
}

export function emptyForm(): Omit<Target, "id" | "outreach" | "notes" | "createdAt"> {
  return {
    name: "", type: "creator", niche: "", platform: "", audience: 1000,
    growth: 3, activity: 3, accessibility: 3, relevance: 3, goal: "", goalAlignment: [],
    stage: "prospect", tags: [], channels: [], followup: null,
  };
}

// Template variable fill: {name} and {niche}.
export function fillTemplate(body: string, t: Target): string {
  return body
    .replace(/\{name\}/gi, t.name || "there")
    .replace(/\{niche\}/gi, t.niche || "your work")
    .replace(/\{platform\}/gi, t.platform || "")
    .replace(/\{type\}/gi, t.type || "");
}

export function parseDdgLite(html: string): { title: string; url: string; snippet: string }[] {
  const out: { title: string; url: string; snippet: string }[] = [];
  const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<a\s+class="result__snippet"[^>]*>([\s\S]*?)<\/a>)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (out.length >= 6) break;
    let url = m[1];
    const enc = url.match(/[?&]uddg=([^&]+)/);
    if (enc) { try { url = decodeURIComponent(enc[1]); } catch { /* keep raw */ } }
    const title = m[2].replace(/<[^>]+>/g, "").trim();
    const snippet = (m[3] || "").replace(/<[^>]+>/g, "").trim().slice(0, 220);
    if (title && url) out.push({ title, url, snippet });
  }
  return out;
}
