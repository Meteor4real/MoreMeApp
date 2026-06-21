// NT5 Broadcast — the "turn on the TV" mode. The wire plays itself:
// anchor avatar, animated lower-third, body text highlighted along with the
// read-aloud, chyron ticker, auto-advance to the next story when done.
//
// Not a modal anymore — a top-level mode inside the NT5 tab. Works on the
// shared wire articles, so when fresh items land they queue up next.

import { useEffect, useMemo, useRef, useState } from "react";
import type { WireArticle } from "../../services/nt5Wire";
import { subscribeWire, runWireOnce } from "../../services/nt5Wire";
import { ANCHORS, NT5_TAGLINE, SPACE_TAGLINE, type AnchorId } from "../../services/nt5Lore";
import { pickAnchorVoice } from "./nt5tts";

type Anchor = (typeof ANCHORS)[AnchorId];

const anchorOf = (id: string): Anchor => ANCHORS[(id as AnchorId)] ?? ANCHORS.voss;

export function NT5Broadcast() {
  // Ticker-kind items don't get a full TV slot — they're crawl-only.
  const [allArts, setAllArts] = useState<WireArticle[]>([]);
  const arts = useMemo(() => allArts.filter((a) => a.kind !== "ticker"), [allArts]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);   // auto-play on open
  const [caret, setCaret] = useState(0);
  const [muted, setMuted] = useState(false);
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => subscribeWire(setAllArts), []);
  useEffect(() => {
    // If the wire is empty when broadcast opens, prime the pump.
    if (allArts.length === 0) {
      void runWireOnce(3).catch(() => undefined);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const article = arts[Math.min(idx, Math.max(arts.length - 1, 0))];
  const anchor = useMemo(() => (article ? anchorOf(article.anchor_id) : ANCHORS.voss), [article]);
  const fullText = article ? `${article.title}. ${article.body}` : "";

  // Speak the active article on play. On end, advance to the next story.
  useEffect(() => {
    window.speechSynthesis.cancel();
    if (!article || !playing || muted) { setCaret(0); return; }
    const { voice, rate, pitch } = pickAnchorVoice(article.anchor_id);
    const u = new SpeechSynthesisUtterance(fullText);
    if (voice) u.voice = voice;
    u.rate = rate;
    u.pitch = pitch;
    u.onstart = () => setCaret(0);
    u.onboundary = (e) => setCaret(e.charIndex || 0);
    u.onend = () => {
      // queue next story; loop back if we hit the end
      setCaret(fullText.length);
      if (!playing) return;
      setIdx((i) => (arts.length > 0 ? (i + 1) % arts.length : 0));
    };
    u.onerror = () => { /* silent */ };
    uttRef.current = u;
    window.speechSynthesis.speak(u);
    return () => { window.speechSynthesis.cancel(); };
  }, [article?.id, playing, muted]); // eslint-disable-line react-hooks/exhaustive-deps

  function togglePlay() { setPlaying((p) => !p); }
  function next() { setIdx((i) => (arts.length > 0 ? (i + 1) % arts.length : 0)); }
  function prev() { setIdx((i) => (arts.length > 0 ? (i - 1 + arts.length) % arts.length : 0)); }
  function refresh() { void runWireOnce(3).catch(() => undefined); }

  if (!article) {
    return (
      <div style={{ flex: 1, display: "grid", placeItems: "center", background: "#05050d", color: "#cbd5e1", padding: 40, textAlign: "center" }}>
        <div>
          <div className="mono" style={{ fontSize: 11, letterSpacing: 4, color: "#22d3ee", marginBottom: 12 }}>NT5 · STANDBY</div>
          <div style={{ fontSize: 22, fontFamily: "'Orbitron','Space Grotesk',sans-serif", marginBottom: 8 }}>The wire is empty.</div>
          <div style={{ fontSize: 13, color: "var(--mute)", marginBottom: 18 }}>The desk is filing now. Refresh to nudge it.</div>
          <button className="btn" onClick={refresh}>Fire the desk</button>
        </div>
      </div>
    );
  }

  const head = fullText.slice(0, caret);
  const tail = fullText.slice(caret);

  return (
    <div style={{
      flex: 1, position: "relative", color: "#fff",
      background: `radial-gradient(circle at 30% 25%, ${anchor.color}26, transparent 60%), radial-gradient(circle at 80% 80%, #7c3aed22, transparent 65%), #05050d`,
      display: "grid", gridTemplateRows: "1fr 200px 56px",
      overflow: "hidden", minHeight: 0,
    }}>
      <Starfield />

      {/* Stage: anchor avatar + headline + body */}
      <div style={{ position: "relative", display: "grid", gridTemplateColumns: "auto 1fr", gap: 36, padding: "40px 56px 0", alignItems: "center", minWidth: 0 }}>
        <AnchorAvatar anchor={anchor} />
        <div style={{ minWidth: 0 }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: 3, color: anchor.color, textTransform: "uppercase" }}>
            {anchor.role} · {article.category.toUpperCase().replace(/_/g, " ")}
          </div>
          <h1 style={{
            fontFamily: "'Orbitron','Space Grotesk',sans-serif",
            fontSize: 44, lineHeight: 1.1, margin: "10px 0 18px", color: "#fff",
            textShadow: `0 0 14px ${anchor.color}66`,
          }}>{article.title}</h1>
          <div style={{ fontSize: 18, lineHeight: 1.55, color: "#cbd5e1", maxHeight: 240, overflow: "hidden" }}>
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
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div className="mono" style={{ fontSize: 12, letterSpacing: 3, color: anchor.color, textTransform: "uppercase" }}>
            S.P.A.C.E. NEWS · {NT5_TAGLINE} · LIVE
          </div>
          <div style={{ fontSize: 26, fontFamily: "'Orbitron',sans-serif", marginTop: 2, fontWeight: 700, color: "#fff" }}>
            {anchor.name}
          </div>
        </div>
        <Chyron items={arts.slice(0, 12)} activeId={article.id} />
      </div>

      {/* Control bar */}
      <div style={{ background: "rgba(0,0,0,0.55)", borderTop: `1px solid ${anchor.color}55`, display: "flex", alignItems: "center", gap: 10, padding: "0 24px" }}>
        <button className="btn" onClick={prev} title="Previous story">‹</button>
        <button className="btn" onClick={togglePlay} style={{ color: anchor.color, borderColor: `${anchor.color}aa` }}>
          {playing ? "■ Pause" : "▶ Play"}
        </button>
        <button className="btn" onClick={next} title="Next story">›</button>
        <button className="btn" onClick={() => setMuted((m) => !m)} title={muted ? "Unmute" : "Mute"}>{muted ? "Unmute" : "Mute"}</button>
        <span className="mono" style={{ fontSize: 10, color: anchor.color, letterSpacing: 2, textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 6, marginLeft: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: anchor.color, boxShadow: `0 0 12px ${anchor.color}`, animation: "nt5pulse 2s ease-in-out infinite" }} />
          On Air · Story {Math.min(idx + 1, arts.length)}/{arts.length}
        </span>
        <div style={{ flex: 1 }} />
        <span className="mono" style={{ fontSize: 10, color: "var(--mute)" }}>{SPACE_TAGLINE}</span>
        <button className="btn" onClick={refresh}>↻ File more</button>
      </div>

      <style>{`
        @keyframes nt5breath { 0%,100% { transform: scale(1); filter: brightness(1) } 50% { transform: scale(1.025); filter: brightness(1.1) } }
        @keyframes nt5pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
        @keyframes nt5chyron { from { transform: translateX(100%); } to { transform: translateX(-100%); } }
      `}</style>
    </div>
  );
}

function AnchorAvatar({ anchor }: { anchor: Anchor }) {
  return (
    <div style={{
      width: 240, height: 240, borderRadius: "50%",
      background: `radial-gradient(circle at 30% 25%, ${anchor.color}, #1a0820 70%)`,
      border: `3px solid ${anchor.color}`,
      boxShadow: `0 0 60px ${anchor.color}88, inset 0 0 80px ${anchor.color}33`,
      display: "grid", placeItems: "center",
      fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontSize: 64, fontWeight: 800, color: "#fff",
      animation: "nt5breath 4.5s ease-in-out infinite",
    }}>
      {anchor.initials}
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

function Chyron({ items, activeId }: { items: WireArticle[]; activeId: string }) {
  if (!items.length) return null;
  const text = items.map((a) => {
    const tag = `[${a.category.toUpperCase().replace(/_/g, " ")}]`;
    const here = a.id === activeId ? "▶ " : "";
    return `${here}${tag} ${a.title}`;
  }).join("   ◆   ");
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
