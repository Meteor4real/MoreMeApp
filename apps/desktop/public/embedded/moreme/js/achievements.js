/* ==========================================================================
   achievements.js — Named badges with lock/unlock state
   ========================================================================== */

// Each achievement has:
//   id:   stable key
//   title: display name (often funny per user's spec)
//   desc: progression text
//   icon: emoji
//   goal: numeric target
//   counter: key under STATE.achievements.progress
//
// Some achievements are unlocked via explicit "claim" actions rather than
// passive counters — those use counter: null and a manual unlock button.

const ACHIEVEMENTS = [
  // --- Skill ---
  { id: 'first_steps',    title: 'First Steps',                  desc: 'Complete your first workout.',             icon: '👟', goal: 1,  counter: 'workouts' },
  { id: 'run',            title: 'RUN!!!!!',                     desc: 'Run 1 mile without stopping.',             icon: '🏃', goal: 1,  counter: 'milesRun' },
  { id: 'iron_arms',      title: 'Iron Arms',                    desc: 'Do 20 push-ups in a row.',                 icon: '💪', goal: 20, counter: 'pushupStreak' },
  { id: 'solid_rock',     title: 'Basically a solid rock',       desc: 'Hold a 1-minute plank.',                   icon: '🗿', goal: 60, counter: 'plankSeconds' },
  { id: 'still_sweat',    title: 'I may not be a threat, but I still sweat', desc: 'Complete 10 sports sessions.', icon: '⚽', goal: 10, counter: 'sports' },

  // --- Learning ---
  { id: 'dad_understand', title: 'DAD, I UNDERSTAND!',           desc: 'Finish a Khan Academy unit.',              icon: '📘', goal: 1,  counter: 'khanUnits' },
  { id: 'noredink',       title: 'Was it hard or easy?',         desc: 'Finish a NoRedInk assignment streak.',     icon: '📝', goal: 1,  counter: 'noRedInkStreak' },
  { id: 'no_drugs',       title: 'He isn\u2019t using drugs!?',   desc: 'Don\u2019t get distracted for a week.',     icon: '🧘', goal: 7,  counter: 'focusWeek' },
  { id: 'wait_wait',      title: 'I wait, wait, and wait some more', desc: 'Read a full book.',                     icon: '📖', goal: 1,  counter: 'bookRead' },

  // --- Discipline ---
  { id: 'energized',      title: 'I\u2019m either really energized or really sleepy!', desc: 'Arrive on time 10 days in a row.', icon: '⏰', goal: 10, counter: 'onTimeStreak' },
  { id: 'dedication',     title: 'Dedication',                   desc: 'Morning routine 14 days straight.',        icon: '☀️', goal: 14, counter: 'morningStreak' },
  { id: 'momentum',       title: 'Momentum!',                    desc: 'Complete all weekly quests.',              icon: '🚀', goal: 1,  counter: 'weeklyComplete' },

  // --- Project ---
  { id: 'am_i_buff',      title: 'Am I buff yet?',               desc: 'Finish a physical project.',               icon: '🏋️', goal: 1,  counter: 'physicalProjects' },
  { id: 'minecraf',       title: 'I\u2019ma do a minecraf',       desc: 'Finish a digital project.',                icon: '🧱', goal: 1,  counter: 'digitalProjects' },
  { id: 'so_tired',       title: 'I\u2019m so tired\u2026',       desc: 'Complete a 3-month goal.',                 icon: '😴', goal: 1,  counter: 'threeMonthGoal' },

  // --- Special ---
  { id: 'sand_pants',     title: 'I got sand in my pants again!', desc: 'Complete 3 beach workouts.',              icon: '🏖', goal: 3,  counter: 'beachWorkouts' },
  { id: 'where_am_i',     title: 'Where am I?',                  desc: 'Complete a travel routine in another place.', icon: '🧭', goal: 1,  counter: 'travelRoutines' },
  { id: 'easier_plank',   title: 'It makes it easier to do the plank!', desc: 'Work out in freezing temps.',       icon: '❄️', goal: 1,  counter: 'coldWorkouts' },
  { id: 'getting_old',    title: 'I\u2019m getting old',          desc: '30-day streak in any category.',           icon: '🎖', goal: 30, counter: '_streak30' }, // synthetic
];

// Bump an achievement counter; auto-unlock if goal reached.
function bumpAchievement(counterId, delta = 1) {
  const p = STATE.achievements.progress;
  p[counterId] = Math.max(0, (p[counterId] || 0) + delta);
  checkAchievementUnlocks();
}

function setAchievement(counterId, value) {
  STATE.achievements.progress[counterId] = value;
  checkAchievementUnlocks();
}

function checkAchievementUnlocks() {
  // Derive synthetic counter for 30-day streak
  STATE.achievements.progress._streak30 = STATE.streak.count;

  const unlocked = new Set(STATE.achievements.unlocked);
  for (const a of ACHIEVEMENTS) {
    if (unlocked.has(a.id)) continue;
    const val = STATE.achievements.progress[a.counter] || 0;
    if (val >= a.goal) {
      STATE.achievements.unlocked.push(a.id);
      unlocked.add(a.id);
      showToast(`🏆 Unlocked: ${a.title}`, 'success');
      if (typeof playSFX === 'function') playSFX('achievement');
    }
  }
  scheduleSave();
}

function renderAchievements() {
  const host = document.getElementById('achGrid');
  const unlockedEl = document.getElementById('achUnlocked');
  const totalEl = document.getElementById('achTotal');
  if (!host) return;

  checkAchievementUnlocks();
  const unlocked = new Set(STATE.achievements.unlocked);

  if (unlockedEl) unlockedEl.textContent = unlocked.size;
  if (totalEl) totalEl.textContent = ACHIEVEMENTS.length;

  host.innerHTML = ACHIEVEMENTS.map(a => {
    const isUnlocked = unlocked.has(a.id);
    const val = STATE.achievements.progress[a.counter] || 0;
    const pct = Math.min(100, Math.round((val / a.goal) * 100));
    return `
      <div class="ach-card ${isUnlocked ? 'is-unlocked' : 'is-locked'}">
        <div class="ach-badge">${isUnlocked ? a.icon : '🔒'}</div>
        <div class="ach-title">${a.title}</div>
        <div class="ach-desc">${a.desc}</div>
        ${!isUnlocked ? `
          <div class="ach-progress"><div class="ach-progress-fill" style="width:${pct}%"></div></div>
          <div class="tiny" style="margin-top:4px;">${Math.min(val, a.goal)} / ${a.goal}</div>
        ` : `<div class="tiny" style="color:var(--ok);margin-top:4px;">Unlocked</div>`}
      </div>`;
  }).join('');
}
