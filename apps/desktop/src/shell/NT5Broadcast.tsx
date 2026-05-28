import { useEffect, useRef, useState } from "react";
import { subscribeWire, type WireArticle } from "../services/nt5Wire";

// NT5 Broadcast bar — the "radio" side of the news. Uses the browser's
// built-in Web Speech API (SpeechSynthesis) to read the current lead story
// aloud, in a voice loosely matched to the anchor. Honest scope: speech
// synthesis is the OS's built-in voices; "TV" here means an animated
// anchor card + live waveform + captioned text alongside the voice — not
// generated video, which we can't do on-device.

type AnchorId = "voss" | "zara" | "dex" | "lena" | "orin";
const ANCHOR_BIO: Record<AnchorId, { name: string; tag: string; accent: string; voiceHint: "deep-male" | "warm-female" | "energetic-male" | "field-female" | "nerd-male" }> = {
  voss: { name: "Voss Calloway", tag: "Lead Anchor", accent: "#d946ef", voiceHint: "deep-male" },
  zara: { name: "Zara Kindle", tag: "Co-Anchor · Culture", accent: "#22d3ee", voiceHint: "warm-female" },
  dex:  { name: "Dex Morrow", tag: "Gaming Desk", accent: "#3b82f6", voiceHint: "energetic-male" },
  lena: { name: "Lena Faust", tag: "Field Reporter", accent: "#ef4444", voiceHint: "field-female" },
  orin: { name: "Orin Vale", tag: "Tech & Space", accent: "#a855f7", voiceHint: "nerd-male" },
};

function pickVoice(hint: ANCHOR_VoiceHint): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const en = voices.filter((v) => v.lang?.toLowerCase().startsWith("en")) || voices;
  // Heuristic match by name keywords commonly used by OS voices.
  const wantsFemale = hint.includes("female");
  const wantsHigh = hint.includes("warm") || hint === "field-female";
  const ranked = en.map((v) => {
    const name = v.name.toLowerCase();
    let s = 0;
    if (wantsFemale && /(female|woman|samantha|victoria|karen|tessa|moira|fiona|zoe|anna|hazel|catherine|jenny|aria)/i.test(name)) s += 3;
    if (!wantsFemale && /(male|man|daniel|alex|fred|david|guy|tom|ryan|james|brian)/i.test(name)) s += 3;
    if (wantsHigh && /(zira|aria|jenny|anna|samantha)/i.test(name)) s += 1;
    if (hint === "nerd-male" && /(microsoft|google|alex)/i.test(name)) s += 1;
    return { v, s };
  });
  ranked.sort((a, b) => b.s - a.s);
  return ranked[0]?.v || en[0] || null;
}
type ANCHOR_VoiceHint = "deep-male" | "warm-female" | "energetic-male" | "field-female" | "nerd-male";

export function NT5Broadcast() {
  const [arts, setArts] = useState<WireArticle[]>([]);
  const [playing, setPlaying] = useState(false);
  const [_voicesTick, setVoicesTick] = useState(0);
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => subscribeWire(setArts), []);
  useEffect(() => {
    // Browsers populate voices async.
    const tick = () => setVoicesTick((n) => n + 1);
    window.speechSynthesis.addEventListener("voiceschanged", tick);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", tick);
      window.speechSynthesis.cancel();
    };
  }, []);

  const lead = arts.find((a) => a.category === "breaking") || arts[0];
  if (!lead) {
    return (
      <div style={shellBar()}>
        <span style={{ fontSize: 11, color: "var(--mute)" }}>Wire is warming up — the broadcast goes live as soon as the first article files.</span>
      </div>
    );
  }
  const anchor = ANCHOR_BIO[(lead.anchor_id as AnchorId)] || ANCHOR_BIO.voss;

  function play() {
    if (playing) { window.speechSynthesis.cancel(); setPlaying(false); return; }
    const u = new SpeechSynthesisUtterance(`${lead.title}. ${lead.body}`);
    const v = pickVoice(anchor.voiceHint);
    if (v) u.voice = v;
    u.rate = 1.0; u.pitch = anchor.voiceHint.includes("female") ? 1.05 : 0.95;
    u.onend = () => setPlaying(false);
    u.onerror = () => setPlaying(false);
    uttRef.current = u;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setPlaying(true);
  }

  return (
    <div style={shellBar()}>
      {/* anchor avatar */}
      <div style={{
        width: 38, height: 38, borderRadius: "50%",
        background: `radial-gradient(circle at 30% 25%, ${anchor.accent}, #1a0820 70%)`,
        border: `1.5px solid ${anchor.accent}`,
        display: "grid", placeItems: "center",
        boxShadow: `0 0 14px ${anchor.accent}55`,
        fontFamily: "'Orbitron','Space Grotesk',sans-serif",
        fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: 0.5,
      }}>
        {anchor.name.split(" ").map((p) => p[0]).join("")}
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "baseline", fontFamily: "'JetBrains Mono', monospace" }}>
          <span style={{ fontSize: 10, color: anchor.accent, letterSpacing: 1.5, textTransform: "uppercase" }}>NOW ON AIR · {anchor.tag}</span>
          <span style={{ fontSize: 10, color: "var(--mute)", letterSpacing: 1, textTransform: "uppercase" }}>{anchor.name}</span>
        </div>
        <div style={{ fontSize: 13, color: "#fff", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={lead.title}>
          {lead.title}
        </div>
      </div>

      {/* live waveform */}
      <Wave active={playing} accent={anchor.accent} />

      {/* play / stop */}
      <button
        onClick={play}
        title={playing ? "Stop" : "Play radio feed"}
        style={{
          width: 38, height: 38, borderRadius: "50%",
          border: `1.5px solid ${anchor.accent}`,
          background: playing ? anchor.accent : "rgba(0,0,0,0.45)",
          color: playing ? "#0a0820" : "#fff",
          cursor: "pointer",
          display: "grid", placeItems: "center",
          fontSize: 14,
          boxShadow: `0 0 12px ${anchor.accent}66`,
          fontFamily: "ui-monospace, monospace",
        }}
      >
        {playing ? "■" : "▶"}
      </button>
    </div>
  );
}

function shellBar(): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 14,
    padding: "10px 16px",
    borderBottom: "1px solid rgba(168,85,247,0.4)",
    background: "linear-gradient(90deg, #0a0820 0%, #06061a 100%)",
  };
}

function Wave({ active, accent }: { active: boolean; accent: string }) {
  const bars = 16;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 24, width: 80 }}>
      {Array.from({ length: bars }).map((_, i) => (
        <div key={i} style={{
          width: 3, borderRadius: 2,
          background: accent,
          opacity: active ? 0.9 : 0.25,
          height: active ? `${20 + Math.sin((Date.now() / 220) + i) * 12}px` : 6,
          animation: active ? `nt5wave-${i % 4} 0.7s ease-in-out ${i * 35}ms infinite alternate` : "none",
        }} />
      ))}
      <style>{`
        @keyframes nt5wave-0 { from { height: 6px } to { height: 22px } }
        @keyframes nt5wave-1 { from { height: 10px } to { height: 18px } }
        @keyframes nt5wave-2 { from { height: 4px } to { height: 24px } }
        @keyframes nt5wave-3 { from { height: 14px } to { height: 8px } }
      `}</style>
    </div>
  );
}
