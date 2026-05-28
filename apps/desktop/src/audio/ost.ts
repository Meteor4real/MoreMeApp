// Procedural OST engine — generates a stable of distinct ambient/synth tracks
// with the Web Audio API (no audio files needed). A lookahead step-sequencer
// plays pad chords, a bassline, drums, optional arpeggios, and a sparse lead
// through a feedback-delay space. Per-track flags pick the texture.

export type TrackDef = {
  id: string;
  name: string;
  vibe: string;          // short tag shown in the player
  bpm: number;
  root: number;          // MIDI note of the tonic
  scale: number[];       // semitone offsets
  prog: number[][];      // chords as scale-degree indices
  lead: OscillatorType;
  pad: OscillatorType;
  leadDensity: number;   // 0..1 chance of a lead note per step
  drums?: "house" | "trip" | "hard" | "soft" | "tribal" | "off";
  arp?: { type: OscillatorType; density: number; oct: number };
  color: string;         // hex for the player tile artwork
};

export const TRACKS: TrackDef[] = [
  { id: "maison",     name: "Maison · After Hours",      vibe: "lo-fi jazz",       bpm: 76,  root: 50, scale: [0,2,3,5,7,9,10], prog: [[0,2,4,6],[5,0,2,4],[3,5,0,2],[4,6,1,3]], lead: "sine",     pad: "sine",     leadDensity: 0.18, drums: "soft",  color: "#7c3aed" },
  { id: "novaterris", name: "Nova Terris",                vibe: "synthwave",        bpm: 100, root: 45, scale: [0,2,3,5,7,8,10], prog: [[0,2,4],[5,0,2],[3,5,0],[6,1,3]],         lead: "sawtooth", pad: "triangle", leadDensity: 0.4,  drums: "house", arp: { type: "triangle", density: 0.55, oct: 1 }, color: "#d946ef" },
  { id: "focus",      name: "Deep Focus",                 vibe: "study pad",        bpm: 60,  root: 48, scale: [0,2,4,7,9],       prog: [[0,2,4],[0,2,4],[3,0,2],[4,1,3]],         lead: "triangle", pad: "sine",     leadDensity: 0.1,  drums: "off",                                                       color: "#22d3ee" },
  { id: "sharled",    name: "Sharled Market",             vibe: "drift trade",      bpm: 112, root: 52, scale: [0,2,4,5,7,9,11],  prog: [[0,2,4],[4,6,1],[5,0,2],[3,5,0]],         lead: "square",   pad: "triangle", leadDensity: 0.46, drums: "house",                                                     color: "#f59e0b" },
  { id: "riftline",   name: "Riftline",                   vibe: "dark drone",       bpm: 68,  root: 43, scale: [0,1,3,5,6,8,10],  prog: [[0,2,4],[1,3,5],[0,2,4],[6,0,2]],         lead: "sine",     pad: "sine",     leadDensity: 0.14, drums: "trip",                                                      color: "#0ea5e9" },
  // — five new ones, each with a distinct texture —
  { id: "azulbright", name: "Azulbright Engines",         vibe: "stellar swell",    bpm: 84,  root: 51, scale: [0,2,4,6,7,9,11],  prog: [[0,2,4,6],[2,4,6,1],[5,0,2,4],[4,6,1,3]], lead: "triangle", pad: "sine",     leadDensity: 0.3,  drums: "tribal", arp: { type: "sine", density: 0.7, oct: 2 },     color: "#3b82f6" },
  { id: "antrosa",    name: "Antrosa Belt",               vibe: "industrial pulse", bpm: 124, root: 41, scale: [0,2,3,5,7,8,10],  prog: [[0,2,4],[5,7,2],[3,5,0],[6,1,3]],         lead: "sawtooth", pad: "sawtooth", leadDensity: 0.55, drums: "hard",                                                      color: "#ef4444" },
  { id: "polar",      name: "Polar Cosmos Crew",          vibe: "heroic theme",     bpm: 96,  root: 53, scale: [0,2,4,5,7,9,11],  prog: [[0,4,7],[2,5,9],[5,7,11],[7,11,2]],       lead: "square",   pad: "triangle", leadDensity: 0.65, drums: "house", arp: { type: "triangle", density: 0.5, oct: 1 },   color: "#fb923c" },
  { id: "originrealms", name: "Origin Realms",            vibe: "blocky adventure", bpm: 92,  root: 47, scale: [0,2,4,5,7,9,11],  prog: [[0,2,4],[3,5,0],[4,6,1],[5,0,2]],         lead: "triangle", pad: "sine",     leadDensity: 0.45, drums: "soft",                                                      color: "#22c55e" },
  { id: "hub",        name: "NetworkChuck Hub Theme",     vibe: "main theme",       bpm: 108, root: 50, scale: [0,2,4,7,9],        prog: [[0,2,4],[5,0,2],[4,6,1],[2,4,0]],         lead: "sawtooth", pad: "triangle", leadDensity: 0.5,  drums: "house", arp: { type: "square", density: 0.6, oct: 1 },     color: "#ff5577" },
];

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export class OST {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private drumBus: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
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
    const master = ctx.createGain(); master.gain.value = this.vol;
    const drumBus = ctx.createGain(); drumBus.gain.value = this.vol * 0.9; drumBus.connect(ctx.destination);
    const delay = ctx.createDelay(1); delay.delayTime.value = 0.34;
    const fb = ctx.createGain(); fb.gain.value = 0.3;
    const wet = ctx.createGain(); wet.gain.value = 0.22;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3200;
    master.connect(lp); lp.connect(ctx.destination);
    master.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(ctx.destination);
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.ctx = ctx; this.master = master; this.drumBus = drumBus; this.noiseBuf = buf;
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
    o.connect(g); g.connect(this.master);
    o.start(start); o.stop(start + dur + 0.05);
  }

  private kick(t: number) {
    if (!this.ctx || !this.drumBus) return;
    const o = this.ctx.createOscillator(); o.type = "sine";
    const g = this.ctx.createGain();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.15);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.6, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g); g.connect(this.drumBus);
    o.start(t); o.stop(t + 0.25);
  }
  private snare(t: number) {
    if (!this.ctx || !this.drumBus || !this.noiseBuf) return;
    const n = this.ctx.createBufferSource(); n.buffer = this.noiseBuf;
    const filt = this.ctx.createBiquadFilter(); filt.type = "highpass"; filt.frequency.value = 1500;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    n.connect(filt); filt.connect(g); g.connect(this.drumBus);
    n.start(t); n.stop(t + 0.2);
  }
  private hat(t: number, open = false) {
    if (!this.ctx || !this.drumBus || !this.noiseBuf) return;
    const n = this.ctx.createBufferSource(); n.buffer = this.noiseBuf;
    const filt = this.ctx.createBiquadFilter(); filt.type = "highpass"; filt.frequency.value = 7000;
    const g = this.ctx.createGain();
    const dur = open ? 0.16 : 0.06;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(open ? 0.18 : 0.12, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(filt); filt.connect(g); g.connect(this.drumBus);
    n.start(t); n.stop(t + dur + 0.02);
  }

  private scheduleDrums(t: TrackDef, time: number) {
    if (!t.drums || t.drums === "off") return;
    const within = this.step % 16;
    switch (t.drums) {
      case "house":
        if (within % 4 === 0) this.kick(time);
        if (within === 4 || within === 12) this.snare(time);
        this.hat(time, within % 4 === 2);
        break;
      case "trip":
        if (within === 0 || within === 7 || within === 11) this.kick(time);
        if (within === 4 || within === 12) this.snare(time);
        if (within % 2 === 1) this.hat(time);
        break;
      case "hard":
        if (within % 2 === 0) this.kick(time);
        if (within === 4 || within === 12) this.snare(time);
        this.hat(time, within % 4 === 0);
        break;
      case "soft":
        if (within === 0 || within === 8) this.kick(time);
        if (within === 4 || within === 12) this.snare(time);
        if (within % 4 === 2) this.hat(time);
        break;
      case "tribal":
        if (within === 0 || within === 6 || within === 10) this.kick(time);
        if (within === 4 || within === 12) this.snare(time);
        if (within % 3 === 0) this.hat(time, within % 6 === 0);
        break;
    }
  }

  private scheduleArp(t: TrackDef, time: number, chord: number[]) {
    if (!t.arp || Math.random() > t.arp.density) return;
    const idx = this.step % chord.length;
    const deg = chord[idx];
    const midi = t.root + 12 * t.arp.oct + t.scale[deg % t.scale.length] + 12 * Math.floor(deg / t.scale.length);
    this.voice(mtof(midi), time, (60 / t.bpm) * 0.45, t.arp.type, 0.04);
  }

  private scheduleStep(t: TrackDef, time: number) {
    const stepsPerChord = 16;
    const chordIdx = Math.floor(this.step / stepsPerChord) % t.prog.length;
    const chord = t.prog[chordIdx];
    const within = this.step % stepsPerChord;

    if (within === 0) {
      const beat = (60 / t.bpm) * 4;
      chord.forEach((deg, i) => {
        const oct = i === 0 ? -12 : 0;
        const midi = t.root + oct + t.scale[deg % t.scale.length] + 12 * Math.floor(deg / t.scale.length);
        this.voice(mtof(midi), time, beat, t.pad, 0.06);
      });
    }
    if (within % 4 === 0) {
      const bassMidi = t.root - 12 + t.scale[chord[0] % t.scale.length];
      this.voice(mtof(bassMidi), time, 60 / t.bpm, "triangle", 0.12);
    }
    if (Math.random() < t.leadDensity * 0.5) {
      const deg = chord[Math.floor(Math.random() * chord.length)] + (Math.random() < 0.4 ? 7 : 0);
      const midi = t.root + 12 + t.scale[deg % t.scale.length] + 12 * Math.floor(deg / t.scale.length);
      this.voice(mtof(midi), time, (60 / t.bpm) * 0.9, t.lead, 0.05);
    }
    this.scheduleArp(t, time, chord);
    this.scheduleDrums(t, time);
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
    const stepDur = 60 / t.bpm / 4;
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
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  next() { this.play(this.current + 1); }
  prev() { this.play(this.current - 1); }

  setVolume(v: number) {
    this.vol = v;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
    if (this.drumBus && this.ctx) this.drumBus.gain.setTargetAtTime(v * 0.9, this.ctx.currentTime, 0.05);
  }

  get currentIndex() { return this.current; }
}

export const ost = new OST();
