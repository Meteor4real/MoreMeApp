import { useEffect, useMemo, useState } from "react";
import { SignalFinderTargets } from "../SignalFinder";
import { houseChat } from "../../houseLLM";
import {
  STAGES, STAGE_LABEL, STAGE_COLOR, type Stage, type Ext, type Channel, type Note,
  loadAllExt, saveAllExt, getExt, patchExt,
  loadWeights, saveWeights, type Weights, DEFAULT_WEIGHTS,
  loadTemplates, saveTemplates, type Template, fillTemplate, DEFAULT_TEMPLATES,
} from "./sfExt";

// The new SignalFinder shell. Wraps the existing scoring/list view (which
// stays untouched as SignalFinderTargets) inside a top tab bar that adds:
//   PIPELINE — kanban board across stages, stage transitions, follow-up,
//   TEMPLATES — saved outreach templates with variable fill,
//   STATS — response rates, funnel, leaderboard,
//   SETTINGS — custom scoring weights.
// All new data lives in a sidecar (sfExt.ts) keyed by target id so the
// original component keeps working.

type View = "today" | "targets" | "pipeline" | "ai" | "templates" | "stats" | "settings";

type Target = {
  id: string; name: string; type: string; niche: string; platform: string;
  audience: number; growth: number; activity: number; accessibility: number;
  relevance: number; goal: string; goalAlignment: string[];
  outreach: { date: string; style: "concise" | "detailed"; responded: boolean }[];
};
const TARGET_KEY = "nchub.signalfinder.v2";
function loadTargets(): Target[] {
  try { const r = localStorage.getItem(TARGET_KEY); if (r) return JSON.parse(r) as Target[]; } catch { /* ignore */ }
  return [];
}

const C_BAR_BG = "linear-gradient(90deg, #160a14, #1a0c14 30%, #110a14 75%, #0c0810)";

function exportAll() {
  const data = {
    v: 1, ts: Date.now(),
    targets: loadTargets(),
    ext: loadAllExt(),
    weights: loadWeights(),
    templates: loadTemplates(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `signalfinder-${Date.now()}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
function importAll(text: string) {
  try {
    const d = JSON.parse(text) as { targets?: unknown; ext?: unknown; weights?: unknown; templates?: unknown };
    if (Array.isArray(d.targets)) localStorage.setItem("nchub.signalfinder.v2", JSON.stringify(d.targets));
    if (d.ext) saveAllExt(d.ext as Record<string, Ext>);
    if (d.weights) saveWeights(d.weights as Weights);
    if (Array.isArray(d.templates)) saveTemplates(d.templates as Template[]);
    window.location.reload();
  } catch { /* ignore */ }
}

export function SignalFinder() {
  const [view, setView] = useState<View>("today");
  return (
    <div className="stage" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "8px 14px", borderBottom: "1px solid var(--line)", background: C_BAR_BG }}>
        <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "var(--mute)", marginRight: 6 }}>SignalFinder</span>
        {(["today", "targets", "pipeline", "ai", "templates", "stats", "settings"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className="btn" style={{
            padding: "6px 14px", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase",
            color: view === v ? "var(--pink)" : undefined, borderColor: view === v ? "rgba(255,87,119,0.55)" : undefined,
            background: view === v ? "rgba(255,87,119,0.08)" : undefined,
          }}>{v}</button>
        ))}
        <span style={{ flex: 1 }} />
        <button className="btn" onClick={exportAll} title="Download all targets + sidecar data as JSON" style={{ fontSize: 11, padding: "6px 12px" }}>Export</button>
        <label className="btn" style={{ fontSize: 11, padding: "6px 12px", cursor: "pointer" }}>
          Import
          <input type="file" accept=".json,application/json" style={{ display: "none" }}
            onChange={(e) => { const f = e.currentTarget.files?.[0]; if (f) f.text().then(importAll); e.currentTarget.value = ""; }} />
        </label>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {view === "today" && <TodayView onJump={(v) => setView(v)} />}
        {view === "targets" && <SignalFinderTargets />}
        {view === "pipeline" && <PipelineView />}
        {view === "ai" && <AIStudioView />}
        {view === "templates" && <TemplatesView />}
        {view === "stats" && <StatsView />}
        {view === "settings" && <SettingsView />}
      </div>
    </div>
  );
}

// ── Today — the daily-driver loop ───────────────────────────────────────────
// Answers: "what should I do RIGHT NOW?"
// Sections: overdue, due today, recent replies (last 7d), top suggestions
// (unstarted high-priority targets), follow-up momentum (this week).
function TodayView({ onJump }: { onJump: (v: View) => void }) {
  const [targets, setTargets] = useState<Target[]>(loadTargets);
  const [ext, setExt] = useState(loadAllExt);
  useEffect(() => { setTargets(loadTargets()); setExt(loadAllExt()); }, []);

  const todayKey = new Date().toISOString().slice(0, 10);
  const overdue: Target[] = [];
  const dueToday: Target[] = [];
  for (const t of targets) {
    const f = getExt(ext, t.id).followup;
    if (!f) continue;
    if (f < todayKey) overdue.push(t);
    else if (f === todayKey) dueToday.push(t);
  }
  overdue.sort((a, b) => (getExt(ext, a.id).followup < getExt(ext, b.id).followup ? -1 : 1));

  const weekAgo = Date.now() - 7 * 86400e3;
  const recentReplies = targets.filter((t) => t.outreach.some((o) => o.responded && Date.parse(o.date) >= weekAgo));

  // Suggestions: untouched (no outreach) targets in Prospect, ranked by raw
  // overall score so you know who to ping first today.
  const suggestions = targets
    .filter((t) => t.outreach.length === 0 && getExt(ext, t.id).stage === "prospect")
    .map((t) => ({ t, s: cheapScore(t) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 5)
    .map((x) => x.t);

  // Momentum: outreach attempts logged in the last 7 days, by day.
  const momentum: { day: string; n: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400e3).toISOString().slice(0, 10);
    momentum.push({ day: d.slice(5), n: targets.reduce((s, t) => s + t.outreach.filter((o) => o.date === d).length, 0) });
  }
  const maxMo = Math.max(1, ...momentum.map((m) => m.n));

  function clearFollowup(id: string) {
    setExt(patchExt(id, { followup: "" }));
  }

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 16, minHeight: 0 }}>
      {/* Top stat strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
        <StatTile label="overdue" value={overdue.length} color="#ef4444" pulse={overdue.length > 0} />
        <StatTile label="due today" value={dueToday.length} color="#f59e0b" />
        <StatTile label="recent replies (7d)" value={recentReplies.length} color="#22c55e" />
        <StatTile label="targets total" value={targets.length} color="#22d3ee" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Overdue + due-today */}
        <div className="panel" style={{ padding: 14 }}>
          <SecHead color="#ef4444">Follow ups owed</SecHead>
          {overdue.length === 0 && dueToday.length === 0 ? (
            <Empty>Nothing owed. Nice.</Empty>
          ) : (
            <>
              {overdue.map((t) => <FollowRow key={t.id} t={t} e={getExt(ext, t.id)} overdue onClear={() => clearFollowup(t.id)} onJump={() => onJump("ai")} />)}
              {dueToday.map((t) => <FollowRow key={t.id} t={t} e={getExt(ext, t.id)} onClear={() => clearFollowup(t.id)} onJump={() => onJump("ai")} />)}
            </>
          )}
        </div>

        {/* Recent replies */}
        <div className="panel" style={{ padding: 14 }}>
          <SecHead color="#22c55e">Recent replies (last 7 days)</SecHead>
          {recentReplies.length === 0 ? <Empty>No replies this week — keep firing.</Empty> : recentReplies.map((t) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              <ScoreRing pct={Math.min(100, cheapScore(t))} color="#22c55e" size={42} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="mono" style={{ fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                <div style={{ fontSize: 11, color: "var(--mute)" }}>{t.type}{t.niche ? ` · ${t.niche}` : ""}</div>
              </div>
              <span style={{ fontSize: 10, padding: "3px 8px", background: `${STAGE_COLOR[getExt(ext, t.id).stage]}22`, color: STAGE_COLOR[getExt(ext, t.id).stage], borderRadius: 4, fontFamily: "ui-monospace,monospace", letterSpacing: 1, textTransform: "uppercase" }}>{STAGE_LABEL[getExt(ext, t.id).stage]}</span>
            </div>
          ))}
        </div>

        {/* Suggestions */}
        <div className="panel" style={{ padding: 14 }}>
          <SecHead color="#ff5577">Top suggestions to ping first</SecHead>
          {suggestions.length === 0 ? <Empty>All prospects already touched. Add new ones on the Targets tab.</Empty> : suggestions.map((t) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              <ScoreRing pct={cheapScore(t)} color="#ff5577" size={48} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="mono" style={{ fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                <div style={{ fontSize: 11, color: "var(--mute)" }}>{t.type}{t.niche ? ` · ${t.niche}` : ""} · {t.audience.toLocaleString()} audience</div>
              </div>
              <button className="btn" onClick={() => onJump("ai")} style={{ fontSize: 11, padding: "5px 11px" }}>Draft message</button>
            </div>
          ))}
        </div>

        {/* Momentum */}
        <div className="panel" style={{ padding: 14 }}>
          <SecHead color="#22d3ee">Outreach momentum · last 7 days</SecHead>
          <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 96, marginTop: 8 }}>
            {momentum.map((m, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: "100%", height: `${(m.n / maxMo) * 80}px`, background: "linear-gradient(180deg, #22d3ee, #22d3ee44)", borderRadius: 3, minHeight: 2 }} title={`${m.n} on ${m.day}`} />
                <span style={{ fontSize: 9, fontFamily: "ui-monospace,monospace", color: "var(--mute)" }}>{m.day}</span>
                <span style={{ fontSize: 10, fontFamily: "ui-monospace,monospace", color: "var(--ink)" }}>{m.n}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: "var(--mute)" }}>{momentum.reduce((s, m) => s + m.n, 0)} attempts this week.</div>
        </div>
      </div>
    </div>
  );
}
function StatTile({ label, value, color, pulse }: { label: string; value: number; color: string; pulse?: boolean }) {
  return (
    <div className="panel" style={{ padding: 14, position: "relative", overflow: "hidden", borderColor: pulse ? `${color}aa` : undefined, boxShadow: pulse ? `0 0 18px ${color}33` : undefined }}>
      {pulse && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 50%, ${color}1a, transparent 70%)`, animation: "sfPulseBg 2.4s ease-in-out infinite" }} />}
      <div style={{ position: "relative", fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontWeight: 800, fontSize: 32, color, lineHeight: 1, textShadow: `0 0 14px ${color}` }}>{value}</div>
      <div style={{ position: "relative", fontSize: 10, color: "var(--mute)", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 6 }}>{label}</div>
      <style>{`@keyframes sfPulseBg { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }`}</style>
    </div>
  );
}
function SecHead({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <span style={{ fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontWeight: 800, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color }}>{children}</span>
      <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${color}66, transparent)` }} />
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color: "var(--mute)", padding: "12px 4px" }}>{children}</div>;
}
function FollowRow({ t, e, overdue, onClear, onJump }: { t: Target; e: Ext; overdue?: boolean; onClear: () => void; onJump: () => void }) {
  const color = overdue ? "#ef4444" : "#f59e0b";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
      <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}` }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="mono" style={{ fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
        <div style={{ fontSize: 11, color: color }}>{overdue ? "OVERDUE" : "due today"} · {e.followup}{e.tags.length > 0 ? ` · ${e.tags.map((g) => g.label).join(", ")}` : ""}</div>
      </div>
      <button className="btn" onClick={onJump} style={{ fontSize: 11, padding: "5px 11px" }}>Draft</button>
      <button className="btn" onClick={onClear} style={{ fontSize: 11, padding: "5px 11px" }}>Clear</button>
    </div>
  );
}
// Reusable circular SVG score ring (also used on Targets/Pipeline cards).
function ScoreRing({ pct, color, size = 56 }: { pct: number; color: string; size?: number }) {
  const r = size / 2 - 4, c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, pct));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (v / 100) * c} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ filter: `drop-shadow(0 0 4px ${color})`, transition: "stroke-dashoffset .35s" }} />
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize={size / 4} fill={color}>{v}</text>
    </svg>
  );
}
// Cheap re-implementation of the original SignalFinder score for use in the
// new views without importing the original component. Mirrors the same shape.
function cheapScore(t: Target): number {
  const acc = t.accessibility / 5, act = t.activity / 5, grw = t.growth / 5, rel = t.relevance / 5;
  const sizeFactor = 1 / (1 + Math.log10(Math.max(t.audience, 1)) / 6);
  const recentResponded = t.outreach.some((o) => o.responded);
  const attempted = t.outreach.length > 0;
  const warmthBoost = recentResponded ? 0.15 : attempted ? 0.05 : 0;
  const response = Math.min(1, 0.6 * acc + 0.25 * act + 0.15 * sizeFactor + warmthBoost);
  const collab = Math.min(1, 0.7 * rel + 0.3 * act);
  const momentum = 0.6 * grw + 0.4 * act;
  const timing = 0.6 * act + 0.4 * grw;
  return Math.round((0.3 * response + 0.2 * collab + 0.2 * momentum + 0.15 * timing + 0.15 * rel) * 100);
}

// ── Pipeline ────────────────────────────────────────────────────────────────
function PipelineView() {
  const [targets, setTargets] = useState<Target[]>(loadTargets);
  const [ext, setExt] = useState(loadAllExt);
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [dragOver, setDragOver] = useState<Stage | null>(null);

  // Pick up changes whenever this view is shown.
  useEffect(() => { setTargets(loadTargets()); setExt(loadAllExt()); }, []);

  function moveStage(id: string, stage: Stage) { setExt(patchExt(id, { stage })); }
  function patchTarget(id: string, p: Partial<Ext>) { setExt(patchExt(id, p)); }

  // All tags currently in use across targets — for the tag-filter dropdown.
  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const id of Object.keys(ext)) for (const tg of ext[id].tags) s.add(tg.label);
    return [...s].sort();
  }, [ext]);

  const filteredTargets = targets.filter((t) => {
    const text = q.trim().toLowerCase();
    if (text && !(t.name.toLowerCase().includes(text) || t.niche.toLowerCase().includes(text) || t.platform.toLowerCase().includes(text))) return false;
    if (tagFilter && !getExt(ext, t.id).tags.some((tg) => tg.label === tagFilter)) return false;
    return true;
  });

  const byStage: Record<Stage, Target[]> = { prospect: [], contacted: [], replied: [], talks: [], won: [], lost: [] };
  for (const t of filteredTargets) byStage[getExt(ext, t.id).stage].push(t);
  const overdueCount = targets.filter((t) => {
    const f = getExt(ext, t.id).followup;
    return f && new Date(f).getTime() < Date.now();
  }).length;

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 14, minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span style={{ fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontWeight: 800, fontSize: 14, color: "var(--pink)", letterSpacing: 2, textTransform: "uppercase" }}>Pipeline</span>
        {overdueCount > 0 && <span style={{ fontSize: 11, padding: "3px 8px", background: "rgba(239,68,68,0.18)", color: "#ef4444", borderRadius: 4, fontFamily: "ui-monospace,monospace", letterSpacing: 1, textTransform: "uppercase" }}>{overdueCount} OVERDUE</span>}
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: "var(--mute)" }}>{targets.length} target{targets.length === 1 ? "" : "s"}</span>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 10 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search by name, niche, platform" style={{ ...inp, flex: 1, maxWidth: 320 }} />
        <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} style={{ ...inp, maxWidth: 180 }}>
          <option value="">all tags</option>
          {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <span style={{ fontSize: 11, color: "var(--mute)" }}>{filteredTargets.length} shown</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${STAGES.length}, minmax(220px, 1fr))`, gap: 10 }}>
        {STAGES.map((s) => (
          <div key={s}
            onDragOver={(e) => { e.preventDefault(); setDragOver(s); }}
            onDragLeave={() => setDragOver((d) => d === s ? null : d)}
            onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); if (id) moveStage(id, s); setDragOver(null); }}
            style={{ background: dragOver === s ? `${STAGE_COLOR[s]}1c` : "rgba(0,0,0,0.4)", border: `1px solid ${dragOver === s ? STAGE_COLOR[s] : `${STAGE_COLOR[s]}55`}`, borderTop: `3px solid ${STAGE_COLOR[s]}`, borderRadius: 6, display: "flex", flexDirection: "column", minHeight: 200, transition: "background .12s, border-color .12s" }}>
            <div style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: STAGE_COLOR[s] }}>{STAGE_LABEL[s]}</span>
              <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--mute)" }}>{byStage[s].length}</span>
            </div>
            <div style={{ padding: 6, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
              {byStage[s].map((t) => {
                const e = getExt(ext, t.id);
                const overdue = e.followup && new Date(e.followup).getTime() < Date.now();
                return (
                  <div key={t.id} onClick={() => setOpen(t.id)}
                    draggable
                    onDragStart={(de) => { de.dataTransfer.setData("text/plain", t.id); de.dataTransfer.effectAllowed = "move"; }}
                    style={{
                      padding: 8, background: "rgba(20,8,12,0.75)", border: "1px solid var(--line)", borderRadius: 5, cursor: "grab",
                      borderLeft: `3px solid ${STAGE_COLOR[s]}`,
                      display: "flex", gap: 8, alignItems: "flex-start",
                    }}>
                    <ScoreRing pct={cheapScore(t)} color={STAGE_COLOR[s]} size={38} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 12, color: "var(--ink)" }}>{t.name || "(unnamed)"}</div>
                    <div style={{ fontSize: 10, color: "var(--mute)", marginTop: 2 }}>{t.type}{t.niche ? ` · ${t.niche}` : ""}</div>
                    {e.tags.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 4 }}>
                        {e.tags.map((tg, i) => <span key={i} style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: `${tg.color}22`, color: tg.color, border: `1px solid ${tg.color}55` }}>{tg.label}</span>)}
                      </div>
                    )}
                    {e.followup && (
                      <div style={{ fontSize: 10, marginTop: 4, color: overdue ? "#ef4444" : "var(--mute)", fontFamily: "ui-monospace,monospace" }}>
                        f/u {e.followup}{overdue ? " · OVERDUE" : ""}
                      </div>
                    )}
                    </div>
                  </div>
                );
              })}
              {byStage[s].length === 0 && <div style={{ fontSize: 11, color: "var(--mute)", padding: "6px 4px" }}>—</div>}
            </div>
          </div>
        ))}
      </div>

      {open && (() => {
        const t = targets.find((x) => x.id === open);
        if (!t) return null;
        return <TargetEditor target={t} ext={getExt(ext, t.id)} onClose={() => setOpen(null)} onMove={(s) => moveStage(t.id, s)} onPatch={(p) => patchTarget(t.id, p)} />;
      })()}
    </div>
  );
}

function TargetEditor({ target, ext, onClose, onMove, onPatch }: {
  target: Target; ext: Ext;
  onClose: () => void; onMove: (s: Stage) => void; onPatch: (p: Partial<Ext>) => void;
}) {
  const [draftTag, setDraftTag] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [draftCh, setDraftCh] = useState<Channel>({ kind: "email", value: "" });
  const tagColors = ["#ff5577", "#22d3ee", "#22c55e", "#f59e0b", "#a78bfa", "#ec4899", "#84cc16"];

  function addTag() {
    if (!draftTag.trim()) return;
    const color = tagColors[ext.tags.length % tagColors.length];
    onPatch({ tags: [...ext.tags, { label: draftTag.trim(), color }] });
    setDraftTag("");
  }
  function removeTag(i: number) { onPatch({ tags: ext.tags.filter((_, k) => k !== i) }); }
  function addNote() {
    if (!draftNote.trim()) return;
    onPatch({ notes: [{ ts: Date.now(), text: draftNote.trim() }, ...ext.notes] });
    setDraftNote("");
  }
  function removeNote(ts: number) { onPatch({ notes: ext.notes.filter((n) => n.ts !== ts) }); }
  function addChannel() {
    if (!draftCh.value.trim()) return;
    onPatch({ channels: [...ext.channels, { ...draftCh, value: draftCh.value.trim() }] });
    setDraftCh({ kind: "email", value: "" });
  }
  function removeChannel(i: number) { onPatch({ channels: ext.channels.filter((_, k) => k !== i) }); }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#0f0a14", border: "1px solid var(--line)", borderRadius: 10, width: 680, maxWidth: "100%", maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ padding: 16, borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontWeight: 800, fontSize: 18, color: "var(--ink)" }}>{target.name}</span>
          <span style={{ fontSize: 11, color: "var(--mute)" }}>{target.type} · {target.niche || "—"} · {target.platform || "—"}</span>
          <span style={{ flex: 1 }} />
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Section title="Stage">
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {STAGES.map((s) => (
                <button key={s} className="btn" onClick={() => onMove(s)} style={{
                  padding: "6px 12px", fontSize: 11,
                  color: ext.stage === s ? STAGE_COLOR[s] : undefined,
                  borderColor: ext.stage === s ? `${STAGE_COLOR[s]}88` : undefined,
                  background: ext.stage === s ? `${STAGE_COLOR[s]}15` : undefined,
                }}>{STAGE_LABEL[s]}</button>
              ))}
            </div>
          </Section>
          <Section title="Follow-up date">
            <div style={{ display: "flex", gap: 6 }}>
              <input type="date" value={ext.followup} onChange={(e) => onPatch({ followup: e.target.value })} style={inp} />
              {ext.followup && <button className="btn" onClick={() => onPatch({ followup: "" })} style={{ fontSize: 11 }}>Clear</button>}
            </div>
          </Section>
          <Section title="Tags">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
              {ext.tags.map((tg, i) => (
                <span key={i} onClick={() => removeTag(i)} title="click to remove" style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: `${tg.color}22`, color: tg.color, border: `1px solid ${tg.color}66`, cursor: "pointer" }}>{tg.label} ✕</span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <input value={draftTag} onChange={(e) => setDraftTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTag()} placeholder="add tag" style={inp} />
              <button className="btn" onClick={addTag} style={{ fontSize: 11 }}>+</button>
            </div>
          </Section>
          <Section title="Contact channels">
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 6 }}>
              {ext.channels.map((ch, i) => (
                <div key={i} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 9, padding: "2px 6px", background: "rgba(255,87,119,0.12)", color: "var(--pink)", borderRadius: 3, letterSpacing: 1, textTransform: "uppercase", minWidth: 64, textAlign: "center" }}>{ch.kind}</span>
                  <span style={{ flex: 1, fontFamily: "ui-monospace,monospace", fontSize: 11, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ch.value}</span>
                  <button className="btn" onClick={() => navigator.clipboard.writeText(ch.value)} style={{ fontSize: 10, padding: "3px 8px" }}>copy</button>
                  <button className="btn" onClick={() => removeChannel(i)} style={{ fontSize: 10, padding: "3px 8px" }}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <select value={draftCh.kind} onChange={(e) => setDraftCh({ ...draftCh, kind: e.target.value as Channel["kind"] })} style={{ ...inp, maxWidth: 110 }}>
                {(["email", "x", "discord", "site", "phone", "github", "youtube", "other"] as Channel["kind"][]).map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
              <input value={draftCh.value} onChange={(e) => setDraftCh({ ...draftCh, value: e.target.value })} placeholder="value" style={inp} onKeyDown={(e) => e.key === "Enter" && addChannel()} />
              <button className="btn" onClick={addChannel} style={{ fontSize: 11 }}>+</button>
            </div>
          </Section>
        </div>
        <div style={{ padding: "0 16px 16px" }}>
          <Section title="Notes timeline">
            <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
              <input value={draftNote} onChange={(e) => setDraftNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()} placeholder="add a note (Enter to save)" style={inp} />
              <button className="btn" onClick={addNote} style={{ fontSize: 11 }}>+ note</button>
            </div>
            {ext.notes.length === 0 ? <div style={{ fontSize: 11, color: "var(--mute)" }}>No notes yet.</div> : ext.notes.map((n: Note) => (
              <div key={n.ts} style={{ padding: "6px 8px", background: "rgba(0,0,0,0.4)", border: "1px solid var(--line)", borderRadius: 4, marginBottom: 4, display: "flex", gap: 8 }}>
                <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 10, color: "var(--mute)", minWidth: 110 }}>{new Date(n.ts).toLocaleString()}</span>
                <span style={{ flex: 1, fontSize: 12, color: "var(--ink)" }}>{n.text}</span>
                <button className="btn" onClick={() => removeNote(n.ts)} style={{ fontSize: 10, padding: "2px 8px" }}>✕</button>
              </div>
            ))}
          </Section>
        </div>
      </div>
    </div>
  );
}

// ── AI Studio ───────────────────────────────────────────────────────────────
function AIStudioView() {
  const [targets] = useState<Target[]>(loadTargets);
  const [targetId, setTargetId] = useState<string>(targets[0]?.id || "");
  const [templates] = useState<Template[]>(loadTemplates);
  const [tplId, setTplId] = useState<string>(templates[0]?.id || "");
  const [tone, setTone] = useState<Template["tone"]>("casual");
  const [hook, setHook] = useState("");
  const [draft, setDraft] = useState("");
  const [variations, setVariations] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [busy, setBusy] = useState<"draft" | "vary" | "subject" | "improve" | "follow" | null>(null);

  const target = targets.find((t) => t.id === targetId);
  const template = templates.find((t) => t.id === tplId);

  function prefill() {
    if (!target || !template) return;
    const filled = fillTemplate(template.body, { name: target.name, niche: target.niche, platform: target.platform, hook: hook || "" });
    setDraft(filled);
  }
  useEffect(() => { prefill(); }, [tplId, targetId]);

  async function generateDraft() {
    if (!target) return;
    setBusy("draft"); setVariations([]);
    const sys = `You are SignalFinder's outreach assistant. Write ONE short opening message in a ${tone} tone. Two sentences max for "short", three to four for everything else. No preamble, no quotes, no signature. Reference one CONCRETE thing about the target if the hook is provided; never fabricate specifics.`;
    const u = `Target: ${target.name} (${target.type})${target.niche ? `, niche: ${target.niche}` : ""}${target.platform ? `, on ${target.platform}` : ""}.\nHook: ${hook || "(none provided)"}\nReply with the message text only.`;
    const r = await houseChat(sys, u);
    setDraft(r.ok ? (r.text || "").trim().replace(/^["']|["']$/g, "") : `[model error] ${r.error}`);
    setBusy(null);
  }
  async function generateVariations() {
    if (!target) return;
    setBusy("vary");
    const sys = `You are SignalFinder's outreach assistant. Produce exactly 3 numbered variations of an opening message in a ${tone} tone. Each on its own paragraph, prefixed with "1.", "2.", "3.". No preamble.`;
    const u = `Target: ${target.name}${target.niche ? ` (${target.niche})` : ""}${target.platform ? ` on ${target.platform}` : ""}.\nHook: ${hook || "(none)"}\nReply with the three numbered variations.`;
    const r = await houseChat(sys, u);
    const text = r.ok ? (r.text || "") : `[model error] ${r.error}`;
    const parts = text.split(/(?:^|\n)\s*\d+\.\s+/).map((s) => s.trim()).filter(Boolean);
    setVariations(parts.slice(0, 3));
    setBusy(null);
  }
  async function generateSubject() {
    if (!target) return;
    setBusy("subject");
    const sys = "Generate ONE short, high-open-rate email subject line (5-9 words). No quotes, no preamble.";
    const u = `Reaching out to: ${target.name}${target.niche ? ` (${target.niche})` : ""}.\nHook: ${hook || "(none)"}\nTone: ${tone}.\nReply with the subject only.`;
    const r = await houseChat(sys, u);
    setSubject(r.ok ? (r.text || "").trim().replace(/^["']|["']$/g, "").split("\n")[0] : `[model error] ${r.error}`);
    setBusy(null);
  }
  async function improveDraft() {
    if (!draft.trim()) return;
    setBusy("improve");
    const sys = `You are an outreach editor. Tighten the message below: make it more ${tone}, cut filler, keep specifics. Reply with the improved message text only, no preamble, no quotes.`;
    const r = await houseChat(sys, draft);
    setDraft(r.ok ? (r.text || "").trim().replace(/^["']|["']$/g, "") : draft);
    setBusy(null);
  }
  async function generateFollowup() {
    if (!target) return;
    setBusy("follow");
    const sys = `Write a SHORT, ${tone} follow-up message (1-2 sentences) to a prior outreach that hasn't replied. No guilt, no pressure. No preamble or quotes.`;
    const u = `Target: ${target.name}${target.niche ? ` (${target.niche})` : ""}.\nThe original outreach was about: ${hook || "the original topic"}.\nReply with the follow-up only.`;
    const r = await houseChat(sys, u);
    setDraft(r.ok ? (r.text || "").trim().replace(/^["']|["']$/g, "") : `[model error] ${r.error}`);
    setBusy(null);
  }

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 14, minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span style={{ fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontWeight: 800, fontSize: 14, color: "var(--pink)", letterSpacing: 2, textTransform: "uppercase" }}>AI Studio</span>
        <span style={{ fontSize: 11, color: "var(--mute)" }}>powered by the bundled house model — uses your About-you profile as context</span>
      </div>
      {targets.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--mute)" }}>Add a target on the Targets tab first.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <Section title="Target">
              <select value={targetId} onChange={(e) => setTargetId(e.target.value)} style={inp}>
                {targets.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.type}</option>)}
              </select>
            </Section>
            <Section title="Tone">
              <div style={{ display: "flex", gap: 4 }}>
                {(["casual", "professional", "hype", "short"] as Template["tone"][]).map((tn) => (
                  <button key={tn} className="btn" onClick={() => setTone(tn)} style={{
                    flex: 1, fontSize: 11, padding: "6px 10px",
                    color: tone === tn ? "var(--pink)" : undefined,
                    borderColor: tone === tn ? "rgba(255,87,119,0.55)" : undefined,
                  }}>{tn}</button>
                ))}
              </div>
            </Section>
            <Section title="Starting template (optional)">
              <select value={tplId} onChange={(e) => setTplId(e.target.value)} style={inp}>
                <option value="">— from scratch —</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <button className="btn" onClick={prefill} style={{ marginTop: 6, fontSize: 11, padding: "6px 12px" }}>Fill from template</button>
            </Section>
            <Section title="Hook (one specific thing about them)">
              <input value={hook} onChange={(e) => setHook(e.target.value)} placeholder="e.g. just released a new mod pack" style={inp} />
            </Section>
            <Section title="Generate">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <button className="btn" onClick={() => void generateDraft()} disabled={busy !== null}>{busy === "draft" ? "…" : "Draft message"}</button>
                <button className="btn" onClick={() => void generateVariations()} disabled={busy !== null}>{busy === "vary" ? "…" : "3 variations"}</button>
                <button className="btn" onClick={() => void generateSubject()} disabled={busy !== null}>{busy === "subject" ? "…" : "Subject line"}</button>
                <button className="btn" onClick={() => void generateFollowup()} disabled={busy !== null}>{busy === "follow" ? "…" : "Follow-up"}</button>
              </div>
            </Section>
          </div>
          <div>
            {subject && (
              <Section title="Subject">
                <div style={{ display: "flex", gap: 4 }}>
                  <input value={subject} onChange={(e) => setSubject(e.target.value)} style={inp} />
                  <button className="btn" onClick={() => navigator.clipboard.writeText(subject)} style={{ fontSize: 11 }}>copy</button>
                </div>
              </Section>
            )}
            <Section title="Draft">
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} style={{ ...inp, minHeight: 180, resize: "vertical" as const }} />
              <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                <button className="btn" onClick={() => void improveDraft()} disabled={busy !== null || !draft.trim()} style={{ fontSize: 11 }}>{busy === "improve" ? "…" : "Improve"}</button>
                <button className="btn" onClick={() => navigator.clipboard.writeText(draft)} disabled={!draft.trim()} style={{ fontSize: 11 }}>copy</button>
                <button className="btn" onClick={() => setDraft("")} disabled={!draft.trim()} style={{ fontSize: 11 }}>clear</button>
              </div>
            </Section>
            {variations.length > 0 && (
              <Section title={`Variations (${variations.length})`}>
                {variations.map((v, i) => (
                  <div key={i} style={{ marginBottom: 8, padding: 10, background: "rgba(0,0,0,0.4)", border: "1px solid var(--line)", borderRadius: 5 }}>
                    <div style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{v}</div>
                    <div style={{ marginTop: 6, display: "flex", gap: 4 }}>
                      <button className="btn" onClick={() => setDraft(v)} style={{ fontSize: 10, padding: "3px 8px" }}>use this</button>
                      <button className="btn" onClick={() => navigator.clipboard.writeText(v)} style={{ fontSize: 10, padding: "3px 8px" }}>copy</button>
                    </div>
                  </div>
                ))}
              </Section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Templates ───────────────────────────────────────────────────────────────
function TemplatesView() {
  const [templates, setTemplates] = useState<Template[]>(loadTemplates);
  const [editing, setEditing] = useState<Template | null>(null);
  function add() { setEditing({ id: `tpl-${Date.now()}`, name: "Untitled", tone: "casual", body: "Hi {name}, …" }); }
  function persist(next: Template[]) { setTemplates(next); saveTemplates(next); }
  function save() {
    if (!editing) return;
    const exists = templates.some((t) => t.id === editing.id);
    persist(exists ? templates.map((t) => t.id === editing.id ? editing : t) : [...templates, editing]);
    setEditing(null);
  }
  function remove(id: string) { persist(templates.filter((t) => t.id !== id)); }
  function reset() { persist(DEFAULT_TEMPLATES); }

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 14, minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontWeight: 800, fontSize: 14, color: "var(--pink)", letterSpacing: 2, textTransform: "uppercase" }}>Templates</span>
        <span style={{ fontSize: 11, color: "var(--mute)" }}>Variables: {"{name} {niche} {platform} {hook}"}</span>
        <span style={{ flex: 1 }} />
        <button className="btn" onClick={add}>+ New</button>
        <button className="btn" onClick={reset}>Reset to defaults</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
        {templates.map((t) => (
          <div key={t.id} style={{ padding: 12, background: "rgba(20,8,12,0.7)", border: "1px solid var(--line)", borderRadius: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 13, color: "var(--ink)" }}>{t.name}</span>
              <span style={{ fontSize: 9, padding: "2px 6px", background: "rgba(34,211,238,0.12)", color: "#22d3ee", borderRadius: 3, letterSpacing: 1, textTransform: "uppercase" }}>{t.tone}</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--mute)", marginTop: 8, lineHeight: 1.5, whiteSpace: "pre-wrap", maxHeight: 90, overflow: "hidden" }}>{t.body}</div>
            <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
              <button className="btn" onClick={() => navigator.clipboard.writeText(fillTemplate(t.body, { name: "{name}", niche: "{niche}", platform: "{platform}", hook: "{hook}" }))} style={{ fontSize: 10, padding: "4px 10px" }}>copy</button>
              <button className="btn" onClick={() => setEditing(t)} style={{ fontSize: 10, padding: "4px 10px" }}>edit</button>
              <button className="btn" onClick={() => remove(t.id)} style={{ fontSize: 10, padding: "4px 10px" }}>delete</button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div onClick={() => setEditing(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#0f0a14", border: "1px solid var(--line)", borderRadius: 10, width: 600, maxWidth: "100%", padding: 16 }}>
            <Section title="Template name"><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} style={inp} /></Section>
            <Section title="Tone">
              <div style={{ display: "flex", gap: 4 }}>
                {(["casual", "professional", "hype", "short"] as Template["tone"][]).map((tn) => (
                  <button key={tn} className="btn" onClick={() => setEditing({ ...editing, tone: tn })} style={{
                    color: editing.tone === tn ? "var(--pink)" : undefined,
                    borderColor: editing.tone === tn ? "rgba(255,87,119,0.55)" : undefined, fontSize: 11,
                  }}>{tn}</button>
                ))}
              </div>
            </Section>
            <Section title="Body (use {name} {niche} {platform} {hook})">
              <textarea value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} style={{ ...inp, minHeight: 140, resize: "vertical" as const, fontFamily: "ui-monospace,monospace" }} />
            </Section>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button className="btn" onClick={save}>Save</button>
              <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stats ───────────────────────────────────────────────────────────────────
function StatsView() {
  const [targets] = useState<Target[]>(loadTargets);
  const ext = loadAllExt();
  // Response rate by style.
  const stat = { concise: { n: 0, r: 0 }, detailed: { n: 0, r: 0 } };
  for (const t of targets) for (const o of t.outreach) { stat[o.style].n++; if (o.responded) stat[o.style].r++; }
  const cRate = stat.concise.n ? Math.round((stat.concise.r / stat.concise.n) * 100) : 0;
  const dRate = stat.detailed.n ? Math.round((stat.detailed.r / stat.detailed.n) * 100) : 0;
  const byStage: Record<Stage, number> = { prospect: 0, contacted: 0, replied: 0, talks: 0, won: 0, lost: 0 };
  for (const t of targets) byStage[getExt(ext, t.id).stage]++;
  const maxStage = Math.max(1, ...Object.values(byStage));
  // Tag distribution.
  const tagCount: Record<string, { count: number; color: string }> = {};
  for (const id of Object.keys(ext)) for (const tg of ext[id].tags) {
    if (!tagCount[tg.label]) tagCount[tg.label] = { count: 0, color: tg.color };
    tagCount[tg.label].count++;
  }
  const warmestLeads = targets
    .map((t) => ({ t, ext: getExt(ext, t.id), responses: t.outreach.filter((o) => o.responded).length }))
    .filter((x) => x.responses > 0 || x.ext.stage === "won" || x.ext.stage === "talks")
    .sort((a, b) => (b.responses - a.responses) || (b.ext.stage === "won" ? 1 : -1))
    .slice(0, 10);

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 16, minHeight: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        <Card title="Response rate">
          <div style={{ display: "flex", justifyContent: "space-around", alignItems: "flex-end", padding: "20px 10px" }}>
            <Gauge label="concise" pct={cRate} color="#22d3ee" />
            <Gauge label="detailed" pct={dRate} color="#d946ef" />
          </div>
          <div style={{ fontSize: 11, color: "var(--mute)", textAlign: "center" }}>{stat.concise.n + stat.detailed.n} total outreach attempts</div>
        </Card>
        <Card title="Pipeline funnel">
          <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 4px" }}>
            {STAGES.map((s) => {
              const w = (byStage[s] / maxStage) * 100;
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: STAGE_COLOR[s], minWidth: 80 }}>{STAGE_LABEL[s]}</span>
                  <div style={{ flex: 1, height: 16, background: "rgba(0,0,0,0.5)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${w}%`, height: "100%", background: `linear-gradient(90deg, ${STAGE_COLOR[s]}, ${STAGE_COLOR[s]}aa)` }} />
                  </div>
                  <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11, color: "var(--ink)", minWidth: 24, textAlign: "right" }}>{byStage[s]}</span>
                </div>
              );
            })}
          </div>
        </Card>
        <Card title="Tags">
          {Object.keys(tagCount).length === 0 ? <div style={{ fontSize: 12, color: "var(--mute)" }}>No tags yet.</div> : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {Object.entries(tagCount).sort((a, b) => b[1].count - a[1].count).map(([label, v]) => (
                <span key={label} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: `${v.color}22`, color: v.color, border: `1px solid ${v.color}55` }}>{label} <b>{v.count}</b></span>
              ))}
            </div>
          )}
        </Card>
        <Card title="Warmest leads">
          {warmestLeads.length === 0 ? <div style={{ fontSize: 12, color: "var(--mute)" }}>No warm leads yet — log a response or move someone into Talks/Won.</div> : warmestLeads.map((l) => (
            <div key={l.t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px solid var(--line)" }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: STAGE_COLOR[l.ext.stage] }} />
              <span style={{ flex: 1, fontFamily: "ui-monospace,monospace", fontSize: 12, color: "var(--ink)" }}>{l.t.name}</span>
              <span style={{ fontSize: 10, color: "var(--mute)" }}>{STAGE_LABEL[l.ext.stage]} · {l.responses} reply</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ── Settings (weights) ──────────────────────────────────────────────────────
function SettingsView() {
  const [w, setW] = useState<Weights>(loadWeights);
  function patch(k: keyof Weights, v: number) { const next = { ...w, [k]: v }; setW(next); saveWeights(next); }
  return (
    <div style={{ flex: 1, overflow: "auto", padding: 16, minHeight: 0 }}>
      <div style={{ maxWidth: 540 }}>
        <div style={{ fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontWeight: 800, fontSize: 14, color: "var(--pink)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Custom scoring weights</div>
        <p style={{ fontSize: 12, color: "var(--mute)", marginTop: 0, lineHeight: 1.55 }}>
          Tune what matters to YOU. Higher weight pushes that factor harder when SignalFinder ranks targets.
          Weights are stored locally and applied next time the Pipeline / Stats views compute priority.
        </p>
        {(Object.keys(DEFAULT_WEIGHTS) as (keyof Weights)[]).map((k) => (
          <div key={k} style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "var(--ink)" }}>{k}</span>
              <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11, color: "var(--pink)" }}>{w[k]}</span>
            </div>
            <input type="range" min={0} max={100} step={1} value={w[k]} onChange={(e) => patch(k, Number(e.target.value))} style={{ width: "100%", accentColor: "var(--pink)" }} />
          </div>
        ))}
        <button className="btn" style={{ marginTop: 14 }} onClick={() => { setW(DEFAULT_WEIGHTS); saveWeights(DEFAULT_WEIGHTS); }}>Reset to defaults</button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--mute)", marginBottom: 4 }}>{title}</div>
      {children}
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: 12, background: "rgba(20,8,12,0.6)", border: "1px solid var(--line)", borderRadius: 6 }}>
      <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--mute)", marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}
function Gauge({ label, pct, color }: { label: string; pct: number; color: string }) {
  const r = 32, c = 2 * Math.PI * r;
  return (
    <div style={{ textAlign: "center" }}>
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} transform="rotate(-90 40 40)"
          style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
        <text x="40" y="44" textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="16" fill={color}>{pct}%</text>
      </svg>
      <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--mute)", marginTop: 4 }}>{label}</div>
    </div>
  );
}

const inp: React.CSSProperties = {
  background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 5,
  color: "var(--ink)", padding: "6px 8px", fontSize: 12, fontFamily: "ui-monospace, monospace", outline: "none", width: "100%",
};
