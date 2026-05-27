/* ==========================================================================
   sfx.js — WebAudio-synthesized sound effects. No external files.
   Respects STATE.settings.sfx (boolean, defaults true).
   ========================================================================== */

let _audioCtx = null;

function getAudio() {
  if (_audioCtx) return _audioCtx;
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    _audioCtx = new C();
  } catch (e) { _audioCtx = null; }
  return _audioCtx;
}

// Browsers lock audio until a user gesture — resume on first interaction.
function primeAudio() {
  const ctx = getAudio();
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

function sfxEnabled() {
  const s = (STATE && STATE.settings) || {};
  return s.sfx !== false;
}

function beep({ freq = 660, duration = 0.1, type = 'sine', volume = 0.12, freqEnd }) {
  if (!sfxEnabled()) return;
  const ctx = getAudio();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (freqEnd) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + duration);
  }
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration + 0.03);
}

function playSFX(kind) {
  switch (kind) {
    case 'log':
      return beep({ freq: 880, duration: 0.07, type: 'sine', volume: 0.1 });

    case 'undo':
      return beep({ freq: 523, freqEnd: 330, duration: 0.11, type: 'triangle', volume: 0.1 });

    case 'xp':
      return beep({ freq: 700, freqEnd: 990, duration: 0.14, type: 'square', volume: 0.07 });

    case 'xpneg':
      return beep({ freq: 330, freqEnd: 180, duration: 0.18, type: 'sawtooth', volume: 0.08 });

    case 'levelup':
      beep({ freq: 523, duration: 0.1,  type: 'triangle', volume: 0.12 });
      setTimeout(() => beep({ freq: 659, duration: 0.1,  type: 'triangle', volume: 0.12 }), 90);
      setTimeout(() => beep({ freq: 784, duration: 0.18, type: 'triangle', volume: 0.14 }), 180);
      return;

    case 'achievement':
      beep({ freq: 784,  duration: 0.1,  type: 'square', volume: 0.1 });
      setTimeout(() => beep({ freq: 988,  duration: 0.1,  type: 'square', volume: 0.1 }),  110);
      setTimeout(() => beep({ freq: 1175, duration: 0.16, type: 'square', volume: 0.12 }), 220);
      return;

    case 'chime':
      beep({ freq: 880,  duration: 0.18, type: 'sine', volume: 0.1 });
      setTimeout(() => beep({ freq: 1175, duration: 0.22, type: 'sine', volume: 0.1 }), 170);
      return;

    case 'warn':
      beep({ freq: 440, duration: 0.12, type: 'sawtooth', volume: 0.09 });
      setTimeout(() => beep({ freq: 330, duration: 0.14, type: 'sawtooth', volume: 0.09 }), 120);
      return;

    case 'click':
      return beep({ freq: 1200, duration: 0.025, type: 'square', volume: 0.04 });

    case 'streak':
      beep({ freq: 659, duration: 0.1, type: 'triangle', volume: 0.12 });
      setTimeout(() => beep({ freq: 880, duration: 0.12, type: 'triangle', volume: 0.13 }), 90);
      setTimeout(() => beep({ freq: 1047, duration: 0.16, type: 'triangle', volume: 0.14 }), 180);
      return;

    case 'quest':
      beep({ freq: 784, duration: 0.12, type: 'sine', volume: 0.1 });
      setTimeout(() => beep({ freq: 988, duration: 0.16, type: 'sine', volume: 0.11 }), 120);
      return;
  }
}
