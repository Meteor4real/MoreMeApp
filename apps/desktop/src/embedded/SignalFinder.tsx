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

export function SignalFinderTargets() {
  const [targets, setTargets] = useState<Target[]>(load);
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [sel, setSel] = useState<string | null>(null);
  const [form, setForm] = useState(empty());
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"score" | "audience" | "az" | "recent">("score");

  useEffect(() => { savePrefs(prefs); }, [prefs]);

  function update(next: Target[]) {
    setTargets(next);
    persist(next);
  }

  const ranked = useMemo(() => {
    const text = q.trim().toLowerCase();
    return [...targets]
      .filter((t) => filter === "all" || t.type === filter)
      .filter((t) => !text || t.name.toLowerCase().includes(text) || t.niche.toLowerCase().includes(text) || t.platform.toLowerCase().includes(text))
      .sort((a, b) => {
        if (sort === "audience") return b.audience - a.audience;
        if (sort === "az") return a.name.localeCompare(b.name);
        if (sort === "recent") return Number(b.id) - Number(a.id);
        return score(b, prefs.goals).overall - score(a, prefs.goals).overall;
      });
  }, [targets, filter, prefs.goals, q, sort]);

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
      <SignalHeader
        total={targets.length}
        warm={targets.filter((t) => t.outreach.some((o) => o.responded)).length}
        topScore={ranked.length ? score(ranked[0], prefs.goals).overall : 0}
        adding={adding}
        onToggleAdd={() => setAdding((a) => !a)}
      />

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
        <div style={{ width: 380, borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", minHeight: 0 }}>
          {/* search + sort */}
          <div style={{ padding: "10px 10px 6px", borderBottom: "1px solid var(--line)" }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search name, niche, platform"
                style={{ flex: 1, background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 6, color: "var(--ink)", padding: "6px 10px", fontSize: 12, fontFamily: "ui-monospace,monospace", outline: "none" }} />
              <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} title="Sort"
                style={{ background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 6, color: "var(--ink)", padding: "6px 8px", fontSize: 11, fontFamily: "ui-monospace,monospace", outline: "none" }}>
                <option value="score">Score</option>
                <option value="audience">Audience</option>
                <option value="recent">Recent</option>
                <option value="az">A-Z</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {["all", ...TYPES].map((f) => (
                <button key={f} className="btn" style={{ padding: "3px 9px", fontSize: 10, minHeight: 26,
                  color: filter === f ? "var(--pink)" : undefined,
                  borderColor: filter === f ? "rgba(255,87,119,0.55)" : undefined,
                  background: filter === f ? "rgba(255,87,119,0.08)" : undefined,
                }} onClick={() => setFilter(f)}>{f}</button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflow: "auto", padding: "8px 0" }}>
            {ranked.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: "var(--mute)", fontSize: 13 }}>
                {targets.length === 0 ? <>No targets yet.<br />Hit <b>+ Target</b> in the header to add your first.</> : "No matches for the current filter."}
              </div>
            )}
            {ranked.map((t) => {
              const s = score(t, prefs.goals);
              const w = warmth(t);
              const wColor = w === "hot" ? "#ef4444" : w === "warm" ? "#f59e0b" : "#6b7280";
              const fu = nextFollowup(t);
              const fuOverdue = fu ? fu < new Date().toISOString().slice(0, 10) : false;
              return (
                <button key={t.id} onClick={() => setSel(t.id)} className={sel === t.id ? "panel-hot panel" : "panel"}
                  style={{
                    display: "flex", gap: 10, alignItems: "stretch",
                    width: "calc(100% - 16px)", margin: "0 8px 8px",
                    textAlign: "left", padding: 10, cursor: "pointer", color: "var(--ink)",
                    borderColor: sel === t.id ? "rgba(255,87,119,0.55)" : undefined,
                    background: sel === t.id ? "rgba(255,87,119,0.06)" : undefined,
                  }}>
                  <SfRing pct={s.overall} color={s.overall >= 70 ? "#22c55e" : s.overall >= 45 ? "#f59e0b" : "#ef4444"} size={48} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
                      <span className="mono" style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name || "(unnamed)"}</span>
                      <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 3, background: `${wColor}22`, color: wColor, letterSpacing: 1, textTransform: "uppercase", fontFamily: "ui-monospace,monospace" }}>{w}</span>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--mute)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.type}{t.niche ? ` · ${t.niche}` : ""}{t.platform ? ` · ${t.platform}` : ""}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--mute)", marginTop: 2 }}>{t.audience.toLocaleString()} audience{t.outreach.length > 0 ? ` · ${t.outreach.length} outreach` : ""}</div>
                    {t.goalAlignment.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 4 }}>
                        {t.goalAlignment.slice(0, 4).map((g) => {
                          const lab = NETWORK_GOALS.find((x) => x.id === g)?.label.split(" ")[0] || g;
                          const active = prefs.goals.includes(g);
                          return <span key={g} style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3,
                            background: active ? "rgba(255,87,119,0.16)" : "rgba(255,255,255,0.05)",
                            color: active ? "var(--pink)" : "var(--mute)", letterSpacing: 0.5,
                            border: active ? "1px solid rgba(255,87,119,0.45)" : "1px solid transparent",
                          }}>{lab}</span>;
                        })}
                      </div>
                    )}
                    {fu && (
                      <div style={{ fontSize: 9, marginTop: 4, color: fuOverdue ? "#ef4444" : "#f59e0b", fontFamily: "ui-monospace,monospace", letterSpacing: 0.5, textTransform: "uppercase" }}>
                        {fuOverdue ? "OVERDUE" : "f/u"} · {fu}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {!current && (
            <div style={{ height: "100%", display: "grid", placeItems: "center", padding: 40, color: "var(--mute)", textAlign: "center" }}>
              <div>
                <div style={{ fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontWeight: 800, fontSize: 14, letterSpacing: 3, color: "var(--pink)", textTransform: "uppercase", marginBottom: 8 }}>
                  Select a target
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.6, maxWidth: 320 }}>
                  Pick someone from the ranked list to see their score breakdown, log outreach, and draft a personalized opener.
                </div>
              </div>
            </div>
          )}
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

// Local circular score ring. Color-graded glow; used by both the card and the
// detail hero. Mirrors the ring in SignalFinderShell so we don't import across
// the file boundary.
function SfRing({ pct, color, size = 56 }: { pct: number; color: string; size?: number }) {
  const r = size / 2 - 4, c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, pct));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }} aria-label="score">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (v / 100) * c} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ filter: `drop-shadow(0 0 4px ${color})`, transition: "stroke-dashoffset .35s" }} />
      <text x={size / 2} y={size / 2 + (size <= 50 ? 4 : 6)} textAnchor="middle"
        fontFamily="ui-monospace,monospace" fontSize={size / 3.2} fill={color} fontWeight={700}>{v}</text>
    </svg>
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
  const w = warmth(t);
  const wColor = w === "hot" ? "#ef4444" : w === "warm" ? "#f59e0b" : "#6b7280";
  const overallColor = s.overall >= 70 ? "#22c55e" : s.overall >= 45 ? "#f59e0b" : "#ef4444";
  const responseCount = t.outreach.filter((o) => o.responded).length;

  return (
    <div>
      {/* HERO — name + meta + big score ring, glowing gradient frame */}
      <div style={{
        padding: 20,
        background: `linear-gradient(135deg, rgba(255,87,119,0.07) 0%, rgba(0,0,0,0.0) 60%), linear-gradient(180deg, rgba(20,8,12,0.7), rgba(8,8,14,0.5))`,
        borderBottom: "1px solid var(--line)",
        display: "flex", alignItems: "center", gap: 20,
      }}>
        <SfRing pct={s.overall} color={overallColor} size={96} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontWeight: 800, fontSize: 22, color: "var(--ink)", letterSpacing: 0.5 }}>{t.name || "(unnamed)"}</span>
            <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 4, background: `${wColor}22`, color: wColor, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "ui-monospace,monospace" }}>{w}</span>
            {styleRecommend && <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 4, background: "rgba(34,211,238,0.12)", color: "#22d3ee", letterSpacing: 1, textTransform: "uppercase", fontFamily: "ui-monospace,monospace" }}>lead with {styleRecommend}</span>}
          </div>
          <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 4 }}>
            {t.type}{t.niche ? ` · ${t.niche}` : ""}{t.platform ? ` · ${t.platform}` : ""} · <b style={{ color: "var(--ink)" }}>{t.audience.toLocaleString()}</b> audience
          </div>
          {t.goal && <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 6, lineHeight: 1.5 }}><i>{t.goal}</i></div>}
          <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 11, fontFamily: "ui-monospace,monospace" }}>
            <Stat label="outreach" value={t.outreach.length} />
            <Stat label="responded" value={responseCount} color="#22c55e" />
            <Stat label="follow-up" value={fu || "—"} color={fu ? "#f59e0b" : undefined} />
          </div>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {/* SCORE BREAKDOWN — 2 columns of bars */}
        <Section label="Score breakdown">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 18px", marginTop: 6 }}>
            {bars.map(([label, v]) => (
              <div key={label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--mute)" }}>
                  <span>{label}</span>
                  <span style={{ color: v >= 70 ? "#22c55e" : v >= 45 ? "#f59e0b" : "var(--mute)", fontFamily: "ui-monospace,monospace" }}>{v}</span>
                </div>
                <div style={{ height: 6, background: "#15151a", borderRadius: 3, overflow: "hidden", marginTop: 4 }}>
                  <div style={{ height: "100%", width: `${v}%`, background: `linear-gradient(90deg, var(--red), var(--pink), var(--orange))`, transition: "width .3s" }} />
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* GOAL ALIGNMENT — pickable chips */}
        <Section label="Serves which of your goals">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {NETWORK_GOALS.map((g) => {
              const on = t.goalAlignment.includes(g.id);
              const active = activeGoals.includes(g.id);
              return (
                <button key={g.id} className="btn" style={{
                  padding: "5px 11px", fontSize: 11, minHeight: 28,
                  color: on ? "var(--pink)" : undefined,
                  borderColor: on && active ? "rgba(255,87,119,0.65)" : on ? "rgba(255,87,119,0.35)" : undefined,
                  background: on ? "rgba(255,87,119,0.08)" : undefined,
                  boxShadow: on && active ? "0 0 10px rgba(255,87,119,0.3)" : undefined,
                }}
                  onClick={() => onPatch({ goalAlignment: on ? t.goalAlignment.filter((x) => x !== g.id) : [...t.goalAlignment, g.id] })}>
                  {g.label}{active && on && <span style={{ color: "#22c55e", marginLeft: 6 }}>●</span>}
                </button>
              );
            })}
          </div>
        </Section>

        {/* AI ASSISTANT — moved up, bigger, primary action */}
        <Section label={`AI assistant${styleRecommend ? ` · ${styleRecommend} recommended` : ""}`}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button className="btn" disabled={researching} onClick={() => void pullResearch()}
              title="Pull a quick web snippet about this person — fed into the draft so the model isn't guessing"
              style={{ minHeight: 36 }}>
              {researching ? "researching…" : research ? "Refresh research" : "Research"}
            </button>
            <button className="btn" disabled={drafting} onClick={() => void draftOutreach()}
              style={{ minHeight: 36, color: "var(--pink)", borderColor: "rgba(255,87,119,0.6)", background: "rgba(255,87,119,0.08)", fontWeight: 600 }}>
              {drafting ? "drafting…" : "Draft outreach"}
            </button>
            {draft && (
              <button className="btn" onClick={() => navigator.clipboard.writeText(draft)} style={{ minHeight: 36 }}>Copy draft</button>
            )}
          </div>
          {research && (
            <div style={{ marginTop: 10, padding: 10, background: "rgba(34,211,238,0.05)", border: "1px solid rgba(34,211,238,0.25)", borderRadius: 6 }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "#22d3ee", marginBottom: 6 }}>Research context</div>
              <div style={{ fontSize: 11, color: "var(--ink)", lineHeight: 1.55, whiteSpace: "pre-wrap", opacity: 0.9 }}>{research.summary}</div>
              {research.sources.length > 0 && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
                  {research.sources.map((src, i) => (
                    <a key={i} href={src.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#22d3ee", textDecoration: "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "ui-monospace,monospace" }}>↗ {src.title}</a>
                  ))}
                </div>
              )}
            </div>
          )}
          {draft && (
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={7}
              style={{ width: "100%", marginTop: 10, background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,87,119,0.35)", borderRadius: 8, color: "var(--ink)", padding: 12, fontSize: 13, lineHeight: 1.55, fontFamily: "inherit", resize: "vertical", outline: "none", boxShadow: "0 0 16px rgba(255,87,119,0.08) inset" }} />
          )}
        </Section>

        {/* OUTREACH TIMELINE */}
        <Section label={`Outreach log · ${t.outreach.length} attempt${t.outreach.length === 1 ? "" : "s"}`}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
            <button className="btn" onClick={() => onLog(t.id, "concise", false)} style={{ fontSize: 12, minHeight: 36 }}>+ Concise sent</button>
            <button className="btn" onClick={() => onLog(t.id, "detailed", false)} style={{ fontSize: 12, minHeight: 36 }}>+ Detailed sent</button>
            <button className="btn" onClick={() => onLog(t.id, "concise", true)} style={{ fontSize: 12, minHeight: 36, color: "#22c55e", borderColor: "rgba(34,197,94,0.5)" }}>+ Concise → replied</button>
            <button className="btn" onClick={() => onLog(t.id, "detailed", true)} style={{ fontSize: 12, minHeight: 36, color: "#22c55e", borderColor: "rgba(34,197,94,0.5)" }}>+ Detailed → replied</button>
          </div>
          {t.outreach.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--mute)", padding: "6px 4px" }}>No outreach logged yet. Draft one above, send it, then log it.</div>
          ) : (
            <div style={{ borderLeft: "2px solid var(--line)", paddingLeft: 12 }}>
              {t.outreach.slice().reverse().map((o, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "5px 0", position: "relative" }}>
                  <span style={{ position: "absolute", left: -19, width: 12, height: 12, borderRadius: "50%", background: o.responded ? "#22c55e" : "#9ca3af", boxShadow: o.responded ? "0 0 8px rgba(34,197,94,0.6)" : "none" }} />
                  <span className="mono" style={{ fontSize: 11, color: "var(--mute)", minWidth: 90 }}>{o.date}</span>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 3, background: "rgba(255,255,255,0.05)", color: "var(--ink)", fontFamily: "ui-monospace,monospace", letterSpacing: 0.5, textTransform: "uppercase" }}>{o.style}</span>
                  <span style={{ fontSize: 11, color: o.responded ? "#22c55e" : "var(--mute)", fontWeight: o.responded ? 600 : 400 }}>{o.responded ? "responded" : "sent · awaiting"}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
          <button className="btn" onClick={() => onRemove(t.id)} style={{ color: "#ef4444", borderColor: "rgba(239,68,68,0.4)" }}>Remove target</button>
        </div>
      </div>
    </div>
  );

  function Stat({ label, value, color }: { label: string; value: number | string; color?: string }) {
    return (
      <div>
        <div style={{ fontSize: 14, color: color || "var(--ink)", fontWeight: 600, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 9, color: "var(--mute)", letterSpacing: 1, textTransform: "uppercase", marginTop: 3 }}>{label}</div>
      </div>
    );
  }
  function Section({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "var(--pink)", textShadow: "0 0 6px rgba(255,87,119,0.4)" }}>{label}</span>
          <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(255,87,119,0.35), transparent)" }} />
        </div>
        {children}
      </div>
    );
  }
}

function goalLabel(g: NetworkGoalId): string {
  return NETWORK_GOALS.find((x) => x.id === g)?.label ?? g;
}

// Branded, hub-themed header with the SignalFinder radar glyph, an animated
// sweep, and a live stat strip — replaces the old plain text label.
function SignalHeader({ total, warm, topScore, adding, onToggleAdd }: { total: number; warm: number; topScore: number; adding: boolean; onToggleAdd: () => void }) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 14, padding: "10px 16px",
        borderBottom: "1px solid rgba(255,87,119,0.35)",
        background: "linear-gradient(90deg, #160a10 0%, #1a0c12 30%, #120a10 75%, #0c0810 100%)",
        position: "relative", overflow: "hidden",
      }}
    >
      <svg width={42} height={42} viewBox="0 0 64 64" aria-label="SignalFinder">
        <defs>
          <radialGradient id="sf-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#ff7a2d" />
            <stop offset="0.6" stopColor="#ff3355" />
            <stop offset="1" stopColor="#7c1d2e" />
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="28" fill="#0c0608" stroke="url(#sf-grad)" strokeWidth="2" />
        {[20, 13, 6].map((r, i) => (
          <circle key={i} cx="32" cy="32" r={r} fill="none" stroke="#ff5577" strokeWidth="1" opacity={0.25 + i * 0.18} />
        ))}
        <circle cx="32" cy="32" r="3" fill="url(#sf-grad)" />
        {/* sweeping radar arm */}
        <g style={{ transformOrigin: "32px 32px", animation: "sf-sweep 3.2s linear infinite" }}>
          <line x1="32" y1="32" x2="32" y2="6" stroke="#ff7a2d" strokeWidth="2" />
          <circle cx="48" cy="18" r="2.4" fill="#ffd166" />
        </g>
      </svg>
      <div style={{ lineHeight: 1.15 }}>
        <div className="glow-text" style={{ fontSize: 16, letterSpacing: 3, textTransform: "uppercase", fontWeight: 800 }}>SignalFinder</div>
        <div className="mono" style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "var(--mute)", marginTop: 2 }}>
          Opportunity radar · personalized outreach
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", gap: 18, marginRight: 8 }}>
        <Stat label="targets" value={total} />
        <Stat label="warm" value={warm} />
        <Stat label="top score" value={topScore} />
      </div>
      <button className="btn" onClick={onToggleAdd}>{adding ? "Close" : "+ Target"}</button>
      <style>{`@keyframes sf-sweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ textAlign: "right" }}>
      <div className="mono glow-text" style={{ fontSize: 18, lineHeight: 1 }}>{value}</div>
      <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--mute)" }}>{label}</div>
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
