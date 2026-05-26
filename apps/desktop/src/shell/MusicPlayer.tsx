import { useState } from "react";
import { ost, TRACKS } from "../audio/ost";

export function MusicPlayer() {
  const [playing, setPlaying] = useState(false);
  const [idx, setIdx] = useState(0);
  const [vol, setVol] = useState(0.45);

  function toggle() {
    if (playing) {
      ost.stop();
      setPlaying(false);
    } else {
      ost.play(idx);
      setPlaying(true);
    }
  }
  function next() {
    const n = (idx + 1) % TRACKS.length;
    setIdx(n);
    ost.play(n);
    setPlaying(true);
  }

  return (
    <div
      className="mono"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 10px",
        height: "100%",
        borderRight: "1px solid var(--line)",
        flex: "none",
        fontSize: 11,
        color: "var(--mute)",
        maxWidth: 280,
      }}
      title="NetworkChuck Hub OST"
    >
      <button className="btn" style={{ padding: "2px 8px" }} onClick={toggle}>
        {playing ? "❚❚" : "►"}
      </button>
      <button className="btn" style={{ padding: "2px 8px" }} onClick={next} title="Next track">
        »
      </button>
      <span
        className="glow-text"
        style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}
      >
        {TRACKS[idx].name}
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={vol}
        onChange={(e) => {
          const v = Number(e.target.value);
          setVol(v);
          ost.setVolume(v);
        }}
        style={{ width: 56 }}
      />
    </div>
  );
}
