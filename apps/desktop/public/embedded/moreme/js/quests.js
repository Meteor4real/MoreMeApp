/* ==========================================================================
   quests.js — Daily action toggles + weekly quest tracking
   ========================================================================== */

const WEEKLY_QUESTS = [
  { id: 'workouts',   label: '3 workouts',            goal: 3 },
  { id: 'sports',     label: '3 sports sessions',     goal: 3 },
  { id: 'milestones', label: '1 project milestone',   goal: 1 },
  { id: 'focus',      label: '5 focus blocks',        goal: 5 },
  { id: 'onTime',     label: '5 days on time',        goal: 5 },
];
const WEEKLY_REWARD = 50;

// ---- Ensure weekly block is fresh -----------------------------------------

function rotateWeeklyIfNeeded() {
  const wk = weekKey();
  if (STATE.weekly.weekKey !== wk) {
    STATE.weekly = defaultWeekly();
  }
  // Also rotate habits week
  if (STATE.habits.weekKey !== wk) {
    // Keep the same habit list, just clear the checkmarks
    STATE.habits.weekKey = wk;
    for (const h of STATE.habits.list) {
      h.days = [false, false, false, false, false, false, false];
    }
  }
}

// ---- Toggle / increment a daily action ------------------------------------

function performDaily(actionId) {
  const def = DAILY_ACTIONS.find(a => a.id === actionId);
  if (!def) return;

  rotateWeeklyIfNeeded();
  const t = STATE.today;

  if (def.type === 'toggle') {
    if (t.actions[actionId]) return; // already claimed today
    t.actions[actionId] = true;
    addXP(def.xp, def.label);
    if (def.quest) bumpQuest(def.quest);
  } else if (def.type === 'count') {
    t.actions[actionId] = (t.actions[actionId] || 0) + 1;
    addXP(def.xp, def.label + ' #' + t.actions[actionId]);
    if (def.quest) bumpQuest(def.quest);
  }

  markStreakActive();
  renderHome();
  renderXpStrip();
}

function undoDaily(actionId) {
  const def = DAILY_ACTIONS.find(a => a.id === actionId);
  if (!def) return;
  const t = STATE.today;

  if (def.type === 'toggle') {
    if (!t.actions[actionId]) return;
    t.actions[actionId] = false;
    addXP(-def.xp, 'Undo: ' + def.label);
    if (def.quest) bumpQuest(def.quest, -1);
  } else if (def.type === 'count') {
    const n = t.actions[actionId] || 0;
    if (n <= 0) return;
    t.actions[actionId] = n - 1;
    addXP(-def.xp, 'Undo: ' + def.label);
    if (def.quest) bumpQuest(def.quest, -1);
  }
  renderHome();
  renderXpStrip();
}

function performBonus(bonusId) {
  const def = BONUS_ACTIONS.find(a => a.id === bonusId);
  if (!def) return;
  STATE.today.extras[bonusId] = (STATE.today.extras[bonusId] || 0) + 1;
  addXP(def.xp, def.label);
  if (def.quest) bumpQuest(def.quest);
  markStreakActive();
  renderHome();
  renderXpStrip();
}

function performPenalty(penaltyId) {
  const def = PENALTIES.find(p => p.id === penaltyId);
  if (!def) return;
  if (penaltyId === 'noEffort') {
    if (STATE.today.penalties.noEffort) return;
    STATE.today.penalties.noEffort = true;
  } else {
    STATE.today.penalties[penaltyId] = (STATE.today.penalties[penaltyId] || 0) + 1;
  }
  addXP(def.xp, def.label);
  renderHome();
  renderXpStrip();
}

function bumpQuest(id, delta = 1) {
  rotateWeeklyIfNeeded();
  const q = STATE.weekly.quests;
  q[id] = Math.max(0, (q[id] || 0) + delta);
  checkWeeklyReward();
}

function checkWeeklyReward() {
  if (STATE.weekly.rewardClaimed) return;
  const allDone = WEEKLY_QUESTS.every(q => STATE.weekly.quests[q.id] >= q.goal);
  if (allDone) {
    STATE.weekly.rewardClaimed = true;
    addXP(WEEKLY_REWARD, 'Weekly quests complete');
    showToast('All weekly quests done! +50 XP bonus.', 'success');
  }
}

// ---- Rendering ------------------------------------------------------------

function renderHome() {
  renderScoreboard();
  renderCalendar();
  renderTop3();
  renderXpLog();
  renderBreakChallenge();
  renderTodayLabel();
}

function renderScoreboard() {
  const el = {
    streak:     document.getElementById('sbStreak'),
    todayXP:    document.getElementById('sbTodayXP'),
    tier:       document.getElementById('sbTier'),
    tierName:   document.getElementById('sbTierName'),
    seasonXP:   document.getElementById('sbSeasonXP'),
    seasonName: document.getElementById('sbSeasonName'),
  };
  if (el.streak)     el.streak.textContent     = STATE.streak.count || 0;
  if (el.todayXP)    el.todayXP.textContent    = STATE.today.xpEarned || 0;
  if (el.tier)       el.tier.textContent       = STATE.xp.level || 1;
  if (el.tierName)   el.tierName.textContent   = tierName(STATE.xp.level || 1);
  if (el.seasonXP)   el.seasonXP.textContent   = STATE.season.totalXP || 0;
  if (el.seasonName) el.seasonName.textContent = STATE.season.theme || 'Foundation';
}

// Refresh scoreboard on every XP event without re-rendering the whole home panel.
onXPChange(renderScoreboard);

function renderTodayLabel() {
  const el = document.getElementById('todayDateLabel');
  if (!el) return;
  const d = new Date();
  el.textContent = d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

// ---- Calendar-style weekly log -------------------------------------------
// 7-column grid, one column per day (Mon–Sun). Each column shows the day's
// date, a "right now" schedule banner for today, and tappable action rows.
// Past days are read-only; future days are dimmed.

const DOW_SHORT  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ACTION_ICONS = {
  morning: '🌅', workout: '🏋️', sports: '⚽', focus: '📚',
  noYT: '📵', onTime: '⏰', moveMin: '🏃', projectWork: '💻',
  extraWorkout: '🏈', extraSports: '🏀', hardThing: '🔥',
  milestone: '🏆', projectComplete: '🎯',
};

const DAILY_SCHEDULE = [
  { start: '0530', end: '0630', label: 'Wake up — morning routine',        icon: '🌅' },
  { start: '0630', end: '0730', label: 'Workout — get the reps in',        icon: '🏋️' },
  { start: '0730', end: '0800', label: 'Get ready — on-time start',        icon: '⏰' },
  { start: '0800', end: '1500', label: 'School — focus, no YouTube',       icon: '📚' },
  { start: '1500', end: '1700', label: 'Sports session — hit the court',   icon: '🏀' },
  { start: '1700', end: '1930', label: 'Project work — 20+ minutes',       icon: '💻' },
  { start: '1930', end: '2100', label: 'Homework / read / free time',      icon: '📖' },
  { start: '2100', end: '2200', label: 'Night routine — wind down',        icon: '🌙' },
  { start: '2200', end: '2359', label: 'Sleep. Recover. Show up tomorrow.', icon: '💤' },
];

function _toMins(hhmm) {
  return parseInt(hhmm.slice(0, 2), 10) * 60 + parseInt(hhmm.slice(2), 10);
}
function _nowActivity() {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  return DAILY_SCHEDULE.find(s => mins >= _toMins(s.start) && mins < _toMins(s.end)) || DAILY_SCHEDULE[DAILY_SCHEDULE.length - 1];
}
function _fmtTime(hhmm) {
  const h = parseInt(hhmm.slice(0, 2), 10);
  const m = hhmm.slice(2);
  const ampm = h >= 12 ? 'pm' : 'am';
  return (h % 12 || 12) + ':' + m + ' ' + ampm;
}

function _todayDow()   { return dowIndex(new Date()); }
function _daySnapshot(dow) {
  if (dow === _todayDow()) {
    return { actions: STATE.today.actions, extras: STATE.today.extras, penalties: STATE.today.penalties, isToday: true };
  }
  const snap = (STATE.weekly && STATE.weekly.days) ? STATE.weekly.days[dow] : null;
  if (snap) return { actions: snap.actions || {}, extras: snap.extras || {}, penalties: snap.penalties || {} };
  return { actions: {}, extras: {}, penalties: {} };
}

function _calRow(action, dow, kind, isToday, isPast) {
  const snap = _daySnapshot(dow);
  let done = false, count = 0;
  if (kind === 'daily') {
    const v = snap.actions[action.id];
    done = action.type === 'toggle' ? !!v : (v || 0) > 0;
    count = action.type === 'count' ? (v || 0) : 0;
  } else if (kind === 'bonus') {
    count = snap.extras[action.id] || 0;
    done = count > 0;
  } else if (kind === 'penalty') {
    const v = snap.penalties[action.id] || 0;
    done = !!v; count = typeof v === 'number' ? v : 0;
  }

  const icon = ACTION_ICONS[action.id] || (kind === 'penalty' ? '⚠️' : '🎯');
  const label = action.label || action.id;
  const xpLabel = `${kind === 'penalty' ? '' : '+'}${action.xp}`;
  const countBadge = count > 1 ? `<span class="cal-ck">×${count}</span>` : '';

  if (isToday) {
    return `<div class="cal-row">
      <button class="cal-action-btn${done ? ' is-done' : ''}" data-cal-kind="${kind}" data-cal-id="${action.id}" title="${label} (${xpLabel} XP)">
        <span class="cal-ai">${icon}</span>
        <span class="cal-al">${label}</span>
        ${countBadge}
        <span class="cal-ax">${xpLabel}</span>
      </button>
      ${kind === 'daily' && done ? `<button class="cal-undo-btn" data-cal-undo="${action.id}" title="Undo">−</button>` : ''}
    </div>`;
  }
  if (isPast) {
    return `<div class="cal-row cal-action-item${done ? ' is-done' : ''}">
      <span class="cal-ai">${icon}</span>
      <span class="cal-al">${label}</span>
      ${countBadge}
    </div>`;
  }
  // future — dimmed, no interaction
  return `<div class="cal-row cal-action-item">
    <span class="cal-ai">${icon}</span>
    <span class="cal-al">${label}</span>
  </div>`;
}

function renderCalendar() {
  const host = document.getElementById('calendar');
  if (!host) return;
  rotateWeeklyIfNeeded();

  const tdow  = _todayDow();
  const now   = new Date();
  // Monday of the current week
  const monDate = new Date(now);
  monDate.setDate(now.getDate() - tdow);
  monDate.setHours(0, 0, 0, 0);

  // "Right now" banner
  const activity = _nowActivity();
  const nowBanner = `<div class="cal-now-banner">
    <span class="cal-now-icon">${activity.icon}</span>
    <div class="cal-now-text">
      <span class="cal-now-label">Right now</span>
      <span class="cal-now-activity">${activity.label}</span>
    </div>
    <span class="cal-now-time">${_fmtTime(activity.start)} – ${_fmtTime(activity.end)}</span>
  </div>`;

  // Build columns
  const cols = DOW_SHORT.map((lbl, dow) => {
    const isToday  = dow === tdow;
    const isPast   = dow < tdow;
    const colDate  = new Date(monDate);
    colDate.setDate(monDate.getDate() + dow);
    const dateNum  = colDate.getDate();
    const monthLbl = colDate.toLocaleDateString([], { month: 'short' });

    const dailyRows   = DAILY_ACTIONS.map(a => _calRow(a, dow, 'daily', isToday, isPast)).join('');
    const bonusRows   = BONUS_ACTIONS.map(b => _calRow(b, dow, 'bonus', isToday, isPast)).join('');
    const penaltyRows = PENALTIES.map(p => _calRow(p, dow, 'penalty', isToday, isPast)).join('');

    return `<div class="cal-day${isToday ? ' is-today' : (isPast ? ' is-past' : ' is-future')}">
      <div class="cal-day-head">
        <span class="cal-date-num">${dateNum}</span>
        <span class="cal-month">${lbl} · ${monthLbl}</span>
      </div>
      <div class="cal-day-body">
        <div class="cal-section-label">Daily</div>
        ${dailyRows}
        <div class="cal-section-label">Bonus</div>
        ${bonusRows}
        <div class="cal-section-label is-penalty">Penalties</div>
        ${penaltyRows}
      </div>
    </div>`;
  }).join('');

  host.innerHTML = `${nowBanner}<div class="cal-grid">${cols}</div>`;

  host.addEventListener('click', e => {
    const btn = e.target.closest('[data-cal-kind]');
    if (btn) {
      const kind = btn.dataset.calKind, id = btn.dataset.calId;
      if (kind === 'daily')   { performDaily(id);   renderCalendar(); }
      else if (kind === 'bonus')   { performBonus(id);   renderCalendar(); }
      else if (kind === 'penalty') { performPenalty(id); renderCalendar(); }
      return;
    }
    const undo = e.target.closest('[data-cal-undo]');
    if (undo) { undoDaily(undo.dataset.calUndo); renderCalendar(); }
  });
}

function renderWeeklyQuests() {
  const host = document.getElementById('weeklyQuests');
  const reward = document.getElementById('weeklyReward');
  if (!host) return;
  rotateWeeklyIfNeeded();

  const rows = WEEKLY_QUESTS.map(q => {
    const cur = STATE.weekly.quests[q.id] || 0;
    const done = cur >= q.goal;
    return `
      <div class="quest${done ? ' is-done' : ''}">
        <span class="quest-check">${done ? '✓' : ''}</span>
        <span>${q.label}</span>
        <span class="quest-progress">${Math.min(cur, q.goal)} / ${q.goal}</span>
      </div>`;
  });
  host.innerHTML = rows.join('');

  if (reward) {
    if (STATE.weekly.rewardClaimed) {
      reward.textContent = '✓ +50 XP bonus claimed this week.';
    } else {
      const remaining = WEEKLY_QUESTS.reduce((acc, q) => acc + Math.max(0, q.goal - (STATE.weekly.quests[q.id] || 0)), 0);
      reward.textContent = remaining === 0
        ? 'All complete — bonus about to land.'
        : `${remaining} checks left → +50 XP bonus.`;
    }
  }
}

function renderTop3() {
  const form = document.getElementById('top3Form');
  if (!form) return;
  const t = STATE.today.top3;
  form.querySelectorAll('[data-top3]').forEach(inp => {
    const field = inp.dataset.top3;
    inp.value = t[field] || '';
    inp.oninput = () => {
      STATE.today.top3[field] = inp.value;
      scheduleSave();
    };
  });
  const state = document.getElementById('top3State');
  if (state) {
    const filled = Object.values(STATE.today.top3).filter(Boolean).length;
    state.textContent = filled === 3
      ? '✓ Three goals set. Lock in.'
      : `${filled} / 3 set.`;
  }
}

function renderXpLog() {
  const host = document.getElementById('xpLog');
  if (!host) return;
  const log = STATE.today.log;
  if (!log.length) {
    host.innerHTML = `<li style="color:var(--ink-tiny);font-style:italic;">Nothing logged yet — warm up and get on the board.</li>`;
    return;
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  host.innerHTML = log.map(e => `
    <li>
      <span>${esc(e.ts)} · ${esc(e.label)}</span>
      <span class="log-amount${e.amount < 0 ? ' is-neg' : ''}">${e.amount > 0 ? '+' : ''}${e.amount}</span>
    </li>`).join('');
}

function renderBreakChallenge() {
  const host = document.getElementById('breakList');
  const dayLabel = document.getElementById('breakChallengeDay');
  if (!host || !dayLabel) return;

  // Day of the week drives the rotation — no manual skip button. Monday = 1.
  const BREAK_DAYS = [
    ['Push-up test', 'Squat test', 'Plank test'],
    ['Long walk or run', 'Bike ride', 'Jump rope'],
    ['Practice a sport', 'Learn something new', 'Improve a technique'],
    ['Make major progress on a personal project'],
    ['Explore somewhere new', 'Try a new activity'],
    ['Clean room', 'Organize digital files', 'Plan next week'],
    ['Review wins', 'Set new goals', 'Celebrate progress'],
  ];
  const DOW_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const day = dowIndex(new Date());
  dayLabel.textContent = DOW_NAMES[day] + ' — session break';
  host.innerHTML = BREAK_DAYS[day].map(item => `<li>${item}</li>`).join('');
}
