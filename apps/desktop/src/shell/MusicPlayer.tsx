import { useEffect, useRef, useState } from "react";
import { ost, TRACKS } from "../audio/ost";
import { loadPrefs } from "../uiPrefs";

// Surfaced OST player. A small tile shows the current track's brand color and
// vibe, with prev/play/next and a track-picker that lifts the entire stable
// out of the rest of the chrome. Hover the volume to expand.

export function MusicPlayer() {
  const prefs0 = loadPrefs();
  const startIdx = Math.max(0, TRACKS.findIndex((t) => t.id === prefs0.musicDefaultTrack));
  const [playing, setPlaying] = useState(false);
  const [idx, setIdx] = useState(startIdx === -1 ? 0 : startIdx);
  const [vol, setVol] = useState(prefs0.musicDefaultVolume);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Honor Settings → Music: default volume, default track, autoplay (with
  // optional fade-in). Runs once on mount.
  useEffect(() => {
    ost.setVolume(prefs0.musicDefaultVolume);
    if (prefs0.musicAutoplay) {
      const startI = startIdx === -1 ? 0 : startIdx;
      if (prefs0.musicFadeIn) {
        ost.setVolume(0);
        ost.play(startI); setPlaying(true);
        const target = prefs0.musicDefaultVolume; let v = 0;
        const t = setInterval(() => { v = Math.min(target, v + target / 30); ost.setVolume(v); if (v >= target) clearInterval(t); }, 100);
      } else {
        ost.play(startI); setPlaying(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function toggle() {
    if (playing) { ost.stop(); setPlaying(false); }
    else { ost.play(idx); setPlaying(true); }
  }
  function next() { const n = (idx + 1) % TRACKS.length; setIdx(n); ost.play(n); setPlaying(true); }
  function prev() { const n = (idx - 1 + TRACKS.length) % TRACKS.length; setIdx(n); ost.play(n); setPlaying(true); }
  function pick(i: number) { setIdx(i); ost.play(i); setPlaying(true); setOpen(false); }

  const t = TRACKS[idx];

  return (
    <div ref={ref} className="mono" style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, padding: "0 10px", height: "100%", borderRight: "1px solid var(--line)", flex: "none", fontSize: 11, color: "var(--mute)", maxWidth: 360 }} title="NetworkChuck Hub OST">
      <button className="btn" style={{ padding: "2px 8px" }} onClick={prev} title="Previous track">‹</button>
      <button className="btn" style={{ padding: "2px 8px" }} onClick={toggle} title={playing ? "Pause" : "Play"}>{playing ? "❚❚" : "►"}</button>
      <button className="btn" style={{ padding: "2px 8px" }} onClick={next} title="Next track">›</button>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Pick a track"
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "2px 10px", borderRadius: 8, cursor: "pointer",
          background: "rgba(0,0,0,0.4)", border: "1px solid var(--line)",
          color: "var(--ink)", fontFamily: "ui-monospace, monospace", fontSize: 11,
          minWidth: 0,
        }}
      >
        <span style={{ width: 12, height: 12, borderRadius: 3, background: `linear-gradient(135deg, ${t.color}, #0a0820)`, boxShadow: `0 0 8px ${t.color}66`, flex: "none" }} />
        <span className="glow-text" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0, fontSize: 11 }}>{t.name}</span>
        <span style={{ color: "var(--mute)", fontSize: 10, whiteSpace: "nowrap" }}>{t.vibe}</span>
      </button>
      <input
        type="range" min={0} max={1} step={0.01} value={vol}
        onChange={(e) => { const v = Number(e.target.value); setVol(v); ost.setVolume(v); }}
        style={{ width: 56 }}
        title="Volume"
      />

      {open && (
        <div
          style={{
            position: "absolute", left: 0, bottom: 36, zIndex: 80,
            width: 320, maxHeight: 360, overflow: "auto",
            background: "#0e0e14", border: "1px solid var(--line)", borderRadius: 10,
            boxShadow: "0 12px 28px rgba(0,0,0,0.6)", padding: 6,
          }}
        >
          <div className="mono" style={{ fontSize: 10, color: "var(--mute)", letterSpacing: 1, padding: "6px 10px", textTransform: "uppercase" }}>
            OST · {TRACKS.length} tracks
          </div>
          {TRACKS.map((tr, i) => (
            <button
              key={tr.id}
              onClick={() => pick(i)}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "6px 10px", borderRadius: 6,
                background: i === idx ? "rgba(255,87,119,0.12)" : "transparent",
                border: "none", color: "var(--ink)", cursor: "pointer",
                textAlign: "left", fontFamily: "ui-monospace, monospace",
              }}
            >
              <span style={{ width: 24, height: 24, borderRadius: 5, background: `linear-gradient(135deg, ${tr.color}, #0a0820)`, boxShadow: `0 0 8px ${tr.color}66`, flex: "none" }} />
              <span style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tr.name}</div>
                <div style={{ fontSize: 10, color: "var(--mute)" }}>{tr.vibe} · {tr.bpm} BPM</div>
              </span>
              {i === idx && playing && <span className="glow-text" style={{ fontSize: 10 }}>NOW</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
