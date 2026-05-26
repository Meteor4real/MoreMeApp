import { useEffect, useMemo, useRef, useState } from "react";
import { HalosChat, HalosProjects, HalosWorkspace, HalosMeet } from "./HalosCollab";

// Embedded HALOS console (reimagined in-app). Addresses the critiques:
// - genuinely ALIEN, non-simple Andromedan glyphs (procedural multi-stroke
//   sigils, not basic circles/lines)
// - Azulbright telemetry (simulated lore worldbuilding, as intended)
// - Hermes as the AI presence (OpenClaw removed)
// - Polar Cosmos Crew renames (Roetem, Tsudrats, ...)
const CY = "#00e5ff";
const PU = "#a07fff";

// ---- procedural alien glyph generator (deterministic per letter) ----
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}
const f1 = (n: number) => Math.round(n * 10) / 10;

function glyphSvg(letter: string): string {
  const i = letter.toUpperCase().charCodeAt(0) - 65;
  const r = rng(i * 2654435761 + 13);
  const p: string[] = [];
  // curved spine
  const x0 = 9 + r() * 6, y0 = 5 + r() * 4, x1 = 12 + r() * 8, y1 = 30 + r() * 5;
  const cx = 6 + r() * 28, cy = 12 + r() * 16;
  p.push(`<path d="M${f1(x0)} ${f1(y0)} Q ${f1(cx)} ${f1(cy)} ${f1(x1)} ${f1(y1)}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`);
  // branches off the spine
  const n = 2 + Math.floor(r() * 3);
  for (let k = 0; k < n; k++) {
    const t = 0.18 + r() * 0.64;
    const bx = x0 + (x1 - x0) * t + (r() - 0.5) * 4;
    const by = y0 + (y1 - y0) * t;
    const ex = 5 + r() * 30, ey = 5 + r() * 30;
    p.push(`<path d="M${f1(bx)} ${f1(by)} L ${f1(ex)} ${f1(ey)}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`);
    if (r() < 0.5) p.push(`<circle cx="${f1(ex)}" cy="${f1(ey)}" r="${f1(1 + r() * 1.5)}" fill="currentColor"/>`);
  }
  // an asymmetric arc node
  if (r() < 0.7) {
    const ax = 10 + r() * 18, ay = 9 + r() * 18, rad = 3 + r() * 3;
    const sweep = r() < 0.5 ? 1 : 0;
    p.push(`<path d="M${f1(ax - rad)} ${f1(ay)} A ${f1(rad)} ${f1(rad)} 0 1 ${sweep} ${f1(ax + rad)} ${f1(ay)}" fill="none" stroke="currentColor" stroke-width="1.4"/>`);
  }
  // a crossing tick
  if (r() < 0.6) {
    const mx = 12 + r() * 16, my = 14 + r() * 12, len = 4 + r() * 6, ang = r() * Math.PI;
    p.push(`<path d="M${f1(mx - Math.cos(ang) * len)} ${f1(my - Math.sin(ang) * len)} L ${f1(mx + Math.cos(ang) * len)} ${f1(my + Math.sin(ang) * len)}" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`);
  }
  return `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">${p.join("")}</svg>`;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const GLYPHS = Object.fromEntries(ALPHABET.map((l) => [l, glyphSvg(l)]));

// ---- telemetry ----
const THREATS = [
  { n: "GREEN", c: "#22c55e", w: 60, sub: "nominal" },
  { n: "BLUE", c: "#3b82f6", w: 18, sub: "elevated watch" },
  { n: "YELLOW", c: "#eab308", w: 9, sub: "anomaly" },
  { n: "ORANGE", c: "#f97316", w: 6, sub: "active threat" },
  { n: "RED", c: "#ef4444", w: 4, sub: "engagement" },
  { n: "AMBER", c: "#f59e0b", w: 2, sub: "system strain" },
  { n: "PURPLE", c: "#a855f7", w: 1, sub: "rift instability" },
  { n: "BLACK", c: "#e8e8ee", w: 0.03, sub: "multiverse-changing event" },
];
function pickThreat() {
  const total = THREATS.reduce((s, t) => s + t.w, 0);
  let x = Math.random() * total;
  for (const t of THREATS) {
    if ((x -= t.w) <= 0) return t;
  }
  return THREATS[0];
}
const INCIDENTS = [
  "Dyson swarm panel cluster 7 rebalanced — output steady.",
  "Riftline Division logs a micro-breach near B-792; contained.",
  "Sharled trading floor: DMD spot price ticks up 0.4%.",
  "Space Tree elevator tether 12 cycled for maintenance.",
  "Solaris Division reports stellar engine Δv within tolerance.",
  "NTPD clears a transit hub incident in Nova Terris sector 9.",
  "S.A.T.U.R.N. Labs files experiment #4471 results.",
  "Multiversal Hub portal frame recalibrated.",
];
const QUOTES = [
  "“The universe does not give power to those who seek it.” — cave wall, Amazon Basin",
  "“Don't lie to me. I'll already know.” — Aluben",
  "“The boots stay on.” — Yruf",
  "“I never had a reason before.” — Roetem",
  "“Balance is a choice you make every morning.” — S.P.A.C.E. Agent Code",
];

const POLAR = [
  ["Roetem", "Meteor"], ["Tsudrats", "Stardust"], ["Yruf", "Fury"],
  ["Avonorepus", "Supernova"], ["Aluben", "Nebula"], ["Eralf Ralos", "Solar Flare"],
  ["Omsoc", "Cosmo"], ["Msirp", "Prism"], ["Etyb", "Byte"],
];

export function HALOS() {
  const [threat, setThreat] = useState(pickThreat);
  const [incidents, setIncidents] = useState<string[]>([INCIDENTS[0]]);
  const [quote, setQuote] = useState(QUOTES[0]);
  const [translate, setTranslate] = useState("AZULBRIGHT");
  const [tab, setTab] = useState<"telemetry" | "stocks" | "roster" | "chat" | "projects" | "workspace" | "meet">("telemetry");

  useEffect(() => {
    const t = setInterval(() => {
      if (Math.random() < 0.18) setThreat(pickThreat());
      setIncidents((prev) => [INCIDENTS[Math.floor(Math.random() * INCIDENTS.length)], ...prev].slice(0, 8));
      setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const stats = useMemo(
    () => [
      ["Azulbright output", `${(98 + Math.random() * 2).toFixed(2)}%`],
      ["Dyson coverage", `${(71 + Math.random() * 4).toFixed(1)}%`],
      ["Pyramid shield", "STABLE"],
      ["Nova Terris pop.", "4.21B"],
      ["DMD spot", `${(1040 + Math.random() * 30).toFixed(0)}`],
      ["Hub portal traffic", `${(120 + Math.random() * 40).toFixed(0)}/s`],
    ],
    [incidents]
  );

  const box: React.CSSProperties = {
    border: `1px solid ${CY}33`, borderRadius: 10, background: "rgba(0,20,28,0.35)",
    boxShadow: `0 0 18px ${CY}14 inset`,
  };

  return (
    <div className="stage" style={{ background: "#07050f", color: "#cfe9ff" }}>
      <div className="mono" style={{ padding: "8px 14px", borderBottom: `1px solid ${CY}33`, display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ fontSize: 12, letterSpacing: 3, textTransform: "uppercase", color: CY, textShadow: `0 0 10px ${CY}` }}>The HALOS Interface</span>
        <div style={{ display: "flex", gap: 6 }}>
          {(["telemetry", "stocks", "roster", "chat", "projects", "workspace", "meet"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="mono"
              style={{ background: "none", border: `1px solid ${tab === t ? CY : CY + "33"}`, color: tab === t ? CY : "#6fa8bd", borderRadius: 6, padding: "3px 10px", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer" }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {(tab === "telemetry" || tab === "stocks" || tab === "roster") && (
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {tab === "telemetry" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
        {/* left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          {/* threat gauge */}
          <div style={{ ...box, padding: 16, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 52, height: 52, color: threat.c }} dangerouslySetInnerHTML={{ __html: glyphSvg(threat.n[0]) }} />
            <div>
              <div className="mono" style={{ fontSize: 22, letterSpacing: 3, color: threat.c, textShadow: `0 0 12px ${threat.c}` }}>
                THREAT · {threat.n}
              </div>
              <div style={{ fontSize: 12, color: "#88b8cc" }}>{threat.sub}</div>
            </div>
          </div>

          {/* stat grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
            {stats.map(([k, v]) => (
              <div key={k} style={{ ...box, padding: 12 }}>
                <div className="mono" style={{ fontSize: 10, letterSpacing: 1, color: "#6fa8bd", textTransform: "uppercase" }}>{k}</div>
                <div className="mono" style={{ fontSize: 18, color: CY, textShadow: `0 0 8px ${CY}66`, marginTop: 4 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* incident feed */}
          <div style={{ ...box, padding: 14 }}>
            <div className="mono" style={{ fontSize: 11, letterSpacing: 2, color: PU, marginBottom: 8 }}>INCIDENT FEED</div>
            {incidents.map((it, i) => (
              <div key={i} className="mono" style={{ fontSize: 12, color: i === 0 ? "#cfe9ff" : "#6fa8bd", padding: "2px 0" }}>
                <span style={{ color: CY }}>›</span> {it}
              </div>
            ))}
          </div>
        </div>

        {/* right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          {/* Andromedan alphabet + translator */}
          <div style={{ ...box, padding: 14 }}>
            <div className="mono" style={{ fontSize: 11, letterSpacing: 2, color: PU, marginBottom: 8 }}>ANDROMADEAN CODEX</div>
            <input
              value={translate}
              onChange={(e) => setTranslate(e.target.value)}
              placeholder="type to translate"
              style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: `1px solid ${CY}33`, borderRadius: 8, color: CY, padding: "7px 10px", fontFamily: "ui-monospace, monospace", fontSize: 13, outline: "none", textTransform: "uppercase" }}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10, color: CY, minHeight: 30 }}>
              {translate.toUpperCase().split("").map((ch, i) =>
                GLYPHS[ch] ? (
                  <span key={i} style={{ width: 26, height: 26 }} dangerouslySetInnerHTML={{ __html: GLYPHS[ch] }} />
                ) : (
                  <span key={i} style={{ width: ch === " " ? 12 : 26 }} />
                )
              )}
            </div>
            <div style={{ height: 1, background: `${CY}22`, margin: "12px 0" }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(46px,1fr))", gap: 6, color: CY }}>
              {ALPHABET.map((l) => (
                <div key={l} style={{ textAlign: "center" }}>
                  <span style={{ display: "inline-block", width: 30, height: 30 }} dangerouslySetInnerHTML={{ __html: GLYPHS[l] }} />
                  <div className="mono" style={{ fontSize: 9, color: "#6fa8bd" }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hermes (no OpenClaw) */}
          <div style={{ ...box, padding: 14 }}>
            <div className="mono" style={{ fontSize: 11, letterSpacing: 2, color: PU, marginBottom: 6 }}>S.P.A.C.E. AI</div>
            <div className="mono" style={{ fontSize: 14, color: CY }}>Hermes · co-boss</div>
            <div style={{ fontSize: 12, color: "#88b8cc", marginTop: 4 }}>
              Reachable from the Terminal and the AI Group Chat. (OpenClaw retired.)
            </div>
          </div>

          {/* Polar crew */}
          <div style={{ ...box, padding: 14 }}>
            <div className="mono" style={{ fontSize: 11, letterSpacing: 2, color: "#ff5577", marginBottom: 8 }}>POLAR COSMOS CREW · B-792</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
              {POLAR.map(([p, o]) => (
                <div key={p} className="mono" style={{ fontSize: 12, color: "#cfe9ff" }}>
                  <span style={{ color: "#ff5577" }}>{p}</span> <span style={{ color: "#6fa8bd" }}>· {o}</span>
                </div>
              ))}
            </div>
          </div>

          {/* lore quote */}
          <div style={{ ...box, padding: 14, fontSize: 13, color: "#9fd3e6", fontStyle: "italic" }}>{quote}</div>
        </div>
        </div>
        )}
        {tab === "stocks" && <Stocks box={box} />}
        {tab === "roster" && <Roster box={box} />}
      </div>
      )}
      {tab === "chat" && <HalosChat />}
      {tab === "projects" && <HalosProjects />}
      {tab === "workspace" && <HalosWorkspace />}
      {tab === "meet" && <HalosMeet />}
    </div>
  );
}

type BoxStyle = React.CSSProperties;

// Azulbright Stocks — simulated DMD candlestick (lore worldbuilding).
function Stocks({ box }: { box: BoxStyle }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    let raf = 0;
    let price = 1040;
    const candles: { o: number; h: number; l: number; c: number }[] = [];
    for (let i = 0; i < 60; i++) {
      const o = price;
      price += (Math.random() - 0.5) * 24;
      const c = price;
      candles.push({ o, c, h: Math.max(o, c) + Math.random() * 10, l: Math.min(o, c) - Math.random() * 10 });
    }
    const draw = () => {
      const w = (cv.width = cv.clientWidth);
      const h = (cv.height = cv.clientHeight);
      const ctx = cv.getContext("2d")!;
      ctx.clearRect(0, 0, w, h);
      const lo = Math.min(...candles.map((c) => c.l));
      const hi = Math.max(...candles.map((c) => c.h));
      const y = (v: number) => h - 16 - ((v - lo) / (hi - lo || 1)) * (h - 32);
      const cw = w / candles.length;
      candles.forEach((c, i) => {
        const x = i * cw + cw / 2;
        const up = c.c >= c.o;
        ctx.strokeStyle = up ? "#22d3ee" : "#ff5577";
        ctx.fillStyle = up ? "#22d3ee" : "#ff5577";
        ctx.beginPath();
        ctx.moveTo(x, y(c.h));
        ctx.lineTo(x, y(c.l));
        ctx.stroke();
        const top = y(Math.max(c.o, c.c));
        ctx.fillRect(x - cw * 0.3, top, cw * 0.6, Math.max(1, Math.abs(y(c.o) - y(c.c))));
      });
    };
    const tick = () => {
      const last = candles[candles.length - 1].c;
      const o = last;
      const c = o + (Math.random() - 0.5) * 24;
      candles.push({ o, c, h: Math.max(o, c) + Math.random() * 10, l: Math.min(o, c) - Math.random() * 10 });
      candles.shift();
      draw();
      raf = window.setTimeout(() => requestAnimationFrame(tick), 1400) as unknown as number;
    };
    draw();
    tick();
    return () => clearTimeout(raf);
  }, []);
  return (
    <div style={{ ...box, padding: 14, height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="mono" style={{ fontSize: 11, letterSpacing: 2, color: PU, marginBottom: 8 }}>
        AZULBRIGHT STOCKS · DMD (Dark Matter Diamonds)
      </div>
      <canvas ref={ref} style={{ flex: 1, width: "100%", minHeight: 320 }} />
    </div>
  );
}

const CREW: [string, string][] = [
  ["Meteor", "Astralex · can do anything (Pact-bound)"],
  ["Stardust", "matter + tech; builds everything"],
  ["Fury", "best pure fighter; the boots stay on"],
  ["Supernova", "star-people; pilot"],
  ["Nebula", "teleport, cloak, truth detection"],
  ["Solar Flare", "fire + lava"],
  ["Cosmo", "telepathic space-puppy"],
  ["Prism", "shapeshifter; phases solids"],
  ["Byte", "built by Stardust; mech form"],
];
function Roster({ box }: { box: BoxStyle }) {
  return (
    <div style={{ ...box, padding: 16 }}>
      <div className="mono" style={{ fontSize: 11, letterSpacing: 2, color: PU, marginBottom: 10 }}>
        AGENT ROSTER · COSMOS CREW (ASTRALEX)
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 10 }}>
        {CREW.map(([name, role]) => (
          <div key={name} style={{ border: `1px solid ${CY}22`, borderRadius: 8, padding: 10, display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ width: 30, height: 30, color: CY, flex: "none" }} dangerouslySetInnerHTML={{ __html: glyphSvg(name[0]) }} />
            <div style={{ minWidth: 0 }}>
              <div className="mono" style={{ fontSize: 13, color: CY }}>{name}</div>
              <div style={{ fontSize: 11, color: "#88b8cc" }}>{role}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
