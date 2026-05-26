import { useEffect, useRef, useState } from "react";
import { loadNT5, saveNT5, runWire, nt5Wired, type Article } from "./nt5store";

const CAT_COLOR: Record<string, string> = {
  breaking: "#ff2d4a", latest: "#d946ef", earth_trending: "#3b82f6",
  gaming: "#1d4ed8", space: "#a855f7", tech: "#22d3ee", culture: "#22d3ee", cc_lore: "#e8e8ee",
};

export function NT5() {
  const [state, setState] = useState(loadNT5);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [topicInput, setTopicInput] = useState("");
  const wired = nt5Wired();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function scan() {
    if (busy || !wired) return;
    setBusy(true);
    setStatus("Scanning the wire…");
    const r = await runWire(3);
    if (r.ok) {
      setState(loadNT5());
      setStatus(r.added.length ? `Filed ${r.added.length} new item(s).` : "Nothing new on the wire.");
    } else {
      setStatus(r.error || "Wire error.");
    }
    setBusy(false);
  }

  // auto wire scan every 20 min while open and Claude is wired
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

  return (
    <div className="stage">
      <div className="mono" style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "var(--mute)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>NT5 · S.P.A.C.E. News <span className="glow-text">· the wire</span></span>
        <button className="btn" onClick={() => void scan()} disabled={busy || !wired}>
          {busy ? "Scanning…" : "Run wire scan"}
        </button>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {!wired && (
          <div className="panel" style={{ padding: 12, marginBottom: 14, color: "var(--mute)", fontSize: 13 }}>
            Wire offline. The anchor desk writes live items via Claude — wire it up in
            <span className="glow-text"> AI Group Chat → Configure → Claude</span> (Anthropic key), then run a scan.
          </div>
        )}

        {/* topics */}
        <div className="panel" style={{ padding: 12, marginBottom: 14 }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: 1, color: "var(--mute)" }}>HOT TOPICS (drive the wire)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {state.topics.map((t) => (
              <button key={t} className="chuck-chip-live" onClick={() => removeTopic(t)} title="remove"
                style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,87,119,0.4)", color: "var(--pink)", borderRadius: 4, padding: "2px 8px", fontSize: 11, cursor: "pointer" }}>
                {t} ✕
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <input value={topicInput} onChange={(e) => setTopicInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTopic()}
              placeholder="Add a topic (e.g. Origin Realms)"
              style={{ flex: 1, background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink)", padding: "7px 12px", fontSize: 12, fontFamily: "ui-monospace, monospace", outline: "none" }} />
            <button className="btn" onClick={addTopic}>Add</button>
          </div>
        </div>

        {status && <div className="mono" style={{ fontSize: 12, color: "var(--mute)", marginBottom: 12 }}>{status}</div>}

        {lead && (
          <div className="panel-hot panel" style={{ padding: 16, marginBottom: 14, borderColor: "rgba(255,45,74,0.3)" }}>
            <Badge cat={lead.category} />
            <h2 className="mono" style={{ margin: "8px 0 6px", fontSize: 22 }}>{lead.title}</h2>
            <div style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.5 }}>{lead.body}</div>
            <div style={{ fontSize: 11, color: "var(--mute)", marginTop: 8 }}>{lead.anchor}</div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
          {state.articles.slice(1).map((a) => (
            <div key={a.id} className="panel" style={{ padding: 12 }}>
              <Badge cat={a.category} />
              <div className="mono" style={{ fontSize: 15, margin: "6px 0 4px" }}>{a.title}</div>
              <div style={{ fontSize: 13, color: "var(--mute)", lineHeight: 1.45 }}>{a.body}</div>
              <div style={{ fontSize: 11, color: "var(--mute)", marginTop: 8 }}>{a.anchor}</div>
            </div>
          ))}
        </div>

        {state.articles.length === 0 && wired && (
          <div className="placeholder"><div style={{ fontSize: 13 }}>No stories filed yet. Run a wire scan.</div></div>
        )}
      </div>
    </div>
  );
}

function Badge({ cat }: { cat: string }) {
  const c = CAT_COLOR[cat] || "#ff5577";
  return (
    <span className="mono" style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: c, border: `1px solid ${c}`, borderRadius: 4, padding: "1px 7px", textShadow: `0 0 8px ${c}88` }}>
      {cat}
    </span>
  );
}
