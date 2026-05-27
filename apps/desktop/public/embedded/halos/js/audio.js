/* ═══════════════════════════════════════════════
   HALOS AUDIO — Web Audio synthesized SFX + ambient pad
   No audio files. 100% generated. Persists to localStorage.
   ═══════════════════════════════════════════════ */
'use strict';

const HALOSAudio = (() => {
  let ctx = null;
  let masterGain = null;
  let ambientGain = null;
  let ambientLP = null;
  let ambientNodes = [];
  let ambientPlaying = false;
  let shimmerTimer = null;

  let settings = {
    muted: false,
    masterVol: 0.5,
    ambientVol: 0.35,
    sfxVol: 0.55,
  };

  try {
    const s = localStorage.getItem('halos_audio');
    if (s) Object.assign(settings, JSON.parse(s));
  } catch (e) {}

  function persist() {
    try { localStorage.setItem('halos_audio', JSON.stringify(settings)); } catch (e) {}
  }

  function ensureCtx() {
    if (ctx) return ctx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    try {
      ctx = new Ctx();
    } catch (e) { return null; }
    masterGain = ctx.createGain();
    masterGain.gain.value = settings.muted ? 0 : settings.masterVol;
    masterGain.connect(ctx.destination);
    return ctx;
  }

  function resumeIfNeeded() {
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  /* ──────────────── SFX ──────────────── */

  function clickSfx() {
    if (settings.muted) return;
    const c = ensureCtx(); if (!c) return;
    resumeIfNeeded();
    const t = c.currentTime;
    // Quick percussive sci-fi tick
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(2400, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.05);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18 * settings.sfxVol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    const hp = c.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 700;
    osc.connect(hp); hp.connect(g); g.connect(masterGain);
    osc.start(t); osc.stop(t + 0.1);
  }

  // Subtle "incoming typing" cue — a soft double-tick that says
  // "someone's composing something" without getting in the way. Played
  // once per typing burst.
  function typingSfx() {
    if (settings.muted) return;
    const c = ensureCtx(); if (!c) return;
    resumeIfNeeded();
    const t = c.currentTime;
    [0, 0.08].forEach((delay) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, t + delay);
      osc.frequency.exponentialRampToValueAtTime(1200, t + delay + 0.04);
      g.gain.setValueAtTime(0.0001, t + delay);
      g.gain.exponentialRampToValueAtTime(0.08 * settings.sfxVol, t + delay + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.09);
      osc.connect(g); g.connect(masterGain);
      osc.start(t + delay); osc.stop(t + delay + 0.12);
    });
  }

  // Panel navigation — quick mid-tone swipe
  function navSfx() {
    if (settings.muted) return;
    const c = ensureCtx(); if (!c) return;
    resumeIfNeeded();
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(1320, t + 0.09);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12 * settings.sfxVol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.connect(g); g.connect(masterGain);
    osc.start(t); osc.stop(t + 0.14);
  }

  // Error / access denied — low falling buzz
  function errorSfx() {
    if (settings.muted) return;
    const c = ensureCtx(); if (!c) return;
    resumeIfNeeded();
    const t = c.currentTime;
    [0, 0.06].forEach(d => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, t + d);
      osc.frequency.exponentialRampToValueAtTime(180, t + d + 0.15);
      g.gain.setValueAtTime(0.0001, t + d);
      g.gain.exponentialRampToValueAtTime(0.16 * settings.sfxVol, t + d + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.18);
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 1800;
      osc.connect(lp); lp.connect(g); g.connect(masterGain);
      osc.start(t + d); osc.stop(t + d + 0.22);
    });
  }

  // Success / saved — two rising pure tones
  function successSfx() {
    if (settings.muted) return;
    const c = ensureCtx(); if (!c) return;
    resumeIfNeeded();
    const t = c.currentTime;
    [{ f: 660, d: 0 }, { f: 880, d: 0.1 }, { f: 1320, d: 0.2 }].forEach(p => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = p.f;
      g.gain.setValueAtTime(0.0001, t + p.d);
      g.gain.exponentialRampToValueAtTime(0.14 * settings.sfxVol, t + p.d + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + p.d + 0.22);
      osc.connect(g); g.connect(masterGain);
      osc.start(t + p.d); osc.stop(t + p.d + 0.26);
    });
  }

  // Urgent / VERY IMPORTANT — sharp alarm pulse
  function urgentSfx() {
    if (settings.muted) return;
    const c = ensureCtx(); if (!c) return;
    resumeIfNeeded();
    const t = c.currentTime;
    for (let i = 0; i < 3; i++) {
      const d = i * 0.14;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(i % 2 === 0 ? 1200 : 900, t + d);
      g.gain.setValueAtTime(0.0001, t + d);
      g.gain.exponentialRampToValueAtTime(0.18 * settings.sfxVol, t + d + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.1);
      const hp = c.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 500;
      osc.connect(hp); hp.connect(g); g.connect(masterGain);
      osc.start(t + d); osc.stop(t + d + 0.14);
    }
  }

  // Call start — ascending swoosh + ring
  function callStartSfx() {
    if (settings.muted) return;
    const c = ensureCtx(); if (!c) return;
    resumeIfNeeded();
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(1760, t + 0.3);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18 * settings.sfxVol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
    osc.connect(g); g.connect(masterGain);
    osc.start(t); osc.stop(t + 0.4);
  }

  // Call end — descending tone (hang-up)
  function callEndSfx() {
    if (settings.muted) return;
    const c = ensureCtx(); if (!c) return;
    resumeIfNeeded();
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.28);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16 * settings.sfxVol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    osc.connect(g); g.connect(masterGain);
    osc.start(t); osc.stop(t + 0.36);
  }

  // Delete / destructive — low thud
  function deleteSfx() {
    if (settings.muted) return;
    const c = ensureCtx(); if (!c) return;
    resumeIfNeeded();
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    const lp = c.createBiquadFilter();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.2);
    lp.type = 'lowpass'; lp.frequency.value = 600;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22 * settings.sfxVol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    osc.connect(lp); lp.connect(g); g.connect(masterGain);
    osc.start(t); osc.stop(t + 0.28);
  }

  // Notification / incoming bell
  function notifSfx() {
    if (settings.muted) return;
    const c = ensureCtx(); if (!c) return;
    resumeIfNeeded();
    const t = c.currentTime;
    [1320, 1760].forEach((freq, i) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.12 * settings.sfxVol, t + i * 0.12 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.12 + 0.38);
      osc.connect(g); g.connect(masterGain);
      osc.start(t + i * 0.12); osc.stop(t + i * 0.12 + 0.42);
    });
  }

  function sendSfx() {
    if (settings.muted) return;
    const c = ensureCtx(); if (!c) return;
    resumeIfNeeded();
    const t = c.currentTime;
    // Two-layer rising blip
    [{ delay: 0, type: 'triangle', f0: 440, f1: 1760 },
     { delay: 0.035, type: 'sine',     f0: 660, f1: 2200 }].forEach((p) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = p.type;
      osc.frequency.setValueAtTime(p.f0, t + p.delay);
      osc.frequency.exponentialRampToValueAtTime(p.f1, t + p.delay + 0.18);
      g.gain.setValueAtTime(0.0001, t + p.delay);
      g.gain.exponentialRampToValueAtTime(0.20 * settings.sfxVol, t + p.delay + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + p.delay + 0.24);
      osc.connect(g); g.connect(masterGain);
      osc.start(t + p.delay); osc.stop(t + p.delay + 0.28);
    });
  }

  /* ──────────────── AMBIENT PAD ──────────────── */

  function startAmbient() {
    if (ambientPlaying) return;
    const c = ensureCtx(); if (!c) return;
    resumeIfNeeded();
    ambientPlaying = true;

    ambientGain = c.createGain();
    ambientGain.gain.value = 0;
    ambientGain.gain.linearRampToValueAtTime(settings.ambientVol, c.currentTime + 5);

    ambientLP = c.createBiquadFilter();
    ambientLP.type = 'lowpass';
    ambientLP.frequency.value = 1500;
    ambientLP.Q.value = 0.7;

    // Spacey delay feedback for "reverb-ish" tail
    const delay = c.createDelay(2);
    delay.delayTime.value = 0.42;
    const fb = c.createGain();
    fb.gain.value = 0.42;
    const wet = c.createGain();
    wet.gain.value = 0.55;

    ambientGain.connect(ambientLP);
    ambientLP.connect(masterGain);
    ambientLP.connect(delay);
    delay.connect(fb); fb.connect(delay);
    delay.connect(wet); wet.connect(masterGain);

    // Drone — A minor 9 stack (A2 C3 E3 G3 B3 A4)
    const freqs = [55, 65.41, 82.41, 98, 123.47, 220];
    freqs.forEach((freq, i) => {
      const osc = c.createOscillator();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;

      const oscG = c.createGain();
      oscG.gain.value = (0.16 / freqs.length) * (1 - i * 0.07);

      // Slow LFO on amplitude — breathing pad
      const lfo = c.createOscillator();
      const lfoG = c.createGain();
      lfo.frequency.value = 0.05 + i * 0.013;
      lfoG.gain.value = oscG.gain.value * 0.55;
      lfo.connect(lfoG); lfoG.connect(oscG.gain);

      // Slow detune drift
      const lfo2 = c.createOscillator();
      const lfo2G = c.createGain();
      lfo2.frequency.value = 0.04 + i * 0.009;
      lfo2G.gain.value = freq * 0.005;
      lfo2.connect(lfo2G); lfo2G.connect(osc.frequency);

      osc.connect(oscG); oscG.connect(ambientGain);
      try { osc.start(); lfo.start(); lfo2.start(); } catch (e) {}
      ambientNodes.push(osc, lfo, lfo2);
    });

    // Occasional bell shimmer — distant chimes
    function shimmer() {
      if (!ambientPlaying || !ctx) return;
      const t2 = ctx.currentTime;
      const notes = [880, 987.77, 1108.73, 1318.51, 1760, 2217.46];
      const note = notes[Math.floor(Math.random() * notes.length)];
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = note;
      g.gain.setValueAtTime(0.0001, t2);
      g.gain.exponentialRampToValueAtTime(0.045, t2 + 0.5);
      g.gain.exponentialRampToValueAtTime(0.0001, t2 + 4.5);
      osc.connect(g); g.connect(ambientLP);
      try { osc.start(t2); osc.stop(t2 + 5); } catch (e) {}
      shimmerTimer = setTimeout(shimmer, 7000 + Math.random() * 11000);
    }
    shimmerTimer = setTimeout(shimmer, 4000);
  }

  function stopAmbient() {
    if (!ambientPlaying || !ctx) return;
    const t = ctx.currentTime;
    if (ambientGain) {
      ambientGain.gain.cancelScheduledValues(t);
      ambientGain.gain.linearRampToValueAtTime(0, t + 1.5);
    }
    if (shimmerTimer) { clearTimeout(shimmerTimer); shimmerTimer = null; }
    setTimeout(() => {
      ambientNodes.forEach(n => { try { n.stop(); } catch (e) {} });
      ambientNodes = [];
      ambientPlaying = false;
    }, 1700);
  }

  /* ──────────────── SETTINGS ──────────────── */

  function setMuted(m) {
    settings.muted = !!m;
    persist();
    if (masterGain && ctx) {
      masterGain.gain.cancelScheduledValues(ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(m ? 0 : settings.masterVol, ctx.currentTime + 0.15);
    }
  }
  function setMasterVol(v) {
    settings.masterVol = Math.max(0, Math.min(1, +v));
    persist();
    if (masterGain && ctx && !settings.muted) {
      masterGain.gain.cancelScheduledValues(ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(settings.masterVol, ctx.currentTime + 0.1);
    }
  }
  function setAmbientVol(v) {
    settings.ambientVol = Math.max(0, Math.min(1, +v));
    persist();
    if (ambientGain && ctx) {
      ambientGain.gain.cancelScheduledValues(ctx.currentTime);
      ambientGain.gain.linearRampToValueAtTime(settings.ambientVol, ctx.currentTime + 0.1);
    }
  }
  function setSfxVol(v) {
    settings.sfxVol = Math.max(0, Math.min(1, +v));
    persist();
  }
  function getSettings() { return Object.assign({}, settings); }
  function isAmbientPlaying() { return ambientPlaying; }

  /* ──────────────── GLOBAL CLICK DELEGATION ──────────────── */

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button, .nav-btn, .agent-tab, .cpre');
    if (!btn) return;
    if (btn.disabled) return;
    if (btn.closest('#audio-settings-section')) return;
    // Use specialised SFX per button role
    if (btn.classList.contains('nav-btn') || btn.classList.contains('agent-tab') || btn.classList.contains('login-tab')) {
      navSfx();
    } else if (btn.dataset.sfx === 'success' || btn.id === 'btn-save-settings') {
      successSfx();
    } else if (btn.dataset.sfx === 'delete' || btn.classList.contains('msg-delete') || btn.id === 'btn-delete-account') {
      deleteSfx();
    } else if (btn.dataset.sfx === 'urgent' || btn.id === 'btn-urgent') {
      urgentSfx();
    } else if (btn.dataset.sfx === 'error') {
      errorSfx();
    } else {
      clickSfx();
    }
  }, true);

  return {
    init: ensureCtx,
    resume: resumeIfNeeded,
    clickSfx, sendSfx, typingSfx,
    navSfx, errorSfx, successSfx, urgentSfx,
    callStartSfx, callEndSfx, deleteSfx, notifSfx,
    startAmbient, stopAmbient,
    setMuted, setMasterVol, setAmbientVol, setSfxVol,
    getSettings, isAmbientPlaying,
  };
})();
window.HALOSAudio = HALOSAudio;
