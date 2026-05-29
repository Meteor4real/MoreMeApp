// Default time-blocked routines per mode, mirroring the user's blueprint:
//   Semester = default weekday during normal school weeks
//   Weekend  = auto-detected Sat/Sun
//   Vacation = Thanksgiving / Winter / Spring / Summer break
//   Exam     = finals / project weeks / J-term
//   Travel   = trips
// Blocks are strict: a block only counts if you check it during or after its
// time window. XP only comes from blocks (plus bonus/penalty adjustments).

import type { Mode, ScheduleBlock } from "./types";

export const ASSIGNABLE_MODES: Mode[] = ["semester", "vacation", "exam", "travel"];

export const MODE_LABEL: Record<Mode, string> = {
  semester: "Semester",
  weekend: "Weekend",
  vacation: "Vacation",
  exam: "Exam",
  travel: "Travel",
};

export const MODE_COLOR: Record<Mode, string> = {
  semester: "#33B5FF",
  weekend:  "#6A7280",
  vacation: "#3EDBB5",
  exam:     "#FF7A2D",
  travel:   "#A855F7",
};

export const SCHEDULES: Record<Mode, ScheduleBlock[]> = {
  semester: [
    { id: "morning",    start: "06:30", end: "06:40", label: "Morning routine",                xp: 10, note: "Water · stretch · quick movement · top 3 goals · deep breaths" },
    { id: "ontime",     start: "07:30", end: "08:30", label: "On time to school",              xp: 10, note: "Identity: you show up." },
    { id: "focus",      start: "12:00", end: "12:30", label: "One 20-min deep focus block",    xp: 15, note: "Pick the class or time. No distractions." },
    { id: "noyt",       start: "08:00", end: "15:00", label: "No distractions / no YouTube at school", xp: 10 },
    { id: "checkin",    start: "14:30", end: "15:00", label: "End-of-day check-in",            xp: 10, note: "Note one thing to improve. Celebrate one win." },
    { id: "sport",      start: "15:30", end: "17:30", label: "After-school sport / movement",  xp: 15, note: "Mon: basketball · Wed: run · Fri: any sport" },
    { id: "move",       start: "17:00", end: "21:00", label: "2-minute movement (minimum)",    xp: 5 },
    { id: "homework",   start: "18:00", end: "20:00", label: "Homework",                       xp: 20 },
    { id: "project",    start: "19:00", end: "21:00", label: "Project work",                   xp: 20 },
    { id: "bed",        start: "21:40", end: "22:00", label: "Bedtime routine",                xp: 10, note: "Light stretching · set clothes out · 1 win · screens off · lights out by 22:00" },
  ],
  weekend: [
    { id: "morning",    start: "08:00", end: "09:00", label: "Morning routine + water",        xp: 10 },
    { id: "sport",      start: "10:00", end: "13:00", label: "Sport / flexible movement",      xp: 15 },
    { id: "project",    start: "13:00", end: "16:00", label: "Project time",                   xp: 20 },
    { id: "learn",      start: "16:00", end: "17:00", label: "Reading / learning",             xp: 10 },
    { id: "gaming",     start: "17:00", end: "21:00", label: "Gaming · only after goals",      xp: 0 },
    { id: "bed",        start: "22:00", end: "23:00", label: "Wind down + bedtime",            xp: 10 },
  ],
  vacation: [
    { id: "morning",    start: "07:00", end: "07:30", label: "Morning routine",                xp: 10 },
    { id: "workout",    start: "07:30", end: "08:30", label: "20–30 min workout",              xp: 20 },
    { id: "breakfast",  start: "08:30", end: "09:00", label: "Healthy breakfast + plan top 3", xp: 5 },
    { id: "learn",      start: "09:30", end: "11:00", label: "Khan Academy / reading / learning", xp: 15 },
    { id: "sports",     start: "12:00", end: "14:00", label: "Sports (1–2 hours)",             xp: 15 },
    { id: "project",    start: "14:00", end: "16:30", label: "Project / cleaning / skill",     xp: 20 },
    { id: "gaming",     start: "19:00", end: "21:00", label: "Gaming · ≤2h · after goals",     xp: 0 },
    { id: "bed",        start: "21:40", end: "22:30", label: "Stretch + bedtime routine",      xp: 10 },
  ],
  exam: [
    { id: "morning",    start: "06:30", end: "06:50", label: "Morning routine",                xp: 10 },
    { id: "study1",     start: "08:00", end: "09:30", label: "Focused study block 1",          xp: 20 },
    { id: "study2",     start: "11:00", end: "12:30", label: "Focused study block 2",          xp: 20 },
    { id: "move",       start: "12:30", end: "13:00", label: "Movement + food reset",          xp: 5 },
    { id: "study3",     start: "14:00", end: "15:30", label: "Focused study block 3",          xp: 20 },
    { id: "project",    start: "16:00", end: "17:30", label: "Project / big-week work",        xp: 20 },
    { id: "light",      start: "17:30", end: "18:00", label: "Light workout",                  xp: 10 },
    { id: "bed",        start: "21:30", end: "22:00", label: "Wind down · sleep is part of the grind", xp: 10 },
  ],
  travel: [
    { id: "morning",    start: "07:00", end: "07:30", label: "Morning routine + water",        xp: 10 },
    { id: "twork",      start: "07:30", end: "08:00", label: "Travel workout · 2–3× round",    xp: 20, note: "15 squats · 10 push-ups · 20 jumping jacks · 30-sec plank" },
    { id: "move",       start: "10:00", end: "18:00", label: "Walking / stairs / exploring",   xp: 15 },
    { id: "learn",      start: "13:00", end: "14:00", label: "Reading / learning",             xp: 15 },
    { id: "project",    start: "18:00", end: "19:30", label: "Project work",                   xp: 20 },
    { id: "bed",        start: "22:00", end: "22:45", label: "Stretch + bedtime",              xp: 10 },
  ],
};

// Fitness weekly cycle — surfaced in the Routines page.
export const FITNESS_DAYS: { day: string; title: string; items: string[] }[] = [
  { day: "Day 1", title: "Strength",      items: ["Push-ups: 3×8–12", "Squats: 3×12–15", "Plank: 3×20–30 sec", "Lunges: 2×10 each leg"] },
  { day: "Day 2", title: "Cardio",        items: ["10–20 min jog or fast walk", "Optional: 30 sec run + 30 sec walk × 10"] },
  { day: "Day 3", title: "Mixed",         items: ["Jumping jacks: 2×30", "Mountain climbers: 2×20", "Sit-ups: 3×10–15", "Stretch + cool down"] },
  { day: "Day 4", title: "Any sport",     items: ["Pick a sport you actually enjoy.", "Then repeat the cycle."] },
];

// Food / hydration rules — also surfaced in Routines.
export const FOOD_RULES: string[] = [
  "One fruit + one vegetable per day",
  "Water before any snack",
  "Sugar once per day max",
  "Water when waking up",
  "Water before school",
  "Water after school",
  "Bodyarmor for long sports",
];

// Gaming rules.
export const GAMING_RULES: string[] = [
  "Friday: up to 4 hours",
  "Saturday: up to 4 hours",
  "Sunday: up to 4 hours",
  "Only after goals are done",
  "No gaming past 9 PM",
];

// Travel kit checklist groups.
export const TRAVEL_KIT: { group: string; items: string[] }[] = [
  { group: "Essentials",            items: ["ID / wallet", "Phone + charger", "Headphones", "Meds"] },
  { group: "Clothing",              items: ["Layers", "Sleepwear", "Sport kit", "Underwear / socks"] },
  { group: "Electronics",           items: ["Laptop + charger", "Cables", "Power bank", "Adapter"] },
  { group: "School + Projects",     items: ["Notes", "Books", "Project workbook", "Pens"] },
  { group: "Fitness + Sports",      items: ["Shoes", "Resistance band", "Jump rope"] },
  { group: "Travel extras",         items: ["Reusable bottle", "Snacks", "Pillow / mask"] },
  { group: "Entertainment",         items: ["Books", "Games (offline)", "Playlists / OST"] },
];

// Identity goals (the always-on stack — also seeded into Goals).
export const DEFAULT_IDENTITY: string[] = [
  "I am someone who shows up.",
  "I am someone who finishes what I start.",
  "I am someone who takes responsibility.",
  "I am someone who doesn't distract myself or others.",
];

// Bonus XP catalog (matches the blueprint).
export const BONUS_CATALOG: { kind: import("./types").BonusKind; label: string; xp: number }[] = [
  { kind: "extra-workout",     label: "Extra workout",       xp: 10 },
  { kind: "extra-sports",      label: "Extra sports session", xp: 10 },
  { kind: "project-milestone", label: "Project milestone",    xp: 30 },
  { kind: "project-complete",  label: "Full project complete", xp: 100 },
  { kind: "difficult-thing",   label: "Did something difficult", xp: 20 },
];

export const PENALTY_CATALOG: { kind: import("./types").PenaltyKind; label: string; xp: number }[] = [
  { kind: "rule-break",        label: "Broke a rule",        xp: -10 },
  { kind: "no-effort",         label: "Missed a day · no effort", xp: -20 },
];
