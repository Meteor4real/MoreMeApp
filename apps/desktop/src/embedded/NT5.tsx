import { useEffect, useMemo, useRef, useState } from "react";
import { loadNT5, saveNT5, runWire, nt5Wired, type Article } from "./nt5store";

// Pixel-faithful in-app rebuild of the NT5 / S.P.A.C.E. News site.
// Same HUD aesthetic as the Vercel deploy (bg #05050d, neon magenta/purple/
// blue/cyan, Orbitron/Chakra Petch/JetBrains Mono, scanline + grid + radial
// glow), but the wire runs always-on on the local house model — no API key.

type CatMeta = { label: string; accent: string; text: string; glow: string };
const CAT_META: Record<string, CatMeta> = {
  breaking: { label: "Breaking", accent: "#ef4444", text: "#fca5a5", glow: "rgba(239,68,68,0.9)" },
  latest: { label: "Latest", accent: "#d946ef", text: "#f5d0fe", glow: "rgba(217,70,239,0.9)" },
  earth_trending: { label: "Earth Trending", accent: "#3b82f6", text: "#bfdbfe", glow: "rgba(59,130,246,0.9)" },
  gaming: { label: "Gaming", accent: "#1d4ed8", text: "#dbeafe", glow: "rgba(29,78,216,0.9)" },
  space: { label: "Space", accent: "#7c3aed", text: "#ddd6fe", glow: "rgba(124,58,237,0.9)" },
  tech: { label: "Tech", accent: "#22d3ee", text: "#a5f3fc", glow: "rgba(34,211,238,0.9)" },
  culture: { label: "Culture", accent: "#22d3ee", text: "#a5f3fc", glow: "rgba(34,211,238,0.9)" },
  cc_lore: { label: "NT Dispatch", accent: "#ffffff", text: "#ffffff", glow: "rgba(255,255,255,0.7)" },
};
const CAT_ORDER = ["breaking", "latest", "earth_trending", "gaming", "space", "cc_lore", "culture", "tech"];
function meta(cat: string): CatMeta {
  return CAT_META[cat] || CAT_META.latest;
}

const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Orbitron:wght@500;600;700;800&family=Chakra+Petch:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
.nt5e {
  position: relative; height: 100%; overflow: auto;
  background:
    radial-gradient(1400px 700px at 15% -10%, rgba(217,70,239,0.12), transparent 60%),
    radial-gradient(1200px 600px at 95% -5%, rgba(59,130,246,0.10), transparent 60%),
    radial-gradient(900px 500px at 50% 110%, rgba(124,58,237,0.08), transparent 65%),
    #05050d;
  color: #cbd5e1;
  font-family: "Inter", system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.nt5e::before {
  content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 1;
  background-image: repeating-linear-gradient(to bottom, rgba(255,255,255,0.022) 0px, rgba(255,255,255,0.022) 1px, transparent 1px, transparent 3px);
  mix-blend-mode: overlay;
}
.nt5e::after {
  content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background-image:
    linear-gradient(rgba(168,85,247,0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(168,85,247,0.06) 1px, transparent 1px);
  background-size: 48px 48px;
  -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%);
  mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%);
}
.nt5e-wrap { position: relative; z-index: 2; max-width: 1100px; margin: 0 auto; padding: 0 20px 48px; }
.nt5e h1, .nt5e h2, .nt5e h3 { font-family: "Orbitron","Space Grotesk",system-ui,sans-serif; color: #fff; letter-spacing: .01em; font-weight: 600; margin: 0; }
.nt5e .mono { font-family: "JetBrains Mono", ui-monospace, monospace; letter-spacing: .02em; }
.nt5e .tactical { font-family: "Chakra Petch","Space Grotesk",system-ui,sans-serif; letter-spacing: .04em; }
.nt5e .neon { text-shadow: 0 0 1px rgba(255,255,255,.4), 0 0 12px rgba(217,70,239,.35), 0 0 24px rgba(124,58,237,.25); }
.nt5e .neon-cyan { text-shadow: 0 0 1px rgba(255,255,255,.4), 0 0 12px rgba(34,211,238,.45), 0 0 24px rgba(59,130,246,.25); }
.nt5e .hud-line { height: 1px; width: 100%; background: linear-gradient(90deg, transparent, rgba(168,85,247,.4), #d946ef, rgba(34,211,238,.35), transparent); box-shadow: 0 0 12px rgba(217,70,239,.4); margin: 24px 0; }
.nt5e .hud-panel {
  position: relative; border-radius: 10px;
  background: linear-gradient(180deg, rgba(20,14,36,.85), rgba(10,8,22,.85));
  border: 1px solid rgba(168,85,247,.4);
  box-shadow: 0 0 24px rgba(168,85,247,.08) inset, 0 0 20px rgba(124,58,237,.08);
  backdrop-filter: blur(6px);
}
.nt5e .hud-panel::before { content: ""; position: absolute; top: -1px; left: -1px; right: -1px; height: 1px; background: linear-gradient(90deg, transparent, #d946ef, #22d3ee, transparent); opacity: .7; }
.nt5e .nt5-nav { position: sticky; top: 0; z-index: 30; border-bottom: 1px solid rgba(168,85,247,.4); background: rgba(5,5,13,.9); backdrop-filter: blur(10px); }
.nt5e .live-dot { display: inline-block; height: 8px; width: 8px; border-radius: 50%; animation: nt5pulse 2s ease-in-out infinite; }
@keyframes nt5pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
.nt5e .catpill { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; padding: 3px 9px; border-radius: 3px; cursor: pointer; transition: all .15s; }
.nt5e .cattab { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; padding: 4px 10px; border-radius: 3px; border: 1px solid rgba(168,85,247,.6); color: #cbd5e1; cursor: pointer; background: none; transition: all .15s; }
.nt5e .cattab:hover { color: #fff; border-color: #d946ef; box-shadow: 0 0 12px rgba(217,70,239,.4); }
.nt5e .cattab.active { border-color: #a855f7; background: rgba(168,85,247,.15); color: #fff; }
.nt5e .art-card { display: block; padding: 18px; transition: border-color .15s; cursor: default; }
.nt5e .art-card:hover { border-color: rgba(168,85,247,.6); }
.nt5e input.nt5-in { background: rgba(0,0,0,.5); border: 1px solid rgba(168,85,247,.4); border-radius: 6px; color: #e5e7eb; padding: 8px 12px; font-size: 12px; font-family: "JetBrains Mono", monospace; outline: none; }
.nt5e input.nt5-in:focus { border-color: #d946ef; box-shadow: 0 0 12px rgba(217,70,239,.3); }
.nt5e .nt5-btn { font-family: "Chakra Petch", system-ui, sans-serif; text-transform: uppercase; letter-spacing: .08em; font-size: 12px; padding: 8px 14px; border-radius: 6px; border: 1px solid rgba(168,85,247,.55); background: rgba(168,85,247,.12); color: #fff; cursor: pointer; transition: all .15s; }
.nt5e .nt5-btn:hover:not(:disabled) { background: rgba(217,70,239,.2); border-color: #d946ef; box-shadow: 0 0 14px rgba(217,70,239,.35); }
.nt5e .nt5-btn:disabled { opacity: .45; cursor: default; }
`;

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <svg width={40} height={40} viewBox="0 0 64 64" fill="none" aria-label="NT5">
        <defs>
          <linearGradient id="nt5e-grad" x1="0" y1="0" x2="64" y2="64">
            <stop offset="0" stopColor="#d946ef" />
            <stop offset="0.5" stopColor="#7c3aed" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
          <filter id="nt5e-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d="M32 3 L58 17 L58 47 L32 61 L6 47 L6 17 Z" stroke="url(#nt5e-grad)" strokeWidth="2" fill="rgba(124,58,237,0.08)" filter="url(#nt5e-glow)" />
        <path d="M18 20 L46 20 L46 26 L34 26 L34 44 L28 44 L28 26 L18 26 Z" fill="url(#nt5e-grad)" filter="url(#nt5e-glow)" />
        <path d="M22 46 L42 46 L42 49 L26 49 L26 52 L40 52 L42 54 L42 58 L40 60 L22 60 L22 57 L38 57 L38 55 L24 55 L22 53 Z" fill="#d946ef" opacity="0.85" filter="url(#nt5e-glow)" />
        <circle cx="6" cy="17" r="1.5" fill="#22d3ee" />
        <circle cx="58" cy="17" r="1.5" fill="#d946ef" />
        <circle cx="6" cy="47" r="1.5" fill="#d946ef" />
        <circle cx="58" cy="47" r="1.5" fill="#22d3ee" />
      </svg>
      <div style={{ lineHeight: 1.15 }}>
        <div className="neon" style={{ fontFamily: "Orbitron, sans-serif", fontWeight: 700, letterSpacing: "0.18em", color: "#fff", fontSize: 14 }}>S.P.A.C.E.</div>
        <div className="mono" style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.3em", color: "#22d3ee" }}>NT5 · NOVA TERRIS 5</div>
      </div>
    </div>
  );
}

function Badge({ cat, xs }: { cat: string; xs?: boolean }) {
  const m = meta(cat);
  return (
    <span className="catpill mono" style={{ border: `1px solid ${m.accent}99`, background: `${m.accent}26`, color: m.text, boxShadow: `0 0 12px ${m.accent}40`, fontSize: xs ? 10 : 11, padding: xs ? "2px 7px" : "3px 9px" }}>
      <span style={{ height: 6, width: 6, borderRadius: "50%", background: m.accent, boxShadow: `0 0 8px ${m.glow}` }} />
      {m.label}
    </span>
  );
}

export function NT5() {
  const [state, setState] = useState(loadNT5);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [topicInput, setTopicInput] = useState("");
  const [active, setActive] = useState<string>("all");
  const wired = nt5Wired();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function scan() {
    if (busy || !wired) return;
    setBusy(true);
    setStatus("Acquiring signal…");
    const r = await runWire(3);
    if (r.ok) {
      setState(loadNT5());
      setStatus(r.added.length ? `Filed ${r.added.length} new item(s) to the wire.` : "Nothing new on the wire.");
    } else {
      setStatus(r.error || "Wire error.");
    }
    setBusy(false);
  }

  useEffect(() => {
    if (!wired) return;
    timer.current = setInterval(() => void scan(), 20 * 60 * 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wired]);

  function addTopic() {
    const t = topicInput.trim();
    if (!t) return;
    const next = { ...state, topics: [...state.topics, t] };
    setState(next);
    saveNT5(next);
    setTopicInput("");
  }
  function removeTopic(t: string) {
    const next = { ...state, topics: state.topics.filter((x) => x !== t) };
    setState(next);
    saveNT5(next);
  }

  const lead: Article | undefined = state.articles[0];
  const rest = useMemo(() => {
    const r = state.articles.slice(1);
    return active === "all" ? r : r.filter((a) => a.category === active);
  }, [state.articles, active]);

  const cats = useMemo(() => {
    const present = new Set(state.articles.map((a) => a.category));
    return CAT_ORDER.filter((c) => present.has(c));
  }, [state.articles]);

  return (
    <div className="nt5e">
      <style>{STYLE}</style>

      <div className="nt5-nav">
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <Logo />
          <div className="mono" style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 11, textTransform: "uppercase" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#f87171" }}>
              <span className="live-dot" style={{ background: "#ef4444", boxShadow: "0 0 10px rgba(239,68,68,0.8)" }} />ON AIR
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#22d3ee" }}>
              <span className="live-dot" style={{ background: "#22d3ee", boxShadow: "0 0 10px rgba(34,211,238,0.8)" }} />{busy ? "SCANNING" : "STANDBY"}
            </span>
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(168,85,247,0.25)", background: "rgba(5,5,13,0.6)" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "8px 20px", display: "flex", gap: 6, overflowX: "auto" }}>
            {CAT_ORDER.map((c) => {
              const m = meta(c);
              return (
                <span key={c} className="catpill mono" style={{ border: "1px solid rgba(168,85,247,0.5)", color: "#cbd5e1", whiteSpace: "nowrap" }}>
                  <span style={{ height: 6, width: 6, borderRadius: "50%", background: m.accent, boxShadow: `0 0 8px ${m.glow}` }} />
                  {m.label}
                </span>
              );
            })}
          </div>
        </div>
        <div className="hud-line" style={{ margin: 0 }} />
      </div>

      <div className="nt5e-wrap">
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginTop: 24, flexWrap: "wrap" }}>
          <div>
            <h1 className="neon" style={{ fontSize: 30 }}>S.P.A.C.E. NEWS</h1>
            <p className="mono" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.25em", color: "#22d3ee", marginTop: 4 }}>
              ◢ NT5 // NOVA TERRIS 5 // UNIFIED WIRE // 24/7
            </p>
          </div>
          <button className="nt5-btn" onClick={() => void scan()} disabled={busy || !wired}>
            {busy ? "Scanning…" : "Run wire scan"}
          </button>
        </div>

        {/* topics */}
        <div className="hud-panel" style={{ padding: 16, marginTop: 20 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#22d3ee" }}>Hot topics · drive the wire</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {state.topics.map((t) => (
              <button key={t} onClick={() => removeTopic(t)} title="remove" className="catpill mono"
                style={{ background: "rgba(217,70,239,0.12)", border: "1px solid rgba(217,70,239,0.5)", color: "#f5d0fe" }}>
                {t} <span style={{ opacity: 0.7 }}>×</span>
              </button>
            ))}
            {state.topics.length === 0 && <span className="mono" style={{ fontSize: 11, color: "#6b7280" }}>No topics yet.</span>}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <input className="nt5-in" value={topicInput} onChange={(e) => setTopicInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTopic()}
              placeholder="Add a topic (e.g. Origin Realms)" style={{ flex: 1 }} />
            <button className="nt5-btn" onClick={addTopic}>Add</button>
          </div>
        </div>

        {status && <div className="mono" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#8b8ba7", marginTop: 14 }}>{status}</div>}

        {lead && (
          <a className="art-card" href="#" onClick={(e) => e.preventDefault()} style={{ position: "relative", overflow: "hidden", borderRadius: 12, border: "1px solid rgba(168,85,247,0.4)", background: "linear-gradient(135deg, rgba(124,58,237,0.15), #0c0c1c 45%, rgba(29,78,216,0.15))", padding: 24, marginTop: 16, cursor: "default" }}>
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(circle at 85% 15%, rgba(124,58,237,0.18), transparent 55%)" }} />
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <Badge cat={lead.category} />
                <span className="mono" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#8b8ba7" }}>
                  Lead Story · {new Date(lead.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <h2 style={{ fontSize: 28, lineHeight: 1.15, color: "#fff" }}>{lead.title}</h2>
              <p style={{ marginTop: 12, fontSize: 15, lineHeight: 1.6, color: "#cbd5e1", maxWidth: 640 }}>{lead.body}</p>
              <div className="mono" style={{ marginTop: 16, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#fff" }}>By {lead.anchor}</div>
            </div>
          </a>
        )}

        <div className="hud-line" />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <div>
            <h2 style={{ fontSize: 20 }}>The Feed</h2>
            <p className="mono" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#8b8ba7" }}>NT5 Unified Wire · auto-updating</p>
          </div>
          <div className="mono" style={{ fontSize: 11, textTransform: "uppercase", color: "#8b8ba7" }}>{state.articles.length} stories live</div>
        </div>

        {cats.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            <button className={`cattab${active === "all" ? " active" : ""}`} onClick={() => setActive("all")}>All</button>
            {cats.map((c) => (
              <button key={c} className={`cattab${active === c ? " active" : ""}`} onClick={() => setActive(c)}>{meta(c).label}</button>
            ))}
          </div>
        )}

        {state.articles.length === 0 ? (
          <div className="hud-panel" style={{ padding: 40, textAlign: "center" }}>
            <div style={{ color: "#fff", fontFamily: "Orbitron, sans-serif" }}>Acquiring signal…</div>
            <div className="mono" style={{ fontSize: 11, textTransform: "uppercase", color: "#8b8ba7", marginTop: 8 }}>
              NT5 only publishes when there is something new on the wire. Run a scan.
            </div>
          </div>
        ) : rest.length === 0 ? (
          <div className="hud-panel" style={{ padding: 40, textAlign: "center" }}>
            <div style={{ color: "#fff", fontFamily: "Orbitron, sans-serif" }}>No stories in this category yet.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
            {rest.map((a) => (
              <div key={a.id} className="hud-panel art-card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                  <Badge cat={a.category} xs />
                  <span className="mono" style={{ fontSize: 10, textTransform: "uppercase", color: "#8b8ba7" }}>
                    {new Date(a.ts).toLocaleDateString([], { month: "short", day: "numeric" })} · {new Date(a.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <h2 style={{ fontSize: 17, lineHeight: 1.3, color: "#fff" }}>{a.title}</h2>
                <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6, color: "rgba(203,213,225,0.85)" }}>{a.body}</p>
                <div className="mono" style={{ marginTop: 14, fontSize: 11, textTransform: "uppercase", color: "#8b8ba7" }}>By {a.anchor}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
