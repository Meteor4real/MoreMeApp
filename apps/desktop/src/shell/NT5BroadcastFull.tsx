import { useEffect, useRef, useState } from "react";
import type { WireArticle } from "../services/nt5Wire";
import { subscribeWire } from "../services/nt5Wire";

// NT5 Broadcast — fullscreen "studio" view. Animated set + lower-third + a
// big caption rail that highlights along with the TTS read-out using the
// Web Speech `boundary` event. Honest scope: this is animated stagecraft
// synced to speech, not generated video — but it reads like a broadcast.

type AnchorId = "voss" | "zara" | "dex" | "lena" | "orin";
const ANCHOR: Record<AnchorId, { name: string; tag: string; color: string }> = {
  voss: { name: "Voss Calloway", tag: "Lead Anchor", color: "#d946ef" },
  zara: { name: "Zara Kindle", tag: "Co-Anchor · Culture", color: "#22d3ee" },
  dex:  { name: "Dex Morrow", tag: "Gaming Desk", color: "#3b82f6" },
  lena: { name: "Lena Faust", tag: "Field Reporter", color: "#ef4444" },
  orin: { name: "Orin Vale", tag: "Tech & Space", color: "#a855f7" },
};

export function NT5BroadcastFull({ article, onClose }: { article: WireArticle; onClose: () => void }) {
  const [arts, setArts] = useState<WireArticle[]>([]);
  const [playing, setPlaying] = useState(false);
  const [caret, setCaret] = useState(0);
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => subscribeWire(setArts), []);
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); window.speechSynthesis.cancel(); };
  }, [onClose]);

  const anchor = ANCHOR[(article.anchor_id as AnchorId)] || ANCHOR.voss;
  const fullText = `${article.title}. ${article.body}`;

  function play() {
    if (playing) { window.speechSynthesis.cancel(); setPlaying(false); setCaret(0); return; }
    const u = new SpeechSynthesisUtterance(fullText);
    u.rate = 1.0;
    u.pitch = anchor.color === ANCHOR.zara.color || anchor.color === ANCHOR.lena.color ? 1.05 : 0.95;
    u.onstart = () => setPlaying(true);
    u.onend = () => { setPlaying(false); setCaret(fullText.length); };
    u.onerror = () => setPlaying(false);
    u.onboundary = (e) => setCaret(e.charIndex || 0);
    uttRef.current = u;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  const head = fullText.slice(0, caret);
  const tail = fullText.slice(caret);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 11000, color: "#fff",
      background: `radial-gradient(circle at 30% 25%, ${anchor.color}22, transparent 60%), radial-gradient(circle at 80% 80%, #7c3aed22, transparent 65%), #05050d`,
      display: "grid", gridTemplateRows: "1fr 200px 56px",
      overflow: "hidden",
    }}>
      <Starfield />

      {/* Stage: anchor avatar + headline + scrolling captions */}
      <div style={{ position: "relative", display: "grid", gridTemplateColumns: "auto 1fr", gap: 36, padding: "40px 56px 0", alignItems: "center" }}>
        {/* anchor avatar */}
        <div style={{
          width: 260, height: 260, borderRadius: "50%",
          background: `radial-gradient(circle at 30% 25%, ${anchor.color}, #1a0820 70%)`,
          border: `3px solid ${anchor.color}`,
          boxShadow: `0 0 60px ${anchor.color}88, inset 0 0 80px ${anchor.color}33`,
          display: "grid", placeItems: "center",
          fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontSize: 72, fontWeight: 800, color: "#fff",
          animation: "nt5breath 4.5s ease-in-out infinite",
        }}>
          {anchor.name.split(" ").map((p) => p[0]).join("")}
        </div>
        {/* headline */}
        <div style={{ minWidth: 0 }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: 3, color: anchor.color, textTransform: "uppercase" }}>
            {anchor.tag} · {article.category.toUpperCase()}
          </div>
          <h1 style={{
            fontFamily: "'Orbitron','Space Grotesk',sans-serif",
            fontSize: 44, lineHeight: 1.1, margin: "10px 0 18px", color: "#fff",
            textShadow: `0 0 14px ${anchor.color}66`,
          }}>{article.title}</h1>
          <div style={{ fontSize: 18, lineHeight: 1.5, color: "#cbd5e1", maxHeight: 240, overflow: "hidden" }}>
            <span style={{ color: "#fff", textShadow: "0 0 8px rgba(255,255,255,0.4)" }}>{head}</span>
            <span style={{ opacity: 0.55 }}>{tail}</span>
          </div>
        </div>
      </div>

      {/* Lower-third + chyron */}
      <div style={{ position: "relative", padding: "20px 56px", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 10 }}>
        <div style={{
          background: `linear-gradient(90deg, ${anchor.color} 0%, ${anchor.color} 6px, rgba(8,8,22,0.92) 6px, rgba(8,8,22,0.92) 100%)`,
          padding: "10px 18px 10px 24px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}>
          <div className="mono" style={{ fontSize: 12, letterSpacing: 3, color: anchor.color, textTransform: "uppercase" }}>
            S.P.A.C.E. NEWS · NT5 · LIVE
          </div>
          <div style={{ fontSize: 26, fontFamily: "'Orbitron',sans-serif", marginTop: 2, fontWeight: 700, color: "#fff" }}>
            {anchor.name}
          </div>
        </div>
        <Chyron items={arts.slice(0, 12)} />
      </div>

      {/* Control bar */}
      <div style={{ background: "rgba(0,0,0,0.55)", borderTop: "1px solid rgba(168,85,247,0.4)", display: "flex", alignItems: "center", gap: 14, padding: "0 24px" }}>
        <button onClick={play} className="btn" style={{ padding: "8px 18px", color: anchor.color, borderColor: `${anchor.color}aa` }}>{playing ? "■ Stop" : "▶ Play feed"}</button>
        <span className="mono" style={{ fontSize: 11, color: anchor.color, letterSpacing: 2, textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: anchor.color, boxShadow: `0 0 12px ${anchor.color}`, animation: "nt5pulse 2s ease-in-out infinite" }} />
          On Air
        </span>
        <div style={{ flex: 1 }} />
        <span className="mono" style={{ fontSize: 11, color: "var(--mute)" }}>Esc to exit broadcast</span>
        <button className="btn" onClick={onClose}>Close</button>
      </div>

      <style>{`
        @keyframes nt5breath { 0%,100% { transform: scale(1); filter: brightness(1) } 50% { transform: scale(1.025); filter: brightness(1.1) } }
        @keyframes nt5pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
        @keyframes nt5chyron { from { transform: translateX(100%); } to { transform: translateX(-100%); } }
      `}</style>
    </div>
  );
}

function Starfield() {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden",
      backgroundImage: `
        radial-gradient(1.6px 1.6px at 5% 10%, rgba(0,229,255,0.7), transparent 100%),
        radial-gradient(1.2px 1.2px at 18% 60%, rgba(217,70,239,0.8), transparent 100%),
        radial-gradient(2px 2px at 30% 25%, rgba(255,255,255,0.5), transparent 100%),
        radial-gradient(1.4px 1.4px at 45% 75%, rgba(124,58,237,0.7), transparent 100%),
        radial-gradient(1px 1px at 60% 18%, rgba(255,255,255,0.4), transparent 100%),
        radial-gradient(1.6px 1.6px at 72% 65%, rgba(34,211,238,0.7), transparent 100%),
        radial-gradient(1.2px 1.2px at 85% 38%, rgba(168,85,247,0.7), transparent 100%),
        radial-gradient(2px 2px at 92% 88%, rgba(255,255,255,0.5), transparent 100%)`,
      animation: "nt5pulse 7s ease-in-out infinite alternate",
    }} />
  );
}

function Chyron({ items }: { items: WireArticle[] }) {
  if (!items.length) return null;
  const text = items.map((a) => `[${a.category.toUpperCase()}] ${a.title}`).join("   ◆   ");
  return (
    <div style={{
      borderTop: "1px solid rgba(168,85,247,0.4)",
      background: "rgba(8,8,22,0.92)",
      padding: "8px 0",
      overflow: "hidden",
      whiteSpace: "nowrap",
      position: "relative",
    }}>
      <div className="mono" style={{
        display: "inline-block",
        animation: "nt5chyron 90s linear infinite",
        fontSize: 13, color: "#cbd5e1", letterSpacing: 1.2,
      }}>{text}{"   ◆   "}{text}</div>
    </div>
  );
}
