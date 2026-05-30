// NT5 Studio — the in-app broadcast authoring tool. Davis's brief: real video
// creation, NOT generated content. So this composes from sources the user
// actually owns or licenses: Pexels stock video, a saved DigitalBlueprint
// scene as a 3D backdrop, plain title cards, and local files dragged in.
//
// Output is a sequenced "broadcast" — a list of clips with optional overlay
// text and a couple of in-clip effects (ken-burns, vignette, glitch). Saved
// to localStorage as nchub.nt5.broadcasts.v1; the broadcast bar can play
// any saved broadcast back as a real video reel.

import { useEffect, useMemo, useRef, useState } from "react";

type ClipKind = "pexels" | "local" | "scene" | "title";

export type StudioClip = {
  id: string;
  kind: ClipKind;
  src: string;          // pexels mp4 url / blob url / scene id / "title"
  poster?: string;
  duration: number;     // seconds
  overlay?: string;     // lower-third text
  effect?: "none" | "kenburns" | "vignette" | "glitch" | "grade-warm" | "grade-cool";
};

export type Broadcast = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  clips: StudioClip[];
};

const KEY = "nchub.nt5.broadcasts.v1";

function loadBroadcasts(): Broadcast[] {
  try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r) as Broadcast[]; }
  catch { /* ignore */ }
  return [];
}
function saveBroadcasts(b: Broadcast[]) {
  try { localStorage.setItem(KEY, JSON.stringify(b)); } catch { /* ignore */ }
}

function uid() { return Math.random().toString(36).slice(2, 10); }

// Pull saved DigitalBlueprint scenes so the user can drop them in as 3D shots.
function loadScenes(): { id: string; name: string }[] {
  try {
    const raw = localStorage.getItem("nchub.digitalblueprint.scenes.v1");
    if (raw) {
      const arr = JSON.parse(raw) as { id: string; name?: string }[];
      if (Array.isArray(arr)) return arr.map((s, i) => ({ id: s.id, name: s.name || `Scene ${i + 1}` }));
    }
    // Fall back to the single active scene if no save list exists.
    if (localStorage.getItem("nchub.digitalblueprint.scene.v1")) return [{ id: "active", name: "Current Blueprint scene" }];
  } catch { /* ignore */ }
  return [];
}

export function NT5Studio() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>(loadBroadcasts);
  const [activeId, setActiveId] = useState<string | null>(broadcasts[0]?.id || null);
  const [pexelsQ, setPexelsQ] = useState("");
  const [pexelsHits, setPexelsHits] = useState<{ id: number; poster: string; duration: number; url: string }[]>([]);
  const [pexelsBusy, setPexelsBusy] = useState(false);
  const [pexelsErr, setPexelsErr] = useState<string | null>(null);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playIdx, setPlayIdx] = useState(0);
  const playTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const active = broadcasts.find((b) => b.id === activeId) || null;
  const scenes = useMemo(loadScenes, []);

  useEffect(() => saveBroadcasts(broadcasts), [broadcasts]);

  function newBroadcast() {
    const b: Broadcast = { id: uid(), name: `Broadcast ${broadcasts.length + 1}`, createdAt: Date.now(), updatedAt: Date.now(), clips: [] };
    setBroadcasts((bs) => [...bs, b]); setActiveId(b.id); setSelectedClipId(null);
  }
  function deleteBroadcast(id: string) {
    setBroadcasts((bs) => bs.filter((b) => b.id !== id));
    if (activeId === id) setActiveId(null);
  }
  function patchActive(p: Partial<Broadcast>) {
    if (!active) return;
    setBroadcasts((bs) => bs.map((b) => (b.id === active.id ? { ...b, ...p, updatedAt: Date.now() } : b)));
  }
  function addClip(c: Omit<StudioClip, "id">) {
    if (!active) { newBroadcast(); }
    setBroadcasts((bs) => bs.map((b) => {
      if (b.id !== (activeId ?? bs[bs.length - 1].id)) return b;
      const nc: StudioClip = { id: uid(), ...c };
      return { ...b, clips: [...b.clips, nc], updatedAt: Date.now() };
    }));
  }
  function patchClip(id: string, p: Partial<StudioClip>) {
    if (!active) return;
    patchActive({ clips: active.clips.map((c) => (c.id === id ? { ...c, ...p } : c)) });
  }
  function removeClip(id: string) {
    if (!active) return;
    patchActive({ clips: active.clips.filter((c) => c.id !== id) });
    if (selectedClipId === id) setSelectedClipId(null);
  }
  function moveClip(id: string, dir: -1 | 1) {
    if (!active) return;
    const i = active.clips.findIndex((c) => c.id === id);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= active.clips.length) return;
    const next = active.clips.slice();
    [next[i], next[j]] = [next[j], next[i]];
    patchActive({ clips: next });
  }

  async function searchPexels() {
    if (!pexelsQ.trim()) return;
    setPexelsBusy(true); setPexelsErr(null);
    try {
      const r = await window.hub.media.pexelsVideo({ query: pexelsQ.trim(), perPage: 12 });
      if (!r.ok) { setPexelsErr(r.error); setPexelsHits([]); return; }
      setPexelsHits(r.videos);
    } catch (e) { setPexelsErr(String(e)); } finally { setPexelsBusy(false); }
  }

  function importLocal(file: File) {
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith("video/");
    if (isVideo) {
      const v = document.createElement("video"); v.preload = "metadata";
      v.onloadedmetadata = () => addClip({ kind: "local", src: url, duration: Math.max(2, v.duration || 5), poster: undefined });
      v.src = url;
    } else if (file.type.startsWith("image/")) {
      addClip({ kind: "local", src: url, duration: 4, poster: url });
    }
  }

  // Playback loop. Each clip plays for its duration (using <video> for video
  // clips, a still pane for titles/scenes/images), then advances. Real-time
  // preview reel — no rendering pipeline, no fake "render bar".
  useEffect(() => {
    if (!playing || !active) return;
    const clip = active.clips[playIdx];
    if (!clip) { setPlaying(false); setPlayIdx(0); return; }
    if (clip.kind === "pexels" || (clip.kind === "local" && clip.src.startsWith("blob:") && !clip.poster)) {
      const v = videoRef.current;
      if (v) { v.src = clip.src; v.currentTime = 0; v.play().catch(() => {}); }
    }
    if (playTimer.current) clearTimeout(playTimer.current);
    playTimer.current = setTimeout(() => setPlayIdx((i) => i + 1), clip.duration * 1000);
    return () => { if (playTimer.current) clearTimeout(playTimer.current); };
  }, [playing, playIdx, active]);

  function play() { if (!active || !active.clips.length) return; setPlayIdx(0); setPlaying(true); }
  function stop() { setPlaying(false); setPlayIdx(0); if (videoRef.current) videoRef.current.pause(); }

  const previewClip = active?.clips[playing ? playIdx : (active.clips.findIndex((c) => c.id === selectedClipId) >= 0 ? active.clips.findIndex((c) => c.id === selectedClipId) : 0)] || null;
  const totalDur = active?.clips.reduce((s, c) => s + c.duration, 0) || 0;

  return (
    <div className="stage" style={{ background: "#06060d", display: "flex", flexDirection: "column" }}>
      {/* Header strip with broadcast picker + actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderBottom: "1px solid rgba(217,70,239,0.35)", background: "linear-gradient(90deg, #0a0820, #06061a)" }}>
        <span className="mono glow-text" style={{ fontSize: 13, letterSpacing: 2, textTransform: "uppercase" }}>NT5 STUDIO</span>
        <span className="mono" style={{ fontSize: 10, color: "var(--mute)" }}>{active ? `${active.clips.length} clip${active.clips.length === 1 ? "" : "s"} · ${totalDur.toFixed(1)}s` : "no broadcast loaded"}</span>
        <div style={{ flex: 1 }} />
        {active && (
          <input value={active.name} onChange={(e) => patchActive({ name: e.target.value })} style={inp} />
        )}
        <select value={activeId || ""} onChange={(e) => { setActiveId(e.target.value || null); setSelectedClipId(null); }} style={{ ...inp, maxWidth: 200 }}>
          <option value="">— pick a broadcast —</option>
          {broadcasts.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <button className="btn" onClick={newBroadcast}>+ New</button>
        {active && <button className="btn" onClick={() => deleteBroadcast(active.id)}>Delete</button>}
        <button className="btn" onClick={playing ? stop : play} disabled={!active || active.clips.length === 0} style={playing ? { color: "var(--orange)" } : undefined}>
          {playing ? "■ Stop" : "▶ Play reel"}
        </button>
      </div>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "280px 1fr 280px", minHeight: 0 }}>
        {/* LEFT — sources */}
        <div style={{ borderRight: "1px solid var(--line)", overflowY: "auto", padding: 10 }}>
          <SubTitle>Sources</SubTitle>

          <SubHead>Pexels stock video</SubHead>
          <div style={{ display: "flex", gap: 4 }}>
            <input value={pexelsQ} onChange={(e) => setPexelsQ(e.target.value)} placeholder="e.g. solar flare, city night" style={inp} onKeyDown={(e) => { if (e.key === "Enter") void searchPexels(); }} />
            <button className="btn" onClick={() => void searchPexels()} disabled={pexelsBusy}>{pexelsBusy ? "…" : "Find"}</button>
          </div>
          {pexelsErr && <div style={{ fontSize: 10, color: "var(--mute)", marginTop: 4 }}>{pexelsErr} — connect Pexels in the Control Panel.</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: 6 }}>
            {pexelsHits.map((v) => (
              <button key={v.id} onClick={() => addClip({ kind: "pexels", src: v.url, poster: v.poster, duration: Math.min(8, Math.max(2, v.duration)), effect: "none" })}
                style={{ border: "1px solid var(--line)", borderRadius: 6, padding: 0, background: `center/cover url("${v.poster}")`, aspectRatio: "16/9", cursor: "pointer", position: "relative" }}
                title={`${v.duration}s — click to add to timeline`}>
                <span style={{ position: "absolute", right: 3, bottom: 3, fontSize: 9, padding: "1px 4px", background: "rgba(0,0,0,0.7)", color: "white" }}>{v.duration}s</span>
              </button>
            ))}
          </div>

          <SubHead>Local file (drop here)</SubHead>
          <div
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => { e.preventDefault(); Array.from(e.dataTransfer.files).forEach(importLocal); }}
            style={{ border: "1px dashed var(--line)", borderRadius: 8, padding: 16, textAlign: "center", color: "var(--mute)", fontSize: 11, cursor: "pointer" }}
            onClick={() => document.getElementById("nt5-studio-file")?.click()}>
            drop video or image · or click to pick
          </div>
          <input id="nt5-studio-file" type="file" accept="video/*,image/*" multiple style={{ display: "none" }} onChange={(e) => Array.from(e.target.files || []).forEach(importLocal)} />

          <SubHead>3D scenes (from DigitalBlueprint)</SubHead>
          {scenes.length === 0 ? (
            <div style={{ fontSize: 10, color: "var(--mute)" }}>Save a scene in DigitalBlueprint to use it as a 3D backdrop.</div>
          ) : scenes.map((s) => (
            <button key={s.id} className="btn" style={{ width: "100%", marginBottom: 4, textAlign: "left", padding: "6px 8px", fontSize: 11 }} onClick={() => addClip({ kind: "scene", src: s.id, duration: 5, effect: "kenburns" })}>{s.name}</button>
          ))}

          <SubHead>Title card</SubHead>
          <button className="btn" style={{ width: "100%" }} onClick={() => addClip({ kind: "title", src: "TITLE", duration: 3, overlay: "BREAKING — NT5", effect: "none" })}>+ Add title card</button>
        </div>

        {/* CENTER — preview canvas */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          <PreviewStage clip={previewClip} videoRef={videoRef} />
          <Timeline
            clips={active?.clips || []}
            selected={selectedClipId}
            playIdx={playing ? playIdx : -1}
            onSelect={setSelectedClipId}
            onMove={moveClip}
            onRemove={removeClip}
          />
        </div>

        {/* RIGHT — inspector */}
        <div style={{ borderLeft: "1px solid var(--line)", overflowY: "auto", padding: 10 }}>
          <SubTitle>Clip inspector</SubTitle>
          {!selectedClipId || !active?.clips.find((c) => c.id === selectedClipId) ? (
            <div style={{ fontSize: 11, color: "var(--mute)" }}>Select a clip on the timeline to edit its duration, overlay text, and effects.</div>
          ) : (() => {
            const c = active!.clips.find((x) => x.id === selectedClipId)!;
            return (
              <div>
                <Field l="kind"><div className="mono" style={{ fontSize: 12, color: "var(--ink)" }}>{c.kind}</div></Field>
                <Field l="duration (s)"><input type="number" min={0.5} step={0.5} value={c.duration} onChange={(e) => patchClip(c.id, { duration: Math.max(0.5, Number(e.target.value) || 1) })} style={inp} /></Field>
                <Field l="overlay text (lower-third)"><input value={c.overlay || ""} onChange={(e) => patchClip(c.id, { overlay: e.target.value })} placeholder={c.kind === "title" ? "BREAKING — NT5" : "optional caption"} style={inp} /></Field>
                <Field l="effect">
                  <select value={c.effect || "none"} onChange={(e) => patchClip(c.id, { effect: e.target.value as StudioClip["effect"] })} style={inp}>
                    <option value="none">none</option>
                    <option value="kenburns">ken-burns (slow zoom + pan)</option>
                    <option value="vignette">vignette</option>
                    <option value="glitch">glitch lines</option>
                    <option value="grade-warm">warm grade</option>
                    <option value="grade-cool">cool grade</option>
                  </select>
                </Field>
                <button className="btn" onClick={() => removeClip(c.id)} style={{ marginTop: 10 }}>Remove clip</button>
              </div>
            );
          })()}
        </div>
      </div>
      <style>{STUDIO_CSS}</style>
    </div>
  );
}

function PreviewStage({ clip, videoRef }: { clip: StudioClip | null; videoRef: React.MutableRefObject<HTMLVideoElement | null> }) {
  if (!clip) {
    return <div style={{ flex: 1, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--mute)", fontSize: 13 }}>
      Add a clip and hit play to preview the reel.
    </div>;
  }
  const fxClass = clip.effect ? `fx-${clip.effect}` : "";
  return (
    <div style={{ flex: 1, background: "#000", position: "relative", overflow: "hidden", minHeight: 0 }}>
      {(clip.kind === "pexels" || (clip.kind === "local" && !clip.poster)) && (
        <video ref={videoRef} className={fxClass} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted playsInline />
      )}
      {clip.kind === "local" && clip.poster && (
        <div className={fxClass} style={{ position: "absolute", inset: 0, background: `center/cover url("${clip.src}")` }} />
      )}
      {clip.kind === "scene" && (
        <div className={fxClass} style={{ position: "absolute", inset: 0, background: "radial-gradient(800px 500px at 50% 60%, rgba(217,70,239,0.18), transparent 70%), #050518", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(217,70,239,0.6)", fontFamily: "ui-monospace,monospace", fontSize: 12, letterSpacing: 4, textTransform: "uppercase" }}>
          [ 3D backdrop · {clip.src} ]
        </div>
      )}
      {clip.kind === "title" && (
        <div className={fxClass} style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #1a0820 0%, #06061a 70%)" }} />
      )}
      {clip.effect === "vignette" && <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 200px 60px rgba(0,0,0,0.75)" }} />}
      {clip.effect === "glitch" && <div className="fx-glitch-overlay" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />}
      {clip.overlay && (
        <div style={{
          position: "absolute", left: 24, bottom: 30, padding: "10px 16px",
          background: "linear-gradient(90deg, rgba(217,70,239,0.92), rgba(124,58,237,0.85))",
          borderLeft: "4px solid #22d3ee", color: "#fff",
          fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: 2,
          textShadow: "0 2px 6px rgba(0,0,0,0.6)", maxWidth: "70%",
        }}>{clip.overlay}</div>
      )}
    </div>
  );
}

function Timeline({ clips, selected, playIdx, onSelect, onMove, onRemove }: {
  clips: StudioClip[]; selected: string | null; playIdx: number;
  onSelect: (id: string) => void; onMove: (id: string, dir: -1 | 1) => void; onRemove: (id: string) => void;
}) {
  return (
    <div style={{ borderTop: "1px solid var(--line)", background: "#0a0a14", padding: 10, minHeight: 130, maxHeight: 200, overflowX: "auto", overflowY: "hidden" }}>
      <div className="mono" style={{ fontSize: 10, color: "var(--mute)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>Timeline</div>
      {clips.length === 0 ? (
        <div style={{ color: "var(--mute)", fontSize: 11, paddingTop: 16 }}>Empty. Add clips from the Sources panel.</div>
      ) : (
        <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
          {clips.map((c, i) => (
            <div key={c.id} onClick={() => onSelect(c.id)}
              style={{
                width: Math.max(80, Math.min(240, c.duration * 30)),
                border: `2px solid ${selected === c.id ? "var(--pink)" : playIdx === i ? "var(--orange)" : "var(--line)"}`,
                borderRadius: 6, padding: 6, cursor: "pointer",
                background: c.kind === "title" ? "linear-gradient(135deg, #1a0820, #06061a)" : c.poster ? `center/cover url("${c.poster}")` : "#15151c",
                position: "relative", flexShrink: 0, height: 92,
              }}>
              <div style={{ position: "absolute", left: 4, top: 4, padding: "1px 5px", background: "rgba(0,0,0,0.75)", fontSize: 9, color: "#fff" }}>{c.kind}</div>
              <div style={{ position: "absolute", right: 4, top: 4, padding: "1px 5px", background: "rgba(0,0,0,0.75)", fontSize: 9, color: "#fff" }}>{c.duration.toFixed(1)}s</div>
              {c.overlay && <div style={{ position: "absolute", left: 4, bottom: 22, fontSize: 9, padding: "1px 4px", background: "rgba(217,70,239,0.85)", color: "#fff", maxWidth: "calc(100% - 8px)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{c.overlay}</div>}
              <div style={{ position: "absolute", left: 4, bottom: 4, display: "flex", gap: 2 }}>
                <button className="btn" onClick={(e) => { e.stopPropagation(); onMove(c.id, -1); }} style={{ padding: "1px 5px", fontSize: 9 }}>‹</button>
                <button className="btn" onClick={(e) => { e.stopPropagation(); onMove(c.id, 1); }} style={{ padding: "1px 5px", fontSize: 9 }}>›</button>
                <button className="btn" onClick={(e) => { e.stopPropagation(); onRemove(c.id); }} style={{ padding: "1px 5px", fontSize: 9 }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <div className="glow-text" style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>{children}</div>;
}
function SubHead({ children }: { children: React.ReactNode }) {
  return <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--mute)", margin: "12px 0 4px" }}>{children}</div>;
}
function Field({ l, children }: { l: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--mute)", marginBottom: 4 }}>{l}</div>
      {children}
    </div>
  );
}

const inp: React.CSSProperties = {
  background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 6,
  color: "var(--ink)", padding: "5px 8px", fontSize: 12, fontFamily: "ui-monospace, monospace", outline: "none", width: "100%",
};

const STUDIO_CSS = `
@keyframes fx-kenburns { 0% { transform: scale(1) translate(0,0); } 100% { transform: scale(1.18) translate(-4%, -3%); } }
.fx-kenburns { animation: fx-kenburns 8s ease-in-out forwards; }
.fx-grade-warm { filter: sepia(0.18) saturate(1.18) hue-rotate(-8deg) brightness(1.04); }
.fx-grade-cool { filter: saturate(0.9) hue-rotate(190deg) brightness(0.96); }
@keyframes fx-glitch { 0%,100% { transform: translate(0,0); } 22% { transform: translate(2px,0); } 24% { transform: translate(-2px,0); } 38% { transform: translate(0,1px); } }
.fx-glitch { animation: fx-glitch 1.2s steps(8) infinite; }
.fx-glitch-overlay { background: repeating-linear-gradient(to bottom, rgba(255,87,119,0.05) 0 2px, transparent 2px 6px); mix-blend-mode: screen; }
`;
