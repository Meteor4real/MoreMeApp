/* ==========================================================================
   clock.js — Real-time clock, time-of-day phases, scheduled reminders,
              and browser notifications.
   ========================================================================== */

// Each phase covers a contiguous hour range and tells Davis what window he's in.
const TOD_PHASES = [
  { id: 'deep-night', icon: '🌙', label: 'Late night — sleep.',                     start: 0,  end: 5 },
  { id: 'morning',    icon: '☀️', label: 'Morning window — routine + top 3.',       start: 5,  end: 10 },
  { id: 'school',     icon: '🎯', label: 'School hours — focus mode.',              start: 10, end: 15 },
  { id: 'afternoon',  icon: '💪', label: 'Afternoon — train, sports, project work.', start: 15, end: 18 },
  { id: 'evening',    icon: '🍽',  label: 'Evening — dinner + wind down.',           start: 18, end: 21 },
  { id: 'bedtime',    icon: '🛏', label: 'Bedtime approaching — lights out at 22:00.', start: 21, end: 22 },
  { id: 'past-bed',   icon: '⛔',  label: 'Past bedtime. Sleep wins tomorrow.',      start: 22, end: 24 },
];

// One-shot reminders that fire once per calendar day. Edit freely.
const SCHEDULED_REMINDERS = [
  { hour: 6,  minute: 30, title: 'Morning routine',  body: '10 minutes: water, stretch, move, top 3, breathe.', sfx: 'chime' },
  { hour: 7,  minute: 30, title: 'Out the door',     body: 'On-time XP is easy XP. Clock it.',                  sfx: 'click' },
  { hour: 15, minute: 30, title: 'Focus block',      body: 'First 25 min: hardest task. Close tabs.',           sfx: 'chime' },
  { hour: 17, minute: 0,  title: 'Train time',       body: 'Workout or sports. Two minutes minimum — always.',  sfx: 'chime' },
  { hour: 20, minute: 30, title: 'Project window',   body: 'Twenty minutes on the next action. That\'s enough.', sfx: 'click' },
  { hour: 21, minute: 30, title: 'Bedtime routine',  body: 'Stretch, set clothes, one win, screens off.',       sfx: 'chime' },
  { hour: 21, minute: 55, title: 'Lights out in 5',  body: 'Save it. Sleep is the real meta.',                  sfx: 'warn'  },
];

let _clockTimer = null;
let _firedReminders = new Set();

function _dayKey(d) {
  return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
}

function currentPhase(d = new Date()) {
  const h = d.getHours();
  for (const p of TOD_PHASES) {
    if (h >= p.start && h < p.end) return p;
  }
  return TOD_PHASES[0];
}

function renderClock() {
  const d = new Date();
  const timeEl  = document.getElementById('clockTime');
  const phaseEl = document.getElementById('clockPhase');
  if (timeEl) {
    timeEl.textContent = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  const p = currentPhase(d);
  if (phaseEl) {
    phaseEl.innerHTML = `<span class="clock-icon">${p.icon}</span><span>${p.label}</span>`;
    phaseEl.dataset.phase = p.id;
  }
  document.body.dataset.phase = p.id;

  // Fire scheduled reminders, one-shot per slot per day.
  const dayKey = _dayKey(d);
  for (const r of SCHEDULED_REMINDERS) {
    const slot = dayKey + ':' + r.hour + ':' + r.minute;
    if (_firedReminders.has(slot)) continue;
    if (d.getHours() === r.hour && d.getMinutes() === r.minute) {
      _firedReminders.add(slot);
      notifyUser(r.title, r.body);
      if (typeof playSFX === 'function') playSFX(r.sfx || 'chime');
      showToast(`${r.title} — ${r.body}`, 'info');
    }
  }

  // Clean up stale fired slots from previous days (memory hygiene).
  if (_firedReminders.size > 200) {
    const keep = new Set();
    for (const k of _firedReminders) if (k.startsWith(dayKey + ':')) keep.add(k);
    _firedReminders = keep;
  }
}

function startClock() {
  renderClock();
  if (_clockTimer) { clearInterval(_clockTimer); _clockTimer = null; }
  // Tick once a second so the clock display stays fresh; cheap enough.
  _clockTimer = setInterval(renderClock, 1000);
}

// ---- Browser notifications -------------------------------------------------

async function requestNotifyPermissionOnce() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied')  return false;
  try {
    const r = await Notification.requestPermission();
    return r === 'granted';
  } catch (e) { return false; }
}

function notifyUser(title, body) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: '/icon-192.svg', silent: false });
  } catch (e) { /* ignore */ }
}
