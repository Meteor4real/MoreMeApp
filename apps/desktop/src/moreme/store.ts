// MoreMe state — single localStorage record, derived selectors, mode
// resolution, XP / level / tier / streak math, and achievement unlocking.

import type {
  Achievement, BonusKind, CalendarEvent, DayLog, Goals, Mode, PenaltyKind,
  Project, ScheduleBlock, State,
} from "./types";
import {
  DAY_COMPLETE_FRACTION, LEVELS_PER_TIER, MAX_LEVEL, TIERS, XP_PER_LEVEL,
} from "./types";
import { ASSIGNABLE_MODES, BONUS_CATALOG, DEFAULT_IDENTITY, PENALTY_CATALOG, SCHEDULES } from "./schedules";

const KEY = "nchub.moreme.v4";

// ── default seeds ────────────────────────────────────────────────────────
const defaultGoals = (): Goals => ({
  weeklyDigital:   [g("5 focus blocks"), g("1 project milestone"), g("1 academic goal")],
  weeklyPhysical:  [g("3 workouts"),     g("2–3 sports sessions")],
  weeklyIdentity:  [g("Morning routine every day"), g("On time every day"), g("No distractions")],
  semesterDigital: [g("Finish one major school unit"), g("Complete one personal project"), g("Maintain streaks for 30 days")],
  semesterPhysical:[g("Improve mile time"), g("Hit push-up / plank goals"), g("Join or participate in a sport")],
  yearlyAcademic:  [g("Pass all classes"), g("Build a digital portfolio"), g("Zero strikes")],
  yearlyPersonal:  [g("Become known as focused and reliable"), g("Build consistent routines"), g("Complete 3 personal projects")],
  yearlyPhysical:  [g("Run a mile without stopping"), g("30 push-ups in a set"), g("Visible muscle definition")],
  identity:        DEFAULT_IDENTITY.map(g),
});
function g(text: string) { return { id: Math.random().toString(36).slice(2, 9), text }; }

const defaultBattlepass = () => Array.from({ length: MAX_LEVEL }, (_, i) => ({ level: i + 1, reward: "" }));

const defaultState = (): State => ({
  schemaVersion: 1,
  events: [],
  dayTypes: {},
  dayLogs: {},
  projects: [],
  goals: defaultGoals(),
  battlepass: defaultBattlepass(),
  unlockedAchievements: {},
  prestige: 0,
  seasonStart: iso(new Date()),
  startedAt: Date.now(),
});

// ── persistence ─────────────────────────────────────────────────────────
const subs = new Set<(s: State) => void>();
let cache: State | null = null;

export function loadState(): State {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<State>;
      // Merge with defaults so newly added fields appear on existing installs.
      cache = mergeWithDefaults(parsed);
    } else cache = defaultState();
  } catch { cache = defaultState(); }
  return cache;
}

function mergeWithDefaults(p: Partial<State>): State {
  const d = defaultState();
  return {
    schemaVersion: 1,
    events: p.events ?? d.events,
    dayTypes: p.dayTypes ?? d.dayTypes,
    dayLogs: p.dayLogs ?? d.dayLogs,
    projects: p.projects ?? d.projects,
    goals: { ...d.goals, ...(p.goals ?? {}) },
    battlepass: p.battlepass && p.battlepass.length === MAX_LEVEL ? p.battlepass : d.battlepass,
    unlockedAchievements: p.unlockedAchievements ?? d.unlockedAchievements,
    prestige: p.prestige ?? 0,
    seasonStart: p.seasonStart ?? d.seasonStart,
    startedAt: p.startedAt ?? d.startedAt,
  };
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
export function resetSeason() {
  updateState((s) => ({ ...s, seasonStart: iso(new Date()) }));
}
export function adjustXp(date: string, deltaBonus: number, deltaPenalty: number) {
  updateState((s) => {
    const day = s.dayLogs[date] ?? { checked: [], bonus: [], penalty: [] };
    if (deltaBonus) day.bonus = [...day.bonus, { kind: "difficult-thing", xp: deltaBonus, ts: Date.now() }];
    if (deltaPenalty) day.penalty = [...day.penalty, { kind: "rule-break", xp: deltaPenalty, ts: Date.now() }];
    return { ...s, dayLogs: { ...s.dayLogs, [date]: day } };
  });
}

// ── date helpers ─────────────────────────────────────────────────────────
export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const dayOfWeek = (dateStr: string) => new Date(dateStr + "T00:00:00").getDay();
export const toMin = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
export const fmtTime = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

// ── mode resolution ──────────────────────────────────────────────────────
export function effectiveMode(date: string, s: State): { mode: Mode; reason: string } {
  const ev = s.events.find((e) => date >= e.start && date <= e.end);
  if (ev) return { mode: ev.mode, reason: `event · ${ev.title}` };
  if (s.dayTypes[date]) return { mode: s.dayTypes[date], reason: "set on the calendar" };
  const dow = dayOfWeek(date);
  if (dow === 0 || dow === 6) return { mode: "weekend", reason: "weekend (auto)" };
  return { mode: "semester", reason: "default" };
}

export function getSchedule(date: string, s: State): ScheduleBlock[] {
  return SCHEDULES[effectiveMode(date, s).mode];
}

// ── XP / level / tier ────────────────────────────────────────────────────
export function xpForDay(date: string, s: State): { earned: number; possible: number; bonus: number; penalty: number; net: number } {
  const sched = getSchedule(date, s);
  const day = s.dayLogs[date];
  const possible = sched.reduce((sum, b) => sum + b.xp, 0);
  const earned = day ? day.checked.reduce((sum, id) => sum + (sched.find((b) => b.id === id)?.xp ?? 0), 0) : 0;
  const bonus = day ? day.bonus.reduce((n, b) => n + b.xp, 0) : 0;
  const penalty = day ? day.penalty.reduce((n, b) => n + b.xp, 0) : 0;
  return { earned, possible, bonus, penalty, net: earned + bonus + penalty };
}

export function totalXp(s: State): number {
  let total = 0;
  for (const date of Object.keys(s.dayLogs)) total += xpForDay(date, s).net;
  return Math.max(0, total);
}

export function levelInfo(s: State): { level: number; tier: string; tierIndex: number; xpIntoLevel: number; levelXp: number; total: number; isMax: boolean } {
  const total = totalXp(s);
  const level = Math.min(MAX_LEVEL, Math.floor(total / XP_PER_LEVEL));
  const tierIndex = Math.min(TIERS.length - 1, Math.floor(level / LEVELS_PER_TIER));
  return {
    level,
    tier: TIERS[tierIndex],
    tierIndex,
    xpIntoLevel: total % XP_PER_LEVEL,
    levelXp: XP_PER_LEVEL,
    total,
    isMax: level >= MAX_LEVEL,
  };
}

// ── streaks ──────────────────────────────────────────────────────────────
export function dayComplete(date: string, s: State): boolean {
  const { net, possible } = xpForDay(date, s);
  return possible > 0 && net >= possible * DAY_COMPLETE_FRACTION;
}

export function streakInfo(today: Date, s: State): { current: number; best: number } {
  let current = 0;
  const d = new Date(today);
  if (!dayComplete(iso(d), s)) d.setDate(d.getDate() - 1);
  while (dayComplete(iso(d), s)) { current++; d.setDate(d.getDate() - 1); }
  // Best streak across recorded history.
  const dates = Object.keys(s.dayLogs).sort();
  let best = 0, run = 0;
  for (let i = 0; i < dates.length; i++) {
    if (dayComplete(dates[i], s)) { run++; best = Math.max(best, run); }
    else run = 0;
  }
  return { current, best: Math.max(best, current) };
}

// ── actions: check / toggle a block, log bonus / penalty ─────────────────
export function toggleBlock(date: string, id: string, nowMin: number) {
  updateState((s) => {
    const sched = getSchedule(date, s);
    const block = sched.find((b) => b.id === id);
    if (!block) return s;
    if (nowMin < toMin(block.start)) return s; // locked: can't check ahead of its window
    const day = s.dayLogs[date] ?? { checked: [], bonus: [], penalty: [] };
    const has = day.checked.includes(id);
    const checked = has ? day.checked.filter((x) => x !== id) : [...day.checked, id];
    return { ...s, dayLogs: { ...s.dayLogs, [date]: { ...day, checked } } };
  });
}

export function logBonus(date: string, kind: BonusKind) {
  const xp = BONUS_CATALOG.find((b) => b.kind === kind)?.xp ?? 0;
  updateState((s) => {
    const day = s.dayLogs[date] ?? { checked: [], bonus: [], penalty: [] };
    return { ...s, dayLogs: { ...s.dayLogs, [date]: { ...day, bonus: [...day.bonus, { kind, xp, ts: Date.now() }] } } };
  });
}
export function logPenalty(date: string, kind: PenaltyKind) {
  const xp = PENALTY_CATALOG.find((p) => p.kind === kind)?.xp ?? 0;
  updateState((s) => {
    const day = s.dayLogs[date] ?? { checked: [], bonus: [], penalty: [] };
    return { ...s, dayLogs: { ...s.dayLogs, [date]: { ...day, penalty: [...day.penalty, { kind, xp, ts: Date.now() }] } } };
  });
}
export function setReflection(date: string, oneWin: string, improvement: string) {
  updateState((s) => {
    const day = s.dayLogs[date] ?? { checked: [], bonus: [], penalty: [] };
    return { ...s, dayLogs: { ...s.dayLogs, [date]: { ...day, oneWin, improvement } } };
  });
}

// ── calendar events / day-type overrides ─────────────────────────────────
export function setDayType(date: string, mode?: Mode) {
  updateState((s) => {
    const dayTypes = { ...s.dayTypes };
    if (mode) dayTypes[date] = mode;
    else delete dayTypes[date];
    return { ...s, dayTypes };
  });
}
export function cycleDayType(date: string) {
  const cur = loadState().dayTypes[date];
  const idx = cur ? ASSIGNABLE_MODES.indexOf(cur) : -1;
  const next = idx + 1 >= ASSIGNABLE_MODES.length ? undefined : ASSIGNABLE_MODES[idx + 1];
  setDayType(date, next);
}
export function addEvent(ev: Omit<CalendarEvent, "id">): CalendarEvent {
  const full: CalendarEvent = { ...ev, id: g("").id };
  updateState((s) => ({ ...s, events: [...s.events, full] }));
  return full;
}
export function removeEvent(id: string) {
  updateState((s) => ({ ...s, events: s.events.filter((e) => e.id !== id) }));
}

// ── projects ─────────────────────────────────────────────────────────────
export function upsertProject(p: Project) {
  updateState((s) => ({ ...s, projects: s.projects.some((x) => x.id === p.id) ? s.projects.map((x) => x.id === p.id ? p : x) : [...s.projects, p] }));
}
export function removeProject(id: string) {
  updateState((s) => ({ ...s, projects: s.projects.filter((p) => p.id !== id) }));
}

// ── goals ────────────────────────────────────────────────────────────────
export function setGoals(goals: Goals) {
  updateState((s) => ({ ...s, goals }));
}

// ── battlepass ──────────────────────────────────────────────────────────
export function setBattlepassReward(level: number, reward: string) {
  updateState((s) => ({ ...s, battlepass: s.battlepass.map((r) => r.level === level ? { ...r, reward } : r) }));
}
export function prestige() {
  updateState((s) => {
    if (levelInfo(s).level < MAX_LEVEL) return s;
    return { ...s, prestige: s.prestige + 1, dayLogs: {}, seasonStart: iso(new Date()) };
  });
}

// ── achievements ────────────────────────────────────────────────────────
export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-day",       category: "discipline", title: "First Day",        desc: "Complete any day at 70%+ of scheduled XP." },
  { id: "streak-3",        category: "discipline", title: "3-Day Streak",     desc: "Hit a 3-day completion streak." },
  { id: "streak-7",        category: "discipline", title: "Week Lit",         desc: "Hit a 7-day completion streak." },
  { id: "streak-14",       category: "discipline", title: "Two Weeks In",     desc: "Hit a 14-day completion streak." },
  { id: "streak-30",       category: "discipline", title: "Monthly Lock-In",  desc: "Hit a 30-day completion streak." },
  { id: "perfect-day",     category: "discipline", title: "Perfect Day",      desc: "Check every block in a single day." },
  { id: "perfect-week",    category: "discipline", title: "Perfect Week",     desc: "Complete 7 days at 70%+ in a row." },
  { id: "morning-30",      category: "discipline", title: "Morning Reps",     desc: "Check the morning routine 30 times." },
  { id: "bedtime-14",      category: "discipline", title: "Sleep Pro",        desc: "Bedtime by 10 PM for 14 logged days." },

  { id: "focus-25",        category: "learning",   title: "Focused Mind",     desc: "Stack 25 deep focus blocks." },
  { id: "study-50",        category: "learning",   title: "Exam Hardened",    desc: "Complete 50 exam-mode study blocks." },
  { id: "learn-20",        category: "learning",   title: "Curious Type",     desc: "Log 20 vacation learning sessions." },

  { id: "workout-30",      category: "skill",      title: "Iron Habit",       desc: "Log 30 workouts (bonus or scheduled)." },
  { id: "sports-30",       category: "skill",      title: "Sport Stack",      desc: "Log 30 sports sessions." },
  { id: "movement-50",     category: "skill",      title: "Always Moving",    desc: "Hit the 2-minute movement minimum 50 times." },

  { id: "project-1",       category: "project",    title: "Shipped It",       desc: "Complete one full project." },
  { id: "project-3",       category: "project",    title: "Three Down",       desc: "Complete three full projects." },
  { id: "milestone-10",    category: "project",    title: "Mile Markers",     desc: "Log 10 project milestones." },

  { id: "tier-athlete",    category: "special",    title: "Athlete",          desc: "Reach the Athlete tier." },
  { id: "tier-unstoppable",category: "special",    title: "Unstoppable",      desc: "Reach the Unstoppable tier." },
  { id: "tier-dp",         category: "special",    title: "Dude Perfect",     desc: "Reach the Dude Perfect tier." },
  { id: "travel-week",     category: "special",    title: "Road Warrior",     desc: "Use travel mode for 7+ days." },
  { id: "vacation-week",   category: "special",    title: "Vacation Earner",  desc: "Use vacation mode for 7+ days." },
  { id: "exam-week",       category: "special",    title: "Exam Ready",       desc: "Use exam mode for 7+ days." },
  { id: "prestige-1",      category: "special",    title: "Reset & Rise",     desc: "Prestige once." },
  { id: "season-clear",    category: "special",    title: "Season Clear",     desc: "Complete a 30-day season at full streak." },
];

// Recompute achievements from the state and unlock any that aren't yet.
export function refreshAchievements(): { newly: string[] } {
  const s = loadState();
  const newly: string[] = [];
  function unlock(id: string) {
    if (s.unlockedAchievements[id]) return;
    s.unlockedAchievements[id] = Date.now();
    newly.push(id);
  }

  // Counts
  let blockCounts = { morning: 0, focus: 0, study: 0, learn: 0, workout: 0, sports: 0, move: 0, bed: 0 };
  let perfectDay = false;
  const completionDates: string[] = [];
  let travelDays = 0, vacationDays = 0, examDays = 0;

  for (const [date, day] of Object.entries(s.dayLogs)) {
    const sched = getSchedule(date, s);
    const possible = sched.reduce((n, b) => n + b.xp, 0);
    const earned = day.checked.reduce((n, id) => n + (sched.find((b) => b.id === id)?.xp ?? 0), 0);
    if (possible > 0 && earned === possible) perfectDay = true;
    if (dayComplete(date, s)) completionDates.push(date);
    const mode = effectiveMode(date, s).mode;
    if (mode === "travel") travelDays++;
    if (mode === "vacation") vacationDays++;
    if (mode === "exam") examDays++;
    for (const id of day.checked) {
      if (id === "morning") blockCounts.morning++;
      if (id === "focus") blockCounts.focus++;
      if (id.startsWith("study")) blockCounts.study++;
      if (id === "learn") blockCounts.learn++;
      if (id === "workout" || id === "twork" || id === "light") blockCounts.workout++;
      if (id === "sport" || id === "sports") blockCounts.sports++;
      if (id === "move") blockCounts.move++;
      if (id === "bed") blockCounts.bed++;
    }
  }
  const milestones = s.projects.reduce((n, p) => n + (p.milestones || 0), 0);
  const completedProjects = s.projects.filter((p) => p.status === "done").length;

  const today = new Date();
  const { current } = streakInfo(today, s);
  const lv = levelInfo(s);

  if (completionDates.length >= 1) unlock("first-day");
  if (current >= 3) unlock("streak-3");
  if (current >= 7) unlock("streak-7");
  if (current >= 14) unlock("streak-14");
  if (current >= 30) unlock("streak-30");
  if (perfectDay) unlock("perfect-day");
  if (consecutiveCompletions(completionDates) >= 7) unlock("perfect-week");
  if (blockCounts.morning >= 30) unlock("morning-30");
  if (blockCounts.bed >= 14) unlock("bedtime-14");
  if (blockCounts.focus >= 25) unlock("focus-25");
  if (blockCounts.study >= 50) unlock("study-50");
  if (blockCounts.learn >= 20) unlock("learn-20");
  if (blockCounts.workout >= 30) unlock("workout-30");
  if (blockCounts.sports >= 30) unlock("sports-30");
  if (blockCounts.move >= 50) unlock("movement-50");
  if (completedProjects >= 1) unlock("project-1");
  if (completedProjects >= 3) unlock("project-3");
  if (milestones >= 10) unlock("milestone-10");
  if (lv.tier === "Athlete" || lv.tierIndex >= 6) unlock("tier-athlete");
  if (lv.tier === "Unstoppable" || lv.tierIndex >= 8) unlock("tier-unstoppable");
  if (lv.tier === "Dude Perfect" || lv.tierIndex >= 9) unlock("tier-dp");
  if (travelDays >= 7) unlock("travel-week");
  if (vacationDays >= 7) unlock("vacation-week");
  if (examDays >= 7) unlock("exam-week");
  if (s.prestige >= 1) unlock("prestige-1");
  // season clear = current streak >= 30 since season start
  if (current >= 30) unlock("season-clear");

  if (newly.length) {
    updateState((cur) => ({ ...cur, unlockedAchievements: { ...cur.unlockedAchievements, ...Object.fromEntries(newly.map((id) => [id, Date.now()])) } }));
  }
  return { newly };
}

function consecutiveCompletions(dates: string[]): number {
  if (!dates.length) return 0;
  const sorted = [...dates].sort();
  let best = 1, cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T00:00:00");
    const next = new Date(sorted[i] + "T00:00:00");
    const diff = (next.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) { cur++; best = Math.max(best, cur); }
    else cur = 1;
  }
  return best;
}
