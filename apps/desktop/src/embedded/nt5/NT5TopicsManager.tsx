// NT5 Topics — the user's news desk. Add/edit the topics NT5 tracks; each is
// a live query the wire pulls REAL current headlines for and re-voices in the
// assigned anchor. This is the control room for "real, realtime news on
// everything I set."

import { useEffect, useState } from "react";
import {
  blankTopic, loadTopics, removeTopic, resetTopics, subscribeTopics,
  upsertTopic, RECENCIES, SOURCES, type Recency, type Topic, type TopicSource,
} from "../../services/nt5Topics";
import { runRealWorldOnce, runTopicOnce } from "../../services/nt5Wire";
import { ALL_ANCHORS, CATEGORIES, type AnchorId, type WireCategory } from "../../services/nt5Lore";

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
          <button className="btn" disabled={busyAll} onClick={() => void pullAll()} style={{ color: C.cyan, borderColor: `${C.cyan}66` }}>
            {busyAll ? "pulling…" : "↻ Pull all topics now"}
          </button>
          <button className="btn" onClick={() => { if (confirm("Reset to the default topic set? Your edits will be lost.")) resetTopics(); }}>Reset to defaults</button>
        </div>
        <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginTop: 0 }}>
          Every topic is a live query NT5 pulls <b style={{ color: C.ink }}>real, current headlines</b> for, then re-voices in the assigned anchor.
          Set anything — celebs, Minecraft, a specific subreddit, a niche RSS feed. The wire refreshes these automatically; hit “Pull now” to fetch on demand.
        </p>
        {flash && <div style={{ fontSize: 12, color: C.cyan, margin: "4px 0 10px" }}>{flash}</div>}

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
