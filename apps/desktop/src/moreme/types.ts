// MoreMe — types for the Hub-native rebuild.

export type Mode = "semester" | "weekend" | "vacation" | "exam" | "travel";

export type ScheduleBlock = {
  id: string;        // stable per-mode id
  start: string;     // "HH:MM"
  end: string;       // "HH:MM"
  label: string;
  xp: number;
  note?: string;
};

export type CalendarEvent = {
  id: string;
  start: string;     // YYYY-MM-DD inclusive
  end: string;       // YYYY-MM-DD inclusive
  title: string;
  mode: Mode;        // forces this mode for the range
};

export type ProjectCategory = "school" | "personal" | "physical" | "digital";
export type ProjectStatus = "active" | "paused" | "done";

export type Project = {
  id: string;
  title: string;
  category: ProjectCategory;
  status: ProjectStatus;
  nextAction: string;
  deadline?: string;  // YYYY-MM-DD
  notes?: string;
  milestones: number; // count, for XP bonuses
};

export type Goal = { id: string; text: string; done?: boolean };
export type Goals = {
  weeklyDigital: Goal[];
  weeklyPhysical: Goal[];
  weeklyIdentity: Goal[];
  semesterDigital: Goal[];
  semesterPhysical: Goal[];
  yearlyAcademic: Goal[];
  yearlyPersonal: Goal[];
  yearlyPhysical: Goal[];
  identity: Goal[];
};

export type BonusKind = "extra-workout" | "extra-sports" | "project-milestone" | "project-complete" | "difficult-thing";
export type PenaltyKind = "rule-break" | "no-effort";

export type DayLog = {
  checked: string[];
  bonus: { kind: BonusKind; xp: number; ts: number }[];
  penalty: { kind: PenaltyKind; xp: number; ts: number }[];
  oneWin?: string;
  improvement?: string;
};

export type Achievement = {
  id: string;
  category: "skill" | "learning" | "discipline" | "project" | "special";
  title: string;
  desc: string;
};

export type BattlepassReward = { level: number; reward: string };

export type State = {
  schemaVersion: 1;
  events: CalendarEvent[];
  dayTypes: Record<string, Mode>;                // explicit per-date mode override
  dayLogs: Record<string, DayLog>;               // by YYYY-MM-DD
  projects: Project[];
  goals: Goals;
  battlepass: BattlepassReward[];                // user-set reward text per level
  unlockedAchievements: Record<string, number>;  // id -> unlocked ts
  prestige: number;
  seasonStart: string;                           // YYYY-MM-DD
  startedAt: number;
};

export const TIERS = [
  "Initiate", "Worker", "Hard Worker", "Dedicated Worker", "Gymnast",
  "Dedicated Gymnast", "Athlete", "Dedicated Athlete", "Unstoppable", "Dude Perfect",
] as const;

export const XP_PER_LEVEL = 200;          // tightened from the old "way too easy" 100
export const LEVELS_PER_TIER = 5;         // 5 levels per tier × 10 tiers = 50 levels
export const MAX_LEVEL = TIERS.length * LEVELS_PER_TIER; // 50

// Day "completes" at this fraction of its scheduled XP — drives streaks.
export const DAY_COMPLETE_FRACTION = 0.7;
