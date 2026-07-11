// Procedural UI sound — the HALOS feel layer, ported. Same WebAudio DNA as
// halos/js/audio.js (no audio files shipped, everything synthesized), tuned
// slightly softer for a daily-driver app.
//
// Restraint rules:
//  - Sounds fire on USER ACTIONS (click, complete, save, nav) and on the two
//    reward moments (unlock, level-up). Nothing ambient, nothing on a loop.
//  - One master toggle (uiPrefs.sfxEnabled, surfaced in Customize). Off = a
//    single early-return; the AudioContext is never even created.

import { loadPrefs } from "../uiPrefs";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function ensureCtx(): AudioContext | null {
  if (!loadPrefs().sfxEnabled) return null;
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
    return ctx;
  } catch { return null; }
}

type OscType = OscillatorType;

function tone(c: AudioContext, opts: {
  type: OscType; from: number; to?: number; delay?: number;
  attack?: number; length: number; peak: number;
  highpass?: number; lowpass?: number;
}) {
  const t = c.currentTime + (opts.delay ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type;
  osc.frequency.setValueAtTime(opts.from, t);
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t + opts.length * 0.75);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(opts.peak, t + (opts.attack ?? 0.008));
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.length);
  let head: AudioNode = osc;
  if (opts.highpass) {
    const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = opts.highpass;
    head.connect(f); head = f;
  }
  if (opts.lowpass) {
    const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = opts.lowpass;
    head.connect(f); head = f;
  }
  head.connect(g);
  g.connect(master!);
  osc.start(t);
  osc.stop(t + opts.length + 0.05);
}

/** Quick percussive tick — generic button press. */
export function sfxClick() {
  const c = ensureCtx(); if (!c) return;
  tone(c, { type: "square", from: 2400, to: 900, length: 0.07, peak: 0.10, attack: 0.004, highpass: 700 });
}

/** Mid-tone rising swipe — switching destinations / tabs. */
export function sfxNav() {
  const c = ensureCtx(); if (!c) return;
  tone(c, { type: "sine", from: 880, to: 1320, length: 0.11, peak: 0.07 });
}

/** Two rising tones — something real got done (complete, save). */
export function sfxSuccess() {
  const c = ensureCtx(); if (!c) return;
  tone(c, { type: "sine", from: 660, length: 0.2, peak: 0.09 });
  tone(c, { type: "sine", from: 990, length: 0.2, peak: 0.09, delay: 0.09 });
}

/** Low falling double-buzz — refused / invalid. */
export function sfxError() {
  const c = ensureCtx(); if (!c) return;
  tone(c, { type: "sawtooth", from: 320, to: 180, length: 0.16, peak: 0.09, lowpass: 1800 });
  tone(c, { type: "sawtooth", from: 320, to: 180, length: 0.16, peak: 0.09, lowpass: 1800, delay: 0.06 });
}

/** Three-note rising chime — achievement unlock / level-up. The big one. */
export function sfxChime() {
  const c = ensureCtx(); if (!c) return;
  tone(c, { type: "sine", from: 660, length: 0.24, peak: 0.11 });
  tone(c, { type: "sine", from: 880, length: 0.24, peak: 0.11, delay: 0.1 });
  tone(c, { type: "sine", from: 1320, length: 0.3, peak: 0.11, delay: 0.2 });
}

/** Soft two-tone attention cue — breaking news bumper. Deliberately quiet. */
export function sfxAlert() {
  const c = ensureCtx(); if (!c) return;
  tone(c, { type: "sine", from: 1040, length: 0.14, peak: 0.07 });
  tone(c, { type: "sine", from: 780, length: 0.18, peak: 0.07, delay: 0.12 });
}
