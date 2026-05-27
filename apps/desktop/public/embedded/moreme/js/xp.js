/* ==========================================================================
   xp.js — XP values, levels, tiers, prestige
   ========================================================================== */

const TIER_NAMES = [
  'Rookie',             // Lv 1
  'Starter',            // Lv 2
  'Varsity',            // Lv 3
  'Captain',            // Lv 4
  'All-Star',           // Lv 5
  'Playoff Contender',  // Lv 6
  'Athlete',            // Lv 7
  'Elite',              // Lv 8
  'Unstoppable',        // Lv 9
  'MVP',                // Lv 10
];

const MAX_LEVEL = 10;
const BASE_LEVEL_COST = 100;
const MAX_LEVEL_COST = 400;

function levelCost(prestige) {
  return Math.min(BASE_LEVEL_COST + prestige * 100, MAX_LEVEL_COST);
}

function tierName(level) {
  return TIER_NAMES[Math.max(0, Math.min(MAX_LEVEL - 1, level - 1))];
}

// ---- XP action catalog ----------------------------------------------------

const DAILY_ACTIONS = [
  { id: 'morning',     label: 'Morning routine',         xp: 10, type: 'toggle', quest: null },
  { id: 'workout',     label: 'Workout',                 xp: 20, type: 'count',  quest: 'workouts' },
  { id: 'sports',      label: 'Sports session',          xp: 15, type: 'count',  quest: 'sports' },
  { id: 'focus',       label: 'Focus block at school',   xp: 15, type: 'count',  quest: 'focus' },
  { id: 'noYT',        label: 'No YouTube at school',    xp: 10, type: 'toggle', quest: null },
  { id: 'onTime',      label: 'Arrived on time',         xp: 10, type: 'toggle', quest: 'onTime' },
  { id: 'moveMin',     label: '2-minute minimum movement', xp: 5, type: 'toggle', quest: null },
  { id: 'projectWork', label: 'Project work (20+ min)',  xp: 20, type: 'count',  quest: null },
];

const BONUS_ACTIONS = [
  { id: 'extraWorkout',    label: 'Extra workout',                    xp: 10, quest: 'workouts' },
  { id: 'extraSports',     label: 'Extra sports session',             xp: 10, quest: 'sports' },
  { id: 'hardThing',       label: 'Did the hard thing',               xp: 20 },
  { id: 'milestone',       label: 'Finished a project milestone',     xp: 30, quest: 'milestones' },
  { id: 'projectComplete', label: 'Finished a project',               xp: 100 },
];

const PENALTIES = [
  { id: 'ruleBreak', label: 'Broke a rule I set', xp: -10 },
  { id: 'noEffort',  label: 'No-effort day',      xp: -20 },
];

// ---- Adding XP ------------------------------------------------------------

// Subscribers for post-award effects (render, achievements, streak bump).
const _xpSubs = [];
function onXPChange(fn) { _xpSubs.push(fn); }

function addXP(amount, label) {
  if (!amount) return;
  const x = STATE.xp;
  x.current += amount;
  if (amount > 0) {
    x.totalEarned += amount;
    STATE.season.totalXP += amount;
  }

  // Level up while we have enough
  while (x.current >= levelCost(x.prestige) && x.level < MAX_LEVEL) {
    x.current -= levelCost(x.prestige);
    x.level += 1;
    showToast(`Tier up — ${tierName(x.level)}!`, 'success');
  }
  // Cap at max level; overflow XP stays in current until prestige
  if (x.level >= MAX_LEVEL) x.level = MAX_LEVEL;

  // Can't drop below 0 within a level
  if (x.current < 0) {
    if (x.level > 1) {
      x.level -= 1;
      x.current = Math.max(0, levelCost(x.prestige) + x.current);
    } else {
      x.current = 0;
    }
  }

  STATE.today.xpEarned += amount;
  STATE.today.log.unshift({ label, amount, ts: shortTime() });
  if (STATE.today.log.length > 60) STATE.today.log.length = 60;

  for (const fn of _xpSubs) { try { fn(amount, label); } catch (e) {} }

  showXPFloat(amount);
  scheduleSave();
}

function prestige() {
  if (STATE.xp.level < MAX_LEVEL) return false;
  STATE.xp.prestige += 1;
  STATE.xp.level = 1;
  STATE.xp.current = 0;
  // Streaks reset on prestige per spec
  STATE.streak.count = 0;
  STATE.streak.lastRewarded = 0;
  showToast(`Prestige ${STATE.xp.prestige} — fresh climb, same you.`, 'success');
  scheduleSave();
  return true;
}

// ---- UI helpers -----------------------------------------------------------

function showXPFloat(amount) {
  const el = document.getElementById('xpGain');
  if (!el) return;
  el.textContent = (amount > 0 ? '+' : '') + amount + ' XP';
  el.hidden = false;
  el.style.animation = 'none';
  void el.offsetWidth; // reflow
  el.style.animation = '';
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => { el.hidden = true; }, 1100);
}

function showToast(msg, variant) {
  const stack = document.getElementById('toastStack');
  if (!stack) return;
  const t = document.createElement('div');
  t.className = 'toast' + (variant ? ' is-' + variant : '');
  t.textContent = msg;
  stack.appendChild(t);
  setTimeout(() => {
    t.style.transition = 'opacity 0.3s';
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 320);
  }, 2600);
}

// ---- Render XP strip ------------------------------------------------------

function renderXpStrip() {
  const x = STATE.xp;
  const cost = levelCost(x.prestige);
  const pct = Math.min(100, Math.round((x.current / cost) * 100));
  const fill = document.getElementById('xpFill');
  const text = document.getElementById('xpText');
  const tier = document.getElementById('tierLabel');
  const level = document.getElementById('levelLabel');
  const prestigeEl = document.getElementById('prestigeLabel');
  const streak = document.getElementById('streakLabel');

  if (fill) fill.style.width = pct + '%';
  if (text) text.textContent = `${x.current} / ${cost} XP`;
  if (tier) tier.textContent = tierName(x.level);
  if (level) level.textContent = x.level;
  if (prestigeEl) {
    if (x.prestige > 0) {
      prestigeEl.hidden = false;
      prestigeEl.textContent = `Prestige ${x.prestige}`;
    } else {
      prestigeEl.hidden = true;
    }
  }
  if (streak) streak.textContent = STATE.streak.count;
}
