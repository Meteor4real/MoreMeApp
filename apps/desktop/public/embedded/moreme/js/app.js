/* ==========================================================================
   app.js — Bootstrap, auth, navigation, and the remaining panel renderers
   (projects, goals, habits, settings)
   ========================================================================== */

const SESSION_KEY = 'more_me_session';

// ---- Screen switching ------------------------------------------------------

function showScreen(name) {
  document.body.dataset.screen = name;
  document.querySelectorAll('.screen').forEach(el => {
    el.hidden = el.dataset.screenName !== name;
  });
}

function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('is-active', t.dataset.tab === name);
  });
  document.querySelectorAll('.panel').forEach(p => {
    p.hidden = p.dataset.panel !== name;
  });
  switch (name) {
    case 'home':
      renderHome();
      break;
    case 'progress':
      renderBattlepass();
      renderWeeklyQuests();
      renderAchievements();
      break;
    case 'plan':
      renderProjects();
      renderRoutines();
      renderGoals();
      renderHabits();
      renderPacking();
      renderTravelModeTabs();
      break;
    case 'settings':
      renderSettings();
      break;
  }
}

// ---- Bootstrap -------------------------------------------------------------

async function boot() {
  showScreen('loading');
  loadLocal();
  applyTheme();

  const session = getStoredSession();
  if (session) {
    STATE.user = session;
    await cloudLoad();
    rolloverDay();
    rolloverSeasonIfNeeded();
    rotateWeeklyIfNeeded();
    checkAchievementUnlocks();
    enterApp();
  } else {
    await detectLoginMode();
    showScreen('login');
    rotateLoginQuote();
  }
}

function getStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s && s.email && s.code) return s;
  } catch (e) {}
  return null;
}

function storeSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function enterApp() {
  showScreen('app');
  wireAppEvents();
  const nameEl = document.getElementById('userName');
  if (nameEl && STATE.user) {
    nameEl.textContent = STATE.user.username || STATE.user.firstName || STATE.user.email;
  }
  renderXpStrip();
  renderRockBanner();
  renderQuickLog();
  if (typeof startClock === 'function') startClock();
  // Ask for notification permission only if the user has opted in.
  if (STATE.settings && STATE.settings.notify && typeof requestNotifyPermissionOnce === 'function') {
    requestNotifyPermissionOnce();
  }
  // Audio contexts need a user gesture to unmute. Prime on first interaction.
  const _primeOnGesture = () => {
    if (typeof primeAudio === 'function') primeAudio();
    document.removeEventListener('click', _primeOnGesture);
    document.removeEventListener('keydown', _primeOnGesture);
  };
  document.addEventListener('click', _primeOnGesture);
  document.addEventListener('keydown', _primeOnGesture);
  showTab('home');
}

// ---- Login flow ------------------------------------------------------------

// Rotating "hype" quotes — sports, competition, grit, and Davis-personal.
// The Rock's cornerstone quote stays pinned in the banner, so it's not in here.
const LOGIN_QUOTES = [
  { q: "It's time to change, boys. Not Divisions. Yourselves.", who: 'General Galeforce' },
  { q: "Sometimes, things seem too big, but every step, every dream seems just a little bit closer.", who: 'Davis Chalden' },
  { q: "This is how legends are made, doin' what you're doin'.", who: 'Johnny Silverhand' },
  { q: "It's showtime.", who: 'Meteor' },
  { q: "Everybody has a plan until they get punched in the mouth.", who: 'Mike Tyson' },
  { q: "Hard work beats talent when talent doesn't work hard.", who: 'Tim Notke' },
  { q: "I've missed more than 9,000 shots in my career. That is why I succeed.", who: 'Michael Jordan' },
  { q: "You miss 100% of the shots you don't take.", who: 'Wayne Gretzky' },
  { q: "The only way to prove you're a good sport is to lose.", who: 'Ernie Banks' },
  { q: "It's not whether you get knocked down; it's whether you get up.", who: 'Vince Lombardi' },
  { q: "Success is usually the culmination of controlling failure.", who: 'Sylvester Stallone' },
  { q: "Be somebody nobody thought you could be.", who: 'The Rock' },
  { q: "Do you know what my favorite part of the game is? The opportunity to play.", who: 'Mike Singletary' },
  { q: "Sweat more in practice, bleed less in war.", who: 'Richard Marcinko' },
  { q: "Champions keep playing until they get it right.", who: 'Billie Jean King' },
  { q: "The more difficult the victory, the greater the happiness in winning.", who: 'Pele' },
  { q: "Set your goals high, and don't stop till you get there.", who: 'Bo Jackson' },
  { q: "Overtime. Again. That's where the good ones are made.", who: 'Dude Perfect' },
];

// Pinned Rock banner pool — "Discipline. Dedication. Domination." is first and
// stays as the default. The rotate button cycles through these variations,
// but we always come back to the anchor quote.
const ROCK_BANNER_QUOTES = [
  { q: "Discipline. Dedication. Domination. That's what happens in this house.", who: 'Dwayne "The Rock" Johnson' },
  { q: "Success isn't always about greatness. It's about consistency.", who: 'Dwayne "The Rock" Johnson' },
  { q: "Be humble. Be hungry. And always be the hardest worker in the room.", who: 'Dwayne "The Rock" Johnson' },
  { q: "The wall's there for a reason — it shows you how bad you want it.", who: 'Dwayne "The Rock" Johnson' },
  { q: "Just show up. Every. Single. Day.", who: 'Dwayne "The Rock" Johnson' },
];
let _rockIdx = 0;

function renderRockBanner() {
  const q = document.querySelector('.rock-banner-quote');
  const c = document.querySelector('.rock-banner-who');
  const pick = ROCK_BANNER_QUOTES[_rockIdx % ROCK_BANNER_QUOTES.length];
  if (q) q.textContent = `“${pick.q}”`;
  if (c) c.textContent = `— ${pick.who}`;
}
function rotateRockBanner() {
  _rockIdx = (_rockIdx + 1) % ROCK_BANNER_QUOTES.length;
  renderRockBanner();
  if (typeof playSFX === 'function') playSFX('click');
}

function rotateLoginQuote() {
  const pick = LOGIN_QUOTES[Math.floor(Math.random() * LOGIN_QUOTES.length)];
  const q = document.getElementById('loginQuote');
  const c = document.getElementById('loginQuoteAuthor');
  if (q) q.textContent = `“${pick.q}”`;
  if (c) c.textContent = `— ${pick.who}`;
}

// Decide whether to show "Continue" as login or register based on email typed.
async function detectLoginMode() {
  const form = document.getElementById('loginForm');
  if (!form) return;
  const emailInput = document.getElementById('loginEmail');
  const firstNameWrap = document.getElementById('firstNameWrap');
  const codeLabel = document.getElementById('codeLabel');
  const btn = document.getElementById('loginBtn');
  const err = document.getElementById('loginError');

  let mode = 'unknown'; // 'login' | 'register'

  async function probe() {
    const email = emailInput.value.trim().toLowerCase();
    if (!email || !email.includes('@')) return;
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_exists', email }),
      });
      const data = await res.json();
      if (data.exists) {
        mode = 'login';
        firstNameWrap.hidden = true;
        codeLabel.textContent = 'Access code';
        btn.textContent = 'Log in';
      } else {
        mode = 'register';
        firstNameWrap.hidden = false;
        codeLabel.textContent = 'Create an access code';
        btn.textContent = 'Create account';
      }
    } catch (e) {
      // Default to login if probe fails — user can register from scratch.
      mode = 'login';
    }
  }

  emailInput.addEventListener('blur', probe);
  emailInput.addEventListener('change', probe);

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    err.hidden = true;
    const email = emailInput.value.trim().toLowerCase();
    const code = document.getElementById('loginCode').value.trim();
    const firstName = document.getElementById('loginFirstName').value.trim();
    if (!email || !code) return;

    btn.disabled = true;
    btn.textContent = '…';

    try {
      if (mode === 'unknown') await probe();

      let res, data;
      if (mode === 'register') {
        if (!firstName) {
          showLoginError('Enter your first name.');
          return;
        }
        res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'register_human', email, firstName, code }),
        });
      } else {
        res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'login', email, code }),
        });
      }
      data = await res.json();
      if (!data.success) {
        const msg = data.detail ? `${data.error}: ${data.detail}` : (data.error || 'That did not work.');
        showLoginError(msg);
        return;
      }

      const user = { ...data.user, code };
      STATE.user = user;
      storeSession(user);
      await cloudLoad();
      rolloverDay();
      rolloverSeasonIfNeeded();
      rotateWeeklyIfNeeded();
      checkAchievementUnlocks();
      enterApp();
    } catch (e) {
      showLoginError('Network error. Try again.');
    } finally {
      btn.disabled = false;
      btn.textContent = mode === 'register' ? 'Create account' : 'Log in';
    }
  });

  // Forgot-code
  document.getElementById('forgotBtn').addEventListener('click', async () => {
    const email = emailInput.value.trim().toLowerCase();
    if (!email) { showLoginError('Enter your email first.'); return; }
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'forgot_code', email }),
      });
      showLoginError('If that email is on file, a reset link is on the way.');
    } catch (e) {
      showLoginError('Network error. Try again.');
    }
  });
}

function showLoginError(msg) {
  const err = document.getElementById('loginError');
  if (!err) return;
  err.textContent = msg;
  err.hidden = false;
}

// ---- App-level events ------------------------------------------------------

function wireAppEvents() {
  document.querySelectorAll('.tab').forEach(t => {
    t.onclick = () => showTab(t.dataset.tab);
  });

  const logout = document.getElementById('logoutBtn');
  if (logout) logout.onclick = () => {
    if (!confirm('Sign out? Your progress stays saved.')) return;
    clearSession();
    location.reload();
  };

  const newProject = document.getElementById('newProjectBtn');
  if (newProject) newProject.onclick = () => openProjectModal();

  const projectCancel = document.getElementById('projectCancelBtn');
  if (projectCancel) projectCancel.onclick = closeProjectModal;

  const projectForm = document.getElementById('projectForm');
  if (projectForm) projectForm.addEventListener('submit', saveProjectFromForm);

  const addHabit = document.getElementById('addHabitBtn');
  if (addHabit) addHabit.onclick = addHabit_;

  document.querySelectorAll('[data-theme]').forEach(btn => {
    btn.onclick = () => {
      STATE.settings.theme = btn.dataset.theme;
      applyTheme();
      scheduleSave();
      document.querySelectorAll('.theme-swatch').forEach(b => b.classList.toggle('is-active', b.dataset.theme === STATE.settings.theme));
    };
  });

  const saveProfileBtn = document.getElementById('saveProfileBtn');
  if (saveProfileBtn) saveProfileBtn.onclick = saveProfile;

  const wipeBtn = document.getElementById('wipeBtn');
  if (wipeBtn) wipeBtn.onclick = wipeMoreMeData;

  document.querySelectorAll('[data-travel-mode]').forEach(btn => {
    btn.onclick = () => {
      STATE.travel.mode = btn.dataset.travelMode;
      scheduleSave();
      renderTravelModeTabs();
    };
  });

  const rockRotate = document.getElementById('rockRotateBtn');
  if (rockRotate) rockRotate.onclick = rotateRockBanner;

  const sfxToggle = document.getElementById('sfxToggle');
  if (sfxToggle) {
    sfxToggle.checked = STATE.settings.sfx !== false;
    sfxToggle.onchange = () => {
      STATE.settings.sfx = sfxToggle.checked;
      scheduleSave();
      if (sfxToggle.checked && typeof playSFX === 'function') playSFX('click');
    };
  }

  const notifyToggle = document.getElementById('notifyToggle');
  const notifyHint = document.getElementById('notifyHint');
  if (notifyToggle) {
    notifyToggle.checked = !!STATE.settings.notify;
    notifyToggle.onchange = async () => {
      STATE.settings.notify = notifyToggle.checked;
      scheduleSave();
      if (notifyToggle.checked && typeof requestNotifyPermissionOnce === 'function') {
        const ok = await requestNotifyPermissionOnce();
        if (notifyHint) {
          notifyHint.textContent = ok
            ? 'Reminders are on. Screen can stay closed.'
            : 'Permission denied. Check your browser settings.';
        }
      } else if (notifyHint) {
        notifyHint.textContent = 'Reminders paused. Flip the switch to bring them back.';
      }
    };
  }
}

// ---- Theme -----------------------------------------------------------------

function applyTheme() {
  // Only two themes exist now — "light" and "dark". Migrate any legacy name
  // sitting in saved state so the UI never lands on a dead palette.
  const raw = (STATE.settings && STATE.settings.theme) || 'light';
  const LEGACY_TO_DARK = { midnight: 'dark' };
  const theme = raw === 'dark' ? 'dark'
              : LEGACY_TO_DARK[raw] ? LEGACY_TO_DARK[raw]
              : 'light';
  if (STATE.settings) STATE.settings.theme = theme;
  document.documentElement.dataset.theme = theme;
}

// ---- Projects --------------------------------------------------------------

let _editingProjectId = null;

function openProjectModal(existingId) {
  _editingProjectId = existingId || null;
  const modal = document.getElementById('projectModal');
  const form = document.getElementById('projectForm');
  const title = document.getElementById('projectModalTitle');
  if (!modal || !form) return;

  form.reset();
  if (existingId) {
    const p = STATE.projects.find(x => x.id === existingId);
    if (p) {
      form.title.value = p.title;
      form.category.value = p.category;
      form.sub.value = p.sub;
      form.nextAction.value = p.nextAction;
      form.deadline.value = p.deadline || '';
      form.notes.value = p.notes || '';
      form.status.value = p.status || 'active';
    }
    title.textContent = 'Edit project';
  } else {
    title.textContent = 'New project';
  }
  modal.hidden = false;
}

function closeProjectModal() {
  document.getElementById('projectModal').hidden = true;
  _editingProjectId = null;
}

function saveProjectFromForm(ev) {
  ev.preventDefault();
  const f = ev.target;
  const data = {
    id: _editingProjectId || newId(),
    title: f.title.value.trim(),
    category: f.category.value,
    sub: f.sub.value,
    nextAction: f.nextAction.value.trim(),
    deadline: f.deadline.value || '',
    notes: f.notes.value.trim(),
    status: f.status.value,
    updatedAt: Date.now(),
  };

  if (_editingProjectId) {
    const idx = STATE.projects.findIndex(p => p.id === _editingProjectId);
    if (idx >= 0) {
      data.createdAt = STATE.projects[idx].createdAt || Date.now();
      // Status change → complete → bump achievement counter + XP
      const oldStatus = STATE.projects[idx].status;
      STATE.projects[idx] = data;
      if (oldStatus !== 'complete' && data.status === 'complete') {
        addXP(100, `Project completed: ${data.title}`);
        if (data.sub === 'physical') bumpAchievement('physicalProjects');
        else if (data.sub === 'digital') bumpAchievement('digitalProjects');
      }
    }
  } else {
    data.createdAt = Date.now();
    STATE.projects.push(data);
  }

  closeProjectModal();
  scheduleSave();
  renderProjects();
}

function deleteProject(id) {
  if (!confirm('Delete this project?')) return;
  STATE.projects = STATE.projects.filter(p => p.id !== id);
  scheduleSave();
  renderProjects();
}

function recordMilestone(id) {
  const p = STATE.projects.find(x => x.id === id);
  if (!p) return;
  addXP(30, `Milestone: ${p.title}`);
  bumpQuest('milestones');
  bumpAchievement('milestonesLifetime');
  renderProjects();
  renderXpStrip();
}

function renderProjects() {
  const host = document.getElementById('projectList');
  const count = document.getElementById('activeCount');
  if (!host) return;

  const active = STATE.projects.filter(p => p.status !== 'complete').length;
  if (count) count.textContent = `${active} active · ${STATE.projects.length} total · max 3 active recommended`;

  if (!STATE.projects.length) {
    host.innerHTML = `
      <div class="card" style="grid-column:1/-1;text-align:center;">
        <h3>No projects yet</h3>
        <p class="card-sub">Every project needs one clear next step. "Finish 2 lessons." Not "work on Khan Academy."</p>
        <button class="btn btn-primary" onclick="document.getElementById('newProjectBtn').click()">Start your first project</button>
      </div>`;
    return;
  }

  host.innerHTML = STATE.projects
    .slice()
    .sort((a, b) => (a.status === 'complete') - (b.status === 'complete') || (b.updatedAt || 0) - (a.updatedAt || 0))
    .map(p => `
      <div class="project-card" data-id="${p.id}">
        <span class="project-status is-${p.status}">${p.status}</span>
        <div class="project-title">${escapeHtml(p.title)}</div>
        <div class="project-meta">${p.category} · ${p.sub}</div>
        <div class="project-next"><strong>Next:</strong> ${escapeHtml(p.nextAction)}</div>
        ${p.deadline ? `<div class="project-deadline">Deadline: ${p.deadline}</div>` : ''}
        ${p.notes ? `<div class="project-notes">${escapeHtml(p.notes)}</div>` : ''}
        <div class="project-actions">
          <button class="btn" data-proj-milestone="${p.id}">+ Milestone</button>
          <button class="btn" data-proj-edit="${p.id}">Edit</button>
          <button class="btn btn-ghost" data-proj-delete="${p.id}">Delete</button>
        </div>
      </div>
    `).join('');

  host.querySelectorAll('[data-proj-edit]').forEach(b =>
    b.onclick = () => openProjectModal(b.dataset.projEdit));
  host.querySelectorAll('[data-proj-delete]').forEach(b =>
    b.onclick = () => deleteProject(b.dataset.projDelete));
  host.querySelectorAll('[data-proj-milestone]').forEach(b =>
    b.onclick = () => recordMilestone(b.dataset.projMilestone));
}

// ---- Goals -----------------------------------------------------------------

const GOAL_LADDER = [
  { key: 'lifetime', label: 'Lifetime goals',  horizon: 'Forever' },
  { key: '10y',      label: '10-year goals',   horizon: '10 years' },
  { key: '5y',       label: '5-year goals',    horizon: '5 years' },
  { key: '3y',       label: '3-year goals',    horizon: '3 years' },
  { key: '1y',       label: '1-year goals',    horizon: '1 year' },
  { key: '3mo',      label: '3-month goals',   horizon: '3 months' },
  { key: 'month',    label: 'Monthly goals',   horizon: 'This month' },
  { key: 'week',     label: 'Weekly goals',    horizon: 'This week' },
];

function renderGoals() {
  const host = document.getElementById('goalLadder');
  if (!host) return;

  host.innerHTML = GOAL_LADDER.map(g => `
    <div class="goal-row">
      <h3>${g.label} <span class="horizon">${g.horizon}</span></h3>
      <textarea data-goal="${g.key}" placeholder="What matters most over this horizon?">${escapeHtml(STATE.goals[g.key] || '')}</textarea>
    </div>
  `).join('');

  host.querySelectorAll('[data-goal]').forEach(ta => {
    ta.addEventListener('input', () => {
      STATE.goals[ta.dataset.goal] = ta.value;
      scheduleSave();
    });
  });
}

// ---- Habits ----------------------------------------------------------------

const DOW_LABELS = ['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su'];

function renderHabits() {
  rotateWeeklyIfNeeded();
  const grid = document.getElementById('habitGrid');
  const weekLabel = document.getElementById('weekLabel');
  if (!grid) return;

  if (weekLabel) weekLabel.textContent = `Week of ${STATE.habits.weekKey}`;

  const header = `<tr><th>Habit</th>${DOW_LABELS.map(d => `<th>${d}</th>`).join('')}<th></th></tr>`;
  const rows = STATE.habits.list.map(h => `
    <tr data-habit="${h.id}">
      <td>${escapeHtml(h.name)}</td>
      ${h.days.map((v, i) => `<td><button class="habit-cell ${v ? 'is-on' : ''}" data-habit-day="${i}">${v ? '✓' : ''}</button></td>`).join('')}
      <td><button class="habit-remove" title="Remove habit">✕</button></td>
    </tr>`).join('');

  grid.innerHTML = header + rows;

  grid.querySelectorAll('tr[data-habit]').forEach(row => {
    const id = row.dataset.habit;
    row.querySelectorAll('[data-habit-day]').forEach(btn => {
      btn.onclick = () => toggleHabitDay(id, parseInt(btn.dataset.habitDay, 10));
    });
    const removeBtn = row.querySelector('.habit-remove');
    if (removeBtn) removeBtn.onclick = () => removeHabit(id);
  });
}

function toggleHabitDay(id, idx) {
  const h = STATE.habits.list.find(x => x.id === id);
  if (!h) return;
  h.days[idx] = !h.days[idx];
  scheduleSave();
  renderHabits();
}

function removeHabit(id) {
  if (!confirm('Remove this habit from the tracker?')) return;
  STATE.habits.list = STATE.habits.list.filter(x => x.id !== id);
  scheduleSave();
  renderHabits();
}

function addHabit_() {
  const input = document.getElementById('newHabitInput');
  if (!input) return;
  const name = input.value.trim();
  if (!name) return;
  STATE.habits.list.push({
    id: newId(),
    name,
    days: [false, false, false, false, false, false, false],
  });
  input.value = '';
  scheduleSave();
  renderHabits();
}

// ---- Settings --------------------------------------------------------------

function renderSettings() {
  document.querySelectorAll('.theme-swatch').forEach(b => {
    b.classList.toggle('is-active', b.dataset.theme === (STATE.settings.theme || 'light'));
  });
  const nameEl = document.getElementById('profileName');
  const bioEl = document.getElementById('profileBio');
  if (nameEl) nameEl.value = STATE.user?.username || STATE.user?.firstName || '';
  if (bioEl) bioEl.value = STATE.user?.bio || '';
}

async function saveProfile() {
  if (!STATE.user) return;
  const nameEl = document.getElementById('profileName');
  const bioEl = document.getElementById('profileBio');
  const username = (nameEl?.value || '').trim();
  const bio = (bioEl?.value || '').trim();
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_profile',
        email: STATE.user.email,
        code: STATE.user.code,
        username, bio,
      }),
    });
    const data = await res.json();
    if (data.success) {
      STATE.user.username = username;
      STATE.user.bio = bio;
      storeSession(STATE.user);
      document.getElementById('userName').textContent = username || STATE.user.firstName;
      showToast('Profile saved.', 'success');
    } else {
      showToast(data.error || 'Could not save profile.', 'error');
    }
  } catch (e) {
    showToast('Network error.', 'error');
  }
}

async function wipeMoreMeData() {
  if (!confirm('Wipe all More Me progress? This keeps your account and HALOS data, but clears XP, projects, achievements, goals, habits.')) return;
  const fresh = defaultState();
  fresh.user = STATE.user;
  fresh.settings = STATE.settings;
  Object.assign(STATE, fresh);
  scheduleSave();
  showToast('More Me data wiped.', 'success');
  showTab('home');
  renderXpStrip();
}

// ---- utils -----------------------------------------------------------------

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// ---- Heartbeat + XP subscriptions -----------------------------------------

// SFX for XP events — positive, negative, and level boundaries.
let _lastKnownLevel = null;
onXPChange((amount) => {
  if (typeof playSFX !== 'function') return;
  if (_lastKnownLevel !== null && STATE.xp.level > _lastKnownLevel) {
    playSFX('levelup');
  } else if (amount > 0) {
    playSFX('xp');
  } else if (amount < 0) {
    playSFX('xpneg');
  }
  _lastKnownLevel = STATE.xp.level;
});

// Daily heartbeat every 5 minutes so the user stays "active".
setInterval(() => {
  if (!STATE.user) return;
  fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'heartbeat',
      email: STATE.user.email,
      code: STATE.user.code,
    }),
  }).catch(() => {});
}, 5 * 60 * 1000);

// Rollover day at midnight tick
setInterval(() => {
  if (STATE.today.date !== todayISO()) {
    rolloverDay();
    rolloverSeasonIfNeeded();
    rotateWeeklyIfNeeded();
    renderHome();
    renderXpStrip();
  }
}, 60 * 1000);

// ---- Achievement counter hooks via daily actions --------------------------

const _origPerformDaily = performDaily;
performDaily = function (id) {
  _origPerformDaily(id);
  if (id === 'workout') bumpAchievement('workouts');
  if (id === 'sports')  bumpAchievement('sports');
  if (id === 'onTime')  bumpAchievement('onTimeStreak');
  if (id === 'morning') bumpAchievement('morningStreak');
  if (id === 'focus')   bumpAchievement('focusWeek');
};

const _origPerformBonus = performBonus;
performBonus = function (id) {
  _origPerformBonus(id);
  if (id === 'extraWorkout') bumpAchievement('workouts');
  if (id === 'extraSports')  bumpAchievement('sports');
};

// When weekly rewards fire, bump Momentum!
const _origCheckWeeklyReward = checkWeeklyReward;
checkWeeklyReward = function () {
  const wasClaimed = STATE.weekly.rewardClaimed;
  _origCheckWeeklyReward();
  if (!wasClaimed && STATE.weekly.rewardClaimed) {
    bumpAchievement('weeklyComplete');
  }
};

// ---- Go ---------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', boot);
