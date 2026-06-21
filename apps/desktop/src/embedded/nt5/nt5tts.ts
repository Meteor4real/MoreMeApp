// NT5 text-to-speech helpers — per-anchor voice selection on top of the
// browser's SpeechSynthesis. The default browser voice is robotic; modern
// browsers + Electron's bundled Chromium expose Microsoft's neural voices
// (Aria, Jenny, Guy, etc.) and Google's "Online" voices alongside the
// older eSpeak fallbacks. We pick the best available match per anchor so
// each one sounds like a different person.
//
// This is a best-effort: voices vary by OS, locale, and Edge/Chromium build.
// When nothing better is available, we still pick the system default but
// tune rate / pitch so anchors still feel distinct.

export type AnchorVoiceProfile = {
  // Substrings to look for in the voice name, in priority order. First match wins.
  preferred: string[];
  rate: number;   // 1.0 = default; 0.9 = slightly slower
  pitch: number;  // 1.0 = default
};

// Tuned per anchor. The preference lists target the named neural voices
// that Microsoft Edge / Windows 10+ expose; Mac falls back to the named
// premium voices; Linux drops to whatever's available.
export const ANCHOR_VOICES: Record<string, AnchorVoiceProfile> = {
  voss: {
    // Lead anchor — authoritative male voice
    preferred: ["Guy Online (Natural)", "Microsoft Guy", "Microsoft David", "Google US English", "Daniel", "Alex"],
    rate: 0.95,
    pitch: 0.95,
  },
  lena: {
    // Field reporter — energetic female voice
    preferred: ["Jenny Online (Natural)", "Microsoft Jenny", "Aria Online (Natural)", "Microsoft Aria", "Samantha", "Karen"],
    rate: 1.05,
    pitch: 1.05,
  },
  orin: {
    // Tech & space — measured male voice
    preferred: ["Brandon Online (Natural)", "Microsoft Brandon", "Microsoft Mark", "Daniel", "Alex"],
    rate: 0.92,
    pitch: 0.92,
  },
  dex: {
    // Gaming desk — younger, snappier voice
    preferred: ["Jason Online (Natural)", "Microsoft Jason", "Microsoft Andrew", "Fred"],
    rate: 1.1,
    pitch: 1.0,
  },
  zara: {
    // Culture — warm female voice
    preferred: ["Aria Online (Natural)", "Microsoft Aria", "Sara Online (Natural)", "Microsoft Sara", "Samantha", "Victoria"],
    rate: 1.0,
    pitch: 1.1,
  },
};

let cachedVoices: SpeechSynthesisVoice[] | null = null;
function loadVoices(): SpeechSynthesisVoice[] {
  if (cachedVoices && cachedVoices.length) return cachedVoices;
  try {
    cachedVoices = window.speechSynthesis?.getVoices?.() || [];
  } catch {
    cachedVoices = [];
  }
  return cachedVoices;
}

// Refresh the cached voice list whenever the browser fires the
// voiceschanged event (voices load asynchronously on some platforms).
if (typeof window !== "undefined" && window.speechSynthesis) {
  try { window.speechSynthesis.onvoiceschanged = () => { cachedVoices = null; loadVoices(); }; }
  catch { /* ignore */ }
}

export function pickAnchorVoice(anchorId: string): { voice: SpeechSynthesisVoice | null; rate: number; pitch: number } {
  const profile = ANCHOR_VOICES[anchorId] ?? ANCHOR_VOICES.voss;
  const voices = loadVoices();
  for (const pref of profile.preferred) {
    const match = voices.find((v) => v.name.toLowerCase().includes(pref.toLowerCase()));
    if (match) return { voice: match, rate: profile.rate, pitch: profile.pitch };
  }
  // Last-resort: any English voice, tuned by profile
  const en = voices.find((v) => v.lang?.toLowerCase().startsWith("en"));
  return { voice: en || null, rate: profile.rate, pitch: profile.pitch };
}

// Speak text with the anchor's voice. Returns a cancel function for the
// caller. Honors a single global utterance — calling speakText cancels
// any in-flight one.
export function speakText(text: string, anchorId: string, onEnd?: () => void): () => void {
  if (!window.speechSynthesis) { onEnd?.(); return () => undefined; }
  try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
  const { voice, rate, pitch } = pickAnchorVoice(anchorId);
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.rate = rate;
  u.pitch = pitch;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  try { window.speechSynthesis.speak(u); } catch { onEnd?.(); }
  return () => { try { window.speechSynthesis.cancel(); } catch { /* ignore */ } };
}

export function cancelSpeak() {
  try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
}
