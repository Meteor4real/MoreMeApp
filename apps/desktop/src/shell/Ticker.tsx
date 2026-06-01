import { useEffect, useState, type ReactNode } from "react";
import type { FeedItem } from "../feeds";
import { TRACKS, ost } from "../audio/ost";
import { importedNowPlaying, importedIsPlaying, loadImported, subscribeImportedPlayer } from "../audio/imported";
import { loadPrefs, subscribePrefs } from "../uiPrefs";

// Dock-style status bar. Replaces the bland thin marquee with a multi-section
// dock: live status pills (CPU/MEM, network, music, time) on the left, the
// wire marquee in the middle, and the action area (MusicPlayer) on the right.

export function Ticker({ items, left }: { items: FeedItem[]; left?: ReactNode }) {
  const [prefs, setPrefs] = useState(loadPrefs);
  const [sys, setSys] = useState<{ cpuPct: number; memPct: number } | null>(null);
  const [online, setOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [clock, setClock] = useState<string>("");
  const [music, setMusic] = useState<{ title: string; kind: "procedural" | "imported" } | null>(null);

  useEffect(() => subscribePrefs(setPrefs), []);

  useEffect(() => {
    let cancelled = false;
    async function pull() {
      try { const s = await window.hub.sys.pulse(); if (!cancelled) setSys({ cpuPct: s.cpuPct, memPct: s.memPct }); } catch { /* ignore */ }
    }
    void pull();
    const t = setInterval(pull, 6000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  useEffect(() => {
    function up() { setOnline(navigator.onLine); }
    window.addEventListener("online", up);
    window.addEventListener("offline", up);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", up); };
  }, []);

  useEffect(() => {
    const tz = prefs.ownerTimezone || undefined;
    function tickClock() {
      const d = new Date();
      try { setClock(d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz, hour12: false })); }
      catch { setClock(d.toLocaleTimeString("en-GB", { hour12: false })); }
    }
    tickClock();
    const t = setInterval(tickClock, 1000);
    return () => clearInterval(t);
  }, [prefs.ownerTimezone]);

  useEffect(() => {
    function readMusic() {
      const imp = importedNowPlaying();
      if (imp && importedIsPlaying()) {
        const t = loadImported().find((x) => x.id === imp);
        if (t) { setMusic({ title: t.name, kind: "imported" }); return; }
      }
      const idx = ost.currentIndex;
      if (idx >= 0 && idx < TRACKS.length) setMusic({ title: TRACKS[idx].name, kind: "procedural" });
      else setMusic(null);
    }
    readMusic();
    const t = setInterval(readMusic, 2000);
    const unsub = subscribeImportedPlayer(() => readMusic());
    return () => { clearInterval(t); unsub(); };
  }, []);

  const wireLines =
    items.length > 0
      ? items.map((i) => `${i.source} · ${i.text}`)
      : ["NetworkChuck Hub online", "waiting for the wire…"];
  const run = [...wireLines, ...wireLines];

  const cpuColor = !sys ? "#666" : sys.cpuPct > 80 ? "#ef4444" : sys.cpuPct > 50 ? "#f59e0b" : "#22c55e";
  const memColor = !sys ? "#666" : sys.memPct > 80 ? "#ef4444" : sys.memPct > 50 ? "#f59e0b" : "#22d3ee";

  return (
    <div className="dock-bar">
      {left && <div className="dock-section compact" style={{ borderRight: "1px solid var(--line)", padding: 0 }}>{left}</div>}

      <div className="dock-section">
        <span className="dock-label">WIRE</span>
        <span className="dock-dot" style={{ background: "var(--orange)", color: "var(--orange)" }} />
      </div>

      <div className="dock-marquee">
        <div className="ticker-track" style={{ height: 30, display: "inline-flex", alignItems: "center" }}>
          {run.map((t, i) => (
            <span className="ticker-item" key={i} style={{ padding: "0 22px", fontSize: 11.5 }}>
              <span className="ticker-dot">◆</span>
              {t}
            </span>
          ))}
        </div>
      </div>

      {sys && (
        <div className="dock-section" title={`CPU ${sys.cpuPct}% · MEM ${sys.memPct}%`}>
          <span className="dock-label">CPU</span>
          <MiniBar pct={sys.cpuPct} color={cpuColor} />
          <span className="dock-val" style={{ color: cpuColor, minWidth: 26, textAlign: "right" }}>{sys.cpuPct}%</span>
        </div>
      )}

      {sys && (
        <div className="dock-section" title={`MEM ${sys.memPct}%`}>
          <span className="dock-label">MEM</span>
          <MiniBar pct={sys.memPct} color={memColor} />
          <span className="dock-val" style={{ color: memColor, minWidth: 26, textAlign: "right" }}>{sys.memPct}%</span>
        </div>
      )}

      {music && (
        <div className="dock-section" title={`Now playing: ${music.title}`} style={{ maxWidth: 220 }}>
          <span className="dock-label" style={{ color: "#ec4899" }}>{music.kind === "imported" ? "IMP" : "OST"}</span>
          <span style={{ display: "inline-flex", alignItems: "flex-end", gap: 2, height: 10 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{
                width: 2, background: "#ec4899", borderRadius: 1,
                animation: `nch-eq 0.${5 + i}s ease-in-out ${i * 0.08}s infinite alternate`,
                height: 4 + i * 2,
              }} />
            ))}
          </span>
          <span className="dock-val" style={{ color: "#ffe0ee", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>{music.title}</span>
        </div>
      )}

      <div className="dock-section" title={online ? "Connected" : "Offline"}>
        <span className="dock-dot" style={{ background: online ? "#22c55e" : "#ef4444", color: online ? "#22c55e" : "#ef4444" }} />
        <span className="dock-val" style={{ color: online ? "#a7f3d0" : "#fecaca" }}>{online ? "NET" : "OFFLINE"}</span>
      </div>

      <div className="dock-section" style={{ borderRight: "none", paddingRight: 14 }}>
        <span className="dock-val glow-text" style={{ color: "var(--pink)", letterSpacing: 1.5 }}>{clock}</span>
      </div>
    </div>
  );
}

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <span style={{ display: "inline-block", width: 36, height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
      <span style={{ display: "block", height: "100%", width: `${Math.max(0, Math.min(100, pct))}%`, background: `linear-gradient(90deg, ${color}, ${color}88)`, boxShadow: `0 0 6px ${color}aa`, transition: "width .6s ease" }} />
    </span>
  );
}
