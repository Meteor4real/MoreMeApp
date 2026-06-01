import { useEffect, useRef, useState } from "react";
import { loadPrefs, subscribePrefs } from "../uiPrefs";
import { subscribeWire, type WireArticle } from "../services/nt5Wire";
import { subscribeOriginPulse, type OriginPulse } from "../services/originRealms";
import { TRACKS, ost } from "../audio/ost";
import { subscribeImportedPlayer, importedNowPlaying, importedIsPlaying, loadImported } from "../audio/imported";

// Floating, toggleable info pieces. They sit on top of the canvas, can be
// dragged anywhere on screen (positions persist), manually X-closed, and
// re-summoned via the "hidden widgets" tray at the bottom-right. Drives from
// the in-app NT5 wire, Origin Realms pulse, system pulse, group chat, more
// (clock, MoreMe, BroBot, GitHub, Vercel, music, network, hub uptime).

const CARD_BG = "linear-gradient(140deg, rgba(20,8,12,0.96), rgba(8,8,14,0.96))";

const POS_KEY = "nchub.floatingInfo.pos.v1";
const HIDDEN_KEY = "nchub.floatingInfo.hidden.v1";

type Pos = { x: number; y: number };
type PosMap = Record<string, Pos>;

function loadPositions(): PosMap {
  try { return JSON.parse(localStorage.getItem(POS_KEY) || "{}") as PosMap; } catch { return {}; }
}
function savePositions(p: PosMap): void {
  try { localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}
function loadHidden(): string[] {
  try { return JSON.parse(localStorage.getItem(HIDDEN_KEY) || "[]") as string[]; } catch { return []; }
}
function saveHidden(ids: string[]): void {
  try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
}

// A stable widget id is used for position + hidden state. The "kind" is the
// stable part (e.g. "breaking"); the cycling article id is just the body.
const HUB_BOOT_AT = Date.now();

export function FloatingInfo() {
  const [prefs, setPrefs] = useState(loadPrefs);
  const [arts, setArts] = useState<WireArticle[]>([]);
  const [origin, setOrigin] = useState<OriginPulse | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(loadHidden()));
  const [positions, setPositions] = useState<PosMap>(loadPositions);
  const [tick, setTick] = useState(0);
  const [sys, setSys] = useState<{ cpuPct: number; memPct: number; memFreeGb: number; diskFreeGb: number; diskTotalGb: number } | null>(null);
  const [crew, setCrew] = useState<{ name: string; content: string } | null>(null);
  const [clock, setClock] = useState<{ time: string; date: string }>({ time: "", date: "" });
  const [moreme, setMoreme] = useState<{ streak: number; doneToday: number; totalToday: number } | null>(null);
  const [brobot, setBrobot] = useState<{ total: number; recent?: string } | null>(null);
  const [github, setGithub] = useState<{ prs: number; recent: string } | null>(null);
  const [vercel, setVercel] = useState<{ name: string; state: string } | null>(null);
  const [music, setMusic] = useState<{ title: string; kit: string; kind: "procedural" | "imported" } | null>(null);
  const [net, setNet] = useState<{ online: boolean; downMbps?: number; rtt?: number; type?: string }>(() => ({ online: typeof navigator !== "undefined" ? navigator.onLine : true }));
  const [uptime, setUptime] = useState<string>("0s");
  const [trayOpen, setTrayOpen] = useState(false);

  useEffect(() => subscribePrefs(setPrefs), []);
  useEffect(() => subscribeWire(setArts), []);
  useEffect(() => subscribeOriginPulse(setOrigin), []);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 11000);
    return () => clearInterval(t);
  }, []);

  // System pulse every 6 s.
  useEffect(() => {
    let cancelled = false;
    async function tickSys() {
      try { const s = await window.hub.sys.pulse(); if (!cancelled) setSys(s); } catch { /* ignore */ }
    }
    void tickSys();
    const t = setInterval(tickSys, 6000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Sample the last group-chat message every 8 s.
  useEffect(() => {
    function readLatest() {
      try {
        const raw = localStorage.getItem("nchub.chat.v2");
        if (!raw) return;
        const msgs = JSON.parse(raw) as Array<{ name?: string; content?: string; kind?: string }>;
        const last = msgs[msgs.length - 1];
        if (last && last.kind !== "system") setCrew({ name: last.name || "—", content: last.content || "" });
      } catch { /* ignore */ }
    }
    readLatest();
    const t = setInterval(readLatest, 8000);
    return () => clearInterval(t);
  }, []);

  // Clock — operator timezone, updates every second.
  useEffect(() => {
    const tz = prefs.ownerTimezone || undefined;
    function tickClock() {
      const d = new Date();
      let time: string; let dateStr: string;
      try {
        time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: tz, hour12: false });
        dateStr = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: tz });
      } catch {
        time = d.toLocaleTimeString("en-GB", { hour12: false });
        dateStr = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
      }
      setClock({ time, date: dateStr.toUpperCase() });
    }
    tickClock();
    const t = setInterval(tickClock, 1000);
    return () => clearInterval(t);
  }, [prefs.ownerTimezone]);

  // MoreMe streak + today's progress — every 30 s.
  useEffect(() => {
    function readMore() {
      try {
        const raw = localStorage.getItem("moreme.v1");
        if (!raw) return;
        const m = JSON.parse(raw) as { streak?: number; days?: Record<string, { items?: { done?: boolean }[] }> };
        const today = new Date().toISOString().slice(0, 10);
        const items = m.days?.[today]?.items || [];
        setMoreme({ streak: m.streak || 0, doneToday: items.filter((x) => x.done).length, totalToday: items.length });
      } catch { /* ignore */ }
    }
    readMore();
    const t = setInterval(readMore, 30000);
    return () => clearInterval(t);
  }, []);

  // BroBot gallery recent — every 20 s.
  useEffect(() => {
    function read() {
      try {
        const raw = localStorage.getItem("brobot.gallery.v1");
        if (!raw) return;
        const g = JSON.parse(raw) as { items?: { title?: string; addedAt?: number }[] };
        const items = g.items || [];
        if (items.length === 0) return;
        const recent = [...items].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))[0];
        setBrobot({ total: items.length, recent: recent.title });
      } catch { /* ignore */ }
    }
    read();
    const t = setInterval(read, 20000);
    return () => clearInterval(t);
  }, []);

  // GitHub PR pulse — every 5 minutes (rate-friendly).
  useEffect(() => {
    let cancelled = false;
    async function pull() {
      try {
        const v = await window.hub.vault.get("github");
        if (!v.token) return;
        const r = await window.hub.net({
          method: "GET",
          url: "https://api.github.com/search/issues?per_page=5&q=" + encodeURIComponent("is:open is:pr author:@me"),
          headers: { Authorization: `Bearer ${v.token}`, Accept: "application/vnd.github+json", "User-Agent": "NetworkChuckHub" },
        });
        const j = r.data as { items?: { title: string }[] } | null;
        const items = j?.items || [];
        if (!cancelled) setGithub({ prs: items.length, recent: items[0]?.title || "no open PRs" });
      } catch { /* ignore */ }
    }
    void pull();
    const t = setInterval(pull, 300000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Vercel latest deploy pulse — every 2 minutes.
  useEffect(() => {
    let cancelled = false;
    async function pull() {
      try {
        const v = await window.hub.vault.get("vercel");
        if (!v.token) return;
        const r = await window.hub.net({
          method: "GET",
          url: "https://api.vercel.com/v6/deployments?limit=1",
          headers: { Authorization: `Bearer ${v.token}` },
        });
        const j = r.data as { deployments?: { name: string; state?: string; readyState?: string }[] } | null;
        const d = j?.deployments?.[0];
        if (d && !cancelled) setVercel({ name: d.name, state: (d.state || d.readyState || "?").toLowerCase() });
      } catch { /* ignore */ }
    }
    void pull();
    const t = setInterval(pull, 120000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Music — sample procedural ost + imported every 2 s.
  useEffect(() => {
    function readMusic() {
      const imp = importedNowPlaying();
      if (imp && importedIsPlaying()) {
        const t = loadImported().find((x) => x.id === imp);
        if (t) { setMusic({ title: t.name, kit: t.vibe || "imported", kind: "imported" }); return; }
      }
      const idx = ost.currentIndex;
      if (idx >= 0 && idx < TRACKS.length) {
        const t = TRACKS[idx];
        setMusic({ title: t.name, kit: t.vibe || "", kind: "procedural" });
      } else {
        setMusic(null);
      }
    }
    readMusic();
    const t = setInterval(readMusic, 2000);
    const unsub = subscribeImportedPlayer(() => readMusic());
    return () => { clearInterval(t); unsub(); };
  }, []);

  // Network status — listens to browser online/offline and polls connection.
  useEffect(() => {
    function update() {
      const c = (navigator as Navigator & { connection?: { downlink?: number; rtt?: number; effectiveType?: string } }).connection;
      setNet({ online: navigator.onLine, downMbps: c?.downlink, rtt: c?.rtt, type: c?.effectiveType });
    }
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const t = setInterval(update, 15000);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); clearInterval(t); };
  }, []);

  // Hub uptime — refreshed every 30 s for the human-readable string.
  useEffect(() => {
    function readUp() {
      const ms = Date.now() - HUB_BOOT_AT;
      const s = Math.floor(ms / 1000);
      const d = Math.floor(s / 86400);
      const h = Math.floor((s % 86400) / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      if (d > 0) setUptime(`${d}d ${h}h ${m}m`);
      else if (h > 0) setUptime(`${h}h ${m}m`);
      else if (m > 0) setUptime(`${m}m ${sec}s`);
      else setUptime(`${sec}s`);
    }
    readUp();
    const t = setInterval(readUp, 1000);
    return () => clearInterval(t);
  }, []);

  const breaking = arts.filter((a) => a.category === "breaking").slice(0, 4);
  const latest = arts.slice(0, 6);

  // Each entry: stable kind id + render. Position lookup uses the kind id.
  type CardDef = { kind: string; tag: string; color: string; show: boolean; body: React.ReactNode };
  const defs: CardDef[] = [];

  if (prefs.infoBreaking && breaking.length) {
    const a = breaking[tick % breaking.length];
    defs.push({
      kind: "breaking", tag: "Breaking · NT5", color: "#ff2d4a", show: true,
      body: (
        <>
          <div className="mono" style={{ fontSize: 13, color: "#ffe5ec", lineHeight: 1.35 }}>{a.title}</div>
          <div style={{ fontSize: 11, color: "#c79da7", marginTop: 4 }}>Tune in for {a.author_display}'s special report.</div>
        </>
      ),
    });
  }
  if (prefs.infoNextUp && latest.length) {
    const a = latest[(tick + 1) % latest.length];
    defs.push({
      kind: "filed", tag: `Filed · ${a.author_display}`, color: "#d946ef", show: true,
      body: (
        <>
          <div className="mono" style={{ fontSize: 13, color: "#f3dcff", lineHeight: 1.35 }}>{a.title}</div>
          <div style={{ fontSize: 11, color: "#b896c4", marginTop: 4 }}>{a.body.slice(0, 96)}{a.body.length > 96 ? "…" : ""}</div>
        </>
      ),
    });
  }
  if (prefs.infoOrigin && origin) {
    defs.push({
      kind: "origin", tag: "Origin Realms · live", color: "#22c55e", show: true,
      body: (
        <>
          <div className="mono" style={{ fontSize: 13, color: "#dbffe7", lineHeight: 1.35 }}>{origin.online ? `${origin.players} / ${origin.max} online` : "server offline"}</div>
          <div style={{ fontSize: 11, color: "#9bd4ad", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{origin.motd}</div>
        </>
      ),
    });
  }
  if (prefs.infoSystem && sys) {
    const cpuColor = sys.cpuPct > 80 ? "#ef4444" : sys.cpuPct > 50 ? "#f59e0b" : "#22d3ee";
    defs.push({
      kind: "system", tag: "System pulse", color: "#22d3ee", show: true,
      body: (
        <>
          <Bar label="CPU" pct={sys.cpuPct} color={cpuColor} />
          <Bar label="MEM" pct={sys.memPct} color="#22d3ee" />
          <div style={{ fontSize: 10, color: "#a3d7e5", marginTop: 4 }}>
            {sys.memFreeGb.toFixed(1)} GB free RAM · {sys.diskFreeGb.toFixed(1)} GB free disk
          </div>
        </>
      ),
    });
  }
  if (prefs.infoCrew && crew) {
    defs.push({
      kind: "crew", tag: `Crew · ${crew.name}`, color: "#ff7a2d", show: true,
      body: (
        <div style={{ fontSize: 12, color: "#ffe5d4", lineHeight: 1.4, maxHeight: 64, overflow: "hidden" }}>
          {crew.content.slice(0, 180)}{crew.content.length > 180 ? "…" : ""}
        </div>
      ),
    });
  }
  if (prefs.ownerBirthday) {
    const bd = prefs.ownerBirthday.split("-");
    const now = new Date();
    if (bd.length === 3 && Number(bd[1]) === now.getMonth() + 1 && Number(bd[2]) === now.getDate()) {
      defs.push({
        kind: "birthday", tag: "◆ Happy birthday", color: "#ff7a2d", show: true,
        body: (
          <div style={{ fontSize: 13, color: "#ffe5d4", lineHeight: 1.4 }}>
            The whole Hub crew is wishing {prefs.ownerName || "you"} a great one today.
          </div>
        ),
      });
    }
  }
  if (prefs.infoClock && clock.time) {
    defs.push({
      kind: "clock", tag: clock.date, color: "#a78bfa", show: true,
      body: <div className="mono glow-text" style={{ fontSize: 22, letterSpacing: 3, lineHeight: 1 }}>{clock.time}</div>,
    });
  }
  if (prefs.infoMoreMe && moreme && moreme.totalToday > 0) {
    defs.push({
      kind: "moreme", tag: `More Me · ${moreme.streak}-day streak`, color: "#00C896", show: true,
      body: (
        <>
          <div className="mono" style={{ fontSize: 12, color: "#d3fff0", lineHeight: 1.4 }}>
            Today {moreme.doneToday}/{moreme.totalToday}
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden", marginTop: 4 }}>
            <div style={{ height: "100%", width: `${moreme.totalToday ? Math.round((moreme.doneToday / moreme.totalToday) * 100) : 0}%`, background: "linear-gradient(90deg, #00C896, #34d399)" }} />
          </div>
        </>
      ),
    });
  }
  if (prefs.infoBroBot && brobot && brobot.total > 0) {
    defs.push({
      kind: "brobot", tag: `BroBot · ${brobot.total} in gallery`, color: "#c9a961", show: true,
      body: (
        <div style={{ fontSize: 12, color: "#f3dca0", lineHeight: 1.4, maxHeight: 40, overflow: "hidden" }}>
          {brobot.recent ? `recent: ${brobot.recent}` : "—"}
        </div>
      ),
    });
  }
  if (prefs.infoGithub && github) {
    defs.push({
      kind: "github", tag: `GitHub · ${github.prs} open PR${github.prs === 1 ? "" : "s"}`, color: "#a5d6ff", show: true,
      body: (
        <div className="mono" style={{ fontSize: 11, color: "#c9e0ff", lineHeight: 1.35, maxHeight: 40, overflow: "hidden", textOverflow: "ellipsis" }}>
          {github.recent}
        </div>
      ),
    });
  }
  if (prefs.infoVercel && vercel) {
    const stateColor = vercel.state === "ready" ? "#22c55e" : vercel.state === "building" || vercel.state === "queued" ? "#f59e0b" : vercel.state === "error" ? "#ef4444" : "#888";
    defs.push({
      kind: "vercel", tag: "Vercel · latest deploy", color: "#ffffff", show: true,
      body: (
        <div className="mono" style={{ fontSize: 12, color: "#e9e9e9", lineHeight: 1.35 }}>
          <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: stateColor, marginRight: 6 }} />
          {vercel.state} · <span style={{ color: "#bbb" }}>{vercel.name}</span>
        </div>
      ),
    });
  }
  if (prefs.infoMusic && music) {
    defs.push({
      kind: "music", tag: `Now playing · ${music.kind === "imported" ? "imported" : music.kit || "ost"}`, color: "#ec4899", show: true,
      body: (
        <div className="mono" style={{ fontSize: 12, color: "#ffe0ee", lineHeight: 1.35, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "inline-flex", gap: 2 }}>
            <Equalizer color="#ec4899" />
          </span>
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{music.title}</span>
        </div>
      ),
    });
  }
  if (prefs.infoNetwork) {
    const c = net.online ? "#22c55e" : "#ef4444";
    defs.push({
      kind: "network", tag: net.online ? "Network · online" : "Network · offline", color: c, show: true,
      body: (
        <div className="mono" style={{ fontSize: 11, color: "#cfeedc", lineHeight: 1.4 }}>
          {net.online ? (
            <>
              {net.type ? <>type {net.type.toUpperCase()} · </> : null}
              {net.downMbps != null ? <>{net.downMbps} Mbps · </> : null}
              {net.rtt != null ? <>{net.rtt} ms rtt</> : "live"}
            </>
          ) : "No connection. Pulse and PR widgets are paused."}
        </div>
      ),
    });
  }
  if (prefs.infoUptime) {
    defs.push({
      kind: "uptime", tag: "Hub uptime", color: "#fbbf24", show: true,
      body: (
        <div className="mono glow-text" style={{ fontSize: 18, letterSpacing: 2, color: "#ffe9a8" }}>{uptime}</div>
      ),
    });
  }

  const visible = defs.filter((d) => !hidden.has(d.kind));
  const hiddenAvailable = defs.filter((d) => hidden.has(d.kind));

  function dismiss(kind: string) {
    setHidden((s) => { const n = new Set(s); n.add(kind); saveHidden([...n]); return n; });
  }
  function restore(kind: string) {
    setHidden((s) => { const n = new Set(s); n.delete(kind); saveHidden([...n]); return n; });
  }
  function restoreAll() {
    setHidden(new Set()); saveHidden([]);
  }
  function resetPositions() {
    setPositions({}); savePositions({});
  }
  function updatePos(kind: string, pos: Pos) {
    setPositions((p) => { const n = { ...p, [kind]: pos }; savePositions(n); return n; });
  }

  // Layout: cards with a saved position go absolute at that point; cards
  // without sit in a flex stack anchored to bottom-right (the classic layout).
  const placed = visible.filter((d) => positions[d.kind]);
  const stacked = visible.filter((d) => !positions[d.kind]);

  return (
    <div data-tour="floating-info" style={{ position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none" }}>
      {/* Free-floating positioned cards */}
      {placed.map((d) => (
        <DraggableCard
          key={d.kind}
          tag={d.tag} color={d.color}
          pos={positions[d.kind]}
          onMove={(p) => updatePos(d.kind, p)}
          onClose={() => dismiss(d.kind)}
        >
          {d.body}
        </DraggableCard>
      ))}

      {/* Default stacked cards anchored bottom-right */}
      {stacked.length > 0 && (
        <div style={{ position: "absolute", right: 14, bottom: 70, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none", maxHeight: "70vh", overflow: "visible" }}>
          {stacked.map((d) => (
            <DraggableCard
              key={d.kind}
              tag={d.tag} color={d.color}
              onMove={(p) => updatePos(d.kind, p)}
              onClose={() => dismiss(d.kind)}
            >
              {d.body}
            </DraggableCard>
          ))}
        </div>
      )}

      {/* Hidden-widgets tray (only when there's something to restore) */}
      {hiddenAvailable.length > 0 && (
        <div style={{ position: "absolute", right: 14, bottom: 40, pointerEvents: "auto" }}>
          <button
            onClick={() => setTrayOpen((o) => !o)}
            className="btn"
            style={{ fontSize: 10, padding: "4px 10px", color: "var(--pink)", borderColor: "rgba(255,87,119,0.55)", boxShadow: "0 0 14px rgba(255,87,119,0.25)" }}
          >
            ◇ {hiddenAvailable.length} hidden
          </button>
          {trayOpen && (
            <div style={{ position: "absolute", right: 0, bottom: 30, minWidth: 200, background: CARD_BG, border: "1px solid rgba(255,87,119,0.35)", borderRadius: 8, padding: 8, boxShadow: "0 0 24px rgba(0,0,0,0.6)" }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--pink)", marginBottom: 6, textTransform: "uppercase" }}>Hidden widgets</div>
              {hiddenAvailable.map((d) => (
                <div key={d.kind} onClick={() => restore(d.kind)} style={{ padding: "4px 6px", fontSize: 11, color: "var(--ink)", cursor: "pointer", borderRadius: 4 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,87,119,0.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: d.color, marginRight: 6 }} />
                  {d.tag}
                </div>
              ))}
              <div style={{ borderTop: "1px solid var(--line)", marginTop: 6, paddingTop: 6, display: "flex", gap: 6 }}>
                <button className="btn" style={{ fontSize: 10, flex: 1 }} onClick={restoreAll}>Show all</button>
                <button className="btn" style={{ fontSize: 10, flex: 1 }} onClick={resetPositions}>Reset positions</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DraggableCard({
  tag, color, pos, onMove, onClose, children,
}: {
  tag: string; color: string; pos?: Pos; onMove: (p: Pos) => void; onClose: () => void; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ x: number; y: number; startX: number; startY: number; moved: boolean } | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    // Only drag with primary button.
    if (e.button !== 0) return;
    drag.current = { x: rect.left, y: rect.top, startX: e.clientX, startY: e.clientY, moved: false };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    if (!drag.current.moved && Math.hypot(dx, dy) < 3) return;
    drag.current.moved = true;
    const w = ref.current?.offsetWidth || 260;
    const h = ref.current?.offsetHeight || 64;
    const nx = Math.max(4, Math.min(window.innerWidth - w - 4, drag.current.x + dx));
    const ny = Math.max(4, Math.min(window.innerHeight - h - 4, drag.current.y + dy));
    onMove({ x: nx, y: ny });
  }
  function onPointerUp() { drag.current = null; }

  const positioned = !!pos;

  return (
    <div
      ref={ref}
      className="floating-card"
      style={{
        position: positioned ? "absolute" : "relative",
        left: positioned ? pos!.x : undefined,
        top: positioned ? pos!.y : undefined,
        maxWidth: 280,
        minWidth: 200,
        padding: "8px 10px 10px",
        borderRadius: 10,
        border: `1px solid ${color}66`,
        background: CARD_BG,
        boxShadow: `0 0 20px ${color}33, 0 0 38px rgba(0,0,0,0.6)`,
        pointerEvents: "auto",
        userSelect: "none",
      }}
      onContextMenu={(e) => { e.preventDefault(); onClose(); }}
    >
      {/* Accent strip */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, borderRadius: "10px 0 0 10px", background: `linear-gradient(180deg, ${color}, ${color}33)`, boxShadow: `0 0 10px ${color}` }} />
      {/* Header: drag handle + close */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, cursor: "grab" }}
      >
        <span className="mono" style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color, textShadow: `0 0 8px ${color}99`, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {tag}
        </span>
        <span title="drag" style={{ color: `${color}88`, fontSize: 9, letterSpacing: 1 }}>⋮⋮</span>
        <span
          title="dismiss"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          onPointerDown={(e) => e.stopPropagation()}
          style={{ color: `${color}99`, fontSize: 11, cursor: "pointer", padding: "0 2px", lineHeight: 1 }}
        >
          ✕
        </span>
      </div>
      {children}
    </div>
  );
}

function Bar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
      <span className="mono" style={{ fontSize: 9, color: "#a3d7e5", width: 28 }}>{label}</span>
      <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, pct))}%`, background: `linear-gradient(90deg, ${color}, ${color}88)`, boxShadow: `0 0 6px ${color}88`, transition: "width .6s ease" }} />
      </div>
      <span className="mono" style={{ fontSize: 10, color: "#dbf6ff", width: 32, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

function Equalizer({ color }: { color: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "flex-end", gap: 2, height: 12 }}>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} style={{
          width: 2, background: color, borderRadius: 1,
          animation: `nch-eq 0.${5 + i}s ease-in-out ${i * 0.08}s infinite alternate`,
          height: 4 + i * 2,
        }} />
      ))}
    </span>
  );
}
