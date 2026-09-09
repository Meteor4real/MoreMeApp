// MoreMe state — calendar-first. One localStorage record, occurrence
// resolution for recurring events, per-occurrence XP, the 20-level quadratic
// economy, conflict detection, and rule-based (earnable) achievements.

import type {
  CalEvent, Category, Class, ClassPeriod, CustomAchievement,
  Customization, DayType, DistractionLog, DynamicTab, FitnessKind, FitnessSession, GoalTimeframe, InboxItem, LevelReward,
  Note, Project, Recurrence, Replacement, School, SchoolBlock, SchoolMod, SchoolPath, ScreenCategory,
  ScreenSession, ScreenSettings, State, StatSource, UrgeLog, UrgeResolution,
  Venture, VentureStatus, Widget,
} from "./types";
import { CATEGORY_META, DEFAULT_XP_BY_CATEGORY, FITNESS_KIND_LABEL, MAX_LEVEL, RANK_NAMES, cumulativeXp } from "./types";

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
export const fromMin = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
export const shiftTime = (hhmm: string, deltaMin: number) => fromMin(toMin(hhmm) + deltaMin);
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
  | { kind: "school"; grade: number }                          // in school, in grade, a Mod is actually running
  | { kind: "break"; grade: number }                           // inside the academic year, but no Mod covers today
  | { kind: "summer"; lastGrade: number; goingInto: number }    // summer between two grades
  | { kind: "alumnus"; graduatedYear: number };                 // done, forever

// Compute exactly where you are in your Mount Vernon arc right now. Summer
// is a first-class state; graduation ends the journey in May/June, not in
// the next August. Within the academic-year window, "school" only holds if
// an actual Mod (from the real Mod Schedule) covers today — otherwise it's
// a break (Thanksgiving, winter break, etc.), not silently "in school."
export function gradeStatus(s: State = loadState(), at = new Date()): GradeStatus {
  const lastSchoolEnd = schoolEndOn(s.school.grade9Year + 3); // end of Grade 12
  if (at > lastSchoolEnd) return { kind: "alumnus", graduatedYear: lastSchoolEnd.getFullYear() };

  const sy = schoolYearStart(at);
  const start = schoolStartOn(sy);
  const end = schoolEndOn(sy);
  const grade = 9 + (sy - s.school.grade9Year);

  // Inside the school window of school year sy → check whether a real Mod
  // actually covers today; if mods are tracked but none does, it's a break.
  if (at >= start && at <= end) {
    if (s.schoolMods.length > 0) {
      const d = iso(at);
      const inMod = s.schoolMods.some((m) => d >= m.startDate && d <= m.endDate);
      if (!inMod) return { kind: "break", grade };
    }
    return { kind: "school", grade };
  }

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
  if (g.kind === "school" || g.kind === "break") return g.grade;
  if (g.kind === "summer") return g.goingInto;  // best single-number answer in summer
  return 13;
}
const ordinal = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;
const seniorName = (g: number) => g === 9 ? "Freshman" : g === 10 ? "Sophomore" : g === 11 ? "Junior" : g === 12 ? "Senior" : "";

const withName = (n: number) => { const name = seniorName(n); return name ? ` (${name})` : ""; };
export function gradeLabel(s: State = loadState(), at = new Date()): string {
  const g = gradeStatus(s, at);
  if (g.kind === "alumnus") return `Alumnus · Class of ${g.graduatedYear}`;
  if (g.kind === "school" || g.kind === "break") return `Grade ${g.grade} · ${ordinal(g.grade)}${withName(g.grade)}`;
  return `Summer · Going into ${ordinal(g.goingInto)}${withName(g.goingInto)}`;
}

export function schoolYearLabel(s: State = loadState(), at = new Date()): string {
  const g = gradeStatus(s, at);
  if (g.kind === "alumnus") return `${g.graduatedYear - 1}–${String(g.graduatedYear).slice(2)}`;
  if (g.kind === "school" || g.kind === "break") { const sy = schoolYearStart(at); return `${sy}–${String(sy + 1).slice(2)}`; }
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

// A day's real schedule shape. Explicit override wins; otherwise auto-detect
// from the real Mod Schedule: Sat/Sun -> weekend, a weekday a real Mod
// actually covers -> school, anything else (a weekday with no Mod covering
// it — a break) -> vacation.
export function dayTypeFor(date: string, s: State = loadState()): DayType {
  const override = s.dayTypes[date];
  if (override) return override;
  const d = dow(date);
  if (d === 0 || d === 6) return "weekend";
  const inMod = s.schoolMods.some((m) => date >= m.startDate && date <= m.endDate);
  return inMod ? "school" : "vacation";
}
export function setDayType(date: string, type: DayType | undefined) {
  updateState((s) => {
    const dayTypes = { ...s.dayTypes };
    if (type) dayTypes[date] = type; else delete dayTypes[date];
    return { ...s, dayTypes };
  });
}
export function setSchool(school: Partial<School>) {
  updateState((s) => ({ ...s, school: { ...s.school, ...school } }));
}

// ── school mod schedule ────────────────────────────────────────────────────
// The fixed 30-min block every day carries, per weekday (1=Mon..5=Fri).
// Same every mod — Mount Vernon's structure, not something that changes
// term to term — so it's a constant, not a field you re-enter each mod.
export const SPECIAL_BLOCK_LABEL: Record<number, string> = {
  1: "Clubs", 2: "Advisory", 3: "Chapel", 4: "Clubs", 5: "Flex",
};
export const SPECIAL_BLOCK_TIME = { start: "09:30", end: "10:00" };
const WEEKDAY_ORDER = [1, 2, 3, 4, 5];

export function blankSchoolMod(number: number): SchoolMod {
  const days: Record<number, SchoolBlock[]> = {};
  for (const d of WEEKDAY_ORDER) {
    days[d] = [{
      id: uid(), kind: "special", label: SPECIAL_BLOCK_LABEL[d],
      start: SPECIAL_BLOCK_TIME.start, end: SPECIAL_BLOCK_TIME.end,
    }];
  }
  return { id: uid(), number, label: `Module ${number}`, startDate: today(), endDate: today(), advisor: "", days };
}

// Davis's real Grade 9 Module 1 schedule — Aug 12 to Oct 8, advisor Tyler
// Dale. The 5 periods sit in a different order each weekday (Monday's order
// differs from Tuesday's, etc.), but each weekday's own order is fixed and
// repeats every week — it doesn't drift or reset, so keying blocks by
// weekday (not by some independent "Day N" rotation counter) is correct,
// not a simplification. This is the actual schedule as given, not a guess.
// Seeded once (fresh installs via seedState, existing installs via a
// one-time loadState migration) so it shows up without Davis re-typing 35
// blocks by hand.
function realMod1(): SchoolMod {
  const per = (label: string, teacher: string, room: string, start: string, end: string): SchoolBlock =>
    ({ id: uid(), kind: "period", label, teacher, room, start, end });
  const special = (weekday: number, teacher?: string, room?: string): SchoolBlock =>
    ({ id: uid(), kind: "special", label: SPECIAL_BLOCK_LABEL[weekday], start: SPECIAL_BLOCK_TIME.start, end: SPECIAL_BLOCK_TIME.end, teacher, room });
  const lunch = (kind: "A" | "B", start: string, end: string): SchoolBlock =>
    ({ id: uid(), kind: "lunch", label: `${kind} Lunch`, start, end });

  const P1 = (start: string, end: string) => per("Period 1 · Cultivating Curiosity", "Harris", "S102", start, end);
  const P2 = (start: string, end: string) => per("Period 2 · GTD", "Okeke", "HQ2 4", start, end);
  const P3 = (start: string, end: string) => per("Period 3 · Academic Writing", "Deen", "S201", start, end);
  const P4 = (start: string, end: string) => per("Period 4 · Health", "Martinez", "N206", start, end);
  const P5 = (start: string, end: string) => per("Period 5 · Scientific Inquiry", "Paperno", "B205", start, end);

  const days: Record<number, SchoolBlock[]> = {
    1: [P1("08:15", "09:25"), special(1), P2("10:05", "11:10"), lunch("A", "11:15", "11:45"), P3("11:50", "12:55"), P4("13:00", "14:05"), P5("14:10", "15:15")],
    2: [P2("08:15", "09:25"), special(2, "Mr. Dale", "HQ1 1"), P3("10:05", "11:10"), lunch("A", "11:15", "11:45"), P4("11:50", "12:55"), P5("13:00", "14:05"), P1("14:10", "15:15")],
    3: [P3("08:15", "09:25"), special(3), P4("10:05", "11:10"), lunch("A", "11:15", "11:45"), P5("11:50", "12:55"), P1("13:00", "14:05"), P2("14:10", "15:15")],
    4: [P4("08:15", "09:25"), special(4), P5("10:05", "11:10"), P1("11:15", "12:20"), lunch("B", "12:25", "12:55"), P2("13:00", "14:05"), P3("14:10", "15:15")],
    // Friday: GTD is chronologically the 3rd period of the day, so it
    // splits around lunch (40 min GTD / 30 min lunch / 40 min GTD) instead
    // of sitting wholly before/after it like every other subject. Best-
    // effort clock alignment from the given durations — P3/P4 shifted 5 min
    // later than the other weekdays to fit after GTD's second half; worth
    // double-checking against the real bell schedule.
    5: [
      P5("08:15", "09:25"), special(5), P1("10:05", "11:10"),
      P2("11:15", "11:55"),
      { id: uid(), kind: "lunch", label: "GTD Lunch", start: "11:55", end: "12:25" },
      P2("12:25", "13:05"),
      P3("13:05", "14:10"), P4("14:15", "15:20"),
    ],
  };
  for (const d of WEEKDAY_ORDER) days[d].sort((a, b) => a.start.localeCompare(b.start));
  return { id: uid(), number: 1, label: "Module 1", startDate: "2026-08-12", endDate: "2026-10-08", advisor: "Tyler Dale", days };
}

export function upsertSchoolMod(m: SchoolMod) {
  updateState((s) => ({
    ...s,
    schoolMods: s.schoolMods.some((x) => x.id === m.id) ? s.schoolMods.map((x) => (x.id === m.id ? m : x)) : [...s.schoolMods, m],
  }));
  generateSchoolModEvents(m.id);
}
export function removeSchoolMod(id: string) {
  updateState((s) => ({ ...s, schoolMods: s.schoolMods.filter((m) => m.id !== id) }));
  removeSchoolModEvents(id);
}

// Room -> floor, per the real rule: "Letter(N/S) + Number(floor)". Anything
// else (HQ1/HQ2/MAC/Blackbox/B building/blank) isn't a floor-1-or-3 room.
export function roomFloor(room?: string): number | null {
  const m = /^[NS]\s*(\d)/i.exec((room ?? "").trim());
  return m ? parseInt(m[1], 10) : null;
}
// Floor 1 or 3 -> B Lunch (class first, then lunch). Everything else,
// including unparseable rooms, -> A Lunch (lunch first, then class).
export function lunchKindForRoom(room?: string): "A" | "B" {
  const f = roomFloor(room);
  return f === 1 || f === 3 ? "B" : "A";
}

// Insert a lunch-slot class into a day's blocks: computes A/B Lunch from
// the class's room and inserts the class portion + Lunch block in the
// correct order, replacing any earlier lunch-slot assignment for that day
// (tracked by the "lunchslot-" id prefix, not by time — GTD's split shape
// below doesn't land on the plain A/B times so a time-window filter can't
// find it).
//
// GTD is a real exception: when GTD lands in this slot it doesn't sit
// wholly before or after lunch like every other subject — it splits around
// it, 40 min GTD / 30 min lunch / 40 min GTD. Anchored at the same lunch
// start/end the room's A/B rule would otherwise use.
export function setLunchSlot(modId: string, weekday: number, subject: string, room: string, teacher?: string, linkedClassId?: string) {
  const kind = lunchKindForRoom(room);
  const isGtd = /^gtd\b/i.test(subject.trim());
  const lunchStart = kind === "B" ? "12:25" : "11:15";
  const lunchEnd = kind === "B" ? "12:55" : "11:45";

  let newBlocks: SchoolBlock[];
  if (isGtd) {
    const part1Start = shiftTime(lunchStart, -40);
    const part2End = shiftTime(lunchEnd, 40);
    const gtdBlock = (start: string, end: string): SchoolBlock => ({
      id: `lunchslot-${uid()}`, kind: "period", label: subject.trim(), room: room.trim() || undefined,
      teacher: teacher?.trim() || undefined, linkedClassId: linkedClassId || undefined, start, end,
    });
    newBlocks = [
      gtdBlock(part1Start, lunchStart),
      { id: `lunchslot-${uid()}`, kind: "lunch", label: "GTD Lunch", start: lunchStart, end: lunchEnd },
      gtdBlock(lunchEnd, part2End),
    ];
  } else {
    newBlocks = [
      {
        id: `lunchslot-${uid()}`, kind: "period", label: subject.trim() || "Class", room: room.trim() || undefined,
        teacher: teacher?.trim() || undefined, linkedClassId: linkedClassId || undefined,
        start: kind === "B" ? "11:15" : "11:50", end: kind === "B" ? "12:20" : "12:55",
      },
      { id: `lunchslot-${uid()}`, kind: "lunch", label: `${kind} Lunch`, start: lunchStart, end: lunchEnd },
    ];
  }

  updateState((s) => ({
    ...s,
    schoolMods: s.schoolMods.map((m) => {
      if (m.id !== modId) return m;
      const rest = (m.days[weekday] ?? []).filter((b) => !b.id.startsWith("lunchslot-"));
      const day = [...rest, ...newBlocks].sort((a, b) => a.start.localeCompare(b.start));
      return { ...m, days: { ...m.days, [weekday]: day } };
    }),
  }));
  generateSchoolModEvents(modId);
}

export function addSchoolBlock(modId: string, weekday: number, block: Omit<SchoolBlock, "id">) {
  updateState((s) => ({
    ...s,
    schoolMods: s.schoolMods.map((m) => {
      if (m.id !== modId) return m;
      const day = [...(m.days[weekday] ?? []), { ...block, id: uid() }].sort((a, b) => a.start.localeCompare(b.start));
      return { ...m, days: { ...m.days, [weekday]: day } };
    }),
  }));
  generateSchoolModEvents(modId);
}
export function updateSchoolBlock(modId: string, weekday: number, blockId: string, patch: Partial<SchoolBlock>) {
  updateState((s) => ({
    ...s,
    schoolMods: s.schoolMods.map((m) => {
      if (m.id !== modId) return m;
      const day = (m.days[weekday] ?? []).map((b) => (b.id === blockId ? { ...b, ...patch } : b)).sort((a, b) => a.start.localeCompare(b.start));
      return { ...m, days: { ...m.days, [weekday]: day } };
    }),
  }));
  generateSchoolModEvents(modId);
}
export function removeSchoolBlock(modId: string, weekday: number, blockId: string) {
  updateState((s) => ({
    ...s,
    schoolMods: s.schoolMods.map((m) => {
      if (m.id !== modId) return m;
      return { ...m, days: { ...m.days, [weekday]: (m.days[weekday] ?? []).filter((b) => b.id !== blockId) } };
    }),
  }));
  generateSchoolModEvents(modId);
}

// Lay a mod's blocks onto the calendar as recurring weekly events, one per
// (weekday, block) pair, bounded to the mod's date range. Idempotent —
// re-running replaces the same set. Called automatically after every edit
// to a mod's blocks (see the mutators above) — a Mod's calendar presence is
// a computed function of its data, not a separate manual "publish" step.
const schoolModEventPrefix = (modId: string) => `schoolmod-${modId}-`;
// A period's own label is usually "Period N · Subject" — strip the "Period
// N ·" prefix to get the real subject name for auto-matching a Class, the
// same idea as Canvas's bracketed-course-name matching. Only used as a
// fallback when the block isn't already linked to a Class by hand.
function subjectFromBlockLabel(label: string): string {
  return label.replace(/^Period\s+\d+\s*·\s*/i, "").trim();
}
export function generateSchoolModEvents(modId: string) {
  updateState((s) => {
    const m = s.schoolMods.find((x) => x.id === modId);
    if (!m) return s;
    const prefix = schoolModEventPrefix(modId);
    const kept = s.events.filter((e) => !e.id.startsWith(prefix));
    let classes = s.classes;
    const classByName = new Map(classes.map((c) => [c.name.toLowerCase(), c]));
    const generated: CalEvent[] = [];
    for (const weekday of WEEKDAY_ORDER) {
      for (const b of m.days[weekday] ?? []) {
        let linkedClassId = b.kind === "period" ? b.linkedClassId : undefined;
        if (b.kind === "period" && !linkedClassId) {
          const subject = subjectFromBlockLabel(b.label);
          if (subject) {
            const key = subject.toLowerCase();
            let cls = classByName.get(key);
            if (!cls) {
              cls = { id: uid(), name: subject, teacher: b.teacher, room: b.room };
              classes = [...classes, cls];
              classByName.set(key, cls);
            }
            linkedClassId = cls.id;
          }
        }
        generated.push({
          id: `${prefix}${weekday}-${b.id}`,
          title: b.label, category: b.kind === "lunch" ? "personal" : "class",
          date: m.startDate, until: m.endDate, allDay: false, start: b.start, end: b.end,
          location: b.room, linkedClassId,
          checklist: [], priority: "normal", visibility: "visible",
          recurrence: { kind: "weekly", days: [weekday] }, reminders: [],
          xp: b.kind === "period" ? 5 : 0, status: "planned", createdAt: Date.now(),
        });
      }
    }
    return { ...s, events: [...kept, ...generated], classes };
  });
}
export function removeSchoolModEvents(modId: string) {
  const prefix = schoolModEventPrefix(modId);
  updateState((s) => ({ ...s, events: s.events.filter((e) => !e.id.startsWith(prefix)) }));
}
export function schoolModEventsApplied(modId: string, s: State): boolean {
  const prefix = schoolModEventPrefix(modId);
  return s.events.some((e) => e.id.startsWith(prefix));
}

// No default routines — the user defines their own from the Calendar /
// event editor. Blank canvas on first launch.
function seedRoutines(_start: string): CalEvent[] {
  return [];
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
    schoolMods: [realMod1()],
    events: [],
    completions: {},
    projects: [],
    ventures: seedVentures(),
    inbox: [],
    classes: seedClasses(),
    distractions: [],
    screenSessions: [],
    urges: [],
    replacements: seedReplacements(),
    screen: seedScreenSettings(),
    fitnessSessions: [],
    customization: seedCustomization(),
    rewards: Array.from({ length: MAX_LEVEL }, (_, i) => ({ level: i + 1, reward: "" })),
    unlockedAchievements: {},
    startedAt: Date.now(),
    dayTypes: {},
    integrations: { canvas: {}, veracross: {}, google: {}, canvasApi: {} },
  };
}

function seedCustomization(): Customization {
  return {
    tabLabels: {},
    hiddenTabs: [],
    customRanks: Array.from({ length: MAX_LEVEL }, () => undefined),
    customAchievements: [],
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
      // One-time migration: Goals used to be their own week/semester/year/
      // identity buckets; each Goal becomes a Project tagged with a
      // timeframe. Reading the legacy shape off the raw parsed JSON since
      // State no longer declares `goals` at all — once this runs, the field
      // is gone from the next save and this branch never fires again.
      const legacyGoals = (p as unknown as { goals?: Record<string, { id: string; text: string; done?: boolean }[]> }).goals;
      let migratedProjects = p.projects ?? d.projects;
      if (legacyGoals) {
        const timeframeFor: Record<string, GoalTimeframe> = { week: "Week", semester: "Semester", year: "Year", identity: "Beyond" };
        const fromGoals: Project[] = [];
        for (const [bucket, list] of Object.entries(legacyGoals)) {
          for (const g of list ?? []) {
            fromGoals.push({ id: g.id, name: g.text, kind: "", status: g.done ? "done" : "active", milestones: [], timeframe: timeframeFor[bucket] });
          }
        }
        migratedProjects = [...migratedProjects, ...fromGoals];
      }
      cache = {
        schemaVersion: 12,
        school: p.school ?? d.school,
        // undefined (field never existed on this install) -> seed the real
        // Mod 1; an explicit [] (the user cleared it themselves) stays [].
        schoolMods: p.schoolMods ?? d.schoolMods,
        events: p.events ?? d.events,
        completions: p.completions ?? {},
        projects: migratedProjects,
        ventures: (p.ventures ?? d.ventures).map((v) => ({ ...v, roadmap: v.roadmap ?? [] })),
        inbox: p.inbox ?? [],
        notes: p.notes ?? [],
        classes: p.classes ?? d.classes,
        distractions: p.distractions ?? [],
        screenSessions: p.screenSessions ?? [],
        urges: p.urges ?? [],
        replacements: p.replacements ?? d.replacements,
        screen: { ...d.screen, ...(p.screen ?? {}) },
        fitnessSessions: p.fitnessSessions ?? [],
        // Customization (v11+) — back-fill cleanly for existing installs.
        customization: mergeCustomization(d.customization, p.customization),
        rewards: p.rewards && p.rewards.length === MAX_LEVEL ? p.rewards : d.rewards,
        unlockedAchievements: p.unlockedAchievements ?? {},
        startedAt: p.startedAt ?? Date.now(),
        parentCode: p.parentCode,
        dayTypes: p.dayTypes ?? {},
        // Per-key backfill (not a blanket ?? on the whole object) so an
        // install saved before the Google Calendar source existed doesn't
        // end up with integrations.google undefined.
        integrations: {
          canvas: p.integrations?.canvas ?? {},
          veracross: p.integrations?.veracross ?? {},
          google: p.integrations?.google ?? {},
          canvasApi: p.integrations?.canvasApi ?? {},
        },
      };
    } else cache = seedState();
  } catch { cache = seedState(); }
  ensureDefaultSchedule();
  return cache;
}

// Weekday and Weekend routines run indefinitely and aren't tied to a trip,
// so there's no reason to make you click "Apply" to get your own real
// routine onto your own calendar — they go live the first time state ever
// loads. (Beach/Anywhere stay manual: they're bounded to a date range you
// pick, because they only make sense once an actual trip is happening.)
// Runs at most once per install (SCHEDULE_AUTOSEED_KEY) — an explicit
// removal afterward ("Remove from calendar") sticks instead of reappearing.
const SCHEDULE_AUTOSEED_KEY = "moreme.schedule.autoseed.v1";
const SCHEDULE_ANCHOR_DATE = "2020-01-01"; // arbitrary far-past anchor so "indefinite" really means it
function ensureDefaultSchedule() {
  if (!cache) return;
  try {
    // Publishing a Mod's blocks is NOT gated behind the once-only flag below
    // — it's cheap and idempotent, so this just checks "does every Mod with
    // real blocks actually have calendar events" on every single load and
    // fixes it if not. That guards against the one-time routine seed below
    // ever failing partway through and never reaching the flag write, which
    // would otherwise leave a real Mod's periods permanently missing from
    // the calendar with nothing to self-heal it.
    for (const m of cache.schoolMods) {
      const hasBlocks = Object.values(m.days).some((day) => (day?.length ?? 0) > 0);
      if (hasBlocks && !schoolModEventsApplied(m.id, cache)) generateSchoolModEvents(m.id);
    }
    if (localStorage.getItem(SCHEDULE_AUTOSEED_KEY)) return;
    if (!routineTemplateApplied("weekday", cache)) applyRoutineTemplate("weekday", SCHEDULE_ANCHOR_DATE);
    if (!routineTemplateApplied("weekend", cache)) applyRoutineTemplate("weekend", SCHEDULE_ANCHOR_DATE);
    localStorage.setItem(SCHEDULE_AUTOSEED_KEY, "1");
  } catch { /* ignore — best-effort default, never block loading state over it */ }
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
// Canvas confirming a real submission counts as done everywhere isDone is
// used — XP, streaks, Get Ahead %, the strikethrough on the calendar block
// — same as ticking it off by hand. It's not self-reported; Canvas already
// verified it actually went in, so there's nothing dishonest about crediting
// it automatically. The checkbox becomes a no-op once this is true (Canvas's
// record wins over an accidental un-check).
export function isDone(e: CalEvent, date: string, s: State = loadState()): boolean {
  if (e.canvasSubmittedAt) return true;
  return s.completions[ck(e.id, date)] != null;
}

// ── per-class color coding ──────────────────────────────────────────────
// Every class gets a distinct, stable color automatically (by its position
// in your class list) so school items read at a glance instead of every
// one being the same generic "school work" blue — Class.color overrides it
// if you'd rather pick your own.
const CLASS_COLOR_PALETTE = [
  "#33B5FF", "#FF8A3E", "#A855F7", "#4ADE80", "#FFD23E",
  "#FF5577", "#22D3EE", "#F97316", "#EC4899", "#8B95A5",
];
export function classColor(classId: string | undefined, s: State = loadState()): string | undefined {
  if (!classId) return undefined;
  const idx = s.classes.findIndex((c) => c.id === classId);
  if (idx < 0) return undefined;
  return s.classes[idx].color || CLASS_COLOR_PALETTE[idx % CLASS_COLOR_PALETTE.length];
}
// The color to actually render an event with — its linked class's color
// when it has one, otherwise the plain category color.
export function eventColor(e: CalEvent, s: State = loadState()): string {
  return classColor(e.linkedClassId, s) ?? CATEGORY_META[e.category].color;
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

// ── logging streak (honesty, not output) ────────────────────────────────────
// A day "logged" is a day you told the app something real about yourself —
// a screen session, an urge, or a school item's help marked honestly —
// regardless of whether the day itself went well. Deliberately separate from
// the routine-completion streak above: that one rewards doing things, this
// one just tracks whether you're bothering to write down the truth. No XP,
// no reward tied to it anywhere — it's shown because an accurate Insights
// tab and an honest Weekly Review only work if the logs are real, and that's
// worth seeing at a glance.
function dayLogged(date: string, s: State): boolean {
  if (s.screenSessions.some((x) => x.date === date)) return true;
  if (s.urges.some((x) => x.date === date)) return true;
  return s.events.some((e) => e.category === "school" && e.date === date && e.helpUsed && isDone(e, date, s));
}
export function loggingStreakInfo(s: State = loadState()): { current: number; best: number; totalDays: number } {
  let current = 0;
  let d = today();
  if (!dayLogged(d, s)) d = addDays(d, -1);
  while (dayLogged(d, s)) { current++; d = addDays(d, -1); }
  const dates = new Set<string>();
  for (const x of s.screenSessions) dates.add(x.date);
  for (const x of s.urges) dates.add(x.date);
  for (const e of s.events) if (e.category === "school" && e.helpUsed && isDone(e, e.date, s)) dates.add(e.date);
  const sorted = [...dates].sort();
  let best = current, run = 0, prev = "";
  for (const day of sorted) {
    if (!dayLogged(day, s)) { run = 0; prev = day; continue; }
    run = prev && addDays(prev, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return { current, best, totalDays: dates.size };
}

// ── event CRUD ──────────────────────────────────────────────────────────────
export const blankEvent = (date: string): CalEvent => ({
  id: uid(), title: "", category: "personal", date, allDay: false,
  start: "09:00", end: "10:00", checklist: [], priority: "normal",
  visibility: "visible", recurrence: { kind: "none" }, reminders: [], xp: DEFAULT_XP_BY_CATEGORY.personal,
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
export const blankProject = (kind = ""): Project => ({
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

// ── routine templates ─────────────────────────────────────────────────────
// Real routine content, carried over from the original More_Me site
// (js/routines.js) into actual CalEvents instead of a static reference page.
// Nothing is auto-seeded — these only land on the calendar when you apply a
// template yourself, same as generateClassPeriods. "Bounded" templates
// (beach / anywhere) run for a date range you pick, meant for an actual trip
// — everything else runs indefinitely until you remove it, same as any
// other recurring routine.
export type RoutineTemplateId = "weekday" | "weekend" | "beach" | "anywhere";
type RoutineTemplateItem = {
  slug: string;
  title: string;
  category: Category;
  start: string;
  end: string;
  recurrence: Recurrence;
  checklist: string[];
};
export const ROUTINE_TEMPLATES: Record<RoutineTemplateId, { label: string; blurb: string; bounded: boolean; items: RoutineTemplateItem[] }> = {
  weekday: {
    label: "Weekday routine",
    blurb: "Morning + night anchors, plus a 3-day/week training split (Mon strength & basketball, Wed jog, Fri mixed). Runs indefinitely until you remove it.",
    bounded: false,
    items: [
      { slug: "morning", title: "Morning routine", category: "routine", start: "06:30", end: "06:40", recurrence: { kind: "weekdays" },
        checklist: ["Drink water", "Stretch (2–3 min)", "Quick movement — push-ups, squats, or a walk", "Set top 3 goals", "Deep breaths"] },
      { slug: "mon-strength", title: "Strength + Basketball", category: "fitness", start: "16:00", end: "17:00", recurrence: { kind: "weekly", days: [1] },
        checklist: ["Push-ups 3×8–12", "Squats 3×12–15", "Plank 3×20–30s", "Lunges 2×10 each leg", "Basketball"] },
      { slug: "wed-cardio", title: "Jog / cardio", category: "fitness", start: "16:00", end: "16:30", recurrence: { kind: "weekly", days: [3] },
        checklist: ["10–20 min jog or fast walk", "or 30s run / 30s walk ×10"] },
      { slug: "fri-mixed", title: "Mixed / any sport", category: "fitness", start: "16:00", end: "17:00", recurrence: { kind: "weekly", days: [5] },
        checklist: ["Jumping jacks 2×30", "Mountain climbers 2×20", "Sit-ups 3×10–15", "Stretch + cool down", "Any sport"] },
      { slug: "night", title: "Night routine", category: "routine", start: "21:40", end: "22:00", recurrence: { kind: "daily" },
        checklist: ["Check off what you completed today", "Note one thing to improve tomorrow", "Celebrate one win", "Light stretching or slow breathing", "Set clothes out for tomorrow", "Lights out at 10:00 MAX", "Screens and loud things off"] },
    ],
  },
  weekend: {
    label: "Weekend routine",
    blurb: "Saturday strength circuit + sports block in the morning, schoolwork and a room reset in the afternoon, then the rest of the weekend is protected for friends — Saturday afternoon/evening and Sunday midday are game-like-crazy time, before Sunday's light reset + planning. Runs indefinitely until you remove it.",
    bounded: false,
    items: [
      { slug: "sat-morning", title: "Saturday strength + sports", category: "fitness", start: "09:00", end: "11:00", recurrence: { kind: "weekly", days: [6] },
        checklist: ["Warm-up 3 min", "Push-ups 3×10–15", "Squats 3×15–20", "Plank 3×30–45s", "Mountain climbers 2×20", "Healthy breakfast", "Sports 1–2 hours — basketball, soccer, running, biking, tennis…"] },
      { slug: "sat-schoolwork", title: "Saturday schoolwork + reset", category: "school", start: "11:30", end: "12:30", recurrence: { kind: "weekly", days: [6] },
        checklist: ["Schoolwork 30–45 min — Khan Academy, NoRedInk, Acton goals", "Reset space — clean room, organize backpack, clothes for next week"] },
      { slug: "sat-friends", title: "Friends & gaming", category: "personal", start: "14:00", end: "20:00", recurrence: { kind: "weekly", days: [6] },
        checklist: ["This is the priority, not an afterthought", "Get on with friends — game, call, hang out, whatever's fun", "Gaming only after the day's main goals are done"] },
      { slug: "sun-morning", title: "Sunday morning", category: "routine", start: "08:00", end: "08:30", recurrence: { kind: "weekly", days: [0] },
        checklist: ["Light movement — walk, stretch, easy jog", "Breakfast + hydration"] },
      { slug: "sun-friends", title: "Friends & gaming", category: "personal", start: "12:00", end: "15:30", recurrence: { kind: "weekly", days: [0] },
        checklist: ["Get on with friends — game, call, hang out", "School week's coming — enjoy this while it's here"] },
      { slug: "sun-reset", title: "Sunday reset + planning", category: "personal", start: "16:00", end: "16:30", recurrence: { kind: "weekly", days: [0] },
        checklist: ["Weekly planning — goals for the week, school calendar", "Optional workout — short run / bodyweight / basketball", "No gaming past 9 PM", "Bedtime routine"] },
    ],
  },
  beach: {
    label: "Beach routine",
    blurb: "Morning beach walk/jog, midday activity, afternoon downtime, sunset walk. Runs for the date range you pick — this one's for an actual trip.",
    bounded: true,
    items: [
      { slug: "morning", title: "Beach walk or jog", category: "fitness", start: "08:00", end: "08:30", recurrence: { kind: "daily" }, checklist: ["Beach walk or jog", "Stretching"] },
      { slug: "midday", title: "Beach midday", category: "fitness", start: "11:00", end: "12:30", recurrence: { kind: "daily" },
        checklist: ["Biking, tennis, or a light bodyweight workout", "Sand sprints, swimming, frisbee, volleyball, or shell-hunting"] },
      { slug: "afternoon", title: "Beach afternoon", category: "personal", start: "14:00", end: "15:30", recurrence: { kind: "daily" },
        checklist: ["Reading or learning", "Project time", "Hydrate — super important at the beach"] },
      { slug: "evening", title: "Sunset walk", category: "fitness", start: "19:30", end: "20:00", recurrence: { kind: "daily" },
        checklist: ["Sunset walk", "1 hour gaming max", "Early sleep — beach air knocks you out"] },
    ],
  },
  anywhere: {
    label: "Anywhere / travel routine",
    blurb: "A universal travel workout, explore-on-foot habit, a little schoolwork, and an evening wind-down, wherever you are. Runs for the date range you pick.",
    bounded: true,
    items: [
      { slug: "morning", title: "Universal travel workout", category: "fitness", start: "08:00", end: "08:20", recurrence: { kind: "daily" },
        checklist: ["15 squats", "10 push-ups", "20 jumping jacks", "30-second plank", "Repeat 2–3 times"] },
      { slug: "explore", title: "Walk everywhere", category: "personal", start: "12:00", end: "12:30", recurrence: { kind: "daily" },
        checklist: ["Explore the area on foot", "Stairs, parks, hotel gym if there is one"] },
      { slug: "afternoon", title: "Travel afternoon", category: "school", start: "15:00", end: "15:50", recurrence: { kind: "daily" },
        checklist: ["20–30 minutes of schoolwork, if possible", "20 minutes of project work, if possible", "Journal one thing you noticed about the place"] },
      { slug: "evening", title: "Travel evening", category: "routine", start: "20:30", end: "21:00", recurrence: { kind: "daily" },
        checklist: ["Light stretching", "1 hour gaming max", "Sleep on time"] },
    ],
  },
};

const routineTemplateEventId = (tmpl: RoutineTemplateId, slug: string) => `tmpl-${tmpl}-${slug}`;

// Idempotent, same shape as generateClassPeriods: re-applying updates the
// same events (and keeps whatever checklist progress you'd already
// checked off) instead of stacking duplicates.
export function applyRoutineTemplate(tmpl: RoutineTemplateId, startDate: string, untilDate?: string) {
  const def = ROUTINE_TEMPLATES[tmpl];
  updateState((s) => {
    let events = s.events;
    for (const item of def.items) {
      const id = routineTemplateEventId(tmpl, item.slug);
      const existing = events.find((e) => e.id === id);
      const ev: CalEvent = {
        id, title: item.title, category: item.category, date: startDate,
        until: def.bounded ? untilDate : undefined,
        allDay: false, start: item.start, end: item.end,
        checklist: existing?.checklist ?? item.checklist.map((t) => ({ id: uid(), text: t, done: false })),
        priority: "normal", visibility: "visible", recurrence: item.recurrence,
        reminders: [], xp: item.category === "fitness" ? 25 : 15,
        status: "planned", createdAt: existing?.createdAt ?? Date.now(),
      };
      events = existing ? events.map((e) => (e.id === id ? ev : e)) : [...events, ev];
    }
    return { ...s, events };
  });
}
export function removeRoutineTemplate(tmpl: RoutineTemplateId) {
  updateState((s) => ({ ...s, events: s.events.filter((e) => !e.id.startsWith(`tmpl-${tmpl}-`)) }));
}
export function routineTemplateApplied(tmpl: RoutineTemplateId, s: State): boolean {
  return s.events.some((e) => e.id.startsWith(`tmpl-${tmpl}-`));
}

// ── external calendar feeds (Canvas, Veracross) ────────────────────────────
// Private per-student .ics subscription URLs, pasted in once. Fetched over
// window.hub.net (main-process fetch — no CORS issue) and parsed with the
// small reader in ./ics. Idempotent: each imported event's id is derived
// from the feed's own UID, so re-syncing updates in place instead of
// duplicating, and your honesty-log fields survive a re-sync.
export type IcsSource = "canvas" | "veracross" | "google";

export function setIcsUrl(source: IcsSource, url: string) {
  updateState((s) => ({
    ...s,
    integrations: { ...s.integrations, [source]: { ...s.integrations[source], url: url.trim() || undefined } },
  }));
}
export function clearIcsFeed(source: IcsSource) {
  updateState((s) => ({
    ...s,
    events: s.events.filter((e) => !e.id.startsWith(`${source}-`)),
    integrations: { ...s.integrations, [source]: {} },
  }));
}

const ICS_CATEGORY: Record<IcsSource, Category> = { canvas: "school", veracross: "class", google: "personal" };

// Canvas's own .ics feed suffixes every assignment/event title with its
// course in brackets — "Reading Quiz 1 [English 9]" — so the course name is
// already sitting right there. Strip it for display and use it to link the
// event to a Class, auto-creating one the first time a course is seen.
function splitCanvasCourse(rawTitle: string): { title: string; course?: string } {
  const m = /^(.*)\s\[([^[\]]+)\]\s*$/.exec(rawTitle);
  if (!m) return { title: rawTitle };
  return { title: m[1].trim(), course: m[2].trim() };
}

export async function syncIcsFeed(source: IcsSource): Promise<{ ok: boolean; count?: number; error?: string }> {
  const url = loadState().integrations[source]?.url;
  if (!url) return { ok: false, error: "No URL set." };
  if (typeof window === "undefined" || !window.hub?.net) return { ok: false, error: "Not available outside the desktop app." };
  const fetchUrl = url.replace(/^webcal:\/\//i, "https://");
  const res = await window.hub.net({ method: "GET", url: fetchUrl, headers: { Accept: "text/calendar, text/plain, */*" } });
  if (!res.ok || typeof res.data !== "string") {
    const err = res.error || `Feed request failed (status ${res.status}).`;
    updateState((s) => ({ ...s, integrations: { ...s.integrations, [source]: { ...s.integrations[source], lastError: err } } }));
    return { ok: false, error: err };
  }
  const { parseIcs } = await import("./ics");
  let items: ReturnType<typeof parseIcs>;
  try { items = parseIcs(res.data); }
  catch {
    const err = "Feed didn't parse as a calendar (.ics) file.";
    updateState((s) => ({ ...s, integrations: { ...s.integrations, [source]: { ...s.integrations[source], lastError: err } } }));
    return { ok: false, error: err };
  }
  const category = ICS_CATEGORY[source];
  updateState((s) => {
    let events = s.events;
    let classes = s.classes;
    const classByName = new Map(classes.map((c) => [c.name.toLowerCase(), c]));
    for (const it of items) {
      const id = `${source}-${it.uid.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || uid()}`;
      const existing = events.find((e) => e.id === id);

      let title = it.summary;
      let linkedClassId = existing?.linkedClassId;
      if (source === "canvas") {
        const split = splitCanvasCourse(it.summary);
        title = split.title;
        // Only auto-link if nothing's linked yet — a link the user cleared
        // by hand (or set to a different class) stays that way on re-sync.
        if (!linkedClassId && split.course) {
          const key = split.course.toLowerCase();
          let cls = classByName.get(key);
          if (!cls) {
            cls = { id: uid(), name: split.course };
            classes = [...classes, cls];
            classByName.set(key, cls);
          }
          linkedClassId = cls.id;
        }
      }

      const ev: CalEvent = {
        id, title, category, date: it.date,
        until: it.endDate, allDay: it.allDay,
        start: it.start, end: it.end,
        location: it.location,
        notes: it.description,
        linkedClassId,
        checklist: existing?.checklist ?? [],
        priority: "normal", visibility: "visible", recurrence: { kind: "none" },
        reminders: existing?.reminders ?? [],
        xp: existing?.xp ?? DEFAULT_XP_BY_CATEGORY[category],
        status: existing?.status ?? "planned",
        createdAt: existing?.createdAt ?? Date.now(),
        // Honesty-log fields are the user's own reflection — a re-sync from
        // the feed must never clobber them.
        prepared: existing?.prepared, helpUsed: existing?.helpUsed, learned: existing?.learned,
        externalSource: source,
      };
      events = existing ? events.map((e) => (e.id === id ? ev : e)) : [...events, ev];
    }
    return {
      ...s, events, classes,
      integrations: { ...s.integrations, [source]: { url, lastSyncAt: Date.now(), lastCount: items.length, lastError: undefined } },
    };
  });
  return { ok: true, count: items.length };
}

// ── Canvas REST API (submission status, real course/teacher names) ────────
// A superset of the .ics feed above — see CanvasApiState in types.ts for
// why. The token is only ever stored in local state (this machine's
// localStorage) and only ever sent to the configured Canvas domain over
// window.hub.net (main-process fetch); it's never written to any file this
// app commits.
export function setCanvasApiToken(domain: string, token: string) {
  const d = domain.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  const t = token.trim();
  updateState((s) => ({
    ...s,
    integrations: { ...s.integrations, canvasApi: { ...s.integrations.canvasApi, domain: d || undefined, token: t || undefined } },
  }));
  // The API can do everything the .ics feed did and more — having both
  // active would double-import every assignment under two different id
  // schemes. Drop the old feed once a real token is set.
  if (d && t && loadState().integrations.canvas.url) clearIcsFeed("canvas");
}
export function clearCanvasApi() {
  updateState((s) => ({
    ...s,
    events: s.events.filter((e) => !e.id.startsWith("canvas-api-")),
    integrations: { ...s.integrations, canvasApi: {} },
  }));
}

type CanvasCourse = { id: number; name?: string; course_code?: string; teachers?: { display_name?: string }[] };
type CanvasAssignment = { id: number; name: string; due_at: string | null; submission?: { submitted_at?: string | null } };

export async function syncCanvasApi(): Promise<{ ok: boolean; courses?: number; assignments?: number; error?: string }> {
  const { domain, token } = loadState().integrations.canvasApi;
  if (!domain || !token) return { ok: false, error: "No Canvas API token set." };
  if (typeof window === "undefined" || !window.hub?.net) return { ok: false, error: "Not available outside the desktop app." };

  const base = `https://${domain}/api/v1`;
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };
  const fail = (err: string) => {
    updateState((s) => ({ ...s, integrations: { ...s.integrations, canvasApi: { ...s.integrations.canvasApi, lastError: err } } }));
    return { ok: false, error: err };
  };

  const coursesRes = await window.hub.net({ method: "GET", url: `${base}/courses?enrollment_state=active&include[]=teachers&per_page=100`, headers });
  if (!coursesRes.ok || !Array.isArray(coursesRes.data)) {
    return fail(coursesRes.error || `Course list request failed (status ${coursesRes.status}).`);
  }
  const courses = coursesRes.data as CanvasCourse[];

  // Match/create a Class per course — canvasCourseId is the stable key once
  // set; falls back to a name match so a class you already created by hand
  // gets adopted instead of duplicated. Teacher only backfills an empty
  // field — never overwrites one you've set yourself.
  updateState((s) => {
    let classes = s.classes;
    for (const course of courses) {
      const name = (course.name || course.course_code || "").trim();
      if (!name) continue;
      const courseId = String(course.id);
      const teacher = course.teachers?.[0]?.display_name?.trim();
      const existing = classes.find((c) => c.canvasCourseId === courseId) ?? classes.find((c) => c.name.toLowerCase() === name.toLowerCase());
      if (!existing) {
        classes = [...classes, { id: uid(), name, canvasCourseId: courseId, teacher }];
      } else {
        classes = classes.map((c) => (c.id === existing.id ? { ...c, canvasCourseId: courseId, teacher: c.teacher || teacher } : c));
      }
    }
    return { ...s, classes };
  });

  let assignmentCount = 0;
  const errors: string[] = [];
  for (const course of courses) {
    const asgRes = await window.hub.net({
      method: "GET",
      url: `${base}/courses/${course.id}/assignments?include[]=submission&order_by=due_at&per_page=100`,
      headers,
    });
    if (!asgRes.ok || !Array.isArray(asgRes.data)) {
      errors.push(`${course.name || course.id}: ${asgRes.error || `status ${asgRes.status}`}`);
      continue;
    }
    const assignments = asgRes.data as CanvasAssignment[];
    updateState((s) => {
      const cls = s.classes.find((c) => c.canvasCourseId === String(course.id));
      let events = s.events;
      for (const a of assignments) {
        if (!a.due_at) continue; // no due date -> nothing honest to put on a calendar
        const due = new Date(a.due_at);
        const id = `canvas-api-${a.id}`;
        const existing = events.find((e) => e.id === id);
        const dueMin = due.getHours() * 60 + due.getMinutes();
        const ev: CalEvent = {
          id, title: a.name, category: "school", date: iso(due),
          allDay: false, start: fromMin(dueMin), end: fromMin(Math.min(23 * 60 + 59, dueMin + 15)),
          notes: existing?.notes,
          linkedClassId: cls?.id ?? existing?.linkedClassId,
          checklist: existing?.checklist ?? [],
          priority: "normal", visibility: "visible", recurrence: { kind: "none" },
          reminders: existing?.reminders ?? [],
          xp: existing?.xp ?? DEFAULT_XP_BY_CATEGORY.school,
          status: existing?.status ?? "planned",
          createdAt: existing?.createdAt ?? Date.now(),
          // Honesty-log fields are the user's own reflection — a re-sync must never clobber them.
          prepared: existing?.prepared, helpUsed: existing?.helpUsed, learned: existing?.learned,
          externalSource: "canvas",
          canvasSubmittedAt: a.submission?.submitted_at ? new Date(a.submission.submitted_at).getTime() : undefined,
        };
        events = existing ? events.map((e) => (e.id === id ? ev : e)) : [...events, ev];
        assignmentCount++;
      }
      return { ...s, events };
    });
  }

  updateState((s) => ({
    ...s,
    integrations: {
      ...s.integrations,
      canvasApi: {
        ...s.integrations.canvasApi,
        lastSyncAt: Date.now(),
        lastCourseCount: courses.length,
        lastAssignmentCount: assignmentCount,
        lastError: errors.length ? errors.slice(0, 3).join("; ") : undefined,
      },
    },
  }));

  return { ok: true, courses: courses.length, assignments: assignmentCount };
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
  id: uid(), name: "", status: "idea", revenue: [], createdAt: Date.now(), roadmap: [],
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
export function inboxToProject(item: InboxItem, timeframe?: GoalTimeframe) {
  upsertProject({ ...blankProject(), name: item.text, timeframe });
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

// ── Parent code ─────────────────────────────────────────────────────────
// A 4-digit code a parent holds, gating screen-budget numbers and adding
// level rewards. Not real security (it's local state) — it's a friction
// point so a kid can't quietly self-buff, and a promise the parent can
// reset without the kid's cooperation.
export function hasParentCode(s: State = loadState()): boolean {
  return !!s.parentCode;
}
export function checkParentCode(code: string, s: State = loadState()): boolean {
  return !!s.parentCode && s.parentCode === code;
}
// Set a new code. If one is already set, `currentCode` must match it first
// (a parent resets it themselves — the whole point). Returns false on a
// wrong/missing current code, true on success.
export function setParentCode(newCode: string, currentCode?: string): boolean {
  const s = loadState();
  if (s.parentCode && s.parentCode !== currentCode) return false;
  updateState((st) => ({ ...st, parentCode: newCode }));
  return true;
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

// ── fitness logging ────────────────────────────────────────────────────────
// Real numbers, not a checkbox: what you did, how long, distance if it
// applies. Same log-it-after shape as screens.
export function fitnessSessionsOn(date: string, s: State = loadState()): FitnessSession[] {
  return s.fitnessSessions.filter((x) => x.date === date).sort((a, b) => b.startedAt - a.startedAt);
}
export function fitnessMinutesOn(date: string, s: State = loadState()): number {
  return fitnessSessionsOn(date, s).reduce((sum, x) => sum + x.minutes, 0);
}
export function logFitnessSession(kind: FitnessKind, what: string, minutes: number, opts?: { distanceMi?: number; details?: string; onDate?: string }): FitnessSession {
  const date = opts?.onDate ?? today();
  const x: FitnessSession = {
    id: uid(), date, startedAt: Date.parse(date + "T12:00:00") || Date.now(),
    kind, what: what.trim() || FITNESS_KIND_LABEL[kind], minutes: Math.max(0, Math.round(minutes)),
    distanceMi: opts?.distanceMi && opts.distanceMi > 0 ? opts.distanceMi : undefined,
    details: opts?.details?.trim() || undefined,
  };
  updateState((s) => ({ ...s, fitnessSessions: [...s.fitnessSessions, x] }));
  refreshAchievements();
  return x;
}
export function removeFitnessSession(id: string) {
  updateState((s) => ({ ...s, fitnessSessions: s.fitnessSessions.filter((x) => x.id !== id) }));
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

// ── distractions / rewards ──────────────────────────────────────────────────
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
  id: uid(), title: "", desc: "", xp: 0,
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
  category: "discipline" | "school" | "build" | "social" | "level" | "special" | "fitness";
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
  longFlowDone: boolean;           // a single event >=180min completed in one sitting (F.L.O.W.)
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
  routineFirstDays: number;        // days morning routine completed before first session
  earnedItDays: number;            // days with ≥1 routine done AND under budget
  // ── school integrity ──────────────────────────────────────────────────
  schoolPrepared: number;          // completed school items with prepared=true
  schoolAllYours: number;          // completed school items with helpUsed === "none"
  schoolHonestlyLogged: number;    // completed school items with helpUsed set (any value)
  loggingStreakBest: number;       // longest run of consecutive days with any real log
  loggingDaysTotal: number;        // distinct days with any real log, total
  // ── fitness ───────────────────────────────────────────────────────────
  fitnessCount: number;            // total completed fitness-category occurrences
  fitnessDaysTotal: number;        // distinct days with ≥1 fitness completion
  fitnessStreak: number;           // longest run of consecutive days with a fitness completion
  longFitnessDone: boolean;        // a single fitness item completed with ≥45min logged
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
  // Fitness days start seeded from logged sessions (real numbers, not just a
  // scheduled checkbox) — the completions loop below adds fitness-category
  // CalEvent days on top, so both the routine templates and the fast logger
  // feed the same achievement track.
  const fitnessDates = new Set<string>(s.fitnessSessions.map((x) => x.date));

  let morningRoutineDone = 0, bedRoutineDone = 0;
  for (const [key, ts] of Object.entries(s.completions)) {
    const [id, date] = key.split("::");
    const e = s.events.find((x) => x.id === id);
    if (!e) continue;
    completionCount++;
    byCategory[e.category] = (byCategory[e.category] ?? 0) + 1;
    if (e.category === "routine") routineCounts[e.id] = (routineCounts[e.id] ?? 0) + 1;
    if (e.category === "fitness") fitnessDates.add(date);
    if (isMorningRoutine(e)) morningRoutineDone++;
    if (isBedRoutine(e)) bedRoutineDone++;
    // "ahead": completed before the occurrence date arrived
    if (iso(new Date(ts)) < date) aheadCompletions++;
    (perDayCats[date] ??= new Set()).add(e.category);
    perDayCompletions[date] = (perDayCompletions[date] ?? 0) + 1;
  }

  const t = today();
  let futureSchoolDone7 = 0, futureSchoolDone30 = 0;
  let longFlowDone = false, meetingPrepDone = 0, ventureDone = 0;
  let longFitnessDone = s.fitnessSessions.some((x) => x.minutes >= 45);
  for (const e of s.events) {
    // single-occurrence completion checks
    const done = isDone(e, e.date, s);
    if (!done) continue;
    if (e.category === "school" && e.date > t) {
      if (e.date <= addDays(t, 7)) futureSchoolDone7++;
      if (e.date <= addDays(t, 30)) futureSchoolDone30++;
    }
    // F.L.O.W. (Full-Length Optimal Work): any single event logged 3+ hours
    // in one sitting, whatever category it's on — not tied to one program.
    if (e.start && e.end && toMin(e.end) - toMin(e.start) >= 180) longFlowDone = true;
    if (e.category === "fitness" && e.start && e.end && toMin(e.end) - toMin(e.start) >= 45) longFitnessDone = true;
    if (e.category === "meeting" && e.checklist.length && e.checklist.every((c) => c.done)) meetingPrepDone++;
    if (e.category === "venture" || e.category === "business") ventureDone++;
  }

  // fitness days/streak — same "distinct completion days, longest consecutive
  // run" shape as the quiet streak below, scoped to fitness-category days.
  const fitnessDaysTotal = fitnessDates.size;
  const sortedFitnessDates = [...fitnessDates].sort();
  let fitnessStreak = 0, fitRun = 0, fitPrev = "";
  for (const d of sortedFitnessDates) {
    fitRun = fitPrev && addDays(fitPrev, 1) === d ? fitRun + 1 : 1;
    fitnessStreak = Math.max(fitnessStreak, fitRun);
    fitPrev = d;
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
  let daysUnderBudget = 0, routineFirstDays = 0, earnedItDays = 0;
  for (const d of sortedScreenDates) {
    const used = screenMinutesOn(d, s);
    const budget = earnedBudgetOn(d, s);
    if (used <= budget.total) daysUnderBudget++;
    if (budget.routinesDone > 0 && used <= budget.total) earnedItDays++;
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
    futureSchoolDone7, futureSchoolDone30, longFlowDone,
    meetingPrepDone, polymathMax, ventureDone, morningRoutineDone, bedRoutineDone,
    quietDays, quietStreak,
    milestonesDone, projectsDone, totalEvents: s.events.length,
    // "Revealed" means it actually went hidden -> visible via revealEvent
    // (revealedAt stamp), not just "was created visible like every event".
    announcementsRevealed: s.events.filter((e) => e.category === "announcement" && e.visibility === "visible" && !!e.revealedAt).length,
    streakCurrent: current, streakBest: best, level: levelInfo(s).level,
    empireMRR: empireMRR(s), empireLifetime: empireLifetime(s),
    liveVentures: s.ventures.filter((v) => v.status === "live" || v.status === "scaling").length,
    screenSessionsLogged: s.screenSessions.length,
    daysUnderBudget, underBudgetStreak,
    urgesLogged: s.urges.length, urgesResisted,
    routineFirstDays, earnedItDays,
    schoolPrepared, schoolAllYours, schoolHonestlyLogged,
    fitnessCount: (byCategory.fitness ?? 0) + s.fitnessSessions.length, fitnessDaysTotal, fitnessStreak, longFitnessDone,
    loggingStreakBest: loggingStreakInfo(s).best, loggingDaysTotal: loggingStreakInfo(s).totalDays,
  };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Discipline — showing up, staying on it
  { id: "first-step", title: "I Did A Thing", desc: "Complete anything you scheduled. Bar is on the floor and you cleared it.", category: "discipline", progress: (a) => [Math.min(a.completionCount, 1), 1] },
  { id: "polymath", title: "Jack Of All Trades, Actually Decent At Most", desc: "Complete items across 5 categories in one day.", category: "discipline", progress: (a) => [a.polymathMax, 5] },
  { id: "quiet-quarter", title: "He Isn't Using Drugs!?", desc: "7-day streak with zero logged distractions.", category: "discipline", progress: (a) => [a.quietStreak, 7] },
  { id: "locked-in", title: "Touch Grass: Unlocked", desc: "30 productive days with no distractions logged, total.", category: "discipline", progress: (a) => [a.quietDays, 30] },
  { id: "streak-3", title: "Three's A Pattern", desc: "3-day routine streak.", category: "discipline", progress: (a) => [a.streakBest, 3] },
  { id: "streak-7", title: "One Whole Week??", desc: "7-day routine streak.", category: "discipline", progress: (a) => [a.streakBest, 7] },
  { id: "streak-30", title: "Okay, This Is Just Who I Am Now", desc: "30-day routine streak.", category: "discipline", progress: (a) => [a.streakBest, 30] },
  { id: "early-bird", title: "I'm Either Really Energized Or Really Sleepy!", desc: "Complete a morning routine (any routine starting before 10:00) 30 times.", category: "discipline", progress: (a) => [a.morningRoutineDone, 30] },
  { id: "sleep-pro", title: "Actually Went To Bed", desc: "Complete a bedtime routine (any routine starting 20:00 or later) 14 times.", category: "discipline", progress: (a) => [a.bedRoutineDone, 14] },
  { id: "planner", title: "Control Freak (Affectionate)", desc: "Have 25 items on your calendar.", category: "discipline", progress: (a) => [a.totalEvents, 25] },

  // School — the get-ahead superpower
  { id: "ahead-of-bell", title: "Beat The Bell", desc: "Finish a school item before its day even arrives.", category: "school", progress: (a) => [Math.min(a.aheadCompletions, 1), 1] },
  { id: "week-ahead", title: "A Week Up On Everyone Else", desc: "Complete 5 future school items inside the next week.", category: "school", progress: (a) => [a.futureSchoolDone7, 5] },
  { id: "month-ahead", title: "Living In The Future", desc: "Complete 15 future school items inside the next month.", category: "school", progress: (a) => [a.futureSchoolDone30, 15] },

  // Build — what you make, ship, and run
  { id: "flow-marathon", title: "I'ma Do A Minecraf", desc: "F.L.O.W. — Full-Length Optimal Work: one thing, zero context-switching, 3+ hours in a single sitting. Log one on anything.", category: "build", progress: (a) => [a.longFlowDone ? 1 : 0, 1] },
  { id: "investor", title: "Walked In With A Plan For Once", desc: "Complete a meeting with its prep checklist fully done.", category: "build", progress: (a) => [a.meetingPrepDone, 1] },
  { id: "ship-it", title: "It's Actually Done", desc: "Complete a project.", category: "build", progress: (a) => [a.projectsDone, 1] },
  { id: "trilogy", title: "Threepeat", desc: "Complete 3 projects.", category: "build", progress: (a) => [a.projectsDone, 3] },
  { id: "mile-markers", title: "Chipping Away At It", desc: "Finish 10 project milestones.", category: "build", progress: (a) => [a.milestonesDone, 10] },
  { id: "mogul", title: "Certified Business Guy", desc: "Complete 10 business / venture items.", category: "build", progress: (a) => [a.ventureDone, 10] },
  { id: "first-dollar", title: "First Dollar, Baby", desc: "Log revenue on a venture for the first time.", category: "build", progress: (a) => [a.empireLifetime > 0 ? 1 : 0, 1] },
  { id: "five-figures", title: "Five Figures, Let's Go", desc: "Reach $10,000 in combined monthly revenue.", category: "build", progress: (a) => [Math.min(a.empireMRR, 10000), 10000] },
  { id: "empire", title: "Multiple Streams (Actually)", desc: "Run 3 live or scaling ventures at once.", category: "build", progress: (a) => [a.liveVentures, 3] },

  // Social — your reputation at school
  { id: "announcer", title: "Made It Official", desc: "Reveal a hidden announcement (create it unannounced, then make it visible).", category: "social", progress: (a) => [a.announcementsRevealed, 1] },

  // Level milestones — the rank ladder, big steps only
  { id: "level-3", title: "Hard Worker Status", desc: "Reach level 3 — Hard Worker.", category: "level", progress: (a) => [a.level, 3] },
  { id: "level-5", title: "Halfway There (Cue The Song)", desc: "Reach level 5 — Gymnast. Halfway up the ladder.", category: "level", progress: (a) => [a.level, 5] },
  { id: "level-8", title: "Almost There", desc: "Reach level 8 — Dedicated Athlete.", category: "level", progress: (a) => [a.level, 8] },
  { id: "level-10", title: "Dude Perfect", desc: "Reach level 10 — the top of the ladder, on purpose.", category: "level", progress: (a) => [a.level, 10] },

  // Fitness — the training half of the story, not just the business half
  { id: "fitness-first", title: "I May Not Be A Threat, But I Still Sweat", desc: "Complete your first fitness session.", category: "fitness", progress: (a) => [Math.min(a.fitnessCount, 1), 1] },
  { id: "fitness-10", title: "Certified Athlete (Self-Proclaimed)", desc: "Complete 10 fitness sessions.", category: "fitness", progress: (a) => [a.fitnessCount, 10] },
  { id: "fitness-50", title: "This Is Basically My Job Now", desc: "Complete 50 fitness sessions.", category: "fitness", progress: (a) => [a.fitnessCount, 50] },
  { id: "fitness-long", title: "Basically A Solid Rock", desc: "Log a single fitness session of 45 minutes or more.", category: "fitness", progress: (a) => [a.longFitnessDone ? 1 : 0, 1] },
  { id: "fitness-streak-3", title: "Three Days Of Actually Moving", desc: "3-day streak of completed fitness sessions.", category: "fitness", progress: (a) => [a.fitnessStreak, 3] },
  { id: "fitness-streak-7", title: "A Week Of Not Being A Couch", desc: "7-day streak of completed fitness sessions.", category: "fitness", progress: (a) => [a.fitnessStreak, 7] },
  { id: "fitness-days-30", title: "Thirty Different Days I Moved", desc: "30 distinct days with a completed fitness session, total.", category: "fitness", progress: (a) => [a.fitnessDaysTotal, 30] },

  // Screens — training honestly. Celebrates noticing + resisting; never
  // punishes over-budget days.
  { id: "honest-screen", title: "Admitting It's The First Step", desc: "Log your first screen session. Noticing is half of it.", category: "discipline", progress: (a) => [Math.min(a.screenSessionsLogged, 1), 1] },
  { id: "under-budget-1", title: "Under The Line, Barely", desc: "End a day under your earned screen budget.", category: "discipline", progress: (a) => [Math.min(a.daysUnderBudget, 1), 1] },
  { id: "earned-it", title: "Earned It, Spent It Wisely", desc: "Stay under budget on a day where routines added bonus minutes.", category: "discipline", progress: (a) => [Math.min(a.earnedItDays, 1), 1] },
  { id: "below-the-line-7", title: "A Week Of Not Doomscrolling", desc: "Seven days in a row under budget.", category: "discipline", progress: (a) => [a.underBudgetStreak, 7] },
  { id: "screen-discipline-30", title: "Thirty Days Of Self Control", desc: "Thirty days under budget, total.", category: "discipline", progress: (a) => [a.daysUnderBudget, 30] },
  { id: "felt-it", title: "Caught Myself", desc: "Log your first urge. Catching the urge IS the win.", category: "discipline", progress: (a) => [Math.min(a.urgesLogged, 1), 1] },
  { id: "ten-resisted", title: "Ten Times I Didn't Cave", desc: "Resist ten urges (pick a replacement instead).", category: "discipline", progress: (a) => [a.urgesResisted, 10] },
  { id: "routine-first-5", title: "Routine Before Phone", desc: "Five days where the morning routine was done before any screens.", category: "discipline", progress: (a) => [a.routineFirstDays, 5] },

  // School integrity — honest self-mirror
  { id: "learn-first-1", title: "DAD, I UNDERSTAND!", desc: "Complete a school item with the prep box honestly checked.", category: "school", progress: (a) => [Math.min(a.schoolPrepared, 1), 1] },
  { id: "learn-first-10", title: "Read, Then Did — Ten Times", desc: "Ten school items completed prepared.", category: "school", progress: (a) => [a.schoolPrepared, 10] },
  { id: "honest-school", title: "Told The Truth About The Help", desc: "Mark a school item's help honestly (any value).", category: "school", progress: (a) => [Math.min(a.schoolHonestlyLogged, 1), 1] },
  { id: "all-yours-5", title: "All Me, Five Times", desc: "Five school items completed with help = 'none'.", category: "school", progress: (a) => [a.schoolAllYours, 5] },

  // Logging streak — cuts across screens/urges/school honesty. Not about
  // doing more; about not going quiet on the truth for a stretch.
  { id: "logging-streak-7", title: "You Actually Wrote It Down", desc: "7 days straight logging something real — a screen session, an urge, or honest school help.", category: "discipline", progress: (a) => [a.loggingStreakBest, 7] },
  { id: "logging-days-30", title: "Thirty Days Of Real Data", desc: "30 total days with something honestly logged.", category: "discipline", progress: (a) => [a.loggingDaysTotal, 30] },

  // Special — the whole-system milestones, not tied to one track
  { id: "hundred-days", title: "100 Days In", desc: "Been running MoreMe for 100 days. Still here.", category: "special", progress: (a, s) => [Math.min(Math.floor((Date.now() - s.startedAt) / 86_400_000), 100), 100] },
  { id: "full-system", title: "Built The Whole Thing", desc: "Actually used every surface — a real Company, a logged workout, a real school Mod, and a Project all going at once.", category: "special", progress: (a, s) => {
    const have = [
      s.ventures.length > 0,
      s.fitnessSessions.length > 0,
      s.schoolMods.length > 0,
      s.projects.length > 0,
    ].filter(Boolean).length;
    return [have, 4];
  } },
  { id: "roadmap-steps-10", title: "Building It For Real", desc: "Check off ten steps across your Companies' roadmaps.", category: "special", progress: (a, s) => {
    const done = s.ventures.reduce((n, v) => n + v.roadmap.filter((r) => r.done).length, 0);
    return [done, 10];
  } },
  { id: "feed-connected", title: "The Calendar Knows", desc: "Connect a real feed — Canvas, Veracross, or Google Calendar — and sync it at least once.", category: "special", progress: (a, s) => {
    const synced = [s.integrations.canvas, s.integrations.veracross, s.integrations.google].filter((f) => !!f.lastSyncAt).length;
    return [Math.min(synced, 1), 1];
  } },
  { id: "weekend-friends-5", title: "Actually Went And Had Fun", desc: "Complete the weekend Friends & gaming block five times.", category: "special", progress: (a, s) => {
    const done = Object.entries(s.completions).filter(([key]) => {
      const id = key.split("::")[0];
      return id.startsWith("tmpl-weekend-sat-friends") || id.startsWith("tmpl-weekend-sun-friends");
    }).length;
    return [done, 5];
  } },

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
