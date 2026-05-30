// Procedural OST engine. Each track picks distinct INSTRUMENT VOICES for its
// pad / bass / lead / arp lines (piano, plucked string, FM bell, brass stack,
// ensemble saw pad, sub bass, etc.) plus a per-track drum kit. This is what
// makes the tracks actually sound different from each other — previously
// every voice was the same exponentially-decaying single oscillator.

export type Instrument =
  | "piano"        // 2-osc detuned, sharp attack, slow decay, LP filter
  | "epiano"       // sine + harmonic, chorused, jazz-y
  | "pluck"        // triangle pluck with LP sweep
  | "nylon"        // soft pluck for acoustic feel
  | "string"       // sawtooth ensemble with slow attack
  | "brass"        // saw+square stack with LP envelope
  | "bell"         // sine + harmonic with long decay
  | "fm-lead"      // FM synthesis (mod osc modulating carrier)
  | "pad-saw"      // 3-detuned saw pad
  | "pad-warm"     // sine pad with slow attack
  | "sub-bass"     // sine sub
  | "saw-bass"     // saw bass with LP envelope
  | "wob-bass"     // wobbly LFO'd saw bass
  | "organ"        // 3-harmonic sine stack
  | "marimba"      // bright sine pluck with very fast decay
  | "lo-fi-pad"    // filtered noise + saw mix
  ;

export type Kit = "house" | "trip" | "hard" | "soft" | "tribal" | "lofi" | "rock" | "techno" | "jazz" | "off";

export type TrackDef = {
  id: string;
  name: string;
  vibe: string;
  bpm: number;
  root: number;
  scale: number[];
  prog: number[][];
  pad: Instrument;
  bass: Instrument;
  lead: Instrument;
  arp?: Instrument;
  leadDensity: number;
  arpDensity?: number;
  arpOct?: number;
  drums: Kit;
  color: string;
};

export const TRACKS: TrackDef[] = [
  { id: "maison",      name: "Maison · After Hours",       vibe: "lo-fi jazz",       bpm: 76,  root: 50, scale: [0,2,3,5,7,9,10], prog: [[0,2,4,6],[5,0,2,4],[3,5,0,2],[4,6,1,3]], pad: "epiano",   bass: "sub-bass", lead: "epiano",  arp: "nylon",    leadDensity: 0.22, arpDensity: 0.35, arpOct: 1, drums: "jazz",  color: "#7c3aed" },
  { id: "novaterris",  name: "Nova Terris",                vibe: "synthwave",        bpm: 100, root: 45, scale: [0,2,3,5,7,8,10], prog: [[0,2,4],[5,0,2],[3,5,0],[6,1,3]],         pad: "pad-saw",  bass: "saw-bass", lead: "fm-lead", arp: "pluck",    leadDensity: 0.5,  arpDensity: 0.6,  arpOct: 1, drums: "house", color: "#d946ef" },
  { id: "focus",       name: "Deep Focus",                 vibe: "study pad",        bpm: 60,  root: 48, scale: [0,2,4,7,9],       prog: [[0,2,4],[0,2,4],[3,0,2],[4,1,3]],         pad: "pad-warm", bass: "sub-bass", lead: "bell",                     leadDensity: 0.12,                       drums: "off",   color: "#22d3ee" },
  { id: "sharled",     name: "Sharled Market",             vibe: "drift trade",      bpm: 112, root: 52, scale: [0,2,4,5,7,9,11],  prog: [[0,2,4],[4,6,1],[5,0,2],[3,5,0]],         pad: "organ",    bass: "saw-bass", lead: "brass",   arp: "marimba",  leadDensity: 0.5,  arpDensity: 0.55, arpOct: 1, drums: "techno",color: "#f59e0b" },
  { id: "riftline",    name: "Riftline",                   vibe: "dark drone",       bpm: 68,  root: 43, scale: [0,1,3,5,6,8,10],  prog: [[0,2,4],[1,3,5],[0,2,4],[6,0,2]],         pad: "lo-fi-pad",bass: "wob-bass", lead: "fm-lead",                  leadDensity: 0.18,                       drums: "trip",  color: "#0ea5e9" },
  { id: "azulbright",  name: "Azulbright Engines",         vibe: "stellar swell",    bpm: 84,  root: 51, scale: [0,2,4,6,7,9,11],  prog: [[0,2,4,6],[2,4,6,1],[5,0,2,4],[4,6,1,3]], pad: "string",   bass: "sub-bass", lead: "bell",    arp: "bell",     leadDensity: 0.32, arpDensity: 0.7,  arpOct: 2, drums: "tribal",color: "#3b82f6" },
  { id: "antrosa",     name: "Antrosa Belt",               vibe: "industrial pulse", bpm: 124, root: 41, scale: [0,2,3,5,7,8,10],  prog: [[0,2,4],[5,7,2],[3,5,0],[6,1,3]],         pad: "pad-saw",  bass: "wob-bass", lead: "brass",                    leadDensity: 0.55,                       drums: "hard",  color: "#ef4444" },
  { id: "polar",       name: "Polar Cosmos Crew",          vibe: "heroic theme",     bpm: 96,  root: 53, scale: [0,2,4,5,7,9,11],  prog: [[0,4,7],[2,5,9],[5,7,11],[7,11,2]],       pad: "string",   bass: "saw-bass", lead: "brass",   arp: "pluck",    leadDensity: 0.65, arpDensity: 0.5,  arpOct: 1, drums: "rock",  color: "#fb923c" },
  { id: "originrealms",name: "Origin Realms",              vibe: "blocky adventure", bpm: 92,  root: 47, scale: [0,2,4,5,7,9,11],  prog: [[0,2,4],[3,5,0],[4,6,1],[5,0,2]],         pad: "piano",    bass: "sub-bass", lead: "piano",   arp: "marimba",  leadDensity: 0.45, arpDensity: 0.45, arpOct: 1, drums: "soft",  color: "#22c55e" },
  { id: "hub",         name: "NetworkChuck Hub Theme",     vibe: "main theme",       bpm: 108, root: 50, scale: [0,2,4,7,9],        prog: [[0,2,4],[5,0,2],[4,6,1],[2,4,0]],         pad: "pad-saw",  bass: "saw-bass", lead: "fm-lead", arp: "pluck",    leadDensity: 0.5,  arpDensity: 0.6,  arpOct: 1, drums: "house", color: "#ff5577" },
  { id: "sharled-eve", name: "Sharled · Closing Bell",     vibe: "smooth jazz",      bpm: 88,  root: 49, scale: [0,2,3,5,7,9,10],  prog: [[0,2,4,6],[3,5,0,2],[1,3,5,0],[4,6,1,3]], pad: "epiano",   bass: "sub-bass", lead: "epiano",  arp: "nylon",    leadDensity: 0.28, arpDensity: 0.4,  arpOct: 1, drums: "jazz",  color: "#eab308" },
  { id: "halos-dawn",  name: "HALOS · Sunrise",            vibe: "ambient strings",  bpm: 70,  root: 50, scale: [0,2,4,7,9,11],     prog: [[0,2,4],[2,4,0],[5,0,2],[3,5,0]],         pad: "string",   bass: "sub-bass", lead: "bell",    arp: "bell",     leadDensity: 0.15, arpDensity: 0.55, arpOct: 2, drums: "off",   color: "#a855f7" },
  { id: "moreme-grind",name: "More Me · Grind",            vibe: "workout drive",    bpm: 132, root: 45, scale: [0,2,3,5,7,8,10],  prog: [[0,2,4],[5,2,4],[3,0,2],[4,1,3]],         pad: "pad-saw",  bass: "wob-bass", lead: "brass",                    leadDensity: 0.7,                        drums: "hard",  color: "#3edbb5" },
  { id: "brobot-lounge",name:"BroBot · Lounge",            vibe: "chillhop",         bpm: 86,  root: 48, scale: [0,2,3,5,7,9,10],  prog: [[0,4,7],[3,5,0],[5,0,2],[2,4,0]],         pad: "epiano",   bass: "sub-bass", lead: "epiano",  arp: "marimba",  leadDensity: 0.3,  arpDensity: 0.35, arpOct: 1, drums: "lofi",  color: "#d4af37" },
  { id: "signal-pulse",name: "SignalFinder · Pulse",       vibe: "minimal techno",   bpm: 124, root: 44, scale: [0,2,4,5,7,9,11],  prog: [[0,4,7],[2,5,9],[4,7,11],[5,0,4]],         pad: "organ",    bass: "saw-bass", lead: "fm-lead", arp: "pluck",    leadDensity: 0.55, arpDensity: 0.8,  arpOct: 1, drums: "techno",color: "#ff5577" },
  { id: "blueprint-set",name:"Digital Blueprint · Set",    vibe: "ambient piano",    bpm: 64,  root: 53, scale: [0,2,4,7,9,11],     prog: [[0,2,4],[2,4,6],[5,0,2],[3,5,0]],         pad: "pad-warm", bass: "sub-bass", lead: "piano",   arp: "bell",     leadDensity: 0.2,  arpDensity: 0.5,  arpOct: 1, drums: "off",   color: "#ffb84d" },
  { id: "voss-anthem", name: "Voss · Anthem",              vibe: "newsroom theme",   bpm: 116, root: 46, scale: [0,2,4,5,7,9,11],  prog: [[0,4,7],[5,7,11],[3,5,0],[4,7,2]],         pad: "string",   bass: "saw-bass", lead: "brass",   arp: "pluck",    leadDensity: 0.55, arpDensity: 0.5,  arpOct: 1, drums: "rock",  color: "#d946ef" },
  { id: "starchaser",  name: "Star Chaser",                vibe: "epic build",       bpm: 128, root: 47, scale: [0,2,3,5,7,9,11],  prog: [[0,2,4,6],[4,6,1,3],[5,0,2,4],[3,5,7,2]], pad: "pad-saw",  bass: "wob-bass", lead: "fm-lead", arp: "bell",     leadDensity: 0.7,  arpDensity: 0.7,  arpOct: 2, drums: "tribal",color: "#06b6d4" },
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
    const fb = ctx.createGain(); fb.gain.value = 0.28;
    const wet = ctx.createGain(); wet.gain.value = 0.18;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 4200;
    master.connect(lp); lp.connect(ctx.destination);
    master.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(ctx.destination);
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.6), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.ctx = ctx; this.master = master; this.drumBus = drumBus; this.noiseBuf = buf;
  }

  // --- Instrument voices. Each builds its own oscillator/filter graph from
  //     scratch so we get genuinely different timbres, not just a different
  //     oscillator type on the same envelope.
  private inst(name: Instrument, freq: number, start: number, dur: number, gain: number) {
    const c = this.ctx!; const out = this.master!;
    const g = c.createGain(); g.connect(out);
    const env = (a: number, d: number, peak: number) => {
      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(peak, start + a);
      g.gain.exponentialRampToValueAtTime(0.0001, start + d);
    };
    switch (name) {
      case "piano": {
        // Two oscillators, slightly detuned, with a low-pass that opens fast
        // and a long-ish decay — gives a hammered, harmonic feel.
        const o1 = c.createOscillator(); o1.type = "triangle"; o1.frequency.value = freq;
        const o2 = c.createOscillator(); o2.type = "sine";     o2.frequency.value = freq * 2.005;
        const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.setValueAtTime(5500, start); lp.frequency.exponentialRampToValueAtTime(900, start + dur);
        o1.connect(lp); o2.connect(lp); lp.connect(g);
        env(0.004, dur, gain * 1.0);
        o1.start(start); o2.start(start);
        o1.stop(start + dur + 0.05); o2.stop(start + dur + 0.05);
        break;
      }
      case "epiano": {
        const o = c.createOscillator(); o.type = "sine"; o.frequency.value = freq;
        const o2 = c.createOscillator(); o2.type = "sine"; o2.frequency.value = freq * 3;
        const o2g = c.createGain(); o2g.gain.value = 0.18; o2.connect(o2g); o2g.connect(g);
        o.connect(g);
        env(0.01, dur * 1.1, gain * 0.9);
        o.start(start); o2.start(start);
        o.stop(start + dur + 0.05); o2.stop(start + dur + 0.05);
        break;
      }
      case "pluck": {
        const o = c.createOscillator(); o.type = "triangle"; o.frequency.value = freq;
        const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.setValueAtTime(4000, start); lp.frequency.exponentialRampToValueAtTime(700, start + dur * 0.8);
        o.connect(lp); lp.connect(g);
        env(0.002, dur * 0.7, gain * 1.0);
        o.start(start); o.stop(start + dur + 0.05);
        break;
      }
      case "nylon": {
        const o = c.createOscillator(); o.type = "triangle"; o.frequency.value = freq;
        const o2 = c.createOscillator(); o2.type = "sine"; o2.frequency.value = freq * 2.01;
        const o2g = c.createGain(); o2g.gain.value = 0.25; o2.connect(o2g); o2g.connect(g);
        const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1800;
        o.connect(lp); lp.connect(g);
        env(0.005, dur * 0.9, gain * 0.95);
        o.start(start); o2.start(start);
        o.stop(start + dur + 0.05); o2.stop(start + dur + 0.05);
        break;
      }
      case "string": {
        const o1 = c.createOscillator(); o1.type = "sawtooth"; o1.frequency.value = freq;
        const o2 = c.createOscillator(); o2.type = "sawtooth"; o2.frequency.value = freq * 1.005;
        const o3 = c.createOscillator(); o3.type = "sawtooth"; o3.frequency.value = freq * 0.995;
        const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2200;
        o1.connect(lp); o2.connect(lp); o3.connect(lp); lp.connect(g);
        g.gain.setValueAtTime(0.0001, start);
        g.gain.linearRampToValueAtTime(gain * 0.7, start + 0.18);
        g.gain.linearRampToValueAtTime(gain * 0.55, start + dur * 0.7);
        g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        [o1, o2, o3].forEach((o) => { o.start(start); o.stop(start + dur + 0.05); });
        break;
      }
      case "brass": {
        const o1 = c.createOscillator(); o1.type = "sawtooth"; o1.frequency.value = freq;
        const o2 = c.createOscillator(); o2.type = "square";   o2.frequency.value = freq * 1.003;
        const lp = c.createBiquadFilter(); lp.type = "lowpass";
        lp.frequency.setValueAtTime(700, start);
        lp.frequency.linearRampToValueAtTime(2500, start + 0.08);
        lp.frequency.exponentialRampToValueAtTime(900, start + dur);
        o1.connect(lp); o2.connect(lp); lp.connect(g);
        env(0.05, dur, gain * 0.85);
        o1.start(start); o2.start(start);
        o1.stop(start + dur + 0.05); o2.stop(start + dur + 0.05);
        break;
      }
      case "bell": {
        const o = c.createOscillator(); o.type = "sine"; o.frequency.value = freq;
        const o2 = c.createOscillator(); o2.type = "sine"; o2.frequency.value = freq * 2.76;
        const o2g = c.createGain(); o2g.gain.value = 0.22; o2.connect(o2g); o2g.connect(g);
        o.connect(g);
        env(0.003, dur * 1.6, gain * 0.9);
        o.start(start); o2.start(start);
        o.stop(start + dur + 0.2); o2.stop(start + dur + 0.2);
        break;
      }
      case "fm-lead": {
        // FM: a modulator drives the carrier's frequency via a Gain node.
        const carrier = c.createOscillator(); carrier.type = "sine"; carrier.frequency.value = freq;
        const mod = c.createOscillator(); mod.type = "sine"; mod.frequency.value = freq * 2;
        const modGain = c.createGain(); modGain.gain.value = freq * 1.2;
        mod.connect(modGain); modGain.connect(carrier.frequency);
        carrier.connect(g);
        env(0.01, dur, gain * 0.9);
        carrier.start(start); mod.start(start);
        carrier.stop(start + dur + 0.05); mod.stop(start + dur + 0.05);
        break;
      }
      case "pad-saw": {
        const o1 = c.createOscillator(); o1.type = "sawtooth"; o1.frequency.value = freq;
        const o2 = c.createOscillator(); o2.type = "sawtooth"; o2.frequency.value = freq * 1.008;
        const o3 = c.createOscillator(); o3.type = "sawtooth"; o3.frequency.value = freq * 0.992;
        const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1500;
        o1.connect(lp); o2.connect(lp); o3.connect(lp); lp.connect(g);
        g.gain.setValueAtTime(0.0001, start);
        g.gain.linearRampToValueAtTime(gain * 0.7, start + 0.4);
        g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        [o1, o2, o3].forEach((o) => { o.start(start); o.stop(start + dur + 0.05); });
        break;
      }
      case "pad-warm": {
        const o = c.createOscillator(); o.type = "sine"; o.frequency.value = freq;
        const o2 = c.createOscillator(); o2.type = "sine"; o2.frequency.value = freq * 2;
        const o2g = c.createGain(); o2g.gain.value = 0.15; o2.connect(o2g); o2g.connect(g);
        o.connect(g);
        g.gain.setValueAtTime(0.0001, start);
        g.gain.linearRampToValueAtTime(gain * 0.8, start + 0.5);
        g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        o.start(start); o2.start(start);
        o.stop(start + dur + 0.05); o2.stop(start + dur + 0.05);
        break;
      }
      case "sub-bass": {
        const o = c.createOscillator(); o.type = "sine"; o.frequency.value = freq;
        o.connect(g);
        env(0.02, dur, gain * 1.6);
        o.start(start); o.stop(start + dur + 0.05);
        break;
      }
      case "saw-bass": {
        const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = freq;
        const lp = c.createBiquadFilter(); lp.type = "lowpass";
        lp.frequency.setValueAtTime(2000, start);
        lp.frequency.exponentialRampToValueAtTime(400, start + dur);
        o.connect(lp); lp.connect(g);
        env(0.005, dur, gain * 1.1);
        o.start(start); o.stop(start + dur + 0.05);
        break;
      }
      case "wob-bass": {
        const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = freq;
        const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 800; lp.Q.value = 6;
        const lfo = c.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 4;
        const lfoG = c.createGain(); lfoG.gain.value = 600;
        lfo.connect(lfoG); lfoG.connect(lp.frequency);
        o.connect(lp); lp.connect(g);
        env(0.01, dur, gain * 1.0);
        o.start(start); lfo.start(start);
        o.stop(start + dur + 0.05); lfo.stop(start + dur + 0.05);
        break;
      }
      case "organ": {
        const f = [freq, freq * 2, freq * 3];
        f.forEach((fr, i) => {
          const o = c.createOscillator(); o.type = "sine"; o.frequency.value = fr;
          const og = c.createGain(); og.gain.value = [1, 0.5, 0.3][i];
          o.connect(og); og.connect(g);
          o.start(start); o.stop(start + dur + 0.05);
        });
        env(0.02, dur, gain * 0.85);
        break;
      }
      case "marimba": {
        const o = c.createOscillator(); o.type = "sine"; o.frequency.value = freq;
        const o2 = c.createOscillator(); o2.type = "sine"; o2.frequency.value = freq * 4;
        const o2g = c.createGain(); o2g.gain.value = 0.4; o2.connect(o2g); o2g.connect(g);
        o.connect(g);
        env(0.002, Math.min(dur, 0.35), gain * 1.0);
        o.start(start); o2.start(start);
        o.stop(start + 0.5); o2.stop(start + 0.5);
        break;
      }
      case "lo-fi-pad": {
        if (this.noiseBuf) {
          const n = c.createBufferSource(); n.buffer = this.noiseBuf; n.loop = true;
          const nf = c.createBiquadFilter(); nf.type = "bandpass"; nf.frequency.value = freq * 2; nf.Q.value = 4;
          const ng = c.createGain(); ng.gain.value = 0.05;
          n.connect(nf); nf.connect(ng); ng.connect(g);
          n.start(start); n.stop(start + dur + 0.05);
        }
        const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = freq;
        const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900;
        o.connect(lp); lp.connect(g);
        g.gain.setValueAtTime(0.0001, start);
        g.gain.linearRampToValueAtTime(gain * 0.6, start + 0.3);
        g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        o.start(start); o.stop(start + dur + 0.05);
        break;
      }
    }
  }

  // --- Drum kits. Different kits use different timbres for the same hit
  //     names so a "house" kit sounds clearly different from a "rock" kit.
  private kick(t: number, kit: Kit) {
    if (!this.ctx || !this.drumBus) return;
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    const fStart = kit === "rock" ? 140 : kit === "hard" ? 130 : kit === "techno" ? 150 : kit === "jazz" ? 90 : kit === "lofi" ? 80 : 110;
    const fEnd = kit === "rock" ? 55 : kit === "hard" ? 40 : kit === "techno" ? 45 : kit === "jazz" ? 50 : kit === "lofi" ? 35 : 45;
    const dur = kit === "jazz" || kit === "lofi" ? 0.16 : kit === "rock" ? 0.28 : 0.22;
    o.type = kit === "techno" ? "triangle" : "sine";
    o.frequency.setValueAtTime(fStart, t);
    o.frequency.exponentialRampToValueAtTime(fEnd, t + dur * 0.7);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(kit === "hard" || kit === "techno" ? 0.75 : 0.6, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.drumBus);
    o.start(t); o.stop(t + dur + 0.02);
  }
  private snare(t: number, kit: Kit) {
    if (!this.ctx || !this.drumBus || !this.noiseBuf) return;
    const c = this.ctx;
    const n = c.createBufferSource(); n.buffer = this.noiseBuf;
    const filt = c.createBiquadFilter(); filt.type = "highpass";
    filt.frequency.value = kit === "jazz" ? 1200 : kit === "rock" ? 1800 : kit === "lofi" ? 900 : 1500;
    const g = c.createGain();
    const peak = kit === "rock" ? 0.55 : kit === "lofi" ? 0.25 : 0.4;
    const dur = kit === "rock" ? 0.22 : kit === "lofi" ? 0.12 : 0.18;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(filt); filt.connect(g); g.connect(this.drumBus);
    n.start(t); n.stop(t + dur + 0.02);
    // Rock kits get a low body tone with the snare.
    if (kit === "rock") {
      const o = c.createOscillator(); o.type = "triangle"; o.frequency.value = 200;
      const og = c.createGain(); og.gain.setValueAtTime(0.2, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(og); og.connect(this.drumBus); o.start(t); o.stop(t + 0.13);
    }
  }
  private hat(t: number, open: boolean, kit: Kit) {
    if (!this.ctx || !this.drumBus || !this.noiseBuf) return;
    const c = this.ctx;
    const n = c.createBufferSource(); n.buffer = this.noiseBuf;
    const filt = c.createBiquadFilter(); filt.type = "highpass";
    filt.frequency.value = kit === "jazz" ? 5500 : kit === "lofi" ? 6500 : 7500;
    const g = c.createGain();
    const dur = open ? (kit === "jazz" ? 0.24 : 0.18) : (kit === "jazz" ? 0.04 : 0.06);
    const peak = kit === "lofi" ? 0.08 : kit === "jazz" ? 0.1 : open ? 0.18 : 0.13;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(filt); filt.connect(g); g.connect(this.drumBus);
    n.start(t); n.stop(t + dur + 0.02);
  }
  private clap(t: number) {
    if (!this.ctx || !this.drumBus || !this.noiseBuf) return;
    const c = this.ctx;
    [0, 0.012, 0.024].forEach((off) => {
      const n = c.createBufferSource(); n.buffer = this.noiseBuf!;
      const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1400; f.Q.value = 2;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t + off);
      g.gain.exponentialRampToValueAtTime(0.3, t + off + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.1);
      n.connect(f); f.connect(g); g.connect(this.drumBus!);
      n.start(t + off); n.stop(t + off + 0.12);
    });
  }
  private rim(t: number) {
    if (!this.ctx || !this.drumBus) return;
    const c = this.ctx;
    const o = c.createOscillator(); o.type = "square"; o.frequency.value = 800;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g); g.connect(this.drumBus);
    o.start(t); o.stop(t + 0.06);
  }
  private shaker(t: number) {
    if (!this.ctx || !this.drumBus || !this.noiseBuf) return;
    const c = this.ctx;
    const n = c.createBufferSource(); n.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 4000;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.08, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    n.connect(f); f.connect(g); g.connect(this.drumBus);
    n.start(t); n.stop(t + 0.1);
  }
  private tom(t: number, pitch: number) {
    if (!this.ctx || !this.drumBus) return;
    const c = this.ctx;
    const o = c.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(pitch, t); o.frequency.exponentialRampToValueAtTime(pitch * 0.5, t + 0.2);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.connect(g); g.connect(this.drumBus);
    o.start(t); o.stop(t + 0.28);
  }

  private scheduleDrums(t: TrackDef, time: number) {
    const kit = t.drums;
    if (kit === "off") return;
    const within = this.step % 16;
    switch (kit) {
      case "house":
        if (within % 4 === 0) this.kick(time, kit);
        if (within === 4 || within === 12) this.snare(time, kit);
        this.hat(time, within % 4 === 2, kit);
        break;
      case "trip":
        if (within === 0 || within === 7 || within === 11) this.kick(time, kit);
        if (within === 4 || within === 12) this.snare(time, kit);
        if (within % 2 === 1) this.hat(time, false, kit);
        if (within === 10) this.rim(time);
        break;
      case "hard":
        if (within % 2 === 0) this.kick(time, kit);
        if (within === 4 || within === 12) this.snare(time, kit);
        this.hat(time, within % 4 === 0, kit);
        break;
      case "soft":
        if (within === 0 || within === 8) this.kick(time, kit);
        if (within === 4 || within === 12) this.snare(time, kit);
        if (within % 4 === 2) this.hat(time, false, kit);
        break;
      case "tribal":
        if (within === 0 || within === 6 || within === 10) this.kick(time, kit);
        if (within === 4 || within === 12) this.tom(time, within === 4 ? 180 : 120);
        if (within % 2 === 0) this.shaker(time);
        break;
      case "lofi":
        if (within === 0 || within === 8) this.kick(time, kit);
        if (within === 4 || within === 12) this.snare(time, kit);
        if (within % 4 === 2) this.hat(time, false, kit);
        if (within === 6) this.rim(time);
        break;
      case "rock":
        if (within === 0 || within === 8) this.kick(time, kit);
        if (within === 4 || within === 12) this.snare(time, kit);
        this.hat(time, false, kit);
        break;
      case "techno":
        if (within % 4 === 0) this.kick(time, kit);
        if (within === 4 || within === 12) this.clap(time);
        if (within % 2 === 1) this.hat(time, within === 7 || within === 15, kit);
        break;
      case "jazz":
        // Jazz ride pattern: long-short-long with brushed snare and walking kick.
        if (within === 0 || within === 8) this.kick(time, kit);
        if (within === 4 || within === 12) this.snare(time, kit);
        if (within % 3 === 0) this.hat(time, true, kit);
        else if (within % 2 === 0) this.shaker(time);
        break;
    }
  }

  private scheduleArp(t: TrackDef, time: number, chord: number[]) {
    if (!t.arp || !t.arpDensity || Math.random() > t.arpDensity) return;
    const idx = this.step % chord.length;
    const deg = chord[idx];
    const oct = t.arpOct ?? 1;
    const midi = t.root + 12 * oct + t.scale[deg % t.scale.length] + 12 * Math.floor(deg / t.scale.length);
    this.inst(t.arp, mtof(midi), time, (60 / t.bpm) * 0.45, 0.045);
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
        this.inst(t.pad, mtof(midi), time, beat, 0.06);
      });
    }
    if (within % 4 === 0) {
      const bassMidi = t.root - 12 + t.scale[chord[0] % t.scale.length];
      this.inst(t.bass, mtof(bassMidi), time, 60 / t.bpm, 0.13);
    }
    if (Math.random() < t.leadDensity * 0.5) {
      const deg = chord[Math.floor(Math.random() * chord.length)] + (Math.random() < 0.4 ? 7 : 0);
      const midi = t.root + 12 + t.scale[deg % t.scale.length] + 12 * Math.floor(deg / t.scale.length);
      this.inst(t.lead, mtof(midi), time, (60 / t.bpm) * 0.9, 0.055);
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
