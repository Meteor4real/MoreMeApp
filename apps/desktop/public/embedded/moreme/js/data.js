/* ==========================================================================
   data.js — Global STATE, defaults, cloud + local persistence
   ========================================================================== */

// ---- Date helpers ----------------------------------------------------------

function todayISO() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function monthKey(d = new Date()) {
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0')].join('-');
}

// Week key in ISO-ish form: YYYY-Www (week starts Monday)
function weekKey(d = new Date()) {
  const target = new Date(d.valueOf());
  const dayNr = (target.getDay() + 6) % 7; // Mon=0..Sun=6
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const week = 1 + Math.ceil((firstThursday - target) / 604800000);
  return target.getFullYear() + '-W' + String(week).padStart(2, '0');
}

// 0 = Monday ... 6 = Sunday
function dowIndex(d = new Date()) {
  return (d.getDay() + 6) % 7;
}

function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// Short day label (for logs)
function shortTime(d = new Date()) {
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// ---- Defaults --------------------------------------------------------------

function defaultTodayBlock() {
  return {
    date: todayISO(),
    actions: {
      morning: false,
      workout: 0,
      sports: 0,
      focus: 0,
      noYT: false,
      onTime: false,
      moveMin: false,
      projectWork: 0,
    },
    extras: {
      extraWorkout: 0,
      extraSports: 0,
      hardThing: 0,
      milestone: 0,
      projectComplete: 0,
    },
    penalties: { ruleBreak: 0, noEffort: false },
    xpEarned: 0,
    log: [],
    top3: { academic: '', personal: '', responsibility: '' },
    top3Done: { academic: false, personal: false, responsibility: false },
  };
}

function defaultWeekly() {
  return {
    weekKey: weekKey(),
    quests: { workouts: 0, sports: 0, milestones: 0, focus: 0, onTime: 0 },
    rewardClaimed: false,
    // Per-day snapshots of the daily log. Index = dowIndex (0=Mon..6=Sun).
    // Each slot holds { actions, extras, penalties, xp }. Blank until a day ends.
    days: [null, null, null, null, null, null, null],
  };
}

function defaultHabitsBlock() {
  return {
    weekKey: weekKey(),
    list: [
      { id: newId(), name: 'Morning routine', days: [false, false, false, false, false, false, false] },
      { id: newId(), name: 'Workout', days: [false, false, false, false, false, false, false] },
      { id: newId(), name: 'On time to school', days: [false, false, false, false, false, false, false] },
      { id: newId(), name: 'No distractions at school/home', days: [false, false, false, false, false, false, false] },
      { id: newId(), name: 'Followed the entire schedule', days: [false, false, false, false, false, false, false] },
    ],
  };
}

function defaultState() {
  return {
    version: 1,
    user: null, // { email, firstName, code, username, bio }
    xp: {
      current: 0,
      totalEarned: 0,
      level: 1,
      prestige: 0,
    },
    today: defaultTodayBlock(),
    streak: {
      count: 0,
      lastActiveDate: null,
      lastRewarded: 0,
    },
    weekly: defaultWeekly(),
    achievements: {
      unlocked: [],
      progress: {
        workouts: 0,
        sports: 0,
        pushupStreak: 0,
        plankSeconds: 0,
        milesRun: 0,
        focusWeek: 0,
        onTimeStreak: 0,
        morningStreak: 0,
        khanUnits: 0,
        bookRead: 0,
        physicalProjects: 0,
        digitalProjects: 0,
        beachWorkouts: 0,
        travelRoutines: 0,
        coldWorkouts: 0,
      },
    },
    projects: [],
    routines: { lastUsed: 'weekday' },
    habits: defaultHabitsBlock(),
    goals: {
      lifetime: '', '10y': '', '5y': '', '3y': '', '1y': '',
      '3mo': '', month: '', week: '',
    },
    travel: { mode: 'home', packed: {} },
    season: {
      number: 1,
      startedMonth: monthKey(),
      theme: 'Foundation',
      totalXP: 0,
      goal: 'Level up to Tier 3 and keep a 7-day streak.',
    },
    settings: { theme: 'light', sfx: true, notify: false },
  };
}

// ---- STATE -----------------------------------------------------------------

const STATE = defaultState();

// ---- Persistence -----------------------------------------------------------

const LOCAL_KEY = 'more_me_state';

function saveLocal() {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(STATE)); } catch (e) {}
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    mergeState(parsed);
    return true;
  } catch (e) { return false; }
}

function mergeState(incoming) {
  // Shallow merge each top-level key, trusting incoming for scalars
  // but keeping default shape for nested objects.
  const d = defaultState();
  for (const key of Object.keys(d)) {
    if (incoming[key] === undefined || incoming[key] === null) continue;
    if (typeof d[key] === 'object' && !Array.isArray(d[key])) {
      STATE[key] = Object.assign({}, d[key], incoming[key]);
    } else {
      STATE[key] = incoming[key];
    }
  }
  // deep-merge for a few known sub-objects
  if (incoming.today) STATE.today = Object.assign(defaultTodayBlock(), incoming.today);
  if (incoming.weekly) STATE.weekly = Object.assign(defaultWeekly(), incoming.weekly);
  if (incoming.habits) STATE.habits = Object.assign(defaultHabitsBlock(), incoming.habits);
  if (incoming.achievements) {
    STATE.achievements.unlocked = incoming.achievements.unlocked || [];
    STATE.achievements.progress = Object.assign(d.achievements.progress, incoming.achievements.progress || {});
  }
}

async function cloudSave() {
  saveLocal();
  if (!STATE.user) return;
  try {
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save',
        email: STATE.user.email,
        code: STATE.user.code,
        key: 'more_me:state',
        value: JSON.stringify(STATE),
      }),
    });
  } catch (e) { /* network — we already saved local */ }
}

async function cloudLoad() {
  if (!STATE.user) return false;
  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'load',
        email: STATE.user.email,
        code: STATE.user.code,
        key: 'more_me:state',
      }),
    });
    const data = await res.json();
    if (data.value) {
      mergeState(JSON.parse(data.value));
      return true;
    }
  } catch (e) { /* fall through */ }
  return false;
}

// Save debounced so repeated XP taps don't flood the network
let _saveTimer = null;
function scheduleSave() {
  saveLocal();
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => { cloudSave(); }, 800);
}
