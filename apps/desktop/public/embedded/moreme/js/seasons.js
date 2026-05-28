/* ==========================================================================
   seasons.js — Monthly seasons with themes + end-of-season rollover
   ========================================================================== */

const SEASON_THEMES = [
  { name: 'Preseason',         goal: 'Hit Varsity tier and a 7-day streak.' },
  { name: 'Training Camp',     goal: 'Complete one personal project.' },
  { name: 'First Quarter',     goal: 'Finish one full Khan Academy unit.' },
  { name: 'Endurance',         goal: 'Run one mile without stopping.' },
  { name: 'Iron Week',         goal: '12 workouts in the month.' },
  { name: 'Halftime Push',     goal: 'Hit a 14-day streak.' },
  { name: 'Scrimmage',         goal: 'Ship one digital project milestone.' },
  { name: 'Two-A-Days',        goal: 'Morning routine 14 days in a row.' },
  { name: 'Tryouts',           goal: 'Try one new activity or sport.' },
  { name: 'Recovery Week',     goal: 'Clean, plan, prep for next season.' },
  { name: 'Playoffs',          goal: 'Hit Elite tier before the month ends.' },
  { name: 'Championship',      goal: 'Reach MVP tier and prestige.' },
];

function rolloverSeasonIfNeeded() {
  const now = monthKey();
  if (STATE.season.startedMonth === now) return;

  // If you ended the season at max level, auto-prestige — earned, not a button.
  if (STATE.xp.level >= MAX_LEVEL && typeof prestige === 'function') {
    prestige();
  }

  // Archive the previous season in a lightweight way — we don't keep deep
  // history in state (keeps the blob small); just bump the number and reset.
  STATE.season.number += 1;
  STATE.season.startedMonth = now;
  STATE.season.totalXP = 0;

  const pick = SEASON_THEMES[(STATE.season.number - 1) % SEASON_THEMES.length];
  STATE.season.theme = pick.name;
  STATE.season.goal = pick.goal;

  // Per spec: season end resets streaks, keeps achievements.
  STATE.streak.count = 0;
  STATE.streak.lastRewarded = 0;
  STATE.streak.lastActiveDate = null;

  showToast(`Season ${STATE.season.number}: ${pick.name}. ${pick.goal}`, 'success');
  scheduleSave();
}

// ---- Render battlepass panel ----------------------------------------------

function renderBattlepass() {
  renderSeasonBar();
  renderTierTrack();
}

function renderSeasonBar() {
  const theme = document.getElementById('seasonTheme');
  const ends = document.getElementById('seasonEnds');
  const label = document.getElementById('seasonLabel');
  const fill = document.getElementById('seasonProgressFill');

  if (label) label.textContent = `Season ${STATE.season.number}`;
  if (theme) theme.textContent = `${STATE.season.theme} — ${STATE.season.goal}`;
  if (ends) {
    const [y, m] = STATE.season.startedMonth.split('-').map(Number);
    const last = new Date(y, m, 0);
    ends.textContent = `Ends ${last.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
  }
  if (fill) {
    // progress ~ totalXP this season vs rough target of 1000
    const pct = Math.min(100, Math.round((STATE.season.totalXP / 1000) * 100));
    fill.style.width = pct + '%';
  }
}

function renderTierTrack() {
  const host = document.getElementById('tierTrack');
  if (!host) return;
  const cur = STATE.xp.level;
  const rows = TIER_NAMES.map((name, i) => {
    const level = i + 1;
    const cls = level < cur ? 'is-unlocked'
              : level === cur ? 'is-current'
              : '';
    return `
      <div class="tier-node ${cls}">
        <div class="tier-node-num">${level}</div>
        <div class="tier-node-name">${name}</div>
      </div>`;
  });
  host.innerHTML = rows.join('');
}

