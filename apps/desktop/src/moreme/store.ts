// MoreMe state — calendar-first. One localStorage record, occurrence
// resolution for recurring events, per-occurrence XP, the 20-level quadratic
// economy, conflict detection, and rule-based (earnable) achievements.

import type {
  CalEvent, Category, Class, ClassPeriod, CustomAchievement, CustomTheme,
  Customization, DistractionLog, DynamicTab, Goal, Goals, InboxItem, LevelReward,
  Note, Person, Project, ProjectKind, Replacement, School, SchoolPath, ScreenCategory,
  ScreenSession, ScreenSettings, State, StatSource, UrgeLog, UrgeResolution,
  Venture, VentureStatus, Widget,
} from "./types";
import { MAX_LEVEL, RANK_NAMES, cumulativeXp } from "./types";
import { setCustomThemeResolver } from "./styles";

// Tell styles.ts how to fetch the user's custom palette out of state. This
// avoids styles.ts having to import the store (which would cycle). Called
// at module-load so initTheme() sees the resolver on first paint.
setCustomThemeResolver(() => {
  try { return loadState().customization.customTheme ?? null; } catch { return null; }
});

const KEY = "nchub.moreme.v12";

// Current YYYY-MM month key (for venture revenue).
export const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

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
// First launch is intentionally empty. No fictional NPCs, no placeholder
// classes, no preset goals or routines. The Mount Vernon school config is
// the only thing seeded — that's the user's actual reality, not fiction.
// Empty state surfaces in each tab guide the user through adding what they
// actually use.

function seedPeople(): Person[] {
  return [];
}

function seedClasses(): Class[] {
  return [];
}

// Seed: you're entering Grade 9 in the 2026-27 school year, Inquiry path.
function seedSchool(): School { return { grade9Year: 2026, path: "Inquiry" }; }

// Academic calendar — Mount Vernon-shaped defaults.
//   First day of school: ~Aug 10 (students return that week).
//   Last day of school:  ~May 28 (Upper School year ends late May / early June).
// Summer is the gap between those two. After Grade 12's school end, you're
// Alumnus forever — there's no August rollover into Grade 13.
const SCHOOL_START_MONTH = 7;  // 0-indexed: August
const SCHOOL_START_DAY   = 10;
const SCHOOL_END_MONTH   = 4;  // 0-indexed: May
const SCHOOL_END_DAY     = 28;

// The fall year of the school year containing `at`. E.g. for Apr 2027 the
// school year is 2026-27, so this returns 2026.
function schoolYearStart(at: Date): number {
  const y = at.getFullYear();
  const m = at.getMonth(), d = at.getDate();
  const past = m > SCHOOL_START_MONTH || (m === SCHOOL_START_MONTH && d >= SCHOOL_START_DAY);
  return past ? y : y - 1;
}
function schoolStartOn(year: number): Date { return new Date(year, SCHOOL_START_MONTH, SCHOOL_START_DAY); }
function schoolEndOn(year: number): Date { return new Date(year + 1, SCHOOL_END_MONTH, SCHOOL_END_DAY); }

export type GradeStatus =
  | { kind: "school"; grade: number }                          // in school, in grade
  | { kind: "summer"; lastGrade: number; goingInto: number }    // summer between two grades
  | { kind: "alumnus"; graduatedYear: number };                 // done, forever

// Compute exactly where you are in your Mount Vernon arc right now. Summer
// is a first-class state; graduation ends the journey in May/June, not in
// the next August.
export function gradeStatus(s: State = loadState(), at = new Date()): GradeStatus {
  const lastSchoolEnd = schoolEndOn(s.school.grade9Year + 3); // end of Grade 12
  if (at > lastSchoolEnd) return { kind: "alumnus", graduatedYear: lastSchoolEnd.getFullYear() };

  const sy = schoolYearStart(at);
  const start = schoolStartOn(sy);
  const end = schoolEndOn(sy);
  const grade = 9 + (sy - s.school.grade9Year);

  // Inside the school window of school year sy → in school, in `grade`.
  if (at >= start && at <= end) return { kind: "school", grade };

  // Otherwise we're in summer. Summer between grade X and grade X+1:
  //   - if we're after May 28 of school year sy → just finished `grade`
  //   - if we're before Aug 10 of sy           → schoolYearStart returned sy-1,
  //     and we're heading into `grade + 1`.
  // Easier framing: `lastGrade` is the grade of the school year that just ended.
  // If at > end of sy, lastGrade=grade, goingInto=grade+1.
  // If at < start of sy, that's already handled by schoolYearStart returning sy-1,
  // so grade above already equals the grade of the year just ended.
  const lastGrade = grade;
  const goingInto = grade + 1;
  if (goingInto > 12) return { kind: "alumnus", graduatedYear: lastSchoolEnd.getFullYear() };
  return { kind: "summer", lastGrade, goingInto };
}

export function gradeNumber(s: State = loadState(), at = new Date()): number {
  const g = gradeStatus(s, at);
  if (g.kind === "school") return g.grade;
  if (g.kind === "summer") return g.goingInto;  // best single-number answer in summer
  return 13;
}
const ordinal = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;
const seniorName = (g: number) => g === 9 ? "Freshman" : g === 10 ? "Sophomore" : g === 11 ? "Junior" : g === 12 ? "Senior" : "";

const withName = (n: number) => { const name = seniorName(n); return name ? ` (${name})` : ""; };
export function gradeLabel(s: State = loadState(), at = new Date()): string {
  const g = gradeStatus(s, at);
  if (g.kind === "alumnus") return `Alumnus · Class of ${g.graduatedYear}`;
  if (g.kind === "school")  return `Grade ${g.grade} · ${ordinal(g.grade)}${withName(g.grade)}`;
  return `Summer · Going into ${ordinal(g.goingInto)}${withName(g.goingInto)}`;
}

export function schoolYearLabel(s: State = loadState(), at = new Date()): string {
  const g = gradeStatus(s, at);
  if (g.kind === "alumnus") return `${g.graduatedYear - 1}–${String(g.graduatedYear).slice(2)}`;
  if (g.kind === "school") { const sy = schoolYearStart(at); return `${sy}–${String(sy + 1).slice(2)}`; }
  // summer: the year just ended is the closer reference
  const sy = schoolYearStart(at);
  const next = sy + 1;
  return `between ${sy}–${String(sy + 1).slice(2)} and ${next}–${String(next + 1).slice(2)}`;
}

export function isSummer(s: State = loadState(), at = new Date()): boolean {
  return gradeStatus(s, at).kind === "summer";
}
export function isAlumnus(s: State = loadState(), at = new Date()): boolean {
  return gradeStatus(s, at).kind === "alumnus";
}
export function setSchool(school: Partial<School>) {
  updateState((s) => ({ ...s, school: { ...s.school, ...school } }));
}

// No default routines — the user defines their own from the Calendar /
// event editor. Blank canvas on first launch.
function seedRoutines(_start: string): CalEvent[] {
  return [];
}

function seedGoals(): Goals {
  return { week: [], semester: [], year: [], identity: [] };
}

// No default replacement drawer — the user adds their own from
// Screens → Settings. Empty drawer surfaces an "Add your first" CTA.
function seedReplacements(): Replacement[] {
  return [];
}

function seedScreenSettings(): ScreenSettings {
  return {
    // Generous on purpose. Lower it once you trust the system; nothing
    // about a punitive starting cap helps when you're trying to befriend it.
    baseBudgetMinutes: 240,        // 4h base
    bonusPerRoutineMinutes: 20,    // +20 per routine you complete today
    capBudgetMinutes: 360,         // 6h ceiling, even with every routine done
    awardXpPerUrgeResisted: 25,    // resisting is real work; XP it
    // No default window — pre-commit one when you're ready.
  };
}

function seedVentures(): Venture[] {
  return [];
}

function seedState(): State {
  return {
    schemaVersion: 12,
    notes: [],
    school: seedSchool(),
    events: [],
    completions: {},
    projects: [],
    ventures: seedVentures(),
    inbox: [],
    people: seedPeople(),
    classes: seedClasses(),
    goals: seedGoals(),
    distractions: [],
    screenSessions: [],
    urges: [],
    replacements: seedReplacements(),
    screen: seedScreenSettings(),
    customization: seedCustomization(),
    rewards: Array.from({ length: MAX_LEVEL }, (_, i) => ({ level: i + 1, reward: "" })),
    unlockedAchievements: {},
    startedAt: Date.now(),
  };
}

function seedCustomization(): Customization {
  return {
    tabLabels: {},
    hiddenTabs: [],
    customRanks: Array.from({ length: MAX_LEVEL }, () => undefined),
    customAchievements: [],
    customTheme: undefined,
    useCustomTheme: false,
    quotes: [],
    dynamicTabs: [],
    widgets: {},
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
        schemaVersion: 12,
        school: p.school ?? d.school,
        events: p.events ?? d.events,
        completions: p.completions ?? {},
        projects: p.projects ?? d.projects,
        ventures: p.ventures ?? d.ventures,
        inbox: p.inbox ?? [],
        notes: p.notes ?? [],
        people: p.people ?? d.people,
        classes: p.classes ?? d.classes,
        goals: { ...d.goals, ...(p.goals ?? {}) },
        distractions: p.distractions ?? [],
        screenSessions: p.screenSessions ?? [],
        urges: p.urges ?? [],
        replacements: p.replacements ?? d.replacements,
        screen: { ...d.screen, ...(p.screen ?? {}) },
        // Customization (v11+) — back-fill cleanly for existing installs.
        customization: mergeCustomization(d.customization, p.customization),
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
  // Resisting an urge is real, hard work — credit it. Configurable per user.
  const resisted = s.urges.filter((u) => u.resolution === "resisted").length;
  total += resisted * Math.max(0, s.screen.awardXpPerUrgeResisted);
  // Custom achievements — only count once claimed; xp clamped non-negative.
  for (const a of s.customization.customAchievements) {
    if (a.claimedAt) total += Math.max(0, Math.round(a.xp));
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
  // Stamp revealedAt only on a real hidden -> visible transition, so the
  // "Made It Official" achievement requires actually using the reveal
  // mechanic instead of unlocking on any normally-created announcement.
  updateState((s) => ({
    ...s,
    events: s.events.map((e) =>
      e.id === id && e.visibility === "hidden"
        ? { ...e, visibility: "visible", revealedAt: Date.now() }
        : e,
    ),
  }));
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
    // drop the generated recurring period event for this class
    completions: s.completions,
  }));
}

// Lay a class's weekly period onto the calendar as one recurring event.
// Idempotent: re-running updates the same event (id derived from the class)
// instead of stacking duplicates. Anchored to the current school-year start so
// it doesn't paint dates before the year began.
const classEventId = (classId: string) => `clsperiod-${classId}`;
export function generateClassPeriods(classId: string) {
  updateState((s) => {
    const c = s.classes.find((x) => x.id === classId);
    if (!c || !c.period || !c.period.days.length) return s;
    const id = classEventId(classId);
    const anchorYear = Math.max(s.school.grade9Year, new Date().getMonth() >= 7 ? new Date().getFullYear() : new Date().getFullYear() - 1);
    const ev: CalEvent = {
      id,
      title: c.name || "Class",
      category: "class",
      date: `${anchorYear}-08-10`,
      until: `${anchorYear + 1}-05-28`,
      allDay: false,
      start: c.period.start,
      end: c.period.end,
      location: c.room,
      people: c.teacher ? [c.teacher] : [],
      linkedClassId: classId,
      checklist: [],
      priority: "normal",
      visibility: "visible",
      recurrence: { kind: "weekly", days: c.period.days },
      reminders: [],
      xp: 0,                 // showing up to class isn't graded XP; school work is
      status: "planned",
      createdAt: Date.now(),
    };
    return { ...s, events: [...s.events.filter((e) => e.id !== id), ev] };
  });
}
export function clearClassPeriods(classId: string) {
  const id = classEventId(classId);
  updateState((s) => ({ ...s, events: s.events.filter((e) => e.id !== id) }));
}
export function setClassPeriod(classId: string, period: ClassPeriod | undefined) {
  updateState((s) => ({ ...s, classes: s.classes.map((c) => (c.id === classId ? { ...c, period } : c)) }));
}

// ── notes / plans ─────────────────────────────────────────────────────────
export const blankNote = (): Note => ({ id: uid(), title: "", body: "", ts: Date.now(), updatedAt: Date.now() });
export function upsertNote(n: Note) {
  updateState((s) => ({
    ...s,
    notes: s.notes.some((x) => x.id === n.id)
      ? s.notes.map((x) => (x.id === n.id ? { ...n, updatedAt: Date.now() } : x))
      : [{ ...n, ts: Date.now(), updatedAt: Date.now() }, ...s.notes],
  }));
}
export function removeNote(id: string) {
  updateState((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) }));
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

// ── ventures (the Empire) ────────────────────────────────────────────────
export const blankVenture = (): Venture => ({
  id: uid(), name: "", status: "idea", revenue: [], createdAt: Date.now(),
});
export function upsertVenture(v: Venture) {
  updateState((s) => ({
    ...s,
    ventures: s.ventures.some((x) => x.id === v.id)
      ? s.ventures.map((x) => (x.id === v.id ? v : x))
      : [...s.ventures, v],
  }));
  refreshAchievements();
}
export function removeVenture(id: string) {
  updateState((s) => ({ ...s, ventures: s.ventures.filter((v) => v.id !== id) }));
}
export function setVentureRevenue(ventureId: string, month: string, amount: number) {
  updateState((s) => ({
    ...s,
    ventures: s.ventures.map((v) => {
      if (v.id !== ventureId) return v;
      const revenue = v.revenue.filter((r) => r.month !== month);
      if (amount > 0) revenue.push({ id: uid(), month, amount });
      revenue.sort((a, b) => a.month.localeCompare(b.month));
      return { ...v, revenue };
    }),
  }));
  refreshAchievements();
}
// Most recent month's revenue for a venture.
export function ventureMRR(v: Venture): number {
  if (!v.revenue.length) return 0;
  return [...v.revenue].sort((a, b) => b.month.localeCompare(a.month))[0].amount;
}
export function empireMRR(s: State = loadState()): number {
  return s.ventures.reduce((n, v) => n + ventureMRR(v), 0);
}
export function empireLifetime(s: State = loadState()): number {
  return s.ventures.reduce((n, v) => n + v.revenue.reduce((m, r) => m + r.amount, 0), 0);
}

// ── inbox (GTD quick capture) ─────────────────────────────────────────────
export function captureInbox(text: string) {
  const t = text.trim();
  if (!t) return;
  updateState((s) => ({ ...s, inbox: [{ id: uid(), text: t, ts: Date.now() }, ...s.inbox] }));
}
export function removeInbox(id: string) {
  updateState((s) => ({ ...s, inbox: s.inbox.filter((i) => i.id !== id) }));
}
// Triage: turn a captured note into an event (returns the draft to edit).
export function inboxToEventDraft(item: InboxItem): CalEvent {
  return { ...blankEvent(today()), title: item.text, allDay: true };
}
export function inboxToProject(item: InboxItem) {
  upsertProject({ ...blankProject("other"), name: item.text });
  removeInbox(item.id);
}
export function inboxToGoal(item: InboxItem, bucket: keyof Goals) {
  updateState((s) => ({ ...s, goals: { ...s.goals, [bucket]: [...s.goals[bucket], { id: uid(), text: item.text }] } }));
  removeInbox(item.id);
}

// ── insights (see yourself achieving it) ──────────────────────────────────
export type Insights = {
  xpByDay: { date: string; xp: number }[];     // last 30 days, completion ts based
  xpLast7: number;
  xpLast30: number;
  completionRate30: number;                     // % of scheduled occurrences done, last 30d
  byCategory: { category: Category; count: number }[];
  bestStreak: number;
  achievementsEarned: number;
  distractions30: number;
  // ── screen correlations (the data mirror that proves the trade) ──────
  screenMinutesByDay: { date: string; minutes: number; budget: number }[]; // last 30
  screenLast7: number;
  screenLast30: number;
  screenAvgDaily: number;                       // average minutes/day where logged
  routineDayAvgMin: number;                     // avg screentime on days morning routine done
  noRoutineDayAvgMin: number;                   // avg screentime on days it wasn't
  routineDays: number;                          // count of days morning routine completed (last 30)
  noRoutineDays: number;                        // count of days it wasn't (last 30)
  urgesLast30: number;
  urgesResistedLast30: number;
  bestUnderBudgetStreak: number;                // longest run of under-budget days, all time
  worstHour: { hour: number; minutes: number } | null; // hour-of-day with most logged screen time
  byScreenCategory: { category: import("./types").ScreenCategory; minutes: number }[]; // last 30
};
export function insights(s: State = loadState()): Insights {
  const now = new Date();
  const start30 = addDays(today(), -29);
  // XP earned per day from completion timestamps (when you actually did it).
  const perDay: Record<string, number> = {};
  for (const [key, ts] of Object.entries(s.completions)) {
    const id = key.split("::")[0];
    const e = s.events.find((x) => x.id === id);
    if (!e) continue;
    const day = iso(new Date(ts));
    perDay[day] = (perDay[day] ?? 0) + e.xp;
  }
  const xpByDay: { date: string; xp: number }[] = [];
  for (let i = 29; i >= 0; i--) { const day = addDays(today(), -i); xpByDay.push({ date: day, xp: perDay[day] ?? 0 }); }
  const xpLast7 = xpByDay.slice(-7).reduce((n, d) => n + d.xp, 0);
  const xpLast30 = xpByDay.reduce((n, d) => n + d.xp, 0);

  // completion rate over last 30 days of scheduled occurrences
  let possible = 0, done = 0;
  for (let i = 0; i < 30; i++) {
    const d = addDays(today(), -i);
    if (d > today()) continue;
    for (const e of eventsOnDate(d, s)) { possible++; if (isDone(e, d, s)) done++; }
  }
  const byCatMap: Record<string, number> = {};
  for (const key of Object.keys(s.completions)) {
    const id = key.split("::")[0];
    const e = s.events.find((x) => x.id === id);
    if (e) byCatMap[e.category] = (byCatMap[e.category] ?? 0) + 1;
  }
  const byCategory = Object.entries(byCatMap)
    .map(([category, count]) => ({ category: category as Category, count }))
    .sort((a, b) => b.count - a.count);

  // ── screen analytics (30-day window) ──────────────────────────────────
  // Daily totals for the last 30 days. Day-level math from screenMinutesOn
  // matches what the Today card and Screens tab show.
  const screenMinutesByDay: { date: string; minutes: number; budget: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const day = addDays(today(), -i);
    screenMinutesByDay.push({ date: day, minutes: screenMinutesOn(day, s), budget: earnedBudgetOn(day, s).total });
  }
  const screenLast7 = screenMinutesByDay.slice(-7).reduce((n, d) => n + d.minutes, 0);
  const screenLast30 = screenMinutesByDay.reduce((n, d) => n + d.minutes, 0);
  const loggedScreenDays = screenMinutesByDay.filter((d) => d.minutes > 0).length;
  const screenAvgDaily = loggedScreenDays ? Math.round(screenLast30 / loggedScreenDays) : 0;

  // The killer correlation: morning routine done vs not done. Look at
  // screentime over the last 30 days bucketed by whether ANY morning routine
  // (semantic: routine starting before 10:00) was completed that date. Only
  // counts days that have a session, so you're not comparing zeros.
  let routineDays = 0, noRoutineDays = 0;
  let routineMinSum = 0, noRoutineMinSum = 0;
  for (const d of screenMinutesByDay) {
    if (d.minutes === 0) continue;
    if (morningRoutineCompletionOn(d.date, s) !== undefined) { routineDays++; routineMinSum += d.minutes; }
    else { noRoutineDays++; noRoutineMinSum += d.minutes; }
  }
  const routineDayAvgMin = routineDays ? Math.round(routineMinSum / routineDays) : 0;
  const noRoutineDayAvgMin = noRoutineDays ? Math.round(noRoutineMinSum / noRoutineDays) : 0;

  // Urges over the window.
  const urgesLast30 = s.urges.filter((u) => u.date >= start30).length;
  const urgesResistedLast30 = s.urges.filter((u) => u.date >= start30 && u.resolution === "resisted").length;

  // Longest under-budget streak, all time, restricted to days with sessions.
  let bestUnderBudgetStreak = 0, runUbAll = 0, prevUbAll = "";
  const allScreenDates = [...new Set(s.screenSessions.map((x) => x.date))].sort();
  for (const d of allScreenDates) {
    const used = screenMinutesOn(d, s);
    const budget = earnedBudgetOn(d, s).total;
    if (used <= budget) {
      runUbAll = prevUbAll && addDays(prevUbAll, 1) === d ? runUbAll + 1 : 1;
      bestUnderBudgetStreak = Math.max(bestUnderBudgetStreak, runUbAll);
    } else { runUbAll = 0; }
    prevUbAll = d;
  }

  // Worst hour of day — when do most of your minutes happen? Bucket by the
  // hour the session was active (use start hour as a simple proxy).
  const minutesByHour: number[] = new Array(24).fill(0);
  for (const x of s.screenSessions) {
    if (x.date < start30) continue;
    const startHour = new Date(x.startedAt).getHours();
    minutesByHour[startHour] += computeSessionMinutes(x);
  }
  let worstHour: { hour: number; minutes: number } | null = null;
  for (let h = 0; h < 24; h++) {
    if (minutesByHour[h] > 0 && (worstHour == null || minutesByHour[h] > worstHour.minutes)) {
      worstHour = { hour: h, minutes: minutesByHour[h] };
    }
  }

  // Screen time per category, last 30 days.
  const screenCatMap: Record<string, number> = {};
  for (const x of s.screenSessions) {
    if (x.date < start30) continue;
    screenCatMap[x.category] = (screenCatMap[x.category] ?? 0) + computeSessionMinutes(x);
  }
  const byScreenCategory = Object.entries(screenCatMap)
    .map(([category, minutes]) => ({ category: category as import("./types").ScreenCategory, minutes }))
    .sort((a, b) => b.minutes - a.minutes);

  void now;
  return {
    xpByDay, xpLast7, xpLast30,
    completionRate30: possible ? Math.round((done / possible) * 100) : 0,
    byCategory,
    bestStreak: streakInfo(s).best,
    achievementsEarned: Object.keys(s.unlockedAchievements).length,
    distractions30: s.distractions.filter((d) => d.date >= start30).length,
    screenMinutesByDay, screenLast7, screenLast30, screenAvgDaily,
    routineDayAvgMin, noRoutineDayAvgMin, routineDays, noRoutineDays,
    urgesLast30, urgesResistedLast30, bestUnderBudgetStreak,
    worstHour, byScreenCategory,
  };
}

// ── reminders: which occurrences are due to fire right now ─────────────────
// Returns events whose start is within their reminder lead-time of `now` and
// not yet done. Caller dedupes by the returned key so a toast fires once.
export type DueReminder = { key: string; e: CalEvent; date: string; startMin: number; lead: number };
export function dueReminders(s: State = loadState(), at = new Date()): DueReminder[] {
  const date = iso(at);
  const nowMin = at.getHours() * 60 + at.getMinutes();
  const out: DueReminder[] = [];
  for (const e of eventsOnDate(date, s)) {
    if (e.allDay || !e.start || !e.reminders.length) continue;
    if (isDone(e, date, s)) continue;
    const startMin = toMin(e.start);
    for (const lead of e.reminders) {
      const fireAt = startMin - lead;
      // fire in a 1-minute window so the per-minute tick catches it once
      if (nowMin >= fireAt && nowMin < fireAt + 1) {
        out.push({ key: `${e.id}::${date}::${lead}`, e, date, startMin, lead });
      }
    }
  }
  return out;
}

// ── screens (training, never nagging) ──────────────────────────────────────
// Honest mirror. The system reflects, doesn't lecture. The user is the only
// enforcer of any of this; achievements celebrate resistance and routines-
// first, never punish over-budget days.

export function setScreenSettings(patch: Partial<ScreenSettings>) {
  updateState((s) => ({ ...s, screen: { ...s.screen, ...patch } }));
}

// Minutes for a single session — explicit > computed-from-times > running.
export function computeSessionMinutes(x: ScreenSession, now: number = Date.now()): number {
  if (x.minutes != null) return Math.max(0, Math.round(x.minutes));
  if (x.endedAt != null) return Math.max(0, Math.round((x.endedAt - x.startedAt) / 60_000));
  return Math.max(0, Math.round((now - x.startedAt) / 60_000));
}

export function screenSessionsOn(date: string, s: State = loadState()): ScreenSession[] {
  return s.screenSessions
    .filter((x) => x.date === date)
    .slice()
    .sort((a, b) => b.startedAt - a.startedAt);
}

export function screenMinutesOn(date: string, s: State = loadState(), now: number = Date.now()): number {
  return s.screenSessions
    .filter((x) => x.date === date)
    .reduce((n, x) => n + computeSessionMinutes(x, now), 0);
}

export function activeScreenSession(s: State = loadState()): ScreenSession | undefined {
  return s.screenSessions.find((x) => x.endedAt == null && x.minutes == null);
}

// Earned budget for a date: base + bonus×(routines completed that day),
// capped. The "I earned this" framing — you do the things you'd skip, you
// expand your screen window. Skip them, you have the base only.
export type Budget = { base: number; bonus: number; total: number; routinesDone: number; routinesPossible: number };
export function earnedBudgetOn(date: string, s: State = loadState()): Budget {
  const base = s.screen.baseBudgetMinutes;
  const routines = eventsOnDate(date, s).filter((e) => e.category === "routine");
  const possible = routines.length;
  const done = routines.filter((e) => isDone(e, date, s)).length;
  const bonus = done * s.screen.bonusPerRoutineMinutes;
  const total = Math.min(s.screen.capBudgetMinutes, base + bonus);
  return { base, bonus, total, routinesDone: done, routinesPossible: possible };
}

// Pre-committed screens window — handles overnight ranges (e.g. 22:00→02:00).
export function isInWindow(s: State = loadState(), at: Date = new Date()): boolean | null {
  const { windowStart, windowEnd } = s.screen;
  if (!windowStart || !windowEnd) return null;
  const m = at.getHours() * 60 + at.getMinutes();
  const a = toMin(windowStart), b = toMin(windowEnd);
  return a <= b ? m >= a && m <= b : m >= a || m <= b;
}

export function startScreenSession(category: ScreenCategory, what: string, note?: string): ScreenSession {
  // Stop any currently-running session before starting a new one — only one
  // can be live at a time, otherwise minute math gets weird.
  const live = activeScreenSession();
  if (live) stopScreenSession(live.id);
  const now = Date.now();
  const x: ScreenSession = {
    id: uid(), date: today(), startedAt: now,
    category, what: what.trim() || "screens", note: note?.trim() || undefined,
  };
  updateState((s) => ({ ...s, screenSessions: [...s.screenSessions, x] }));
  refreshAchievements();
  return x;
}

export function stopScreenSession(id: string) {
  updateState((s) => ({
    ...s,
    screenSessions: s.screenSessions.map((x) =>
      x.id === id && x.endedAt == null ? { ...x, endedAt: Date.now() } : x
    ),
  }));
  refreshAchievements();
}

// Quick after-the-fact log — pick category, name it, how long. The act of
// logging IS the awareness.
export function logScreenSession(category: ScreenCategory, what: string, minutes: number, note?: string, onDate?: string): ScreenSession {
  const date = onDate ?? today();
  const startedAt = Date.parse(date + "T12:00:00") || Date.now();
  const x: ScreenSession = {
    id: uid(), date, startedAt,
    endedAt: startedAt + minutes * 60_000,
    minutes: Math.max(0, Math.round(minutes)),
    category, what: what.trim() || "screens", note: note?.trim() || undefined,
  };
  updateState((s) => ({ ...s, screenSessions: [...s.screenSessions, x] }));
  refreshAchievements();
  return x;
}

export function updateScreenSession(id: string, patch: Partial<ScreenSession>) {
  updateState((s) => ({
    ...s,
    screenSessions: s.screenSessions.map((x) => (x.id === id ? { ...x, ...patch } : x)),
  }));
  refreshAchievements();
}

export function removeScreenSession(id: string) {
  updateState((s) => ({ ...s, screenSessions: s.screenSessions.filter((x) => x.id !== id) }));
  refreshAchievements();
}

// First screen session time of a date (minutes since midnight) — drives the
// "routine before phone" achievement.
function firstSessionMinuteOn(date: string, s: State): number | null {
  const sess = s.screenSessions.filter((x) => x.date === date);
  if (!sess.length) return null;
  const first = sess.reduce((a, b) => (a.startedAt < b.startedAt ? a : b));
  const d = new Date(first.startedAt);
  return d.getHours() * 60 + d.getMinutes();
}

// ── urges (felt-it, beat-it) ──────────────────────────────────────────────
export function logUrge(args: { what?: string; resolution: UrgeResolution; replacement?: string; note?: string }): UrgeLog {
  const u: UrgeLog = {
    id: uid(), date: today(), ts: Date.now(),
    what: args.what?.trim() || undefined,
    resolution: args.resolution,
    replacement: args.replacement?.trim() || undefined,
    note: args.note?.trim() || undefined,
  };
  updateState((s) => ({ ...s, urges: [...s.urges, u] }));
  refreshAchievements();
  return u;
}
export function removeUrge(id: string) {
  updateState((s) => ({ ...s, urges: s.urges.filter((u) => u.id !== id) }));
  refreshAchievements();
}
export function urgesOn(date: string, s: State = loadState()): UrgeLog[] {
  return s.urges.filter((u) => u.date === date);
}

// ── replacement drawer ────────────────────────────────────────────────────
export function addReplacement(label: string, minutes: number) {
  const r: Replacement = { id: uid(), label: label.trim() || "Do something else", minutes: Math.max(1, Math.round(minutes)) };
  updateState((s) => ({ ...s, replacements: [...s.replacements, r] }));
}
export function updateReplacement(id: string, patch: Partial<Replacement>) {
  updateState((s) => ({ ...s, replacements: s.replacements.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
}
export function removeReplacement(id: string) {
  updateState((s) => ({ ...s, replacements: s.replacements.filter((r) => r.id !== id) }));
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

// ── customization (rename tabs, hide tabs, custom ranks, custom achievements,
// custom theme) ────────────────────────────────────────────────────────────
//
// Migration-safe defaults backstop: any missing field gets the seed value,
// and the rank array is normalized to exactly MAX_LEVEL entries.
function mergeCustomization(d: Customization, p?: Partial<Customization>): Customization {
  if (!p) return d;
  const ranks = Array.from({ length: MAX_LEVEL }, (_, i) => {
    const v = p.customRanks?.[i];
    return typeof v === "string" && v.trim() ? v : undefined;
  });
  return {
    tabLabels: p.tabLabels ?? d.tabLabels,
    hiddenTabs: p.hiddenTabs ?? d.hiddenTabs,
    customRanks: ranks,
    customAchievements: p.customAchievements ?? d.customAchievements,
    customTheme: p.customTheme ?? d.customTheme,
    useCustomTheme: !!p.useCustomTheme,
    quotes: Array.isArray(p.quotes) ? p.quotes : d.quotes,
    dynamicTabs: Array.isArray(p.dynamicTabs) ? p.dynamicTabs : d.dynamicTabs,
    widgets: p.widgets && typeof p.widgets === "object" ? p.widgets : d.widgets,
  };
}

// ── quotes (user-supplied; rotate one per day on Today + quote widgets) ──
export function addQuote(text: string, by: string) {
  const t = text.trim();
  if (!t) return;
  updateState((s) => ({
    ...s,
    customization: { ...s.customization, quotes: [...s.customization.quotes, { id: uid(), text: t, by: by.trim() || "Me" }] },
  }));
}
export function removeQuote(id: string) {
  updateState((s) => ({
    ...s,
    customization: { ...s.customization, quotes: s.customization.quotes.filter((q) => q.id !== id) },
  }));
}

export function tabLabel(id: string, fallback: string, s: State = loadState()): string {
  const v = s.customization.tabLabels[id];
  return v && v.trim() ? v : fallback;
}
export function setTabLabel(id: string, label: string) {
  updateState((s) => ({
    ...s,
    customization: {
      ...s.customization,
      tabLabels: { ...s.customization.tabLabels, [id]: label.trim() },
    },
  }));
}
export function resetTabLabel(id: string) {
  updateState((s) => {
    const next = { ...s.customization.tabLabels };
    delete next[id];
    return { ...s, customization: { ...s.customization, tabLabels: next } };
  });
}

export function isTabHidden(id: string, s: State = loadState()): boolean {
  return s.customization.hiddenTabs.includes(id);
}
export function toggleTabHidden(id: string) {
  updateState((s) => {
    const cur = s.customization.hiddenTabs;
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    return { ...s, customization: { ...s.customization, hiddenTabs: next } };
  });
}

export function rankFor(level: number, s: State = loadState()): string {
  const i = Math.max(1, Math.min(MAX_LEVEL, level)) - 1;
  const override = s.customization.customRanks[i];
  return override && override.trim() ? override : (RANK_NAMES[i] ?? "");
}
export function setRank(level: number, name: string) {
  updateState((s) => {
    const i = Math.max(1, Math.min(MAX_LEVEL, level)) - 1;
    const ranks = s.customization.customRanks.slice();
    ranks[i] = name.trim() || undefined;
    return { ...s, customization: { ...s.customization, customRanks: ranks } };
  });
}
export function resetAllRanks() {
  updateState((s) => ({
    ...s,
    customization: {
      ...s.customization,
      customRanks: Array.from({ length: MAX_LEVEL }, () => undefined),
    },
  }));
}

// Custom achievements — user-defined goals with XP rewards. Unlike the
// built-in rule-based ones, these are MANUALLY claimed (you decide when
// you've earned them). Claim once, claim sticks; XP counts once.
export const blankCustomAchievement = (): CustomAchievement => ({
  id: uid(), title: "", desc: "", xp: 100,
});
export function addCustomAchievement(a: CustomAchievement) {
  updateState((s) => ({
    ...s,
    customization: {
      ...s.customization,
      customAchievements: [...s.customization.customAchievements, a],
    },
  }));
}
export function updateCustomAchievement(id: string, patch: Partial<CustomAchievement>) {
  updateState((s) => ({
    ...s,
    customization: {
      ...s.customization,
      customAchievements: s.customization.customAchievements.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    },
  }));
}
export function removeCustomAchievement(id: string) {
  updateState((s) => ({
    ...s,
    customization: {
      ...s.customization,
      customAchievements: s.customization.customAchievements.filter((a) => a.id !== id),
    },
  }));
}
export function claimCustomAchievement(id: string) {
  updateState((s) => ({
    ...s,
    customization: {
      ...s.customization,
      customAchievements: s.customization.customAchievements.map((a) =>
        a.id === id && !a.claimedAt ? { ...a, claimedAt: Date.now() } : a
      ),
    },
  }));
}
export function unclaimCustomAchievement(id: string) {
  updateState((s) => ({
    ...s,
    customization: {
      ...s.customization,
      customAchievements: s.customization.customAchievements.map((a) =>
        a.id === id ? { ...a, claimedAt: undefined } : a
      ),
    },
  }));
}

// Custom theme — user-defined palette. setCustomTheme also flips the theme
// preference to "custom" so it applies immediately.
export function setCustomTheme(p: CustomTheme) {
  updateState((s) => ({
    ...s,
    customization: { ...s.customization, customTheme: p, useCustomTheme: true },
  }));
}
export function clearCustomTheme() {
  updateState((s) => ({
    ...s,
    customization: { ...s.customization, customTheme: undefined, useCustomTheme: false },
  }));
}
export function setUseCustomTheme(on: boolean) {
  updateState((s) => ({ ...s, customization: { ...s.customization, useCustomTheme: on } }));
}

// ── Dynamic UI (the agent API) ─────────────────────────────────────────────
// Everything here is a pure state mutation. An external agent (or the in-app
// builder UI) can compose tabs and widgets without touching source. Persisted
// + synced via the same path as everything else.

export function addDynamicTab(label: string, icon?: string, notes?: string): DynamicTab {
  const t: DynamicTab = { id: "dyn-" + uid(), label: label.trim() || "Untitled", icon, notes };
  updateState((s) => ({
    ...s,
    customization: { ...s.customization, dynamicTabs: [...s.customization.dynamicTabs, t] },
  }));
  return t;
}
export function updateDynamicTab(id: string, patch: Partial<DynamicTab>) {
  updateState((s) => ({
    ...s,
    customization: {
      ...s.customization,
      dynamicTabs: s.customization.dynamicTabs.map((t) => (t.id === id ? { ...t, ...patch, id: t.id } : t)),
    },
  }));
}
export function removeDynamicTab(id: string) {
  updateState((s) => {
    const widgets = { ...s.customization.widgets };
    delete widgets[id];
    return {
      ...s,
      customization: {
        ...s.customization,
        dynamicTabs: s.customization.dynamicTabs.filter((t) => t.id !== id),
        widgets,
      },
    };
  });
}
export function moveDynamicTab(id: string, dir: -1 | 1) {
  updateState((s) => {
    const arr = s.customization.dynamicTabs.slice();
    const i = arr.findIndex((t) => t.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return s;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return { ...s, customization: { ...s.customization, dynamicTabs: arr } };
  });
}

// Widgets live under a tab id. Built-in tab ids (e.g. "today") are valid
// targets — drop a widget on Today and it renders above the default content.
export function widgetsOn(tabId: string, s: State = loadState()): Widget[] {
  return s.customization.widgets[tabId] ?? [];
}

// Build a typed blank Widget for a given kind. The agent / builder picks
// fields from here; field validation happens in addWidget.
export function blankWidget(kind: Widget["kind"]): Widget {
  const id = "w-" + uid();
  switch (kind) {
    case "text":      return { id, kind, title: "", body: "" };
    case "counter":   return { id, kind, title: "Counter", value: 0, step: 1 };
    case "note":      return { id, kind, title: "", body: "" };
    case "checklist": return { id, kind, title: "Checklist", items: [] };
    case "link":      return { id, kind, title: "Open", url: "https://" };
    case "iframe":    return { id, kind, title: "", url: "https://", height: 360 };
    case "stat":      return { id, kind, title: "Stat", source: "xp.total", format: "number" };
    case "image":     return { id, kind, title: "", url: "https://", height: 240 };
    case "divider":   return { id, kind };
    case "quote":     return { id, kind, title: "" };
  }
}

export function addWidget(tabId: string, widget: Widget) {
  // Defensive: re-id if the caller forgot, so two widgets can't collide.
  const safe: Widget = widget.id ? widget : { ...widget, id: "w-" + uid() };
  updateState((s) => {
    const list = s.customization.widgets[tabId] ?? [];
    return {
      ...s,
      customization: {
        ...s.customization,
        widgets: { ...s.customization.widgets, [tabId]: [...list, safe] },
      },
    };
  });
}
export function updateWidget(tabId: string, widgetId: string, patch: Partial<Widget>) {
  updateState((s) => {
    const list = s.customization.widgets[tabId] ?? [];
    return {
      ...s,
      customization: {
        ...s.customization,
        widgets: {
          ...s.customization.widgets,
          [tabId]: list.map((w) => (w.id === widgetId ? { ...w, ...patch, id: w.id, kind: w.kind } as Widget : w)),
        },
      },
    };
  });
}
export function removeWidget(tabId: string, widgetId: string) {
  updateState((s) => {
    const list = s.customization.widgets[tabId] ?? [];
    return {
      ...s,
      customization: {
        ...s.customization,
        widgets: { ...s.customization.widgets, [tabId]: list.filter((w) => w.id !== widgetId) },
      },
    };
  });
}
export function moveWidget(tabId: string, widgetId: string, dir: -1 | 1) {
  updateState((s) => {
    const list = (s.customization.widgets[tabId] ?? []).slice();
    const i = list.findIndex((w) => w.id === widgetId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return s;
    [list[i], list[j]] = [list[j], list[i]];
    return {
      ...s,
      customization: {
        ...s.customization,
        widgets: { ...s.customization.widgets, [tabId]: list },
      },
    };
  });
}

// Stat widget data source. Pure read — the renderer calls this each render.
export function statValue(source: StatSource, s: State = loadState()): number {
  switch (source) {
    case "screen.todayMinutes":     return screenMinutesOn(today(), s);
    case "screen.todayBudget":      return earnedBudgetOn(today(), s).total;
    case "screen.urgesResistedToday": return urgesOn(today(), s).filter((u) => u.resolution === "resisted").length;
    case "screen.urgesResistedTotal": return s.urges.filter((u) => u.resolution === "resisted").length;
    case "xp.total":                return totalXp(s);
    case "xp.level":                return levelInfo(s).level;
    case "xp.streak":               return streakInfo(s).current;
    case "events.todayCompleted": {
      let n = 0;
      for (const e of eventsOnDate(today(), s)) if (isDone(e, today(), s)) n++;
      return n;
    }
    case "events.todayTotal":       return eventsOnDate(today(), s).length;
    case "ventures.mrr":            return empireMRR(s);
    case "ventures.lifetime":       return empireLifetime(s);
  }
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
  argDone: number;
  meetingPrepDone: number;         // meetings completed with all checklist done
  polymathMax: number;             // max distinct categories completed in one day
  ventureDone: number;
  // Morning/bed routines are detected SEMANTICALLY (by start time), never by
  // id — the app can only reward what it can actually observe from the
  // user's own routines, whatever they named them.
  morningRoutineDone: number;      // completions of routine events starting before 10:00
  bedRoutineDone: number;          // completions of routine events starting 20:00 or later
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
  empireMRR: number;
  empireLifetime: number;
  liveVentures: number;
  // ── screens ───────────────────────────────────────────────────────────
  screenSessionsLogged: number;
  daysUnderBudget: number;         // days with sessions, all-day total ≤ earned budget
  underBudgetStreak: number;       // longest run of consecutive under-budget days
  urgesLogged: number;
  urgesResisted: number;
  daysAllSessionsInWindow: number; // days with ≥1 session, ALL inside pre-committed window
  routineFirstDays: number;        // days morning routine completed before first session
  earnedItDays: number;            // days with ≥1 routine done AND under budget
  // ── school integrity ──────────────────────────────────────────────────
  schoolPrepared: number;          // completed school items with prepared=true
  schoolAllYours: number;          // completed school items with helpUsed === "none"
  schoolHonestlyLogged: number;    // completed school items with helpUsed set (any value)
};

// Semantic routine-slot tests. "Morning" = starts before 10:00; "bed" =
// starts 20:00 or later. Used by achievements + the insights correlation so
// they work on whatever routines the user actually created.
const isMorningRoutine = (e: CalEvent) => e.category === "routine" && !!e.start && e.start < "10:00";
const isBedRoutine = (e: CalEvent) => e.category === "routine" && !!e.start && e.start >= "20:00";

// Was any morning routine completed on `date`? Returns the earliest
// completion timestamp if so, else undefined.
export function morningRoutineCompletionOn(date: string, s: State): number | undefined {
  let earliest: number | undefined;
  for (const e of s.events) {
    if (!isMorningRoutine(e)) continue;
    const ts = s.completions[`${e.id}::${date}`];
    if (ts && (earliest === undefined || ts < earliest)) earliest = ts;
  }
  return earliest;
}

function aggregate(s: State): Aggregates {
  const byCategory: Record<string, number> = {};
  const routineCounts: Record<string, number> = {};
  let completionCount = 0, aheadCompletions = 0;
  const perDayCats: Record<string, Set<string>> = {};
  const perDayCompletions: Record<string, number> = {};

  let morningRoutineDone = 0, bedRoutineDone = 0;
  for (const [key, ts] of Object.entries(s.completions)) {
    const [id, date] = key.split("::");
    const e = s.events.find((x) => x.id === id);
    if (!e) continue;
    completionCount++;
    byCategory[e.category] = (byCategory[e.category] ?? 0) + 1;
    if (e.category === "routine") routineCounts[e.id] = (routineCounts[e.id] ?? 0) + 1;
    if (isMorningRoutine(e)) morningRoutineDone++;
    if (isBedRoutine(e)) bedRoutineDone++;
    // "ahead": completed before the occurrence date arrived
    if (iso(new Date(ts)) < date) aheadCompletions++;
    (perDayCats[date] ??= new Set()).add(e.category);
    perDayCompletions[date] = (perDayCompletions[date] ?? 0) + 1;
  }

  const t = today();
  let futureSchoolDone7 = 0, futureSchoolDone30 = 0;
  let longIProjectDone = false, argDone = 0, meetingPrepDone = 0, ventureDone = 0;
  let eventsLinkedToPeople = 0;
  for (const e of s.events) {
    if (e.people.length) eventsLinkedToPeople++;
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

  // ── screen aggregations ─────────────────────────────────────────────
  // Collect every date that has at least one session or one urge — the
  // achievement math considers a day only when there was activity to judge.
  const screenDates = new Set<string>();
  for (const x of s.screenSessions) screenDates.add(x.date);
  const sortedScreenDates = [...screenDates].sort();
  let daysUnderBudget = 0, daysAllSessionsInWindow = 0, routineFirstDays = 0, earnedItDays = 0;
  for (const d of sortedScreenDates) {
    const used = screenMinutesOn(d, s);
    const budget = earnedBudgetOn(d, s);
    if (used <= budget.total) daysUnderBudget++;
    if (budget.routinesDone > 0 && used <= budget.total) earnedItDays++;
    // window: must have a configured window AND every session of that day must
    // have started within it
    if (s.screen.windowStart && s.screen.windowEnd) {
      const sess = s.screenSessions.filter((x) => x.date === d);
      const allIn = sess.length > 0 && sess.every((x) => isInWindow(s, new Date(x.startedAt)) === true);
      if (allIn) daysAllSessionsInWindow++;
    }
    // routine before phone: any morning routine (semantic — starts before
    // 10:00) done that day, with its completion ts before the first
    // screen-session minute of the day
    const morningCompletedTs = morningRoutineCompletionOn(d, s);
    if (morningCompletedTs) {
      const mDate = new Date(morningCompletedTs);
      const m = mDate.getHours() * 60 + mDate.getMinutes();
      const first = firstSessionMinuteOn(d, s);
      if (first == null || m < first) routineFirstDays++;
    }
  }
  // Under-budget streak — consecutive days with sessions where total ≤ budget.
  let underBudgetStreak = 0, runUb = 0, prevUb = "";
  for (const d of sortedScreenDates) {
    const used = screenMinutesOn(d, s);
    const budget = earnedBudgetOn(d, s);
    if (used <= budget.total) {
      runUb = prevUb && addDays(prevUb, 1) === d ? runUb + 1 : 1;
      underBudgetStreak = Math.max(underBudgetStreak, runUb);
    } else { runUb = 0; }
    prevUb = d;
  }
  const urgesResisted = s.urges.filter((u) => u.resolution === "resisted").length;

  // ── school integrity aggregations ───────────────────────────────────
  let schoolPrepared = 0, schoolAllYours = 0, schoolHonestlyLogged = 0;
  for (const e of s.events) {
    if (e.category !== "school") continue;
    if (!isDone(e, e.date, s)) continue;
    if (e.prepared) schoolPrepared++;
    if (e.helpUsed) schoolHonestlyLogged++;
    if (e.helpUsed === "none") schoolAllYours++;
  }

  return {
    completionCount, byCategory, routineCounts, aheadCompletions,
    futureSchoolDone7, futureSchoolDone30, longIProjectDone, argDone,
    meetingPrepDone, polymathMax, ventureDone, morningRoutineDone, bedRoutineDone,
    quietDays, quietStreak,
    milestonesDone, projectsDone, eventsLinkedToPeople, totalEvents: s.events.length,
    // "Revealed" means it actually went hidden -> visible via revealEvent
    // (revealedAt stamp), not just "was created visible like every event".
    announcementsRevealed: s.events.filter((e) => e.category === "announcement" && e.visibility === "visible" && !!e.revealedAt).length,
    streakCurrent: current, streakBest: best, level: levelInfo(s).level,
    empireMRR: empireMRR(s), empireLifetime: empireLifetime(s),
    liveVentures: s.ventures.filter((v) => v.status === "live" || v.status === "scaling").length,
    screenSessionsLogged: s.screenSessions.length,
    daysUnderBudget, underBudgetStreak,
    urgesLogged: s.urges.length, urgesResisted,
    daysAllSessionsInWindow, routineFirstDays, earnedItDays,
    schoolPrepared, schoolAllYours, schoolHonestlyLogged,
  };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Discipline — showing up, staying on it
  { id: "first-step", title: "Showed Up", desc: "Complete anything you scheduled.", category: "discipline", progress: (a) => [Math.min(a.completionCount, 1), 1] },
  { id: "polymath", title: "Polymath", desc: "Complete items across 5 categories in one day.", category: "discipline", progress: (a) => [a.polymathMax, 5] },
  { id: "quiet-quarter", title: "Heads Down", desc: "7-day streak with zero logged distractions.", category: "discipline", progress: (a) => [a.quietStreak, 7] },
  { id: "locked-in", title: "Phone Off", desc: "30 productive days with no distractions logged, total.", category: "discipline", progress: (a) => [a.quietDays, 30] },
  { id: "streak-3", title: "Three in a Row", desc: "3-day routine streak.", category: "discipline", progress: (a) => [a.streakBest, 3] },
  { id: "streak-7", title: "Week Lit", desc: "7-day routine streak.", category: "discipline", progress: (a) => [a.streakBest, 7] },
  { id: "streak-30", title: "Lock-In · 30d", desc: "30-day routine streak.", category: "discipline", progress: (a) => [a.streakBest, 30] },
  { id: "early-bird", title: "Early Bird", desc: "Complete a morning routine (any routine starting before 10:00) 30 times.", category: "discipline", progress: (a) => [a.morningRoutineDone, 30] },
  { id: "sleep-pro", title: "Sleep Pro", desc: "Complete a bedtime routine (any routine starting 20:00 or later) 14 times.", category: "discipline", progress: (a) => [a.bedRoutineDone, 14] },
  { id: "planner", title: "All Booked Up", desc: "Have 25 items on your calendar.", category: "discipline", progress: (a) => [a.totalEvents, 25] },

  // School — the get-ahead superpower
  { id: "ahead-of-bell", title: "Ahead of the Bell", desc: "Finish a school item before its day even arrives.", category: "school", progress: (a) => [Math.min(a.aheadCompletions, 1), 1] },
  { id: "week-ahead", title: "A Week Up On You", desc: "Complete 5 future school items inside the next week.", category: "school", progress: (a) => [a.futureSchoolDone7, 5] },
  { id: "month-ahead", title: "Already Doing Next Month", desc: "Complete 15 future school items inside the next month.", category: "school", progress: (a) => [a.futureSchoolDone30, 15] },

  // Build — what you make, ship, and run
  { id: "iproject-marathon", title: "Locked In", desc: "Complete a 3-hour iProject block in a single sitting.", category: "build", progress: (a) => [a.longIProjectDone ? 1 : 0, 1] },
  { id: "arg-architect", title: "ARG Architect", desc: "Complete 3 ARG items.", category: "build", progress: (a) => [a.argDone, 3] },
  { id: "investor", title: "Walks In Prepared", desc: "Complete a meeting with its prep checklist fully done.", category: "build", progress: (a) => [a.meetingPrepDone, 1] },
  { id: "ship-it", title: "Shipped It", desc: "Complete a project.", category: "build", progress: (a) => [a.projectsDone, 1] },
  { id: "trilogy", title: "Three Down", desc: "Complete 3 projects.", category: "build", progress: (a) => [a.projectsDone, 3] },
  { id: "mile-markers", title: "Mile Markers", desc: "Finish 10 project milestones.", category: "build", progress: (a) => [a.milestonesDone, 10] },
  { id: "mogul", title: "Mogul", desc: "Complete 10 business / venture items.", category: "build", progress: (a) => [a.ventureDone, 10] },
  { id: "first-dollar", title: "First Dollar", desc: "Log revenue on a venture for the first time.", category: "build", progress: (a) => [a.empireLifetime > 0 ? 1 : 0, 1] },
  { id: "five-figures", title: "Five Figures", desc: "Reach $10,000 in combined monthly revenue.", category: "build", progress: (a) => [Math.min(a.empireMRR, 10000), 10000] },
  { id: "empire", title: "Empire", desc: "Run 3 live or scaling ventures at once.", category: "build", progress: (a) => [a.liveVentures, 3] },

  // Social — your reputation at school
  { id: "people-person", title: "Knows Everyone", desc: "Link 5 items to people in your circle.", category: "social", progress: (a) => [a.eventsLinkedToPeople, 5] },
  { id: "announcer", title: "Made It Official", desc: "Reveal a hidden announcement (create it unannounced, then make it visible).", category: "social", progress: (a) => [a.announcementsRevealed, 1] },

  // Level milestones — the rank ladder, big steps only
  { id: "level-5", title: "Up the Ladder", desc: "Reach level 5 — Operator.", category: "level", progress: (a) => [a.level, 5] },
  { id: "level-10", title: "Halfway", desc: "Reach level 10 — Tycoon.", category: "level", progress: (a) => [a.level, 10] },
  { id: "level-15", title: "Top Floor", desc: "Reach level 15 — Titan.", category: "level", progress: (a) => [a.level, 15] },
  { id: "level-20", title: "It's You", desc: "Reach level 20 — Davis.", category: "level", progress: (a) => [a.level, 20] },

  // Screens — training honestly. Celebrates noticing + resisting; never
  // punishes over-budget days.
  { id: "honest-screen", title: "Honest Log", desc: "Log your first screen session. Noticing is half of it.", category: "discipline", progress: (a) => [Math.min(a.screenSessionsLogged, 1), 1] },
  { id: "under-budget-1", title: "Under the Line", desc: "End a day under your earned screen budget.", category: "discipline", progress: (a) => [Math.min(a.daysUnderBudget, 1), 1] },
  { id: "earned-it", title: "Earned It", desc: "Stay under budget on a day where routines added bonus minutes.", category: "discipline", progress: (a) => [Math.min(a.earnedItDays, 1), 1] },
  { id: "below-the-line-7", title: "Below the Line · 7d", desc: "Seven days in a row under budget.", category: "discipline", progress: (a) => [a.underBudgetStreak, 7] },
  { id: "screen-discipline-30", title: "Screen Discipline · 30d", desc: "Thirty days under budget, total.", category: "discipline", progress: (a) => [a.daysUnderBudget, 30] },
  { id: "felt-it", title: "Felt It", desc: "Log your first urge. Catching the urge IS the win.", category: "discipline", progress: (a) => [Math.min(a.urgesLogged, 1), 1] },
  { id: "ten-resisted", title: "Ten Down", desc: "Resist ten urges (pick a replacement instead).", category: "discipline", progress: (a) => [a.urgesResisted, 10] },
  { id: "kept-window", title: "Window Keeper", desc: "Seven days where every screen session started inside your pre-committed window.", category: "discipline", progress: (a) => [a.daysAllSessionsInWindow, 7] },
  { id: "routine-first-5", title: "Routine Before Phone", desc: "Five days where the morning routine was done before any screens.", category: "discipline", progress: (a) => [a.routineFirstDays, 5] },

  // School integrity — honest self-mirror
  { id: "learn-first-1", title: "Learn First", desc: "Complete a school item with the prep box honestly checked.", category: "school", progress: (a) => [Math.min(a.schoolPrepared, 1), 1] },
  { id: "learn-first-10", title: "Read, Then Did · 10", desc: "Ten school items completed prepared.", category: "school", progress: (a) => [a.schoolPrepared, 10] },
  { id: "honest-school", title: "Honest Effort", desc: "Mark a school item's help honestly (any value).", category: "school", progress: (a) => [Math.min(a.schoolHonestlyLogged, 1), 1] },
  { id: "all-yours-5", title: "All Yours", desc: "Five school items completed with help = 'none'.", category: "school", progress: (a) => [a.schoolAllYours, 5] },

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
