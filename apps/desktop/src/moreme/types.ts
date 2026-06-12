// MoreMe — types for the calendar-first rebuild.
//
// Everything schedulable is a CalEvent: recurring routine habits, school
// classes, iProject blocks, business meetings, ARG stages, travel, and
// "announcements" (which can be hidden until you're ready to reveal them).
// XP is earned per completed occurrence; completing milestones and projects
// adds bonus XP. No modes, no focus blocks, no strikes, no session breaks.

export type Category =
  | "routine"      // recurring habit (morning routine, bedtime, movement)
  | "class"        // a Mount Vernon class period
  | "school"       // homework / assignments / school work
  | "iproject"     // independent project block (Mount Vernon iProject / "GTD")
  | "business"     // running your companies
  | "venture"      // a specific business / venture activity
  | "project"      // personal build / mod work
  | "arg"          // Cosmos Crew ARG release/stage
  | "meeting"      // a scheduled meeting
  | "travel"       // trips, the helicopter, logistics
  | "announcement" // something you plan to reveal to the school
  | "fitness"      // workout / sport
  | "personal";    // anything else

export type Priority = "low" | "normal" | "high";
export type EventStatus = "planned" | "doing" | "done" | "skipped";
// "hidden" = an unannounced plan: visible only to you until you reveal it.
export type Visibility = "visible" | "hidden";

export type ChecklistItem = { id: string; text: string; done: boolean };

export type Recurrence =
  | { kind: "none" }
  | { kind: "daily" }
  | { kind: "weekdays" }            // Mon–Fri
  | { kind: "weekly"; days: number[] }; // 0=Sun … 6=Sat

export type CalEvent = {
  id: string;
  title: string;
  notes?: string;
  category: Category;
  date: string;                 // YYYY-MM-DD — anchor date (recurrence start)
  until?: string;               // YYYY-MM-DD — recurrence end (optional)
  allDay: boolean;
  start?: string;               // "HH:MM"
  end?: string;                 // "HH:MM"
  location?: string;
  people: string[];             // Person ids
  linkedProjectId?: string;
  linkedClassId?: string;       // for category="school" or "class" — anchors Get Ahead
  checklist: ChecklistItem[];
  priority: Priority;
  visibility: Visibility;
  recurrence: Recurrence;
  reminders: number[];          // minutes before start
  xp: number;                   // awarded per completed occurrence
  // Single events: status drives completion. Recurring events ignore this and
  // use the completions map keyed by occurrence date instead.
  status: EventStatus;
  createdAt: number;
  // ── School honesty log (only meaningful when category === "school") ──
  // The neutral mirror: did you actually read the material before starting?
  // What help did you use? What stuck? No nags — just self-reflection.
  prepared?: boolean;           // "I read what I needed before I dove in"
  helpUsed?: HelpKind;          // "none" | "search" | "ai" | "friend" | "mixed"
  learned?: string;             // one-line takeaway, your own words
};

export type HelpKind = "none" | "search" | "ai" | "friend" | "mixed";
export const HELP_KINDS: HelpKind[] = ["none", "search", "ai", "friend", "mixed"];
export const HELP_KIND_LABEL: Record<HelpKind, string> = {
  none: "None — all me", search: "Search / docs", ai: "AI", friend: "A friend", mixed: "A mix",
};

// A Mount Vernon class (or any course). School-work events link to a class
// so the Get Ahead planner can roll up "% pre-done" per course over the
// upcoming week / month. An optional weekly `period` lets MoreMe generate the
// recurring class meetings onto the calendar in one click.
export type ClassPeriod = { days: number[]; start: string; end: string };  // days: 0=Sun..6=Sat
export type Class = {
  id: string;
  name: string;        // "World History", "Algebra II", etc.
  teacher?: string;    // Person id
  color?: string;      // optional accent override
  room?: string;       // where it meets
  period?: ClassPeriod; // weekly meeting pattern (drives the timetable generator)
};

// A freeform note / plan. The "folders of plans in development" bucket — the
// unannounced ideas, ARG planning, meeting talking points, anything that's
// reference rather than a scheduled action.
export type Note = {
  id: string;
  title: string;
  body: string;
  pinned?: boolean;
  linkedProjectId?: string;
  hidden?: boolean;     // an unannounced plan — dimmed + marked in the list
  ts: number;
  updatedAt: number;
};

export type ProjectKind = "arg" | "mod" | "venture" | "school" | "other";
export type ProjectStatus = "active" | "paused" | "done";

export type Project = {
  id: string;
  name: string;
  kind: ProjectKind;
  status: ProjectStatus;
  notes?: string;
  deadline?: string;            // YYYY-MM-DD
  milestones: ChecklistItem[];
  completedAt?: number;         // set when status flips to done (project XP bonus)
};

export type Person = {
  id: string;
  name: string;
  role: string;                 // "Friend", "Teacher", "Principal", "Investor"…
  notes?: string;
};

// A business / venture you run. Tracked separately from Projects so the
// Empire view can sum monthly revenue and show health at a glance.
export type VentureStatus = "idea" | "building" | "live" | "scaling" | "sold" | "paused";
export type RevenueEntry = { id: string; month: string; amount: number };  // month = YYYY-MM
export type Venture = {
  id: string;
  name: string;
  tagline?: string;
  status: VentureStatus;
  link?: string;
  notes?: string;
  // monthly revenue history -> the Empire dashboard derives current MRR + trend
  revenue: RevenueEntry[];
  nextAction?: string;
  createdAt: number;
};

// GTD quick-capture. Dump anything; triage later into an event/project/goal.
export type InboxItem = { id: string; text: string; ts: number };

export type Goal = { id: string; text: string; done?: boolean };
export type Goals = {
  week: Goal[];
  semester: Goal[];
  year: Goal[];
  identity: Goal[];
};

export type DistractionLog = { id: string; date: string; note: string; ts: number };

// ── Screen training ────────────────────────────────────────────────────────
// Built for honest awareness, not nags. The system reflects, never lectures.
// Sessions are logged (quick-add or live timer). Daily budget = base +
// bonus×routines-done-today (you EARN screens by doing the routines you'd
// otherwise skip). Optional pre-committed window for "I only play 4–9pm."
// Urges are tracked because resisting them IS the win — not zero screentime.

export type ScreenCategory = "gaming" | "social" | "video" | "browsing" | "creative" | "other";
export const SCREEN_CATEGORIES: ScreenCategory[] = ["gaming", "social", "video", "browsing", "creative", "other"];
export const SCREEN_CATEGORY_LABEL: Record<ScreenCategory, string> = {
  gaming: "Gaming", social: "Social", video: "Video", browsing: "Browsing",
  creative: "Creative", other: "Other",
};

export type ScreenSession = {
  id: string;
  date: string;          // YYYY-MM-DD (the day the session started; sessions don't cross-pollinate days)
  startedAt: number;     // ms
  endedAt?: number;      // ms — undefined while in-progress
  minutes?: number;      // explicit minutes; used when set, otherwise computed from times
  category: ScreenCategory;
  what: string;          // free-text: "Minecraft", "YouTube", "Hypixel Bedwars"
  note?: string;
};

export type UrgeResolution = "resisted" | "later" | "did-it";  // honest
export type UrgeLog = {
  id: string;
  date: string;          // YYYY-MM-DD
  ts: number;
  what?: string;         // what was tempting
  resolution: UrgeResolution;
  replacement?: string;  // what you did instead (if resisted)
  note?: string;
};

// A 1- to 10-minute alternative you can pick when the urge hits. Editable.
export type Replacement = { id: string; label: string; minutes: number };

export type ScreenSettings = {
  baseBudgetMinutes: number;      // base daily budget
  bonusPerRoutineMinutes: number; // unlocked per routine you complete that day
  capBudgetMinutes: number;       // ceiling even with bonuses (so it doesn't run away)
  windowStart?: string;           // HH:MM — pre-committed "screens only after this"
  windowEnd?: string;             // HH:MM — pre-committed "screens off by this"
  awardXpPerUrgeResisted: number; // XP credit for an urge you logged + resisted
};

// ── Customization ──────────────────────────────────────────────────────────
// Lets the user rename tabs, hide ones they don't use, override the 20 rank
// names, add their own achievements, and define a third theme palette.
export type CustomTheme = {
  bg: string; elev: string; sunk: string;
  ink: string; inkSoft: string; inkTiny: string; line: string;
  mint: string; mintDeep: string; mintHi: string;
  warn: string; cool: string;
  heroImage?: string;  // optional URL — shown as a faint backdrop on Today
};
export type CustomAchievement = {
  id: string;
  title: string;
  desc: string;
  xp: number;
  claimedAt?: number;   // first claim timestamp; subsequent claims are no-ops
};
export type Customization = {
  tabLabels: Record<string, string>;     // tabId -> override label ("" or absent = use default)
  hiddenTabs: string[];                   // tabIds hidden from the tab row
  customRanks: (string | undefined)[];   // length 20; undefined = use RANK_NAMES default
  customAchievements: CustomAchievement[];
  customTheme?: CustomTheme;             // when set, "custom" theme becomes selectable
  useCustomTheme: boolean;               // toggle for the picker
};

export type LevelReward = { level: number; reward: string };

// Mount Vernon Upper School context. `grade9Year` is the calendar year you
// START 9th grade (the fall). The current grade is DERIVED from today's date
// vs. that anchor, rolling over each August — so it advances automatically
// every school year with no manual bump. `path` is the Upper School pathway.
export type SchoolPath = "Inquiry" | "Global Impact Diploma" | "Innovation Diploma";
export type School = {
  grade9Year: number;     // e.g. 2026 = you enter Grade 9 in Aug 2026
  path: SchoolPath;
};

export type State = {
  schemaVersion: 11;
  customization: Customization;
  school: School;
  events: CalEvent[];
  // completions keyed by `${eventId}::${YYYY-MM-DD}` -> unlock timestamp.
  completions: Record<string, number>;
  projects: Project[];
  ventures: Venture[];
  inbox: InboxItem[];
  notes: Note[];
  people: Person[];
  classes: Class[];
  goals: Goals;
  distractions: DistractionLog[];
  // Screen training surface — see the screen* types above.
  screenSessions: ScreenSession[];
  urges: UrgeLog[];
  replacements: Replacement[];
  screen: ScreenSettings;
  rewards: LevelReward[];                        // user-set reward text per level
  unlockedAchievements: Record<string, number>;  // id -> unlocked ts
  startedAt: number;
};

// ── Level economy: fewer levels, much heavier XP per level ────────────────
// 20 levels on a quadratic per-level cost curve. Each level is a real haul.
export const MAX_LEVEL = 20;

// Each level has a name — the climb from "showed up today" to "owns the
// place." Mount Vernon-flavored for the Inquiry path + the businessman arc.
// Level n ↔ RANK_NAMES[n-1].
export const RANK_NAMES: readonly string[] = [
  "Inquirer",        //  1 — showed up
  "Always Ahead",    //  2 — finishes things early
  "Maker",           //  3 — building stuff
  "Founder",         //  4 — started a thing
  "Operator",        //  5 — runs the thing
  "Strategist",      //  6 — plays the long game
  "Polymath",        //  7 — many fronts at once
  "Architect",       //  8 — designs systems
  "Magnate",         //  9 — moves real money
  "Tycoon",          // 10 — halfway · serious money
  "Mogul",           // 11
  "Empire-Builder",  // 12
  "Visionary",       // 13
  "Powerhouse",      // 14
  "Titan",           // 15
  "Page Six",        // 16 — you're in the news
  "Helipad Class",   // 17 — you arrive by helicopter
  "Icon",            // 18
  "Legend",          // 19
  "Davis",           // 20 — the namesake. Top.
];

// XP required to advance FROM level n TO level n+1.
export function levelStep(n: number): number {
  return 500 * n * n; // L1→L2 = 500, L2→L3 = 2,000, L5→L6 = 12,500 …
}

// Cumulative XP required to *reach* a level (level 1 = 0 XP).
export function cumulativeXp(level: number): number {
  let total = 0;
  for (let k = 1; k < level; k++) total += levelStep(k);
  return total;
}

// Category presentation (label + accent color). Order here drives pickers.
export const CATEGORY_META: Record<Category, { label: string; color: string; glyph: string }> = {
  routine:      { label: "Routine",      color: "#8b95a5", glyph: "◇" },
  class:        { label: "Class",        color: "#33B5FF", glyph: "▤" },
  school:       { label: "School Work",  color: "#3EA0FF", glyph: "✎" },
  iproject:     { label: "iProject",     color: "#3EDBB5", glyph: "◈" },
  business:     { label: "Business",     color: "#FFB23E", glyph: "$" },
  venture:      { label: "Venture",      color: "#FF8A3E", glyph: "▲" },
  project:      { label: "Project",      color: "#A855F7", glyph: "◆" },
  arg:          { label: "ARG",          color: "#E0529C", glyph: "✦" },
  meeting:      { label: "Meeting",      color: "#FF5577", glyph: "●" },
  travel:       { label: "Travel",       color: "#22D3EE", glyph: "✈" },
  announcement: { label: "Announcement", color: "#FFD23E", glyph: "❖" },
  fitness:      { label: "Fitness",      color: "#4ADE80", glyph: "⚡" },
  personal:     { label: "Personal",     color: "#9aa0ad", glyph: "·" },
};

export const CATEGORY_ORDER: Category[] = [
  "routine", "class", "school", "iproject", "business", "venture",
  "project", "arg", "meeting", "travel", "announcement", "fitness", "personal",
];
