import { useEffect, useMemo, useState } from "react";
import { SignalFinderTargets } from "../SignalFinder";
import {
  STAGES, STAGE_LABEL, STAGE_COLOR, type Stage, type Ext, type Channel, type Tag, type Note,
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

type View = "targets" | "pipeline" | "templates" | "stats" | "settings";

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

export function SignalFinder() {
  const [view, setView] = useState<View>("targets");
  return (
    <div className="stage" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "8px 14px", borderBottom: "1px solid var(--line)", background: C_BAR_BG }}>
        <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "var(--mute)", marginRight: 6 }}>SignalFinder</span>
        {(["targets", "pipeline", "templates", "stats", "settings"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className="btn" style={{
            padding: "6px 14px", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase",
            color: view === v ? "var(--pink)" : undefined, borderColor: view === v ? "rgba(255,87,119,0.55)" : undefined,
            background: view === v ? "rgba(255,87,119,0.08)" : undefined,
          }}>{v}</button>
        ))}
        <span style={{ flex: 1 }} />
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {view === "targets" && <SignalFinderTargets />}
        {view === "pipeline" && <PipelineView />}
        {view === "templates" && <TemplatesView />}
        {view === "stats" && <StatsView />}
        {view === "settings" && <SettingsView />}
      </div>
    </div>
  );
}

// ── Pipeline ────────────────────────────────────────────────────────────────
function PipelineView() {
  const [targets, setTargets] = useState<Target[]>(loadTargets);
  const [ext, setExt] = useState(loadAllExt);
  const [open, setOpen] = useState<string | null>(null);

  // Pick up changes whenever this view is shown.
  useEffect(() => { setTargets(loadTargets()); setExt(loadAllExt()); }, []);

  function moveStage(id: string, stage: Stage) { setExt(patchExt(id, { stage })); }
  function patchTarget(id: string, p: Partial<Ext>) { setExt(patchExt(id, p)); }

  const byStage: Record<Stage, Target[]> = { prospect: [], contacted: [], replied: [], talks: [], won: [], lost: [] };
  for (const t of targets) byStage[getExt(ext, t.id).stage].push(t);
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
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${STAGES.length}, minmax(220px, 1fr))`, gap: 10 }}>
        {STAGES.map((s) => (
          <div key={s} style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${STAGE_COLOR[s]}55`, borderTop: `3px solid ${STAGE_COLOR[s]}`, borderRadius: 6, display: "flex", flexDirection: "column", minHeight: 200 }}>
            <div style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: STAGE_COLOR[s] }}>{STAGE_LABEL[s]}</span>
              <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--mute)" }}>{byStage[s].length}</span>
            </div>
            <div style={{ padding: 6, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
              {byStage[s].map((t) => {
                const e = getExt(ext, t.id);
                const overdue = e.followup && new Date(e.followup).getTime() < Date.now();
                return (
                  <div key={t.id} onClick={() => setOpen(t.id)} style={{
                    padding: 8, background: "rgba(20,8,12,0.75)", border: "1px solid var(--line)", borderRadius: 5, cursor: "pointer",
                    borderLeft: `3px solid ${STAGE_COLOR[s]}`,
                  }}>
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
