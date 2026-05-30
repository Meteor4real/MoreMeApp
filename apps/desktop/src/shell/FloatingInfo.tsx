import { useEffect, useState } from "react";
import { loadPrefs, subscribePrefs } from "../uiPrefs";
import { subscribeWire, type WireArticle } from "../services/nt5Wire";
import { subscribeOriginPulse, type OriginPulse } from "../services/originRealms";

// Floating, toggleable info pieces. They sit on top of the canvas, rotate
// gently, and can be turned off per-type in Settings. Drives from the in-app
// NT5 wire (breaking + filed-now) and the live Origin Realms pulse.

const CARD_BG = "linear-gradient(140deg, rgba(20,8,12,0.96), rgba(8,8,14,0.96))";

export function FloatingInfo() {
  const [prefs, setPrefs] = useState(loadPrefs);
  const [arts, setArts] = useState<WireArticle[]>([]);
  const [origin, setOrigin] = useState<OriginPulse | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [tick, setTick] = useState(0);
  const [sys, setSys] = useState<{ cpuPct: number; memPct: number; memFreeGb: number; diskFreeGb: number; diskTotalGb: number } | null>(null);
  const [crew, setCrew] = useState<{ name: string; content: string } | null>(null);
  const [clock, setClock] = useState<{ time: string; date: string }>({ time: "", date: "" });
  const [moreme, setMoreme] = useState<{ streak: number; doneToday: number; totalToday: number } | null>(null);
  const [brobot, setBrobot] = useState<{ total: number; recent?: string } | null>(null);
  const [github, setGithub] = useState<{ prs: number; recent: string } | null>(null);
  const [vercel, setVercel] = useState<{ name: string; state: string } | null>(null);

  useEffect(() => subscribePrefs(setPrefs), []);
  useEffect(() => subscribeWire(setArts), []);
  useEffect(() => subscribeOriginPulse(setOrigin), []);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 11000);
    return () => clearInterval(t);
  }, []);

  // Poll the system pulse every 6 s.
  useEffect(() => {
    let cancelled = false;
    async function tickSys() {
      try { const s = await window.hub.sys.pulse(); if (!cancelled) setSys(s); } catch { /* ignore */ }
    }
    void tickSys();
    const t = setInterval(tickSys, 6000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Sample the last group-chat message every 8 s — drives the Crew widget.
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

  // Clock — updates every second so the widget reads like a live HUD.
  useEffect(() => {
    function tickClock() {
      const d = new Date();
      const hh = d.getHours().toString().padStart(2, "0");
      const mm = d.getMinutes().toString().padStart(2, "0");
      const ss = d.getSeconds().toString().padStart(2, "0");
      const dateStr = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
      setClock({ time: `${hh}:${mm}:${ss}`, date: dateStr.toUpperCase() });
    }
    tickClock();
    const t = setInterval(tickClock, 1000);
    return () => clearInterval(t);
  }, []);

  // MoreMe streak + today's progress, polled from its localStorage every 30 s.
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

  // GitHub PR pulse — polled every 5 minutes (rate-friendly). Skips silently
  // if the user hasn't connected GitHub.
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

  // Vercel latest deploy pulse — polled every 2 minutes.
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

  const breaking = arts.filter((a) => a.category === "breaking").slice(0, 4);
  const latest = arts.slice(0, 6);

  const cards: { id: string; show: boolean; node: React.ReactNode }[] = [];

  if (prefs.infoBreaking && breaking.length) {
    const a = breaking[tick % breaking.length];
    cards.push({
      id: "breaking-" + a.id, show: true,
      node: (
        <InfoCard key={a.id} tag="Breaking · NT5" color="#ff2d4a">
          <div className="mono" style={{ fontSize: 13, color: "#ffe5ec", lineHeight: 1.35 }}>{a.title}</div>
          <div style={{ fontSize: 11, color: "#c79da7", marginTop: 4 }}>Tune in for {a.author_display}'s special report.</div>
        </InfoCard>
      ),
    });
  }
  if (prefs.infoNextUp && latest.length) {
    const a = latest[(tick + 1) % latest.length];
    cards.push({
      id: "filed-" + a.id, show: true,
      node: (
        <InfoCard key={a.id} tag={`Filed · ${a.author_display}`} color="#d946ef">
          <div className="mono" style={{ fontSize: 13, color: "#f3dcff", lineHeight: 1.35 }}>{a.title}</div>
          <div style={{ fontSize: 11, color: "#b896c4", marginTop: 4 }}>{a.body.slice(0, 96)}{a.body.length > 96 ? "…" : ""}</div>
        </InfoCard>
      ),
    });
  }
  if (prefs.infoOrigin && origin) {
    cards.push({
      id: "origin", show: true,
      node: (
        <InfoCard key="origin" tag="Origin Realms · live" color="#22c55e">
          <div className="mono" style={{ fontSize: 13, color: "#dbffe7", lineHeight: 1.35 }}>{origin.online ? `${origin.players} / ${origin.max} online` : "server offline"}</div>
          <div style={{ fontSize: 11, color: "#9bd4ad", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{origin.motd}</div>
        </InfoCard>
      ),
    });
  }
  if (prefs.infoSystem && sys) {
    cards.push({
      id: "system", show: true,
      node: (
        <InfoCard key="system" tag="System pulse" color="#22d3ee">
          <div className="mono" style={{ fontSize: 12, color: "#dbf6ff", lineHeight: 1.4 }}>
            CPU {sys.cpuPct}%  ·  MEM {sys.memPct}%
          </div>
          <div style={{ fontSize: 11, color: "#a3d7e5", marginTop: 3 }}>
            {sys.memFreeGb.toFixed(1)} GB free RAM  ·  {sys.diskFreeGb.toFixed(1)} GB free disk
          </div>
        </InfoCard>
      ),
    });
  }
  if (prefs.infoCrew && crew) {
    cards.push({
      id: "crew", show: true,
      node: (
        <InfoCard key="crew" tag={`Crew · ${crew.name}`} color="#ff7a2d">
          <div style={{ fontSize: 12, color: "#ffe5d4", lineHeight: 1.4, maxHeight: 64, overflow: "hidden" }}>
            {crew.content.slice(0, 180)}{crew.content.length > 180 ? "…" : ""}
          </div>
        </InfoCard>
      ),
    });
  }
  if (prefs.infoClock && clock.time) {
    cards.push({
      id: "clock", show: true,
      node: (
        <InfoCard key="clock" tag={clock.date} color="#a78bfa">
          <div className="mono glow-text" style={{ fontSize: 22, letterSpacing: 3, lineHeight: 1 }}>{clock.time}</div>
        </InfoCard>
      ),
    });
  }
  if (prefs.infoMoreMe && moreme && moreme.totalToday > 0) {
    cards.push({
      id: "moreme", show: true,
      node: (
        <InfoCard key="moreme" tag={`More Me · ${moreme.streak}-day streak`} color="#00C896">
          <div className="mono" style={{ fontSize: 12, color: "#d3fff0", lineHeight: 1.4 }}>
            Today {moreme.doneToday}/{moreme.totalToday}
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden", marginTop: 4 }}>
            <div style={{ height: "100%", width: `${moreme.totalToday ? Math.round((moreme.doneToday / moreme.totalToday) * 100) : 0}%`, background: "linear-gradient(90deg, #00C896, #34d399)" }} />
          </div>
        </InfoCard>
      ),
    });
  }
  if (prefs.infoBroBot && brobot && brobot.total > 0) {
    cards.push({
      id: "brobot", show: true,
      node: (
        <InfoCard key="brobot" tag={`BroBot · ${brobot.total} in gallery`} color="#c9a961">
          <div style={{ fontSize: 12, color: "#f3dca0", lineHeight: 1.4, maxHeight: 40, overflow: "hidden" }}>
            {brobot.recent ? `recent: ${brobot.recent}` : "—"}
          </div>
        </InfoCard>
      ),
    });
  }
  if (prefs.infoGithub && github) {
    cards.push({
      id: "github", show: true,
      node: (
        <InfoCard key="github" tag={`GitHub · ${github.prs} open PR${github.prs === 1 ? "" : "s"}`} color="#a5d6ff">
          <div className="mono" style={{ fontSize: 11, color: "#c9e0ff", lineHeight: 1.35, maxHeight: 40, overflow: "hidden", textOverflow: "ellipsis" }}>
            {github.recent}
          </div>
        </InfoCard>
      ),
    });
  }
  if (prefs.infoVercel && vercel) {
    const stateColor = vercel.state === "ready" ? "#22c55e" : vercel.state === "building" || vercel.state === "queued" ? "#f59e0b" : vercel.state === "error" ? "#ef4444" : "#888";
    cards.push({
      id: "vercel", show: true,
      node: (
        <InfoCard key="vercel" tag={`Vercel · latest deploy`} color="#ffffff">
          <div className="mono" style={{ fontSize: 12, color: "#e9e9e9", lineHeight: 1.35 }}>
            <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: stateColor, marginRight: 6 }} />
            {vercel.state} · <span style={{ color: "#bbb" }}>{vercel.name}</span>
          </div>
        </InfoCard>
      ),
    });
  }

  const visible = cards.filter((c) => !dismissed.has(c.id));
  if (!visible.length) return null;

  return (
    <div
      data-tour="floating-info"
      style={{
        position: "fixed",
        right: 14,
        bottom: 70,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      {visible.map((c) => (
        <div key={c.id} style={{ pointerEvents: "auto" }} onContextMenu={(e) => { e.preventDefault(); setDismissed((d) => new Set([...d, c.id])); }}>
          {c.node}
        </div>
      ))}
    </div>
  );

  function InfoCard({ tag, color, children }: { tag: string; color: string; children: React.ReactNode }) {
    return (
      <div
        style={{
          maxWidth: 260,
          padding: "10px 12px",
          borderRadius: 10,
          border: `1px solid ${color}66`,
          background: CARD_BG,
          boxShadow: `0 0 18px ${color}22, 0 0 32px rgba(0,0,0,0.55)`,
        }}
      >
        <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color, marginBottom: 4 }}>{tag}</div>
        {children}
      </div>
    );
  }
}
