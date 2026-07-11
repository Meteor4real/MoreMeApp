import { useEffect, useRef, useState } from "react";
import { loadPrefs } from "../../uiPrefs";
import {
  fetchWeather, fetchMarkets, fetchSpace, fetchSports,
  type Weather, type Quote, type SpaceData, type Game,
} from "../../services/nt5Segments";
import { NT } from "./nt5theme";
import { sfxAlert } from "../../services/sfx";

// NT5 live data segments — real data, tokenized to the NT5 design system.
// `compact` stacks the cards vertically for the front page's side column;
// full mode lays them out as a grid (used by Broadcast / standalone).

// Legacy-named constant remapped onto the shared token sheet so every card
// body recolors with the system.
const C = {
  panel: NT.bg2, line: NT.border, cyan: NT.cyan,
  magenta: NT.purple, ink: NT.ink, muted: NT.ink2,
  green: NT.success, red: NT.live, amber: NT.warn,
};

export function NT5Segments({ compact = false }: { compact?: boolean }) {
  const [weather, setWeather] = useState<Weather | null | "loading">("loading");
  const [markets, setMarkets] = useState<Quote[] | "loading">("loading");
  const [space, setSpace] = useState<SpaceData | null | "loading">("loading");
  const [sports, setSports] = useState<Game[] | "loading">("loading");

  useEffect(() => {
    const place = loadPrefs().ownerLocation || "New York";
    let alive = true;
    async function loadAll() {
      fetchWeather(place).then((w) => alive && setWeather(w)).catch(() => alive && setWeather(null));
      fetchMarkets().then((m) => alive && setMarkets(m)).catch(() => alive && setMarkets([]));
      fetchSpace().then((s) => alive && setSpace(s)).catch(() => alive && setSpace(null));
      fetchSports().then((g) => alive && setSports(g)).catch(() => alive && setSports([]));
    }
    void loadAll();
    const t = setInterval(() => void loadAll(), 5 * 60 * 1000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (compact) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <WeatherCard w={weather} />
        <MarketsCard q={markets} />
        <SpaceCard s={space} />
        <SportsTicker games={sports} />
      </div>
    );
  }
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        <WeatherCard w={weather} />
        <MarketsCard q={markets} />
        <SpaceCard s={space} />
      </div>
      <SportsTicker games={sports} />
    </div>
  );
}

// Each segment: hairline card, category-tinted kicker, no glow.
function SegShell({ kicker, color, children }: { kicker: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ position: "relative", padding: "12px 12px 12px 15px", background: NT.bg2, border: `1px solid ${NT.border}`, borderRadius: NT.radius, overflow: "hidden" }}>
      <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: `${color}88` }} />
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontFamily: NT.fontD, fontWeight: 600, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color }}>{kicker}</span>
      </div>
      {children}
    </div>
  );
}

function WeatherCard({ w }: { w: Weather | null | "loading" }) {
  return (
    <SegShell kicker="NT5 Weather Desk" color={C.cyan}>
      {w === "loading" ? <Loading /> : !w ? <Unavailable label="weather" /> : (
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: 34, color: C.ink, lineHeight: 1, textShadow: `0 0 14px ${C.cyan}55` }}>{w.tempF}°</span>
            <span style={{ fontSize: 13, color: C.cyan }}>{w.desc}</span>
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{w.place}</div>
          <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 11, color: C.muted, fontFamily: "ui-monospace,monospace" }}>
            <span>H {w.hi}° L {w.lo}°</span>
            <span>wind {w.windKph} km/h</span>
            <span>hum {w.humidity}%</span>
          </div>
        </div>
      )}
    </SegShell>
  );
}

function MarketsCard({ q }: { q: Quote[] | "loading" }) {
  return (
    <SegShell kicker="NT5 Markets" color={C.green}>
      {q === "loading" ? <Loading /> : q.length === 0 ? <Unavailable label="market data" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {q.slice(0, 6).map((x) => {
            const up = x.changePct >= 0;
            return (
              <div key={x.symbol} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "ui-monospace,monospace", fontSize: 12 }}>
                <span style={{ color: C.ink, width: 64, fontWeight: 700 }}>{x.symbol}</span>
                <span style={{ color: C.muted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {x.kind === "crypto" ? "$" : ""}{x.price.toLocaleString(undefined, { maximumFractionDigits: x.price < 10 ? 2 : 0 })}
                </span>
                <span style={{ color: up ? C.green : C.red, width: 66, textAlign: "right" }}>
                  {up ? "▲" : "▼"} {Math.abs(x.changePct).toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </SegShell>
  );
}

function SpaceCard({ s }: { s: SpaceData | null | "loading" }) {
  return (
    <SegShell kicker="NT5 Space Desk" color={C.magenta}>
      {s === "loading" ? <Loading /> : !s ? <Unavailable label="space data" /> : (
        <div style={{ fontSize: 12, color: C.ink, lineHeight: 1.6 }}>
          {s.peopleInSpace != null && <div><b style={{ color: C.magenta }}>{s.peopleInSpace}</b> humans currently in orbit</div>}
          {s.iss && <div style={{ fontFamily: "ui-monospace,monospace", color: C.muted, fontSize: 11 }}>ISS @ {s.iss.lat.toFixed(1)}°, {s.iss.lon.toFixed(1)}°</div>}
          {s.apod && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 10, color: C.magenta, letterSpacing: 1, textTransform: "uppercase" }}>NASA picture of the day</div>
              <div style={{ color: C.ink, fontSize: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>{s.apod.title}</div>
            </div>
          )}
          {s.peopleInSpace == null && !s.iss && !s.apod && <Unavailable label="space data" />}
        </div>
      )}
    </SegShell>
  );
}

function SportsTicker({ games }: { games: Game[] | "loading" }) {
  if (games === "loading") return null;
  if (games.length === 0) return null;
  const run = [...games, ...games];
  return (
    <div style={{ marginTop: 12, border: `1px solid ${NT.border}`, borderRadius: NT.radius, background: NT.bg2, overflow: "hidden", display: "flex", alignItems: "stretch" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "0 12px", background: C.amber, color: NT.bg, fontFamily: NT.fontD, fontWeight: 800, fontSize: 10, letterSpacing: "0.16em" }}>SPORTS</div>
      <div style={{ flex: 1, overflow: "hidden", whiteSpace: "nowrap" }}>
        <div style={{ display: "inline-block", animation: "nt5crawl 60s linear infinite", paddingLeft: "100%", padding: "7px 0" }}>
          {run.map((g, i) => {
            const live = g.state === "in";
            const final = g.state === "post";
            return (
              <span key={i} style={{ marginRight: 36, fontFamily: "ui-monospace,monospace", fontSize: 12, color: C.ink }}>
                <span style={{ color: C.muted, marginRight: 8 }}>{g.league}</span>
                {g.away} <b style={{ color: C.ink }}>{g.awayScore}</b>
                <span style={{ color: C.muted }}> – </span>
                <b style={{ color: C.ink }}>{g.homeScore}</b> {g.home}
                <span style={{ marginLeft: 8, color: live ? C.red : final ? C.green : C.muted, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" }}>
                  {live ? "● LIVE " : ""}{g.detail}
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Loading() { return <div style={{ fontSize: 12, color: C.muted, fontFamily: "ui-monospace,monospace" }}>tuning the feed…</div>; }
function Unavailable({ label }: { label: string }) { return <div style={{ fontSize: 12, color: C.muted }}>No {label} right now — the desk will retry.</div>; }

// Breaking-news bumper: a full-width animated banner that slides in when a
// fresh "breaking" article lands. Auto-dismisses; clickable.
export function BreakingBumper({ title, anchor, onClick }: { title: string; anchor: string; onClick: () => void }) {
  const [show, setShow] = useState(true);
  const tref = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setShow(true);
    sfxAlert(); // one soft two-tone when a breaking story lands — never loops
    if (tref.current) clearTimeout(tref.current);
    tref.current = setTimeout(() => setShow(false), 12000);
    return () => { if (tref.current) clearTimeout(tref.current); };
  }, [title]);
  if (!show) return null;
  return (
    <div onClick={onClick} style={{
      position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 50, cursor: "pointer",
      display: "flex", alignItems: "stretch", background: "linear-gradient(90deg, #b91c1c, #ef4444)",
      boxShadow: "0 -4px 24px rgba(239,68,68,0.5)", animation: "nt5bumperin .4s ease-out",
    }}>
      <div style={{ display: "flex", alignItems: "center", padding: "0 16px", background: "#0a0820", color: "#ef4444", fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: 13, letterSpacing: 3 }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 10px #ef4444", marginRight: 8, animation: "nt5pulse 1s ease-in-out infinite" }} />
        BREAKING
      </div>
      <div style={{ flex: 1, padding: "10px 16px", color: "#fff", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {title}
        <span style={{ marginLeft: 12, fontSize: 11, opacity: 0.8, fontWeight: 400 }}>— {anchor}, NT5</span>
      </div>
      <button onClick={(e) => { e.stopPropagation(); setShow(false); }} style={{ border: "none", background: "rgba(0,0,0,0.25)", color: "#fff", padding: "0 14px", cursor: "pointer", fontSize: 14 }}>✕</button>
      <style>{`@keyframes nt5bumperin { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
}
