import { useEffect, useMemo, useState } from "react";
import { houseChat } from "../houseLLM";

// SignalFinder — strategic-opportunity / relationship-intelligence CRM.
// You enter real targets (creators, communities, collaborators, mentors…);
// the engine scores them across response-likelihood, collab-compatibility,
// momentum, timing, and relevance, ranks them, and tracks outreach + warmth
// + follow-up. A top-level networking-goals filter biases scoring + LLM
// drafts toward the goals you're actively pursuing, and the personalization
// engine adapts the suggested outreach style based on what's landed.
// No fabricated data — everything here is the user's own entries.

type Style = "concise" | "detailed";
type Outreach = { date: string; style: Style; responded: boolean };

const NETWORK_GOALS = [
  { id: "collab",     label: "Creator collaborations",      hint: "co-projects, splits, features" },
  { id: "career",     label: "Career advancement",          hint: "roles, intros, references" },
  { id: "startup",    label: "Startup development",         hint: "co-founders, hires, advisors" },
  { id: "community",  label: "Community building",          hint: "members, partners, sponsors" },
  { id: "mentor",     label: "Mentorship acquisition",      hint: "guidance, feedback, sponsorship" },
  { id: "recruit",    label: "Project recruitment",         hint: "contributors, talent, collaborators" },
] as const;
type NetworkGoalId = typeof NETWORK_GOALS[number]["id"];

type Target = {
  id: string;
  name: string;
  type: string;
  niche: string;
  platform: string;
  audience: number;
  growth: number;        // 1-5
  activity: number;      // 1-5
  accessibility: number; // 1-5
  relevance: number;     // 1-5
  goal: string;          // per-target free-text context
  goalAlignment: NetworkGoalId[]; // which user goals this target serves
  outreach: Outreach[];
};

const KEY = "nchub.signalfinder.v2";
const PREF_KEY = "nchub.signalfinder.prefs.v1";

const TYPES = ["creator", "developer", "artist", "business", "mentor", "community", "collaborator"];
const today = () => new Date().toISOString().slice(0, 10);

type Prefs = { goals: NetworkGoalId[] };
function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { goals: [] };
}
function savePrefs(p: Prefs) {
  try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

function load(): Target[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]") as unknown[];
    return raw.map((r): Target => {
      const t = r as Partial<Target> & { goalAlignment?: NetworkGoalId[] };
      return {
        id: t.id ?? String(Math.random()),
        name: t.name ?? "",
        type: t.type ?? "creator",
        niche: t.niche ?? "",
        platform: t.platform ?? "",
        audience: t.audience ?? 0,
        growth: t.growth ?? 3,
        activity: t.activity ?? 3,
        accessibility: t.accessibility ?? 3,
        relevance: t.relevance ?? 3,
        goal: t.goal ?? "",
        goalAlignment: t.goalAlignment ?? [],
        outreach: t.outreach ?? [],
      };
    });
  } catch {
    return [];
  }
}
function persist(t: Target[]) {
  try { localStorage.setItem(KEY, JSON.stringify(t)); } catch { /* ignore */ }
}

type Scores = {
  response: number;
  collab: number;
  momentum: number;
  timing: number;
  relevance: number;
  overall: number;
};

function score(t: Target, activeGoals: NetworkGoalId[]): Scores {
  const acc = t.accessibility / 5;
  const act = t.activity / 5;
  const grw = t.growth / 5;
  const rel = t.relevance / 5;
  const sizeFactor = 1 / (1 + Math.log10(Math.max(t.audience, 1)) / 6);
  const recentResponded = t.outreach.some((o) => o.responded);
  const attempted = t.outreach.length > 0;
  const warmthBoost = recentResponded ? 0.15 : attempted ? 0.05 : 0;
  // Goal alignment lifts the relevance score: every active goal this target
  // serves adds a small multiplier; targets aligned to nothing the user is
  // pursuing right now sink in the ranking.
  const goalHits = activeGoals.length === 0 ? 1 : t.goalAlignment.filter((g) => activeGoals.includes(g)).length;
  const goalLift = activeGoals.length === 0 ? 0 : Math.min(0.3, goalHits * 0.12);

  const response = Math.round(Math.min(1, 0.6 * acc + 0.25 * act + 0.15 * sizeFactor + warmthBoost) * 100);
  const collab = Math.round(Math.min(1, 0.7 * rel + 0.3 * act + goalLift) * 100);
  const momentum = Math.round((0.6 * grw + 0.4 * act) * 100);
  const timing = Math.round((0.6 * act + 0.4 * grw) * 100);
  const relevance = Math.round(Math.min(1, rel + goalLift) * 100);
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
  growth: 3, activity: 3, accessibility: 3, relevance: 3, goal: "", goalAlignment: [],
});

export function SignalFinder() {
  const [targets, setTargets] = useState<Target[]>(load);
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [sel, setSel] = useState<string | null>(null);
  const [form, setForm] = useState(empty());
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => { savePrefs(prefs); }, [prefs]);

  function update(next: Target[]) {
    setTargets(next);
    persist(next);
  }

  const ranked = useMemo(
    () =>
      [...targets]
        .filter((t) => filter === "all" || t.type === filter)
        .sort((a, b) => score(b, prefs.goals).overall - score(a, prefs.goals).overall),
    [targets, filter, prefs.goals]
  );

  // Personalization engine: which outreach style lands responses?
  const styleReco = useMemo(() => {
    const stat = { concise: { n: 0, r: 0 }, detailed: { n: 0, r: 0 } };
    targets.forEach((t) =>
      t.outreach.forEach((o) => {
        stat[o.style].n++;
        if (o.responded) stat[o.style].r++;
      })
    );
    const rate = (s: { n: number; r: number }) => (s.n ? Math.round((s.r / s.n) * 100) : null);
    const cRate = rate(stat.concise);
    const dRate = rate(stat.detailed);
    const recommend: Style | null =
      cRate == null && dRate == null ? null
      : cRate == null ? "detailed"
      : dRate == null ? "concise"
      : cRate >= dRate ? "concise" : "detailed";
    return { concise: cRate, detailed: dRate, stat, recommend };
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
  function toggleGoal(g: NetworkGoalId) {
    setPrefs((p) => ({ ...p, goals: p.goals.includes(g) ? p.goals.filter((x) => x !== g) : [...p.goals, g] }));
  }
  function patchSelectedTarget(patch: Partial<Target>) {
    if (!sel) return;
    update(targets.map((t) => (t.id === sel ? { ...t, ...patch } : t)));
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
        <span>SignalFinder</span>
        <button className="btn" onClick={() => setAdding((a) => !a)}>{adding ? "Close" : "+ Target"}</button>
      </div>

      {/* Networking goals (top-level state — drives scoring + LLM drafts) */}
      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)" }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: 1, color: "var(--mute)", textTransform: "uppercase", marginBottom: 6 }}>
          Active networking goals
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {NETWORK_GOALS.map((g) => {
            const on = prefs.goals.includes(g.id);
            return (
              <button key={g.id} onClick={() => toggleGoal(g.id)} title={g.hint} className="btn"
                style={{ padding: "4px 10px", fontSize: 11, color: on ? "var(--pink)" : undefined, borderColor: on ? "rgba(255,87,119,0.55)" : undefined }}>
                {g.label}
              </button>
            );
          })}
        </div>
        {prefs.goals.length === 0 && (
          <div style={{ fontSize: 11, color: "var(--mute)", marginTop: 6 }}>
            Select what you&apos;re actually pursuing right now — scoring will weight aligned targets up, the rest down.
          </div>
        )}
      </div>

      {/* Personalization readout */}
      {(styleReco.concise !== null || styleReco.detailed !== null) && (
        <div className="mono" style={{ padding: "8px 14px", fontSize: 12, color: "var(--mute)", borderBottom: "1px solid var(--line)" }}>
          Outreach landing rate — concise {styleReco.concise ?? "–"}% · detailed {styleReco.detailed ?? "–"}%
          {styleReco.recommend && (
            <span className="glow-text">{"  → lead with "}{styleReco.recommend}</span>
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
          <Slider l="relevance to your work" v={form.relevance} on={(v) => setForm({ ...form, relevance: v })} />
          <Field l="per-target context"><input style={inp} placeholder="why this target, in one line" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} /></Field>
          <Field l="serves which goals">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {NETWORK_GOALS.map((g) => {
                const on = form.goalAlignment.includes(g.id);
                return (
                  <button key={g.id} className="btn" style={{ padding: "2px 8px", fontSize: 10, color: on ? "var(--pink)" : undefined }}
                    onClick={() => setForm({ ...form, goalAlignment: on ? form.goalAlignment.filter((x) => x !== g.id) : [...form.goalAlignment, g.id] })}>
                    {g.label.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          </Field>
          <div style={{ alignSelf: "end" }}><button className="btn" onClick={addTarget}>Add</button></div>
        </div>
      )}

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Ranked list */}
        <div style={{ width: 320, borderRight: "1px solid var(--line)", overflow: "auto" }}>
          <div style={{ padding: "8px 10px", display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["all", ...TYPES].map((f) => (
              <button key={f} className="btn" style={{ padding: "2px 8px", fontSize: 10, color: filter === f ? "var(--pink)" : undefined }} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
          {ranked.length === 0 && <div className="placeholder"><div style={{ fontSize: 13 }}>No targets yet. Add one to start scoring.</div></div>}
          {ranked.map((t) => {
            const s = score(t, prefs.goals);
            return (
              <button key={t.id} onClick={() => setSel(t.id)} className="panel" style={{ display: "block", width: "calc(100% - 16px)", margin: "0 8px 8px", textAlign: "left", padding: 10, cursor: "pointer", borderColor: sel === t.id ? "rgba(255,87,119,0.6)" : undefined, color: "var(--ink)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="mono" style={{ fontSize: 13 }}>{t.name}</span>
                  <span className="mono glow-text" style={{ fontSize: 16 }}>{s.overall}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--mute)" }}>{t.type} · {t.platform || "—"} · {warmth(t)}</div>
                {t.goalAlignment.length > 0 && (
                  <div style={{ fontSize: 10, color: "var(--mute)", marginTop: 2 }}>
                    {t.goalAlignment.map((g) => NETWORK_GOALS.find((x) => x.id === g)?.label.split(" ")[0]).join(" · ")}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Detail */}
        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          {!current && <div className="placeholder"><div style={{ fontSize: 13 }}>Select a target to see its scoring breakdown + outreach.</div></div>}
          {current && (
            <Detail
              t={current}
              activeGoals={prefs.goals}
              styleRecommend={styleReco.recommend}
              onLog={logOutreach}
              onRemove={removeTarget}
              onPatch={patchSelectedTarget}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({
  t, activeGoals, styleRecommend, onLog, onRemove, onPatch,
}: {
  t: Target;
  activeGoals: NetworkGoalId[];
  styleRecommend: Style | null;
  onLog: (id: string, s: Style, r: boolean) => void;
  onRemove: (id: string) => void;
  onPatch: (patch: Partial<Target>) => void;
}) {
  const s = score(t, activeGoals);
  const fu = nextFollowup(t);
  const [draft, setDraft] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [research, setResearch] = useState<{ summary: string; sources: { title: string; url: string }[] } | null>(null);
  const [researching, setResearching] = useState(false);

  // Pull a quick research snippet from the web so the local model isn't
  // guessing who this person is. DDG HTML endpoint via the main process
  // (CORS-free, no key). The first ~3 result titles + snippets are summarized
  // and fed as context into the draft prompt.
  async function pullResearch() {
    setResearching(true);
    try {
      const q = `${t.name}${t.platform ? " " + t.platform : ""}${t.niche ? " " + t.niche : ""}`;
      const r = await window.hub.net({
        method: "GET",
        url: "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(q),
        headers: { "User-Agent": "Mozilla/5.0 NetworkChuckHub/1.0" },
      });
      if (!r.ok) { setResearch({ summary: "(search backend unreachable)", sources: [] }); return; }
      const html = typeof r.data === "string" ? r.data : "";
      const hits = parseDdgLite(html).slice(0, 4);
      const summary = hits.map((h, i) => `${i + 1}. ${h.title} — ${h.snippet}`).join("\n");
      setResearch({ summary: summary || "(no relevant results)", sources: hits.map((h) => ({ title: h.title, url: h.url })) });
    } catch (e) {
      setResearch({ summary: `(research failed: ${String(e)})`, sources: [] });
    } finally {
      setResearching(false);
    }
  }

  async function draftOutreach() {
    setDrafting(true);
    // Style preference: per-target landed style > global recommendation > default concise.
    const landed = t.outreach.find((o) => o.responded);
    const targetStyle: Style = landed ? landed.style : (styleRecommend ?? "concise");
    const styleHint =
      targetStyle === "detailed"
        ? "detailed, warm, references one specific thing they made"
        : "concise, genuine, two sentences max, references one specific thing they made";
    const goalContext = activeGoals.length > 0
      ? activeGoals.map((g) => goalLabel(g)).join(", ")
      : "general networking";
    const targetGoalText = t.goalAlignment.length > 0 ? t.goalAlignment.map(goalLabel).join(" + ") : "open";
    const researchBlock = research?.summary
      ? `\nResearch on this person (recent web hits — use to pick ONE specific reference, don't fabricate):\n${research.summary}`
      : "\nNo web research yet — be careful not to invent specifics about them.";
    const res = await houseChat(
      "You are SignalFinder's outreach assistant. Write one short, high-response-likelihood opening message to reach a target. Reply with ONLY the message — no preamble, no quotes, no signature. Reference one CONCRETE thing about them (from the research if available); never invent specifics.",
      `My active networking goals: ${goalContext}.
Target: ${t.name} (${t.type})${t.niche ? ", niche: " + t.niche : ""}${t.platform ? ", on " + t.platform : ""}.
What this target offers me: ${targetGoalText}.
Specific context: ${t.goal || "(none)"}.
Style: ${styleHint}.${researchBlock}`
    );
    setDrafting(false);
    setDraft(res.ok ? res.text || "" : `[model error] ${res.error}`);
  }

  function parseDdgLite(html: string): { title: string; url: string; snippet: string }[] {
    const out: { title: string; url: string; snippet: string }[] = [];
    const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<a\s+class="result__snippet"[^>]*>([\s\S]*?)<\/a>)?/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) {
      if (out.length >= 6) break;
      let url = m[1];
      const enc = url.match(/[?&]uddg=([^&]+)/);
      if (enc) { try { url = decodeURIComponent(enc[1]); } catch { /* keep raw */ } }
      const title = m[2].replace(/<[^>]+>/g, "").trim();
      const snippet = (m[3] || "").replace(/<[^>]+>/g, "").trim().slice(0, 220);
      if (title && url) out.push({ title, url, snippet });
    }
    return out;
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
          {t.goal && <div style={{ fontSize: 12, color: "var(--mute)" }}>context: {t.goal}</div>}
        </div>
        <div className="mono glow-text" style={{ fontSize: 32 }}>{s.overall}</div>
      </div>

      <div className="panel" style={{ padding: 10, margin: "10px 0" }}>
        <div className="mono" style={{ fontSize: 10, color: "var(--mute)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Serves which of your goals</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {NETWORK_GOALS.map((g) => {
            const on = t.goalAlignment.includes(g.id);
            const active = activeGoals.includes(g.id);
            return (
              <button key={g.id} className="btn" style={{ padding: "2px 8px", fontSize: 10, color: on ? "var(--pink)" : undefined, borderColor: on && active ? "rgba(255,87,119,0.55)" : undefined }}
                onClick={() => onPatch({ goalAlignment: on ? t.goalAlignment.filter((x) => x !== g.id) : [...t.goalAlignment, g.id] })}>
                {g.label}
              </button>
            );
          })}
        </div>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <div className="mono" style={{ fontSize: 12, letterSpacing: 1, color: "var(--mute)" }}>
            AI ASSISTANT
            {styleRecommend && <span className="glow-text"> · {styleRecommend} recommended</span>}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn" disabled={researching} onClick={() => void pullResearch()} title="Pull a quick web snippet about this person — fed into the draft so the model isn't guessing">
              {researching ? "…" : research ? "Refresh research" : "Research"}
            </button>
            <button className="btn" disabled={drafting} onClick={() => void draftOutreach()}>{drafting ? "…" : "Draft outreach"}</button>
          </div>
        </div>
        {research && (
          <div style={{ marginTop: 10, fontSize: 11, color: "var(--mute)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Research context</div>
            {research.summary}
            {research.sources.length > 0 && (
              <div style={{ marginTop: 6 }}>
                {research.sources.map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noreferrer" style={{ display: "block", fontSize: 11, color: "var(--pink)", textDecoration: "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>↗ {s.title}</a>
                ))}
              </div>
            )}
          </div>
        )}
        {draft && (
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={5}
            style={{ width: "100%", marginTop: 10, background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink)", padding: 10, fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none" }} />
        )}
      </div>

      <button className="btn" style={{ marginTop: 14 }} onClick={() => onRemove(t.id)}>Remove target</button>
    </div>
  );
}

function goalLabel(g: NetworkGoalId): string {
  return NETWORK_GOALS.find((x) => x.id === g)?.label ?? g;
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
