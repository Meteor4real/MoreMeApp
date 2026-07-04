// NT5 Topics — the user's news desk. Add/edit the topics NT5 tracks; each is
// a live query the wire pulls REAL current headlines for and re-voices in the
// assigned anchor. This is the control room for "real, realtime news on
// everything I set."

import { useEffect, useMemo, useState } from "react";
import {
  blankTopic, clearTopics, loadTopics, removeTopic, subscribeTopics,
  upsertTopic, RECENCIES, SOURCES, type Recency, type Topic, type TopicSource,
} from "../../services/nt5Topics";
import { runRealWorldOnce, runTopicOnce } from "../../services/nt5Wire";
import { ALL_ANCHORS, ANCHORS as ANCHOR_BIBLE, CATEGORIES, type AnchorId, type WireCategory } from "../../services/nt5Lore";
import {
  getDeskStatuses, kickAnchor, setAnchorCadence, subscribeDesk,
  type AnchorStatus,
} from "../../services/nt5Desk";

const C = {
  bg: "#05050d", panel: "#0a0820", line: "rgba(217,70,239,0.35)",
  magenta: "#d946ef", cyan: "#22d3ee", red: "#ef4444", ink: "#f3dcff", muted: "#9b8fb0",
};

const CAT_LABEL: Record<string, string> = {
  breaking: "Breaking", field: "Field", earth_trending: "Earth Trending", culture: "Culture",
  gaming: "Gaming", space: "Space", tech: "Tech", cc_lore: "Network",
};
const SOURCE_LABEL: Record<TopicSource, string> = {
  "google-news": "Google News", reddit: "Reddit", rss: "RSS URL",
};
const SOURCE_HINT: Record<TopicSource, string> = {
  "google-news": "any search terms — e.g. Taylor Swift, SpaceX launch",
  reddit: "a subreddit — e.g. Minecraft, news, gaming",
  rss: "a direct feed URL — https://…/rss.xml",
};

export function NT5TopicsManager() {
  const [topics, setTopics] = useState<Topic[]>(loadTopics);
  const [busyAll, setBusyAll] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string>("");
  useEffect(() => subscribeTopics(setTopics), []);

  async function pullAll() {
    setBusyAll(true); setFlash("");
    const r = await runRealWorldOnce(4).catch(() => ({ added: [] as unknown[] }));
    setBusyAll(false);
    setFlash(`Pulled ${r.added.length} fresh ${r.added.length === 1 ? "story" : "stories"} across your desk.`);
  }
  async function pullOne(t: Topic) {
    setBusyId(t.id); setFlash("");
    const r = await runTopicOnce(t).catch(() => ({ added: [] as unknown[] }));
    setBusyId(null);
    setFlash(`${t.label || t.query}: ${r.added.length} new.`);
  }

  return (
    <div style={{ flex: 1, overflow: "auto", background: C.bg, padding: 18, minHeight: 0 }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
          <div style={{ fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontWeight: 800, fontSize: 20, color: C.magenta, letterSpacing: 2, textShadow: `0 0 16px ${C.magenta}55` }}>
            YOUR NEWS DESK
          </div>
          <div style={{ flex: 1 }} />
          {topics.length > 0 && (
            <button className="btn" disabled={busyAll} onClick={() => void pullAll()} style={{ color: C.cyan, borderColor: `${C.cyan}66` }}>
              {busyAll ? "pulling…" : "↻ Force a full sweep"}
            </button>
          )}
          {topics.length > 0 && (
            <button className="btn" onClick={() => { if (confirm("Clear every topic on your desk? This can't be undone.")) clearTopics(); }} style={{ color: C.red, borderColor: `${C.red}55` }}>Clear all</button>
          )}
        </div>
        <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginTop: 0 }}>
          NT5 doesn't know what you're into — <b style={{ color: C.ink }}>you set the desk</b>. Add a topic below
          (any search terms, a subreddit, or a feed URL) and its anchor files real, current headlines for it on
          their own cadence, 24/7. Nothing is pre-loaded.
        </p>
        {topics.length === 0 && (
          <div style={{ padding: 16, background: C.panel, border: `1px dashed ${C.line}`, borderRadius: 8, marginBottom: 4, fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
            Your desk is empty. Add a topic below — anything: a team, a game, a hobby, world news, a specific
            subreddit. The anchor assigned to it starts pulling real headlines the moment you save it.
          </div>
        )}
        {flash && <div style={{ fontSize: 12, color: C.cyan, margin: "4px 0 10px" }}>{flash}</div>}

        <AnchorDeskPanel />
        <div style={{ height: 1, background: C.line, margin: "18px 0 14px" }} />
        <div style={{ fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontWeight: 800, fontSize: 12, color: C.cyan, letterSpacing: 3, textTransform: "uppercase", marginBottom: 10, textShadow: `0 0 10px ${C.cyan}` }}>
          Topic list
        </div>

        {/* header row */}
        <div style={{ display: "grid", gridTemplateColumns: "28px 1.4fr 1.6fr 1fr 1fr 0.9fr 0.7fr 64px", gap: 8, padding: "0 4px 6px", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: C.muted }}>
          <span title="Enabled">On</span><span>Label</span><span>Query / Source target</span><span>Source</span><span>Anchor</span><span>Desk</span><span>Fresh</span><span />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {topics.map((t) => (
            <TopicRow key={t.id} t={t} busy={busyId === t.id} onPull={() => void pullOne(t)} />
          ))}
        </div>

        <AddTopic />
      </div>
    </div>
  );
}

function TopicRow({ t, busy, onPull }: { t: Topic; busy: boolean; onPull: () => void }) {
  const set = <K extends keyof Topic>(k: K, v: Topic[K]) => upsertTopic({ ...t, [k]: v });
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "28px 1.4fr 1.6fr 1fr 1fr 0.9fr 0.7fr 64px", gap: 8, alignItems: "center",
      padding: "8px 6px", background: t.enabled ? C.panel : "rgba(10,8,32,0.4)", border: `1px solid ${C.line}`,
      borderRadius: 8, opacity: t.enabled ? 1 : 0.6,
    }}>
      <input type="checkbox" checked={t.enabled} onChange={(e) => set("enabled", e.target.checked)} style={{ accentColor: C.magenta }} />
      <input value={t.label} placeholder="Label" onChange={(e) => set("label", e.target.value)} style={inp} />
      <input value={t.query} placeholder={SOURCE_HINT[t.source]} onChange={(e) => set("query", e.target.value)} style={inp} />
      <select value={t.source} onChange={(e) => set("source", e.target.value as TopicSource)} style={inp}>
        {SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
      </select>
      <select value={t.anchor} onChange={(e) => set("anchor", e.target.value as AnchorId)} style={inp}>
        {ALL_ANCHORS.map((a) => <option key={a.id} value={a.id}>{a.name.split(" ")[0]}</option>)}
      </select>
      <select value={t.category} onChange={(e) => set("category", e.target.value as WireCategory)} style={inp}>
        {CATEGORIES.map((c) => <option key={c} value={c}>{CAT_LABEL[c] ?? c}</option>)}
      </select>
      <select value={t.recency} onChange={(e) => set("recency", e.target.value as Recency)} style={inp} disabled={t.source !== "google-news"} title={t.source === "google-news" ? "Freshness window" : "Recency applies to Google News"}>
        {RECENCIES.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
        <button className="btn" disabled={busy} onClick={onPull} title="Pull this topic now" style={{ padding: "4px 8px", fontSize: 11, color: C.cyan, borderColor: `${C.cyan}55` }}>{busy ? "…" : "↻"}</button>
        <button className="btn" onClick={() => removeTopic(t.id)} title="Remove" style={{ padding: "4px 8px", fontSize: 11, color: C.red, borderColor: `${C.red}55` }}>×</button>
      </div>
    </div>
  );
}

function AddTopic() {
  const [draft, setDraft] = useState<Topic>(blankTopic);
  const set = <K extends keyof Topic>(k: K, v: Topic[K]) => setDraft((d) => ({ ...d, [k]: v }));
  function add() {
    if (!draft.query.trim()) return;
    upsertTopic({ ...draft, label: draft.label.trim() || draft.query.trim() });
    setDraft(blankTopic());
  }
  return (
    <div style={{ marginTop: 14, padding: 12, background: "rgba(34,211,238,0.04)", border: `1px solid ${C.cyan}33`, borderRadius: 8 }}>
      <div style={{ fontSize: 10, color: C.cyan, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Add a topic</div>
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr 1fr 1fr 1fr auto", gap: 8, alignItems: "center" }}>
        <input value={draft.label} placeholder="Label (optional)" onChange={(e) => set("label", e.target.value)} style={inp} />
        <input value={draft.query} placeholder={SOURCE_HINT[draft.source]} onChange={(e) => set("query", e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} style={inp} />
        <select value={draft.source} onChange={(e) => set("source", e.target.value as TopicSource)} style={inp}>
          {SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
        </select>
        <select value={draft.anchor} onChange={(e) => set("anchor", e.target.value as AnchorId)} style={inp}>
          {ALL_ANCHORS.map((a) => <option key={a.id} value={a.id}>{a.name.split(" ")[0]}</option>)}
        </select>
        <select value={draft.category} onChange={(e) => set("category", e.target.value as WireCategory)} style={inp}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{CAT_LABEL[c] ?? c}</option>)}
        </select>
        <button className="btn" onClick={add} style={{ color: C.cyan, borderColor: `${C.cyan}66` }}>+ Add</button>
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(217,70,239,0.3)",
  borderRadius: 6, color: "#f3dcff", padding: "6px 8px", fontSize: 12, outline: "none",
  fontFamily: "ui-monospace, monospace",
};

// ── The Desk: live per-anchor activity ─────────────────────────────────────
// One row per anchor. Live countdown to the next shift, a pip when they're
// mid-shift, last-shift summary, editable cadence, "↻ Now" kick.

function AnchorDeskPanel() {
  const [, force] = useState(0);
  // Two render triggers: 1s tick for the countdowns + desk subscription for
  // state changes (mid-shift toggles, fresh "last filed" summaries).
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => subscribeDesk(() => force((n) => n + 1)), []);
  const statuses = getDeskStatuses();
  const allTopics = loadTopics();
  return (
    <div style={{ background: "rgba(217,70,239,0.06)", border: `1px solid ${C.magenta}33`, borderRadius: 10, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
        <div style={{ fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontWeight: 800, fontSize: 12, color: C.magenta, letterSpacing: 3, textTransform: "uppercase", textShadow: `0 0 10px ${C.magenta}` }}>
          THE DESK · live
        </div>
        <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase" }}>
          autonomous · 24/7
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {statuses.map((s) => <AnchorRow key={s.id} st={s} topicCount={allTopics.filter((t) => t.anchor === s.id && t.enabled && t.query.trim()).length} />)}
      </div>
    </div>
  );
}

function AnchorRow({ st, topicCount }: { st: AnchorStatus; topicCount: number }) {
  const a = ANCHOR_BIBLE[st.id];
  const [kicking, setKicking] = useState(false);
  const [draftCadence, setDraftCadence] = useState(String(st.cadenceMinutes));
  // Keep the local cadence editor in sync if state changes externally.
  useEffect(() => { setDraftCadence(String(st.cadenceMinutes)); }, [st.cadenceMinutes]);

  const countdown = useMemo(() => {
    if (st.filing) return "ON AIR";
    if (topicCount === 0) return "no topics";
    const ms = st.nextFileAt - Date.now();
    if (ms <= 0) return "now";
    const s = Math.round(ms / 1000);
    const m = Math.floor(s / 60), sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  }, [st.filing, st.nextFileAt, topicCount]);

  const lastSummary = useMemo(() => {
    if (!st.lastFiled) return st.filing ? "filing now…" : "standby";
    const mins = Math.max(0, Math.round((Date.now() - st.lastFiled.at) / 60_000));
    const ago = mins === 0 ? "just now" : `${mins}m ago`;
    if (st.lastFiled.count === 0) return `${ago} · no new headlines`;
    const topics = st.lastFiled.topicLabels.slice(0, 3).join(", ") + (st.lastFiled.topicLabels.length > 3 ? `, +${st.lastFiled.topicLabels.length - 3}` : "");
    return `${ago} · ${st.lastFiled.count} from ${topics}`;
  }, [st.lastFiled, st.filing]);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "180px 1fr 110px 96px 110px 70px",
      gap: 8, alignItems: "center",
      padding: "8px 10px",
      background: st.filing ? `${a.color}14` : "rgba(0,0,0,0.25)",
      border: `1px solid ${st.filing ? a.color : C.line}`,
      borderLeft: `4px solid ${a.color}`,
      borderRadius: 8,
      transition: "background .2s, border-color .2s",
    }}>
      <div>
        <div style={{ fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontWeight: 800, fontSize: 13, color: a.color, letterSpacing: 0.5, textShadow: `0 0 8px ${a.color}66` }}>
          {a.name}
        </div>
        <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginTop: 1 }}>
          {a.role}
        </div>
      </div>
      <div style={{ minWidth: 0, fontSize: 11, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={lastSummary}>
        {lastSummary}
      </div>
      <div style={{ fontSize: 11, color: topicCount === 0 ? C.red : C.muted }}>
        {topicCount === 0 ? "none assigned" : `${topicCount} topic${topicCount === 1 ? "" : "s"}`}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 9, color: C.muted, letterSpacing: 1, textTransform: "uppercase" }}>every</span>
        <input
          type="number" min={1} max={180} value={draftCadence}
          onChange={(e) => setDraftCadence(e.target.value)}
          onBlur={() => {
            const n = parseInt(draftCadence, 10);
            if (Number.isFinite(n) && n > 0) setAnchorCadence(st.id, n);
            else setDraftCadence(String(st.cadenceMinutes));
          }}
          style={{ ...inp, width: 44, padding: "4px 6px", fontSize: 11, textAlign: "right" }}
        />
        <span style={{ fontSize: 9, color: C.muted, letterSpacing: 1, textTransform: "uppercase" }}>min</span>
      </div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontFamily: "ui-monospace,monospace", color: st.filing ? a.color : C.ink }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: st.filing ? a.color : (topicCount === 0 ? C.muted : `${a.color}88`),
          boxShadow: st.filing ? `0 0 10px ${a.color}` : "none",
          animation: st.filing ? "nt5pulse 1.4s ease-in-out infinite" : "none",
        }} />
        {countdown}
      </div>
      <button
        className="btn"
        disabled={kicking || st.filing || topicCount === 0}
        onClick={async () => { setKicking(true); try { await kickAnchor(st.id); } finally { setKicking(false); } }}
        title="File this anchor's shift now"
        style={{ padding: "4px 8px", fontSize: 11, color: a.color, borderColor: `${a.color}55` }}
      >
        {st.filing || kicking ? "…" : "↻ Now"}
      </button>
    </div>
  );
}
