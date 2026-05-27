import { useMemo, useState } from "react";
import { houseChat } from "../houseLLM";

// SignalFinder (built from scratch) — a strategic opportunity-scoring CRM.
// You enter real targets (creators, communities, collaborators, mentors…);
// the engine scores them across response-likelihood, collab-compatibility,
// momentum, timing, and relevance, ranks them, and tracks outreach + warmth +
// follow-up. Personalization learns which outreach style lands responses.
// No fabricated data — everything here is the user's own entries.

type Style = "concise" | "detailed";
type Outreach = { date: string; style: Style; responded: boolean };
type Target = {
  id: string;
  name: string;
  type: string;
  niche: string;
  platform: string;
  audience: number;
  growth: number; // 1-5
  activity: number; // 1-5
  accessibility: number; // 1-5
  relevance: number; // 1-5
  goal: string;
  outreach: Outreach[];
};

const KEY = "nchub.signalfinder.v1";
const TYPES = ["creator", "developer", "artist", "business", "mentor", "community", "collaborator"];
const today = () => new Date().toISOString().slice(0, 10);

function load(): Target[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
function persist(t: Target[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(t));
  } catch {
    /* ignore */
  }
}

type Scores = {
  response: number;
  collab: number;
  momentum: number;
  timing: number;
  relevance: number;
  overall: number;
};

function score(t: Target): Scores {
  const acc = t.accessibility / 5;
  const act = t.activity / 5;
  const grw = t.growth / 5;
  const rel = t.relevance / 5;
  const sizeFactor = 1 / (1 + Math.log10(Math.max(t.audience, 1)) / 6); // smaller = easier
  const recentResponded = t.outreach.some((o) => o.responded);
  const attempted = t.outreach.length > 0;
  const warmthBoost = recentResponded ? 0.15 : attempted ? 0.05 : 0;

  const response = Math.round(Math.min(1, 0.6 * acc + 0.25 * act + 0.15 * sizeFactor + warmthBoost) * 100);
  const collab = Math.round((0.7 * rel + 0.3 * act) * 100);
  const momentum = Math.round((0.6 * grw + 0.4 * act) * 100);
  const timing = Math.round((0.6 * act + 0.4 * grw) * 100);
  const relevance = Math.round(rel * 100);
  const overall = Math.round(
    0.3 * response + 0.2 * collab + 0.2 * momentum + 0.15 * timing + 0.15 * relevance
  );
  return { response, collab, momentum, timing, relevance, overall };
}

function warmth(t: Target): "cold" | "warm" | "hot" {
  if (t.outreach.some((o) => o.responded)) return "hot";
  if (t.outreach.length > 0) return "warm";
  return "cold";
}
function nextFollowup(t: Target): string | null {
  if (t.outreach.some((o) => o.responded) || t.outreach.length === 0) return null;
  const last = t.outreach[t.outreach.length - 1];
  const d = new Date(last.date);
  d.setDate(d.getDate() + 5);
  return d.toISOString().slice(0, 10);
}

const empty = (): Omit<Target, "id" | "outreach"> => ({
  name: "", type: "creator", niche: "", platform: "", audience: 1000,
  growth: 3, activity: 3, accessibility: 3, relevance: 3, goal: "",
});

export function SignalFinder() {
  const [targets, setTargets] = useState<Target[]>(load);
  const [sel, setSel] = useState<string | null>(null);
  const [form, setForm] = useState(empty());
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState("all");

  function update(next: Target[]) {
    setTargets(next);
    persist(next);
  }

  const ranked = useMemo(
    () =>
      [...targets]
        .filter((t) => filter === "all" || t.type === filter)
        .sort((a, b) => score(b).overall - score(a).overall),
    [targets, filter]
  );

  // personalization: which outreach style lands responses?
  const styleReco = useMemo(() => {
    const stat = { concise: { n: 0, r: 0 }, detailed: { n: 0, r: 0 } };
    targets.forEach((t) =>
      t.outreach.forEach((o) => {
        stat[o.style].n++;
        if (o.responded) stat[o.style].r++;
      })
    );
    const rate = (s: { n: number; r: number }) => (s.n ? Math.round((s.r / s.n) * 100) : null);
    return { concise: rate(stat.concise), detailed: rate(stat.detailed), stat };
  }, [targets]);

  function addTarget() {
    if (!form.name.trim()) return;
    const t: Target = { ...form, id: String(Date.now()), outreach: [] };
    update([...targets, t]);
    setForm(empty());
    setAdding(false);
    setSel(t.id);
  }

  function logOutreach(id: string, style: Style, responded: boolean) {
    update(
      targets.map((t) =>
        t.id === id ? { ...t, outreach: [...t.outreach, { date: today(), style, responded }] } : t
      )
    );
  }
  function removeTarget(id: string) {
    update(targets.filter((t) => t.id !== id));
    if (sel === id) setSel(null);
  }

  const current = targets.find((t) => t.id === sel) || null;

  return (
    <div className="stage">
      <div
        className="mono"
        style={{
          padding: "10px 14px", borderBottom: "1px solid var(--line)", fontSize: 12,
          letterSpacing: 2, textTransform: "uppercase", color: "var(--mute)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}
      >
        <span>SignalFinder <span className="glow-text">· opportunity radar</span></span>
        <button className="btn" onClick={() => setAdding((a) => !a)}>{adding ? "Close" : "+ Target"}</button>
      </div>

      {(styleReco.concise !== null || styleReco.detailed !== null) && (
        <div className="mono" style={{ padding: "8px 14px", fontSize: 12, color: "var(--mute)", borderBottom: "1px solid var(--line)" }}>
          Outreach landing rate — concise {styleReco.concise ?? "–"}% · detailed {styleReco.detailed ?? "–"}%
          {styleReco.concise !== null && styleReco.detailed !== null && (
            <span className="glow-text">
              {"  → lead with "}
              {(styleReco.concise ?? 0) >= (styleReco.detailed ?? 0) ? "concise" : "detailed"}
            </span>
          )}
        </div>
      )}

      {adding && (
        <div style={{ padding: 14, borderBottom: "1px solid var(--line)", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
          <Field l="name"><input style={inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field l="type">
            <select style={inp} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((x) => <option key={x}>{x}</option>)}
            </select>
          </Field>
          <Field l="niche"><input style={inp} value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })} /></Field>
          <Field l="platform"><input style={inp} value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} /></Field>
          <Field l="audience size"><input type="number" style={inp} value={form.audience} onChange={(e) => setForm({ ...form, audience: Number(e.target.value) })} /></Field>
          <Slider l="growth" v={form.growth} on={(v) => setForm({ ...form, growth: v })} />
          <Slider l="activity" v={form.activity} on={(v) => setForm({ ...form, activity: v })} />
          <Slider l="accessibility" v={form.accessibility} on={(v) => setForm({ ...form, accessibility: v })} />
          <Slider l="relevance to goal" v={form.relevance} on={(v) => setForm({ ...form, relevance: v })} />
          <Field l="your goal"><input style={inp} value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} /></Field>
          <div style={{ alignSelf: "end" }}><button className="btn" onClick={addTarget}>Add</button></div>
        </div>
      )}

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* ranked list */}
        <div style={{ width: 320, borderRight: "1px solid var(--line)", overflow: "auto" }}>
          <div style={{ padding: "8px 10px", display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["all", ...TYPES].map((f) => (
              <button key={f} className="btn" style={{ padding: "2px 8px", fontSize: 10, color: filter === f ? "var(--pink)" : undefined }} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
          {ranked.length === 0 && <div className="placeholder"><div style={{ fontSize: 13 }}>No targets yet. Add one to start scoring.</div></div>}
          {ranked.map((t) => {
            const s = score(t);
            return (
              <button key={t.id} onClick={() => setSel(t.id)} className="panel" style={{ display: "block", width: "calc(100% - 16px)", margin: "0 8px 8px", textAlign: "left", padding: 10, cursor: "pointer", borderColor: sel === t.id ? "rgba(255,87,119,0.6)" : undefined, color: "var(--ink)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="mono" style={{ fontSize: 13 }}>{t.name}</span>
                  <span className="mono glow-text" style={{ fontSize: 16 }}>{s.overall}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--mute)" }}>{t.type} · {t.platform || "—"} · {warmth(t)}</div>
              </button>
            );
          })}
        </div>

        {/* detail */}
        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          {!current && <div className="placeholder"><div style={{ fontSize: 13 }}>Select a target to see its scoring breakdown + outreach.</div></div>}
          {current && <Detail t={current} onLog={logOutreach} onRemove={removeTarget} />}
        </div>
      </div>
    </div>
  );
}

function Detail({ t, onLog, onRemove }: { t: Target; onLog: (id: string, s: Style, r: boolean) => void; onRemove: (id: string) => void }) {
  const s = score(t);
  const fu = nextFollowup(t);
  const [draft, setDraft] = useState("");
  const [drafting, setDrafting] = useState(false);

  async function draftOutreach() {
    setDrafting(true);
    const styleHint = t.outreach.some((o) => o.responded && o.style === "detailed") ? "detailed and warm" : "concise and genuine";
    const res = await houseChat(
      "You are SignalFinder's outreach assistant. Write one short, high-response-likelihood opening message to reach a target. Match the requested style. Reply with ONLY the message — no preamble, no quotes.",
      `Target: ${t.name} (${t.type})${t.niche ? ", niche: " + t.niche : ""}${t.platform ? ", on " + t.platform : ""}. My goal: ${t.goal || "connect / collaborate"}. Style: ${styleHint}.`
    );
    setDrafting(false);
    setDraft(res.ok ? res.text || "" : `[model error] ${res.error}`);
  }

  const bars: [string, number][] = [
    ["Response likelihood", s.response], ["Collab compatibility", s.collab],
    ["Momentum", s.momentum], ["Timing quality", s.timing], ["Relevance", s.relevance],
  ];
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div className="mono" style={{ fontSize: 18 }}>{t.name}</div>
          <div style={{ fontSize: 12, color: "var(--mute)" }}>{t.type} · {t.niche || "—"} · {t.platform || "—"} · {t.audience.toLocaleString()} audience</div>
          {t.goal && <div style={{ fontSize: 12, color: "var(--mute)" }}>goal: {t.goal}</div>}
        </div>
        <div className="mono glow-text" style={{ fontSize: 32 }}>{s.overall}</div>
      </div>

      <div style={{ margin: "16px 0" }}>
        {bars.map(([label, v]) => (
          <div key={label} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--mute)" }}>
              <span>{label}</span><span>{v}</span>
            </div>
            <div style={{ height: 5, background: "#15151a", borderRadius: 3, overflow: "hidden", marginTop: 3 }}>
              <div className="strip" style={{ height: "100%", width: `${v}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="panel" style={{ padding: 12 }}>
        <div className="mono" style={{ fontSize: 12, letterSpacing: 1, color: "var(--mute)" }}>OUTREACH · {warmth(t)}{fu ? ` · follow up by ${fu}` : ""}</div>
        <div style={{ display: "flex", gap: 6, margin: "10px 0", flexWrap: "wrap" }}>
          <button className="btn" onClick={() => onLog(t.id, "concise", false)}>Log concise</button>
          <button className="btn" onClick={() => onLog(t.id, "detailed", false)}>Log detailed</button>
          <button className="btn" onClick={() => onLog(t.id, "concise", true)}>+ concise reply</button>
          <button className="btn" onClick={() => onLog(t.id, "detailed", true)}>+ detailed reply</button>
        </div>
        {t.outreach.length === 0 && <div style={{ fontSize: 12, color: "var(--mute)" }}>No outreach logged yet.</div>}
        {t.outreach.slice().reverse().map((o, i) => (
          <div key={i} className="mono" style={{ fontSize: 12, color: "var(--mute)" }}>
            {o.date} · {o.style} · {o.responded ? <span className="glow-text">responded</span> : "sent"}
          </div>
        ))}
      </div>

      <div className="panel" style={{ padding: 12, marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="mono" style={{ fontSize: 12, letterSpacing: 1, color: "var(--mute)" }}>AI ASSISTANT</div>
          <button className="btn" disabled={drafting} onClick={() => void draftOutreach()}>{drafting ? "…" : "Draft outreach"}</button>
        </div>
        {draft && (
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={5}
            style={{ width: "100%", marginTop: 10, background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink)", padding: 10, fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none" }} />
        )}
      </div>

      <button className="btn" style={{ marginTop: 14 }} onClick={() => onRemove(t.id)}>Remove target</button>
    </div>
  );
}

const inp: React.CSSProperties = {
  background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 6,
  color: "var(--ink)", padding: "6px 8px", fontSize: 12, width: "100%", fontFamily: "ui-monospace, monospace",
};
function Field({ l, children }: { l: string; children: React.ReactNode }) {
  return <label style={{ fontSize: 10, color: "var(--mute)", textTransform: "uppercase", letterSpacing: 1 }}>{l}<div style={{ marginTop: 4 }}>{children}</div></label>;
}
function Slider({ l, v, on }: { l: string; v: number; on: (v: number) => void }) {
  return (
    <label style={{ fontSize: 10, color: "var(--mute)", textTransform: "uppercase", letterSpacing: 1 }}>
      {l}: <span className="glow-text">{v}</span>
      <input type="range" min={1} max={5} value={v} onChange={(e) => on(Number(e.target.value))} style={{ width: "100%", marginTop: 4 }} />
    </label>
  );
}
