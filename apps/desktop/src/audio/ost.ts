// Procedural OST engine — generates several distinct ambient/synth tracks with
// the Web Audio API (no audio files needed). A lookahead step-sequencer plays
// pad chords, a bassline, and sparse lead notes through a feedback-delay space.

export type TrackDef = {
  id: string;
  name: string;
  bpm: number;
  root: number; // MIDI note of the tonic
  scale: number[]; // semitone offsets
  prog: number[][]; // chords as scale-degree indices
  lead: "triangle" | "sine" | "sawtooth" | "square";
  pad: "sine" | "triangle";
  leadDensity: number; // 0..1 chance of a lead note per step
};

export const TRACKS: TrackDef[] = [
  {
    id: "maison",
    name: "Maison · After Hours",
    bpm: 76,
    root: 50, // D
    scale: [0, 2, 3, 5, 7, 9, 10], // dorian, jazzy
    prog: [[0, 2, 4, 6], [5, 0, 2, 4], [3, 5, 0, 2], [4, 6, 1, 3]],
    lead: "sine",
    pad: "sine",
    leadDensity: 0.18,
  },
  {
    id: "novaterris",
    name: "Nova Terris",
    bpm: 100,
    root: 45, // A
    scale: [0, 2, 3, 5, 7, 8, 10], // aeolian, synthwave
    prog: [[0, 2, 4], [5, 0, 2], [3, 5, 0], [6, 1, 3]],
    lead: "sawtooth",
    pad: "triangle",
    leadDensity: 0.4,
  },
  {
    id: "focus",
    name: "Deep Focus",
    bpm: 60,
    root: 48, // C
    scale: [0, 2, 4, 7, 9], // major pentatonic, calm
    prog: [[0, 2, 4], [0, 2, 4], [3, 0, 2], [4, 1, 3]],
    lead: "triangle",
    pad: "sine",
    leadDensity: 0.1,
  },
  {
    id: "sharled",
    name: "Sharled Market",
    bpm: 112,
    root: 52, // E
    scale: [0, 2, 4, 5, 7, 9, 11], // ionian, bright
    prog: [[0, 2, 4], [4, 6, 1], [5, 0, 2], [3, 5, 0]],
    lead: "square",
    pad: "triangle",
    leadDensity: 0.46,
  },
  {
    id: "riftline",
    name: "Riftline",
    bpm: 68,
    root: 43, // G
    scale: [0, 1, 3, 5, 6, 8, 10], // locrian-ish, dark
    prog: [[0, 2, 4], [1, 3, 5], [0, 2, 4], [6, 0, 2]],
    lead: "sine",
    pad: "sine",
    leadDensity: 0.14,
  },
];

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export class OST {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private nextStepTime = 0;
  private current = -1;
  private vol = 0.45;
  playing = false;

  private ensure() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = this.vol;
    // simple feedback-delay reverb-ish space
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.34;
    const fb = ctx.createGain();
    fb.gain.value = 0.3;
    const wet = ctx.createGain();
    wet.gain.value = 0.22;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 3200;
    master.connect(lp);
    lp.connect(ctx.destination);
    master.connect(delay);
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(wet);
    wet.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
  }

  private voice(freq: number, start: number, dur: number, type: OscillatorType, gain: number) {
    if (!this.ctx || !this.master) return;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(gain, start + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(start);
    o.stop(start + dur + 0.05);
  }

  private scheduleStep(t: TrackDef, time: number) {
    const stepsPerChord = 8;
    const chordIdx = Math.floor(this.step / stepsPerChord) % t.prog.length;
    const chord = t.prog[chordIdx];
    const within = this.step % stepsPerChord;

    // pad on chord change
    if (within === 0) {
      const beat = (60 / t.bpm) * 4;
      chord.forEach((deg, i) => {
        const oct = i === 0 ? -12 : 0;
        const midi = t.root + oct + t.scale[deg % t.scale.length] + 12 * Math.floor(deg / t.scale.length);
        this.voice(mtof(midi), time, beat, t.pad, 0.06);
      });
    }
    // bass on downbeats (every 2 steps)
    if (within % 2 === 0) {
      const bassMidi = t.root - 12 + t.scale[chord[0] % t.scale.length];
      this.voice(mtof(bassMidi), time, 60 / t.bpm, "triangle", 0.12);
    }
    // sparse lead
    if (Math.random() < t.leadDensity) {
      const deg = chord[Math.floor(Math.random() * chord.length)] + (Math.random() < 0.4 ? 7 : 0);
      const midi = t.root + 12 + t.scale[deg % t.scale.length] + 12 * Math.floor(deg / t.scale.length);
      this.voice(mtof(midi), time, (60 / t.bpm) * 0.9, t.lead, 0.05);
    }
  }

  play(index: number) {
    this.ensure();
    if (!this.ctx) return;
    void this.ctx.resume();
    this.current = ((index % TRACKS.length) + TRACKS.length) % TRACKS.length;
    this.step = 0;
    this.nextStepTime = this.ctx.currentTime + 0.1;
    this.playing = true;
    if (this.timer) clearInterval(this.timer);
    const t = TRACKS[this.current];
    const stepDur = 60 / t.bpm / 2; // 8th notes
    this.timer = setInterval(() => {
      if (!this.ctx) return;
      while (this.nextStepTime < this.ctx.currentTime + 0.15) {
        this.scheduleStep(t, this.nextStepTime);
        this.nextStepTime += stepDur;
        this.step++;
      }
    }, 40);
  }

  stop() {
    this.playing = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  next() {
    this.play(this.current + 1);
  }

  setVolume(v: number) {
    this.vol = v;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  get currentIndex() {
    return this.current;
  }
}

export const ost = new OST();
