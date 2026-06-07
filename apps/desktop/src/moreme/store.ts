// MoreMe state — calendar-first. One localStorage record, occurrence
// resolution for recurring events, per-occurrence XP, the 20-level quadratic
// economy, conflict detection, and rule-based (earnable) achievements.

import type {
  CalEvent, Category, Class, DistractionLog, Goal, Goals, LevelReward, Person, Project,
  ProjectKind, State,
} from "./types";
import { MAX_LEVEL, cumulativeXp } from "./types";

const KEY = "nchub.moreme.v6";

// ── id + date helpers ─────────────────────────────────────────────────────
export const uid = () => Math.random().toString(36).slice(2, 10);
export const iso = (d: Date) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};
export const today = () => iso(new Date());
export const dow = (date: string) => new Date(date + "T00:00:00").getDay();
export const toMin = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
export const fmtTime = (hhmm?: string) => {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
export const addDays = (date: string, n: number) => {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + n);
  return iso(d);
};
export const monthLabel = (y: number, m: number) =>
  new Date(y, m, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });

// ── seeds ─────────────────────────────────────────────────────────────────
function g(text: string): Goal { return { id: uid(), text }; }

function seedPeople(): Person[] {
  return [
    { id: "p-lily", name: "Lily", role: "Friend" },
    { id: "p-bridget", name: "Mrs. Bridget", role: "Teacher" },
    { id: "p-harrison", name: "Principal Harrison", role: "Principal" },
  ];
}

function seedClasses(): Class[] {
  // Placeholder courseload — rename / replace these once your real schedule
  // is locked in. The point is to give the Get Ahead view something to chew
  // on; assignments link to a class so the % pre-done bar is meaningful.
  return [
    { id: "c-history", name: "World History",   teacher: "p-bridget" },
    { id: "c-math",    name: "Algebra II" },
    { id: "c-english", name: "English" },
    { id: "c-science", name: "Biology" },
    { id: "c-iD",      name: "Innovation Diploma" },
  ];
}

// Default recurring routines for a Mount Vernon Innovation Diploma student.
// No "focus block", no "no-YouTube" block — zero distraction is a standing
// expectation now, not a checkable item.
function seedRoutines(start: string): CalEvent[] {
  const base = (id: string, title: string, s: string, e: string, xp: number, notes?: string): CalEvent => ({
    id, title, category: "routine", date: start, allDay: false, start: s, end: e,
    people: [], checklist: [], priority: "normal", visibility: "visible",
    recurrence: { kind: "weekdays" }, reminders: [], xp, status: "planned",
    notes, createdAt: Date.now(),
  });
  const daily = (id: string, title: string, s: string, e: string, xp: number, notes?: string): CalEvent =>
    ({ ...base(id, title, s, e, xp, notes), recurrence: { kind: "daily" } });
  return [
    daily("rt-morning", "Morning routine", "06:30", "06:50", 10, "Water · stretch · top 3 for the day"),
    base("rt-ontime", "On time to Mount Vernon", "07:30", "08:00", 10, "You show up."),
    base("rt-iproject", "iProject block", "10:00", "11:30", 20, "Independent project / GTD time"),
    base("rt-school-ahead", "School work — stay ahead", "12:00", "13:00", 20, "Work next week's assignments before they're assigned"),
    base("rt-build", "Project / build time", "16:00", "17:30", 20, "Mods, ARG, ventures"),
    daily("rt-move", "Movement / sport", "17:30", "18:30", 15, "Lift, run, or play a sport"),
    daily("rt-bed", "Bedtime routine", "21:40", "22:00", 10, "Set out clothes · screens off · one win"),
  ];
}

function seedGoals(): Goals {
  return {
    week: [g("Finish all of next week's school work early"), g("Ship one ARG stage"), g("3 workouts")],
    semester: [g("Stay a full week ahead in every class"), g("Launch a new venture"), g("Complete 3 personal projects")],
    year: [g("Known at Mount Vernon as focused and reliable"), g("Grow the businesses"), g("Run a mile without stopping")],
    identity: [
      g("I am someone who shows up."),
      g("I am someone who finishes what I start."),
      g("I am someone who doesn't distract myself or others."),
      g("I get my work done before it's even due."),
    ],
  };
}

function seedState(): State {
  const start = today();
  return {
    schemaVersion: 6,
    events: seedRoutines(start),
    completions: {},
    projects: [
      {
        id: "proj-arg", name: "Cosmos Crew ARG", kind: "arg", status: "active",
        notes: "Weekly clue stages for the school.",
        milestones: [
          { id: uid(), text: "Outline next stage", done: false },
          { id: uid(), text: "Build the clues", done: false },
          { id: uid(), text: "Schedule the release", done: false },
        ],
      },
    ],
    people: seedPeople(),
    classes: seedClasses(),
    goals: seedGoals(),
    distractions: [],
    rewards: Array.from({ length: MAX_LEVEL }, (_, i) => ({ level: i + 1, reward: "" })),
    unlockedAchievements: {},
    startedAt: Date.now(),
  };
}

// ── persistence ─────────────────────────────────────────────────────────
const subs = new Set<(s: State) => void>();
let cache: State | null = null;

export function loadState(): State {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<State>;
      const d = seedState();
      cache = {
        schemaVersion: 6,
        events: p.events ?? d.events,
        completions: p.completions ?? {},
        projects: p.projects ?? d.projects,
        people: p.people ?? d.people,
        classes: p.classes ?? d.classes,
        goals: { ...d.goals, ...(p.goals ?? {}) },
        distractions: p.distractions ?? [],
        rewards: p.rewards && p.rewards.length === MAX_LEVEL ? p.rewards : d.rewards,
        unlockedAchievements: p.unlockedAchievements ?? {},
        startedAt: p.startedAt ?? Date.now(),
      };
    } else cache = seedState();
  } catch { cache = seedState(); }
  return cache;
}

export function updateState(mut: (s: State) => State): State {
  const next = mut(loadState());
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  subs.forEach((fn) => fn(next));
  return next;
}
export function subscribeState(fn: (s: State) => void): () => void {
  subs.add(fn); fn(loadState()); return () => subs.delete(fn);
}

// ── occurrence resolution ──────────────────────────────────────────────────
export function occursOn(e: CalEvent, date: string): boolean {
  if (date < e.date) return false;
  if (e.until && date > e.until) return false;
  switch (e.recurrence.kind) {
    case "none": return date === e.date;
    case "daily": return true;
    case "weekdays": { const d = dow(date); return d >= 1 && d <= 5; }
    case "weekly": return e.recurrence.days.includes(dow(date));
  }
}

export function eventsOnDate(date: string, s: State = loadState()): CalEvent[] {
  return s.events
    .filter((e) => occursOn(e, date))
    .sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      return toMin(a.start ?? "00:00") - toMin(b.start ?? "00:00");
    });
}

const ck = (id: string, date: string) => `${id}::${date}`;
export function isDone(e: CalEvent, date: string, s: State = loadState()): boolean {
  return s.completions[ck(e.id, date)] != null;
}

export function toggleDone(eventId: string, date: string) {
  updateState((s) => {
    const completions = { ...s.completions };
    const key = ck(eventId, date);
    if (completions[key]) delete completions[key];
    else completions[key] = Date.now();
    return { ...s, completions };
  });
  refreshAchievements();
}

// ── conflicts: overlapping timed events on the same day ─────────────────────
export function conflictIds(date: string, s: State = loadState()): Set<string> {
  const timed = eventsOnDate(date, s).filter((e) => !e.allDay && e.start && e.end);
  const bad = new Set<string>();
  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      const a = timed[i], b = timed[j];
      if (toMin(a.start!) < toMin(b.end!) && toMin(b.start!) < toMin(a.end!)) {
        bad.add(a.id); bad.add(b.id);
      }
    }
  }
  return bad;
}

// ── XP / level ──────────────────────────────────────────────────────────────
export function eventById(id: string, s: State = loadState()): CalEvent | undefined {
  return s.events.find((e) => e.id === id);
}

export function totalXp(s: State = loadState()): number {
  let total = 0;
  for (const key of Object.keys(s.completions)) {
    const id = key.split("::")[0];
    const e = s.events.find((x) => x.id === id);
    if (e) total += e.xp;
  }
  // Project bonuses: each completed milestone +30, each completed project +100.
  for (const p of s.projects) {
    total += p.milestones.filter((m) => m.done).length * 30;
    if (p.status === "done") total += 100;
  }
  return Math.max(0, total);
}

export type LevelInfo = {
  level: number; total: number; into: number; span: number;
  isMax: boolean; nextAt: number; floor: number;
};
export function levelInfo(s: State = loadState()): LevelInfo {
  const total = totalXp(s);
  let level = 1;
  while (level < MAX_LEVEL && cumulativeXp(level + 1) <= total) level++;
  const floor = cumulativeXp(level);
  const isMax = level >= MAX_LEVEL;
  const nextAt = isMax ? floor : cumulativeXp(level + 1);
  return { level, total, into: total - floor, span: isMax ? 1 : nextAt - floor, isMax, nextAt, floor };
}

export function xpForDate(date: string, s: State = loadState()): { earned: number; possible: number } {
  const evs = eventsOnDate(date, s);
  let earned = 0, possible = 0;
  for (const e of evs) { possible += e.xp; if (isDone(e, date, s)) earned += e.xp; }
  return { earned, possible };
}

// ── streaks (routine consistency) ──────────────────────────────────────────
export function dayComplete(date: string, s: State = loadState()): boolean {
  const routines = eventsOnDate(date, s).filter((e) => e.category === "routine");
  if (!routines.length) return false;
  return routines.every((e) => isDone(e, date, s));
}
export function streakInfo(s: State = loadState()): { current: number; best: number } {
  let current = 0;
  let d = today();
  if (!dayComplete(d, s)) d = addDays(d, -1);
  while (dayComplete(d, s)) { current++; d = addDays(d, -1); }
  // Best over recorded completion span.
  const dates = new Set<string>();
  for (const k of Object.keys(s.completions)) dates.add(k.split("::")[1]);
  const sorted = [...dates].sort();
  let best = current, run = 0, prev = "";
  for (const day of sorted) {
    if (!dayComplete(day, s)) { run = 0; prev = day; continue; }
    run = prev && addDays(prev, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return { current, best };
}

// ── event CRUD ──────────────────────────────────────────────────────────────
export const blankEvent = (date: string): CalEvent => ({
  id: uid(), title: "", category: "personal", date, allDay: false,
  start: "09:00", end: "10:00", people: [], checklist: [], priority: "normal",
  visibility: "visible", recurrence: { kind: "none" }, reminders: [], xp: 10,
  status: "planned", createdAt: Date.now(),
});
export function upsertEvent(e: CalEvent) {
  updateState((s) => ({
    ...s,
    events: s.events.some((x) => x.id === e.id)
      ? s.events.map((x) => (x.id === e.id ? e : x))
      : [...s.events, e],
  }));
  refreshAchievements();
}
export function removeEvent(id: string) {
  updateState((s) => {
    const completions = { ...s.completions };
    for (const k of Object.keys(completions)) if (k.startsWith(id + "::")) delete completions[k];
    return { ...s, events: s.events.filter((e) => e.id !== id), completions };
  });
}
export function revealEvent(id: string) {
  updateState((s) => ({ ...s, events: s.events.map((e) => (e.id === id ? { ...e, visibility: "visible" } : e)) }));
  refreshAchievements();
}

// ── projects ──────────────────────────────────────────────────────────────
export const blankProject = (kind: ProjectKind = "other"): Project => ({
  id: uid(), name: "", kind, status: "active", milestones: [],
});
export function upsertProject(p: Project) {
  updateState((s) => {
    const prev = s.projects.find((x) => x.id === p.id);
    const next = { ...p };
    if (next.status === "done" && (!prev || prev.status !== "done")) next.completedAt = Date.now();
    if (next.status !== "done") next.completedAt = undefined;
    return {
      ...s,
      projects: s.projects.some((x) => x.id === p.id)
        ? s.projects.map((x) => (x.id === p.id ? next : x))
        : [...s.projects, next],
    };
  });
  refreshAchievements();
}
export function removeProject(id: string) {
  updateState((s) => ({ ...s, projects: s.projects.filter((p) => p.id !== id) }));
}

// ── classes ────────────────────────────────────────────────────────────
export const blankClass = (): Class => ({ id: uid(), name: "" });
export function upsertClass(c: Class) {
  updateState((s) => ({
    ...s,
    classes: s.classes.some((x) => x.id === c.id)
      ? s.classes.map((x) => (x.id === c.id ? c : x))
      : [...s.classes, c],
  }));
}
export function removeClass(id: string) {
  updateState((s) => ({
    ...s,
    classes: s.classes.filter((c) => c.id !== id),
    // clear the link on any events that referenced it, rather than orphaning
    events: s.events.map((e) => (e.linkedClassId === id ? { ...e, linkedClassId: undefined } : e)),
  }));
}

// "Get Ahead" rollup — for each class, how much of the upcoming `days` window
// of school work is already done. This powers the story's superpower: see at
// a glance what % of next week / month is pre-emptively crushed.
export type AheadRow = {
  classId: string | null;             // null = "Unfiled school work"
  className: string;
  total: number;
  done: number;
  pct: number;
  upcoming: { e: CalEvent; on: string; done: boolean }[];
};

export function aheadByClass(daysAhead: number, s: State = loadState()): AheadRow[] {
  const start = today();
  const end = addDays(start, daysAhead);
  const groups = new Map<string | null, AheadRow>();

  function row(id: string | null, name: string): AheadRow {
    let r = groups.get(id);
    if (!r) { r = { classId: id, className: name, total: 0, done: 0, pct: 0, upcoming: [] }; groups.set(id, r); }
    return r;
  }
  // Seed every known class so empty ones still appear (so you can target them).
  for (const c of s.classes) row(c.id, c.name);

  for (const e of s.events) {
    if (e.category !== "school") continue;
    // walk every occurrence in window
    let d = start > e.date ? start : e.date;
    const last = e.until && e.until < end ? e.until : end;
    while (d <= last) {
      if (occursOn(e, d)) {
        const cls = s.classes.find((c) => c.id === e.linkedClassId);
        const r = row(cls ? cls.id : null, cls ? cls.name : "Unfiled school work");
        const done = isDone(e, d, s);
        r.total++; if (done) r.done++;
        r.upcoming.push({ e, on: d, done });
      }
      d = addDays(d, 1);
    }
  }
  const rows = [...groups.values()].map((r) => ({ ...r, pct: r.total ? Math.round((r.done / r.total) * 100) : 0 }));
  // Sort: incomplete first, then by class name.
  rows.sort((a, b) => (a.pct - b.pct) || a.className.localeCompare(b.className));
  // Sort upcoming items chronologically.
  for (const r of rows) r.upcoming.sort((a, b) => a.on.localeCompare(b.on) || (a.e.start ?? "").localeCompare(b.e.start ?? ""));
  return rows;
}

// Total pre-done across all classes in a window. Used by the Get Ahead hero.
export function aheadTotal(daysAhead: number, s: State = loadState()): { total: number; done: number; pct: number } {
  let total = 0, done = 0;
  for (const r of aheadByClass(daysAhead, s)) { total += r.total; done += r.done; }
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

// Events scheduled today/tomorrow with at least one reminder set; surfaces a
// strip on Today so you actually see what's coming. Not a firing system —
// just visibility.
export type UpcomingItem = { e: CalEvent; on: string; startMin: number; firstReminderMin: number };
export function upcomingWithReminders(s: State = loadState(), horizonDays = 2): UpcomingItem[] {
  const out: UpcomingItem[] = [];
  const start = today();
  for (let i = 0; i < horizonDays; i++) {
    const d = addDays(start, i);
    for (const e of eventsOnDate(d, s)) {
      if (!e.reminders.length || e.allDay || !e.start) continue;
      if (isDone(e, d, s)) continue;
      out.push({ e, on: d, startMin: toMin(e.start), firstReminderMin: Math.min(...e.reminders) });
    }
  }
  return out.sort((a, b) => a.on.localeCompare(b.on) || a.startMin - b.startMin).slice(0, 5);
}

// ── people ──────────────────────────────────────────────────────────────
export function upsertPerson(p: Person) {
  updateState((s) => ({
    ...s,
    people: s.people.some((x) => x.id === p.id) ? s.people.map((x) => (x.id === p.id ? p : x)) : [...s.people, p],
  }));
}
export function removePerson(id: string) {
  updateState((s) => ({ ...s, people: s.people.filter((p) => p.id !== id) }));
}

// ── goals / distractions / rewards ──────────────────────────────────────────
export function setGoals(goals: Goals) { updateState((s) => ({ ...s, goals })); }
export function logDistraction(note: string) {
  updateState((s) => ({
    ...s,
    distractions: [...s.distractions, { id: uid(), date: today(), note: note || "Off-task", ts: Date.now() }],
  }));
  refreshAchievements();
}
export function removeDistraction(id: string) {
  updateState((s) => ({ ...s, distractions: s.distractions.filter((d) => d.id !== id) }));
}
export function distractionsOn(date: string, s: State = loadState()): DistractionLog[] {
  return s.distractions.filter((d) => d.date === date);
}
export function setReward(level: number, reward: string) {
  updateState((s) => ({ ...s, rewards: s.rewards.map((r) => (r.level === level ? { ...r, reward } : r)) }));
}

// ── achievements (earnable, rule-based) ─────────────────────────────────────
export type AchievementDef = {
  id: string;
  title: string;
  desc: string;
  category: "discipline" | "school" | "build" | "social" | "level" | "special";
  // returns [have, need] for progress display
  progress: (a: Aggregates, s: State) => [number, number];
};

type Aggregates = {
  completionCount: number;
  byCategory: Record<string, number>;
  routineCounts: Record<string, number>;
  aheadCompletions: number;        // completed an event before its date
  futureSchoolDone7: number;       // school events in next 7 days that are done
  futureSchoolDone30: number;
  longIProjectDone: boolean;       // a >=180min iProject completed
  helipad: boolean;
  argDone: number;
  meetingPrepDone: number;         // meetings completed with all checklist done
  polymathMax: number;             // max distinct categories completed in one day
  ventureDone: number;
  quietDays: number;               // days with >=1 completion and 0 distractions
  quietStreak: number;
  milestonesDone: number;
  projectsDone: number;
  eventsLinkedToPeople: number;
  totalEvents: number;
  announcementsRevealed: number;
  streakCurrent: number;
  streakBest: number;
  level: number;
};

function aggregate(s: State): Aggregates {
  const byCategory: Record<string, number> = {};
  const routineCounts: Record<string, number> = {};
  let completionCount = 0, aheadCompletions = 0;
  const perDayCats: Record<string, Set<string>> = {};
  const perDayCompletions: Record<string, number> = {};

  for (const [key, ts] of Object.entries(s.completions)) {
    const [id, date] = key.split("::");
    const e = s.events.find((x) => x.id === id);
    if (!e) continue;
    completionCount++;
    byCategory[e.category] = (byCategory[e.category] ?? 0) + 1;
    if (e.category === "routine") routineCounts[e.id] = (routineCounts[e.id] ?? 0) + 1;
    // "ahead": completed before the occurrence date arrived
    if (iso(new Date(ts)) < date) aheadCompletions++;
    (perDayCats[date] ??= new Set()).add(e.category);
    perDayCompletions[date] = (perDayCompletions[date] ?? 0) + 1;
  }

  const t = today();
  let futureSchoolDone7 = 0, futureSchoolDone30 = 0;
  let longIProjectDone = false, helipad = false, argDone = 0, meetingPrepDone = 0, ventureDone = 0;
  let eventsLinkedToPeople = 0;
  for (const e of s.events) {
    if (e.people.length) eventsLinkedToPeople++;
    if (e.category === "travel" && (e.location ?? "").toLowerCase().includes("heli")) {
      if (isDone(e, e.date, s) || e.recurrence.kind === "none") helipad = true;
    }
    // single-occurrence completion checks
    const done = isDone(e, e.date, s);
    if (!done) continue;
    if ((e.category === "school" || e.category === "iproject") && e.date > t) {
      if (e.date <= addDays(t, 7)) futureSchoolDone7++;
      if (e.date <= addDays(t, 30)) futureSchoolDone30++;
    }
    if (e.category === "iproject" && e.start && e.end && toMin(e.end) - toMin(e.start) >= 180) longIProjectDone = true;
    if (e.category === "arg") argDone++;
    if (e.category === "meeting" && e.checklist.length && e.checklist.every((c) => c.done)) meetingPrepDone++;
    if (e.category === "venture" || e.category === "business") ventureDone++;
  }

  let polymathMax = 0;
  for (const set of Object.values(perDayCats)) polymathMax = Math.max(polymathMax, set.size);

  // quiet days/streak
  const distractionDates = new Set(s.distractions.map((d) => d.date));
  const completionDates = Object.keys(perDayCompletions).sort();
  let quietDays = 0;
  for (const d of completionDates) if (!distractionDates.has(d)) quietDays++;
  let quietStreak = 0, run = 0, prev = "";
  for (const d of completionDates) {
    if (distractionDates.has(d)) { run = 0; prev = d; continue; }
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    quietStreak = Math.max(quietStreak, run);
    prev = d;
  }

  const milestonesDone = s.projects.reduce((n, p) => n + p.milestones.filter((m) => m.done).length, 0);
  const projectsDone = s.projects.filter((p) => p.status === "done").length;
  const { current, best } = streakInfo(s);

  return {
    completionCount, byCategory, routineCounts, aheadCompletions,
    futureSchoolDone7, futureSchoolDone30, longIProjectDone, helipad, argDone,
    meetingPrepDone, polymathMax, ventureDone, quietDays, quietStreak,
    milestonesDone, projectsDone, eventsLinkedToPeople, totalEvents: s.events.length,
    announcementsRevealed: s.events.filter((e) => e.category === "announcement" && e.visibility === "visible").length,
    streakCurrent: current, streakBest: best, level: levelInfo(s).level,
  };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first-step", title: "First Step", desc: "Complete any scheduled item.", category: "discipline", progress: (a) => [Math.min(a.completionCount, 1), 1] },
  { id: "ahead-of-bell", title: "Ahead of the Bell", desc: "Finish something before its day even arrives.", category: "school", progress: (a) => [Math.min(a.aheadCompletions, 1), 1] },
  { id: "week-ahead", title: "Week Ahead", desc: "Complete 5 future school items inside the next week.", category: "school", progress: (a) => [a.futureSchoolDone7, 5] },
  { id: "month-ahead", title: "Month Ahead", desc: "Complete 15 future school items inside the next month.", category: "school", progress: (a) => [a.futureSchoolDone30, 15] },
  { id: "iproject-marathon", title: "iProject Marathon", desc: "Complete a 3-hour iProject block.", category: "build", progress: (a) => [a.longIProjectDone ? 1 : 0, 1] },
  { id: "helipad", title: "Helipad", desc: "Log a travel item that lands on the helipad.", category: "special", progress: (a) => [a.helipad ? 1 : 0, 1] },
  { id: "arg-architect", title: "ARG Architect", desc: "Ship 3 Cosmos Crew ARG stages.", category: "build", progress: (a) => [a.argDone, 3] },
  { id: "investor", title: "Investor", desc: "Complete a meeting with its prep checklist fully done.", category: "build", progress: (a) => [a.meetingPrepDone, 1] },
  { id: "polymath", title: "Polymath", desc: "Complete items across 5 categories in one day.", category: "discipline", progress: (a) => [a.polymathMax, 5] },
  { id: "mogul", title: "Mogul", desc: "Complete 10 business / venture items.", category: "build", progress: (a) => [a.ventureDone, 10] },
  { id: "quiet-quarter", title: "Quiet Quarter", desc: "7-day streak with zero logged distractions.", category: "discipline", progress: (a) => [a.quietStreak, 7] },
  { id: "locked-in", title: "Locked In", desc: "30 distraction-free productive days, total.", category: "discipline", progress: (a) => [a.quietDays, 30] },
  { id: "streak-3", title: "Three in a Row", desc: "3-day routine streak.", category: "discipline", progress: (a) => [a.streakBest, 3] },
  { id: "streak-7", title: "Week Lit", desc: "7-day routine streak.", category: "discipline", progress: (a) => [a.streakBest, 7] },
  { id: "streak-30", title: "Locked Month", desc: "30-day routine streak.", category: "discipline", progress: (a) => [a.streakBest, 30] },
  { id: "early-bird", title: "Early Bird", desc: "Complete the morning routine 30 times.", category: "discipline", progress: (a) => [a.routineCounts["rt-morning"] ?? 0, 30] },
  { id: "sleep-pro", title: "Sleep Pro", desc: "Complete the bedtime routine 14 times.", category: "discipline", progress: (a) => [a.routineCounts["rt-bed"] ?? 0, 14] },
  { id: "ship-it", title: "Shipped It", desc: "Complete a project.", category: "build", progress: (a) => [a.projectsDone, 1] },
  { id: "trilogy", title: "Trilogy", desc: "Complete 3 projects.", category: "build", progress: (a) => [a.projectsDone, 3] },
  { id: "mile-markers", title: "Mile Markers", desc: "Finish 10 project milestones.", category: "build", progress: (a) => [a.milestonesDone, 10] },
  { id: "people-person", title: "People Person", desc: "Link 5 items to people in your circle.", category: "social", progress: (a) => [a.eventsLinkedToPeople, 5] },
  { id: "announcer", title: "Announcer", desc: "Reveal a planned announcement to the school.", category: "social", progress: (a) => [a.announcementsRevealed, 1] },
  { id: "planner", title: "Planner", desc: "Have 25 items on your calendar.", category: "discipline", progress: (a) => [a.totalEvents, 25] },
  { id: "level-5", title: "Level 5", desc: "Reach level 5.", category: "level", progress: (a) => [a.level, 5] },
  { id: "level-10", title: "Level 10", desc: "Reach level 10.", category: "level", progress: (a) => [a.level, 10] },
  { id: "level-15", title: "Level 15", desc: "Reach level 15.", category: "level", progress: (a) => [a.level, 15] },
  { id: "level-20", title: "Maxed", desc: "Reach level 20.", category: "level", progress: (a) => [a.level, 20] },
];

export function achievementProgress(s: State = loadState()): Record<string, { have: number; need: number; done: boolean }> {
  const a = aggregate(s);
  const out: Record<string, { have: number; need: number; done: boolean }> = {};
  for (const def of ACHIEVEMENTS) {
    const [have, need] = def.progress(a, s);
    out[def.id] = { have: Math.min(have, need), need, done: have >= need };
  }
  return out;
}

export function refreshAchievements(): { newly: string[] } {
  const s = loadState();
  const prog = achievementProgress(s);
  const newly: string[] = [];
  const unlocked = { ...s.unlockedAchievements };
  for (const def of ACHIEVEMENTS) {
    if (prog[def.id].done && !unlocked[def.id]) { unlocked[def.id] = Date.now(); newly.push(def.id); }
  }
  if (newly.length) updateState((cur) => ({ ...cur, unlockedAchievements: unlocked }));
  return { newly };
}
