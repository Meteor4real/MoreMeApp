// MoreMe — calendar-first UI. Today / Calendar / Projects / Goals /
// Achievements / Levels, plus a full event editor. Subscribes to the single
// store; XP is earned by completing scheduled items and project milestones.

import { useEffect, useMemo, useState } from "react";
import { T } from "./styles";
import {
  CATEGORY_META, CATEGORY_ORDER, MAX_LEVEL, cumulativeXp, levelStep,
} from "./types";
import type {
  CalEvent, Category, ChecklistItem, Goal, Person, Priority, Project,
  ProjectKind, Recurrence, State, Visibility,
} from "./types";
import {
  ACHIEVEMENTS, achievementProgress, blankEvent, blankProject,
  conflictIds, dayComplete, distractionsOn, eventsOnDate, fmtTime, iso, isDone,
  levelInfo, loadState, logDistraction, monthLabel, removeDistraction,
  removeEvent, removePerson, removeProject, revealEvent, setGoals, setReward,
  streakInfo, subscribeState, today, toggleDone, uid, upsertEvent, upsertPerson,
  upsertProject, xpForDate,
} from "./store";

type Tab = "today" | "calendar" | "projects" | "goals" | "achievements" | "levels";

function useStore(): State {
  const [s, setS] = useState<State>(loadState);
  useEffect(() => subscribeState(setS), []);
  return s;
}

export function MoreMeUI() {
  const s = useStore();
  const [tab, setTab] = useState<Tab>("today");
  const [editing, setEditing] = useState<CalEvent | null>(null);

  const tabs: Tab[] = ["today", "calendar", "projects", "goals", "achievements", "levels"];

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <Header s={s} />
      <div style={{ display: "flex", gap: 6, padding: "10px 18px", flexWrap: "wrap", borderBottom: `1px solid ${T.line}` }}>
        {tabs.map((t) => (
          <button key={t} className={"mm-tab" + (tab === t ? " active" : "")} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      <div className="scrolly" style={{ flex: 1, minHeight: 0, padding: 18 }}>
        {tab === "today" && <TodayView s={s} onEdit={setEditing} />}
        {tab === "calendar" && <CalendarView s={s} onEdit={setEditing} />}
        {tab === "projects" && <ProjectsView s={s} />}
        {tab === "goals" && <GoalsView s={s} />}
        {tab === "achievements" && <AchievementsView s={s} />}
        {tab === "levels" && <LevelsView s={s} />}
      </div>
      {editing && <EventEditor s={s} draft={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

// ── header: level bar + streak + today XP ─────────────────────────────────
function Header({ s }: { s: State }) {
  const lv = levelInfo(s);
  const { current } = streakInfo(s);
  const tx = xpForDate(today(), s);
  const pct = lv.isMax ? 100 : Math.round((lv.into / lv.span) * 100);
  return (
    <div style={{ padding: "16px 18px 12px", borderBottom: `1px solid ${T.line}`, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
      <div>
        <div className="mm-h1" style={{ fontSize: 26, lineHeight: 1 }}>MoreMe</div>
        <div style={{ fontSize: 11, color: T.inkTiny, letterSpacing: ".08em", textTransform: "uppercase", marginTop: 3 }}>
          Mount Vernon · Innovation Diploma
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 240 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
          <b style={{ color: T.mint }}>Level {lv.level}{lv.isMax ? " · MAX" : ""}</b>
          <span style={{ color: T.inkTiny }}>{lv.total.toLocaleString()} XP{lv.isMax ? "" : ` · ${lv.nextAt.toLocaleString()} to L${lv.level + 1}`}</span>
        </div>
        <div className="mm-progress"><div className="mm-progress-fill" style={{ width: pct + "%" }} /><div className="mm-progress-text">{pct}%</div></div>
      </div>
      <Stat label="Streak" value={`${current}d`} />
      <Stat label="Today" value={`${tx.earned}/${tx.possible} XP`} />
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: "center", minWidth: 64 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: T.mint }}>{value}</div>
      <div style={{ fontSize: 10, color: T.inkTiny, letterSpacing: ".1em", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

// ── shared: one event row with a complete checkbox ────────────────────────
function EventRow({ e, date, s, onEdit }: { e: CalEvent; date: string; s: State; onEdit: (e: CalEvent) => void }) {
  const meta = CATEGORY_META[e.category];
  const done = isDone(e, date, s);
  const conflict = conflictIds(date, s).has(e.id);
  const hidden = e.visibility === "hidden";
  return (
    <div className={"mm-action" + (done ? " done" : "") + (conflict ? " mm-conflict" : "")} style={{ cursor: "default" }}>
      <button
        onClick={() => toggleDone(e.id, date)}
        title={done ? "Mark not done" : "Complete (+XP)"}
        style={{ width: 22, height: 22, flex: "none", borderRadius: 6, border: `2px solid ${meta.color}`, background: done ? meta.color : "transparent", color: T.bg, cursor: "pointer", fontSize: 13, lineHeight: 1 }}
      >{done ? "✓" : ""}</button>
      <span className="mm-dot" style={{ ["--c" as never]: meta.color }} />
      <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => onEdit(e)}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <b style={{ fontSize: 13 }}>{e.title || "(untitled)"}</b>
          {e.priority === "high" && <span className="mm-pill" style={{ background: T.warn + "22", color: T.warn }}>High</span>}
          {hidden && <span className="mm-pill" style={{ background: "#FFD23E22", color: "#FFD23E" }}>Hidden</span>}
        </div>
        <div style={{ fontSize: 11, color: T.inkTiny, marginTop: 2 }}>
          {meta.label}
          {!e.allDay && e.start ? ` · ${fmtTime(e.start)}${e.end ? "–" + fmtTime(e.end) : ""}` : e.allDay ? " · all day" : ""}
          {e.location ? ` · ${e.location}` : ""}
          {e.xp ? ` · ${e.xp} XP` : ""}
          {e.people.length ? ` · ${e.people.map((id) => s.people.find((p) => p.id === id)?.name).filter(Boolean).join(", ")}` : ""}
        </div>
        {e.checklist.length > 0 && (
          <div style={{ fontSize: 11, color: T.inkSoft, marginTop: 3 }}>
            {e.checklist.filter((c) => c.done).length}/{e.checklist.length} sub-tasks
          </div>
        )}
      </div>
      <button className="mm-btn" style={{ padding: "4px 8px" }} onClick={() => onEdit(e)}>Edit</button>
    </div>
  );
}

// ── Today ─────────────────────────────────────────────────────────────────
function TodayView({ s, onEdit }: { s: State; onEdit: (e: CalEvent) => void }) {
  const date = today();
  const evs = eventsOnDate(date, s);
  const routines = evs.filter((e) => e.category === "routine");
  const rest = evs.filter((e) => e.category !== "routine");
  const dists = distractionsOn(date, s);
  const conflicts = conflictIds(date, s);

  return (
    <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr", maxWidth: 760, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="serif" style={{ fontSize: 20 }}>{new Date(date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>
        <button className="mm-btn mm-btn-primary" onClick={() => onEdit({ ...blankEvent(date) })}>+ New item</button>
      </div>

      {conflicts.size > 0 && (
        <div className="mm-card" style={{ padding: "10px 14px", borderColor: T.warn, color: T.warn, fontSize: 12 }}>
          {conflicts.size} item{conflicts.size === 1 ? "" : "s"} overlap in time today — adjust the schedule.
        </div>
      )}

      <Section title={`Routine · ${routines.filter((e) => isDone(e, date, s)).length}/${routines.length}`}>
        {routines.length === 0 ? <Empty>No routines today.</Empty> : routines.map((e) => <EventRow key={e.id} e={e} date={date} s={s} onEdit={onEdit} />)}
      </Section>

      <Section title="Scheduled">
        {rest.length === 0 ? <Empty>Nothing scheduled. Add a class, meeting, or project block.</Empty> : rest.map((e) => <EventRow key={e.id} e={e} date={date} s={s} onEdit={onEdit} />)}
      </Section>

      <Section title="Distraction-free check">
        <div style={{ fontSize: 12, color: T.inkSoft, marginBottom: 8 }}>
          Zero distractions is the standing expectation — not a box to check. If you slipped, log it honestly; a clean day counts toward Quiet streaks.
        </div>
        {dists.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
            {dists.map((d) => (
              <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.warn }}>
                <span style={{ flex: 1 }}>{d.note}</span>
                <button className="mm-btn" style={{ padding: "2px 8px" }} onClick={() => removeDistraction(d.id)}>×</button>
              </div>
            ))}
          </div>
        )}
        <DistractionAdder />
      </Section>
    </div>
  );
}
function DistractionAdder() {
  const [v, setV] = useState("");
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input placeholder="What pulled you off-task?" value={v} onChange={(e) => setV(e.target.value)} style={{ flex: 1 }} />
      <button className="mm-btn mm-btn-danger" onClick={() => { logDistraction(v.trim()); setV(""); }}>Log distraction</button>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mm-card" style={{ padding: 16 }}>
      <div style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: T.inkTiny, marginBottom: 10 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color: T.inkTiny, fontStyle: "italic" }}>{children}</div>;
}

// ── Calendar ────────────────────────────────────────────────────────────────
function CalendarView({ s, onEdit }: { s: State; onEdit: (e: CalEvent) => void }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [sel, setSel] = useState(today());

  const grid = useMemo(() => buildMonth(cursor.y, cursor.m), [cursor]);
  const selEvents = eventsOnDate(sel, s);
  const selConflicts = conflictIds(sel, s);

  function shift(n: number) {
    setCursor((c) => { const d = new Date(c.y, c.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 16, alignItems: "start" }}>
      <div className="mm-card" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <button className="mm-btn" onClick={() => shift(-1)}>‹</button>
          <div className="serif" style={{ fontSize: 18, flex: 1, textAlign: "center" }}>{monthLabel(cursor.y, cursor.m)}</div>
          <button className="mm-btn" onClick={() => shift(1)}>›</button>
          <button className="mm-btn" onClick={() => { const d = new Date(); setCursor({ y: d.getFullYear(), m: d.getMonth() }); setSel(today()); }}>Today</button>
        </div>
        <div className="mm-cal">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="mm-dow">{d}</div>)}
          {grid.map((cell) => {
            const evs = eventsOnDate(cell.date, s);
            const isToday = cell.date === today();
            return (
              <div
                key={cell.date}
                className={"mm-day" + (cell.inMonth ? "" : " other") + (isToday ? " today" : "") + (cell.date === sel ? " selected" : "")}
                onClick={() => setSel(cell.date)}
                onDoubleClick={() => onEdit({ ...blankEvent(cell.date) })}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="mm-daynum">{cell.day}</span>
                  {dayComplete(cell.date, s) && <span style={{ color: T.mint, fontSize: 11 }}>✓</span>}
                </div>
                {evs.slice(0, 3).map((e) => (
                  <div key={e.id} className={"mm-chip" + (isDone(e, cell.date, s) ? " done" : "")} style={{ ["--c" as never]: CATEGORY_META[e.category].color }}>
                    {e.visibility === "hidden" ? "• " : ""}{e.title || CATEGORY_META[e.category].label}
                  </div>
                ))}
                {evs.length > 3 && <div style={{ fontSize: 10, color: T.inkTiny }}>+{evs.length - 3} more</div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mm-card" style={{ padding: 16, position: "sticky", top: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div className="serif" style={{ fontSize: 16 }}>{new Date(sel + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div>
          <button className="mm-btn mm-btn-primary" style={{ padding: "5px 10px" }} onClick={() => onEdit({ ...blankEvent(sel) })}>+ Add</button>
        </div>
        {selConflicts.size > 0 && <div style={{ fontSize: 11, color: T.warn, marginBottom: 8 }}>Time conflict on this day.</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {selEvents.length === 0 ? <Empty>Nothing scheduled. Double-click any day to add.</Empty> : selEvents.map((e) => <EventRow key={e.id} e={e} date={sel} s={s} onEdit={onEdit} />)}
        </div>
      </div>
    </div>
  );
}
function buildMonth(y: number, m: number): { date: string; day: number; inMonth: boolean }[] {
  const first = new Date(y, m, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const cells: { date: string; day: number; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({ date: iso(d), day: d.getDate(), inMonth: d.getMonth() === m });
  }
  return cells;
}

// ── Event editor ────────────────────────────────────────────────────────────
function EventEditor({ s, draft, onClose }: { s: State; draft: CalEvent; onClose: () => void }) {
  const [e, setE] = useState<CalEvent>(draft);
  const exists = s.events.some((x) => x.id === e.id);
  const set = <K extends keyof CalEvent>(k: K, v: CalEvent[K]) => setE((p) => ({ ...p, [k]: v }));
  const meta = CATEGORY_META[e.category];

  function save() {
    upsertEvent({ ...e, title: e.title.trim() || CATEGORY_META[e.category].label });
    onClose();
  }

  return (
    <div className="mm-modal-back" onClick={onClose}>
      <div className="mm-modal" onClick={(ev) => ev.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span className="mm-dot" style={{ ["--c" as never]: meta.color, width: 12, height: 12 }} />
          <div className="serif" style={{ fontSize: 20, flex: 1 }}>{exists ? "Edit item" : "New item"}</div>
          <button className="mm-btn" onClick={onClose}>Close</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Title">
            <input value={e.title} placeholder={meta.label} onChange={(ev) => set("title", ev.target.value)} autoFocus />
          </Field>

          <Field label="Category">
            <select value={e.category} onChange={(ev) => set("category", ev.target.value as Category)}>
              {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_META[c].label}</option>)}
            </select>
          </Field>

          <div className="mm-row">
            <Field label="Date"><input type="date" value={e.date} onChange={(ev) => set("date", ev.target.value)} /></Field>
            <Field label="All day">
              <div className="mm-seg">
                <button className={e.allDay ? "on" : ""} onClick={() => set("allDay", true)}>Yes</button>
                <button className={!e.allDay ? "on" : ""} onClick={() => set("allDay", false)}>No</button>
              </div>
            </Field>
            {!e.allDay && <>
              <Field label="Start"><input type="time" value={e.start ?? ""} onChange={(ev) => set("start", ev.target.value)} /></Field>
              <Field label="End"><input type="time" value={e.end ?? ""} onChange={(ev) => set("end", ev.target.value)} /></Field>
            </>}
          </div>

          <Field label="Location"><input value={e.location ?? ""} placeholder="Mrs. Bridget's room · Meteor HQ · Helipad" onChange={(ev) => set("location", ev.target.value)} /></Field>

          <div className="mm-row">
            <Field label="Priority">
              <div className="mm-seg">
                {(["low", "normal", "high"] as Priority[]).map((p) => (
                  <button key={p} className={e.priority === p ? "on" : ""} onClick={() => set("priority", p)}>{p}</button>
                ))}
              </div>
            </Field>
            <Field label="XP reward"><input type="number" min={0} max={500} value={e.xp} onChange={(ev) => set("xp", Math.max(0, Number(ev.target.value) || 0))} style={{ width: 90 }} /></Field>
            <Field label="Visibility">
              <div className="mm-seg">
                {(["visible", "hidden"] as Visibility[]).map((v) => (
                  <button key={v} className={e.visibility === v ? "on" : ""} onClick={() => set("visibility", v)}>{v === "hidden" ? "Unannounced" : "Visible"}</button>
                ))}
              </div>
            </Field>
          </div>

          <Field label="Repeats">
            <div className="mm-seg">
              {(["none", "daily", "weekdays", "weekly"] as Recurrence["kind"][]).map((k) => (
                <button key={k} className={e.recurrence.kind === k ? "on" : ""}
                  onClick={() => set("recurrence", k === "weekly" ? { kind: "weekly", days: [dowOf(e.date)] } : { kind: k } as Recurrence)}>{k}</button>
              ))}
            </div>
          </Field>
          {e.recurrence.kind === "weekly" && (
            <div className="mm-seg">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => {
                const days = (e.recurrence as { kind: "weekly"; days: number[] }).days;
                const on = days.includes(i);
                return <button key={i} className={on ? "on" : ""} onClick={() => set("recurrence", { kind: "weekly", days: on ? days.filter((x) => x !== i) : [...days, i] })}>{d}</button>;
              })}
            </div>
          )}
          {e.recurrence.kind !== "none" && (
            <Field label="Repeat until (optional)"><input type="date" value={e.until ?? ""} onChange={(ev) => set("until", ev.target.value || undefined)} /></Field>
          )}

          <Field label="People">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {s.people.map((p) => {
                const on = e.people.includes(p.id);
                return <button key={p.id} className={"mm-tab" + (on ? " active" : "")} onClick={() => set("people", on ? e.people.filter((x) => x !== p.id) : [...e.people, p.id])}>{p.name}</button>;
              })}
              {s.people.length === 0 && <Empty>Add people in Projects → Circle.</Empty>}
            </div>
          </Field>

          <Field label="Link to project">
            <select value={e.linkedProjectId ?? ""} onChange={(ev) => set("linkedProjectId", ev.target.value || undefined)}>
              <option value="">None</option>
              {s.projects.map((p) => <option key={p.id} value={p.id}>{p.name || "(untitled)"}</option>)}
            </select>
          </Field>

          <Field label="Sub-tasks">
            <ChecklistEditor items={e.checklist} onChange={(items) => set("checklist", items)} />
          </Field>

          <Field label="Notes"><textarea rows={2} value={e.notes ?? ""} onChange={(ev) => set("notes", ev.target.value)} /></Field>

          <div style={{ display: "flex", gap: 10, justifyContent: "space-between", marginTop: 4 }}>
            <div style={{ display: "flex", gap: 8 }}>
              {exists && <button className="mm-btn mm-btn-danger" onClick={() => { removeEvent(e.id); onClose(); }}>Delete</button>}
              {exists && e.visibility === "hidden" && <button className="mm-btn" onClick={() => { revealEvent(e.id); onClose(); }}>Reveal</button>}
            </div>
            <button className="mm-btn mm-btn-primary" onClick={save}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
function dowOf(date: string) { return new Date(date + "T00:00:00").getDay(); }
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mm-field"><label>{label}</label>{children}</div>;
}
function ChecklistEditor({ items, onChange }: { items: ChecklistItem[]; onChange: (i: ChecklistItem[]) => void }) {
  const [v, setV] = useState("");
  const add = () => { if (v.trim()) { onChange([...items, { id: uid(), text: v.trim(), done: false }]); setV(""); } };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((it) => (
        <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={it.done} onChange={() => onChange(items.map((x) => x.id === it.id ? { ...x, done: !x.done } : x))} style={{ width: "auto" }} />
          <span style={{ flex: 1, fontSize: 13, textDecoration: it.done ? "line-through" : "none", color: it.done ? T.inkTiny : T.ink }}>{it.text}</span>
          <button className="mm-btn" style={{ padding: "2px 8px" }} onClick={() => onChange(items.filter((x) => x.id !== it.id))}>×</button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 6 }}>
        <input placeholder="Add a sub-task…" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
        <button className="mm-btn" onClick={add}>Add</button>
      </div>
    </div>
  );
}

// ── Projects + Circle ─────────────────────────────────────────────────────
function ProjectsView({ s }: { s: State }) {
  return (
    <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0,1fr) 300px", alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="serif" style={{ fontSize: 20 }}>Projects & Ventures</div>
          <button className="mm-btn mm-btn-primary" onClick={() => upsertProject({ ...blankProject(), name: "New project" })}>+ Project</button>
        </div>
        {s.projects.length === 0 && <Empty>No projects yet.</Empty>}
        {s.projects.map((p) => <ProjectCard key={p.id} p={p} />)}
      </div>
      <CircleCard s={s} />
    </div>
  );
}
function ProjectCard({ p }: { p: Project }) {
  const done = p.milestones.filter((m) => m.done).length;
  const pct = p.milestones.length ? Math.round((done / p.milestones.length) * 100) : 0;
  return (
    <div className="mm-card" style={{ padding: 16, opacity: p.status === "done" ? 0.75 : 1 }}>
      <div className="mm-row" style={{ alignItems: "center" }}>
        <input value={p.name} onChange={(e) => upsertProject({ ...p, name: e.target.value })} style={{ flex: 1, fontSize: 15, fontWeight: 600 }} />
        <select value={p.kind} onChange={(e) => upsertProject({ ...p, kind: e.target.value as ProjectKind })}>
          {(["arg", "mod", "venture", "school", "other"] as ProjectKind[]).map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <select value={p.status} onChange={(e) => upsertProject({ ...p, status: e.target.value as Project["status"] })}>
          {(["active", "paused", "done"] as Project["status"][]).map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <button className="mm-btn mm-btn-danger" style={{ padding: "4px 8px" }} onClick={() => removeProject(p.id)}>×</button>
      </div>
      <div className="mm-progress" style={{ margin: "10px 0" }}><div className="mm-progress-fill" style={{ width: pct + "%" }} /><div className="mm-progress-text">{done}/{p.milestones.length} milestones · {pct}%</div></div>
      <ChecklistEditor items={p.milestones} onChange={(milestones) => upsertProject({ ...p, milestones })} />
      <div style={{ fontSize: 11, color: T.inkTiny, marginTop: 8 }}>Each milestone +30 XP · completing the project +100 XP</div>
    </div>
  );
}
function CircleCard({ s }: { s: State }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  return (
    <div className="mm-card" style={{ padding: 16 }}>
      <div className="serif" style={{ fontSize: 16, marginBottom: 10 }}>Circle</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {s.people.map((p: Person) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input value={p.name} onChange={(e) => upsertPerson({ ...p, name: e.target.value })} style={{ flex: 1 }} />
            <input value={p.role} onChange={(e) => upsertPerson({ ...p, role: e.target.value })} style={{ width: 96 }} />
            <button className="mm-btn mm-btn-danger" style={{ padding: "4px 8px" }} onClick={() => removePerson(p.id)}>×</button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Role" value={role} onChange={(e) => setRole(e.target.value)} style={{ width: 90 }} />
      </div>
      <button className="mm-btn" style={{ marginTop: 8, width: "100%" }} onClick={() => { if (name.trim()) { upsertPerson({ id: uid(), name: name.trim(), role: role.trim() || "Contact" }); setName(""); setRole(""); } }}>Add person</button>
    </div>
  );
}

// ── Goals ───────────────────────────────────────────────────────────────────
function GoalsView({ s }: { s: State }) {
  const cols: { key: keyof typeof s.goals; title: string }[] = [
    { key: "week", title: "This Week" },
    { key: "semester", title: "This Semester" },
    { key: "year", title: "This Year" },
    { key: "identity", title: "Identity" },
  ];
  return (
    <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
      {cols.map((c) => <GoalColumn key={c.key} title={c.title} goals={s.goals[c.key]} onChange={(g) => setGoals({ ...s.goals, [c.key]: g })} />)}
    </div>
  );
}
function GoalColumn({ title, goals, onChange }: { title: string; goals: Goal[]; onChange: (g: Goal[]) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="mm-card" style={{ padding: 16 }}>
      <div className="serif" style={{ fontSize: 16, marginBottom: 10 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {goals.map((g) => (
          <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={!!g.done} onChange={() => onChange(goals.map((x) => x.id === g.id ? { ...x, done: !x.done } : x))} style={{ width: "auto" }} />
            <span style={{ flex: 1, fontSize: 13, textDecoration: g.done ? "line-through" : "none", color: g.done ? T.inkTiny : T.ink }}>{g.text}</span>
            <button className="mm-btn" style={{ padding: "2px 8px" }} onClick={() => onChange(goals.filter((x) => x.id !== g.id))}>×</button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <input placeholder="Add a goal…" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && v.trim()) { onChange([...goals, { id: uid(), text: v.trim() }]); setV(""); } }} />
      </div>
    </div>
  );
}

// ── Achievements ──────────────────────────────────────────────────────────
function AchievementsView({ s }: { s: State }) {
  const prog = achievementProgress(s);
  const unlockedCount = ACHIEVEMENTS.filter((a) => s.unlockedAchievements[a.id]).length;
  const cats = ["discipline", "school", "build", "social", "level", "special"] as const;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
        <div className="serif" style={{ fontSize: 20 }}>Achievements</div>
        <div style={{ fontSize: 12, color: T.inkTiny }}>{unlockedCount}/{ACHIEVEMENTS.length} earned</div>
      </div>
      {cats.map((cat) => {
        const list = ACHIEVEMENTS.filter((a) => a.category === cat);
        return (
          <div key={cat} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: T.inkTiny, marginBottom: 8 }}>{cat}</div>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
              {list.map((a) => {
                const p = prog[a.id];
                const unlocked = !!s.unlockedAchievements[a.id];
                return (
                  <div key={a.id} className={"mm-ach" + (unlocked ? " unlocked" : "")}>
                    <div className="mm-medal">{unlocked ? "★" : "◇"}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ fontSize: 13 }}>{a.title}</b>
                      <div style={{ fontSize: 11, color: T.inkSoft, margin: "2px 0 5px" }}>{a.desc}</div>
                      <div className="mm-progress" style={{ height: 8 }}><div className="mm-progress-fill" style={{ width: (p.need ? (p.have / p.need) * 100 : 0) + "%" }} /></div>
                      <div style={{ fontSize: 10, color: T.inkTiny, marginTop: 3 }}>{p.have}/{p.need}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Levels / rewards ────────────────────────────────────────────────────────
function LevelsView({ s }: { s: State }) {
  const lv = levelInfo(s);
  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div className="serif" style={{ fontSize: 20, marginBottom: 6 }}>Level Track</div>
      <div style={{ fontSize: 12, color: T.inkSoft, marginBottom: 16 }}>
        20 levels on a steep curve — each level costs more than the last. Set a reward you'll actually give yourself at each one.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((level) => {
          const reached = lv.level >= level;
          const need = cumulativeXp(level);
          const reward = s.rewards.find((r) => r.level === level)?.reward ?? "";
          return (
            <div key={level} className="mm-card" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, borderColor: reached ? T.mint : T.line, background: reached ? T.mint + "0d" : T.elev }}>
              <div style={{ width: 40, textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: reached ? T.mint : T.inkTiny }}>{level}</div>
              </div>
              <div style={{ width: 130, fontSize: 11, color: T.inkTiny }}>
                {need.toLocaleString()} XP{level < MAX_LEVEL ? <><br />+{levelStep(level).toLocaleString()} to next</> : <><br />max level</>}
              </div>
              <input style={{ flex: 1 }} placeholder="Reward for reaching this level…" value={reward} onChange={(e) => setReward(level, e.target.value)} />
              {reached && <span className="mm-pill" style={{ background: T.mint, color: T.bg }}>Reached</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
