/* ==========================================================================
   streaks.js — Daily streak tracking + milestone bonuses
   ========================================================================== */

const STREAK_REWARDS = [
  { day: 3,  xp: 10 },
  { day: 7,  xp: 25 },
  { day: 14, xp: 50 },
  { day: 30, xp: 100, tierSkip: true },
];

// Called whenever any positive action is taken today.
// If it's a new calendar day, advance the streak; otherwise no-op.
function markStreakActive() {
  const today = todayISO();
  const last = STATE.streak.lastActiveDate;

  if (last === today) return; // already counted today

  if (!last) {
    STATE.streak.count = 1;
  } else {
    const lastDate = new Date(last + 'T00:00:00');
    const now = new Date(today + 'T00:00:00');
    const daysApart = Math.round((now - lastDate) / 86400000);
    if (daysApart === 1) {
      STATE.streak.count += 1;
    } else if (daysApart > 1) {
      // Streak broken
      STATE.streak.count = 1;
      STATE.streak.lastRewarded = 0;
    } else {
      // Clock skew / same day edge — just keep count
    }
  }
  STATE.streak.lastActiveDate = today;
  checkStreakRewards();
}

function checkStreakRewards() {
  for (const r of STREAK_REWARDS) {
    if (STATE.streak.count >= r.day && STATE.streak.lastRewarded < r.day) {
      STATE.streak.lastRewarded = r.day;
      addXP(r.xp, `${r.day}-day streak bonus`);
      if (typeof playSFX === 'function') playSFX('streak');
      if (r.tierSkip && STATE.xp.level < MAX_LEVEL) {
        STATE.xp.level += 1;
        STATE.xp.current = 0;
        showToast(`30-day streak! Tier skip → ${tierName(STATE.xp.level)}`, 'success');
      }
    }
  }
}

// Daily rollover: called on load if today !== STATE.today.date.
function rolloverDay() {
  if (STATE.today.date === todayISO()) return;

  // If the user earned nothing yesterday and didn't mark no-effort,
  // we DON'T auto-break the streak — they just don't advance it.
  // Streak only advances when markStreakActive() fires.

  // Snapshot yesterday's log into the weekly grid before wiping.
  if (STATE.today.date && STATE.weekly && Array.isArray(STATE.weekly.days)) {
    const prev = new Date(STATE.today.date + 'T00:00:00');
    if (!isNaN(prev.getTime())) {
      const prevWeek = weekKey(prev);
      if (prevWeek === STATE.weekly.weekKey) {
        const dow = dowIndex(prev);
        STATE.weekly.days[dow] = {
          actions: Object.assign({}, STATE.today.actions),
          extras: Object.assign({}, STATE.today.extras),
          penalties: Object.assign({}, STATE.today.penalties),
          xp: STATE.today.xpEarned,
        };
      }
    }
  }

  STATE.today = defaultTodayBlock();
  rotateWeeklyIfNeeded();
}
