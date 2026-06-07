// MoreMe — Weekly Review. The GTD ritual: look back at what slipped, look
// ahead at the week, surface every project's next action, clear the inbox,
// and lock this week's goals. One modal, top to bottom, so nothing rots.

import { useState } from "react";
import { T } from "./styles";
import { CATEGORY_META } from "./types";
import type { CalEvent, State } from "./types";
import {
  addDays, aheadTotal, eventsOnDate, isDone, removeInbox, setGoals, today, uid,
} from "./store";

export function WeeklyReview({ s, onClose, onEdit }: { s: State; onClose: () => void; onEdit: (e: CalEvent) => void }) {
  // Past 7 days: scheduled (non-routine) items left undone.
  const missed: { e: CalEvent; on: string }[] = [];
  for (let i = 1; i <= 7; i++) {
    const d = addDays(today(), -i);
    for (const e of eventsOnDate(d, s)) {
      if (e.category === "routine") continue;
      if (!isDone(e, d, s)) missed.push({ e, on: d });
    }
  }
  // Next 7 days: what's coming.
  const ahead: { e: CalEvent; on: string }[] = [];
  for (let i = 0; i <= 7; i++) {
    const d = addDays(today(), i);
    for (const e of eventsOnDate(d, s)) {
      if (e.category === "routine") continue;
      ahead.push({ e, on: d });
    }
  }
  ahead.sort((a, b) => a.on.localeCompare(b.on) || (a.e.start ?? "").localeCompare(b.e.start ?? ""));
  const preDone = aheadTotal(7, s);

  // Projects needing a next action (active, with an undone milestone or none).
  const activeProjects = s.projects.filter((p) => p.status === "active");

  const [goal, setGoal] = useState("");
  function addGoal() {
    if (!goal.trim()) return;
    setGoals({ ...s.goals, week: [...s.goals.week, { id: uid(), text: goal.trim() }] });
    setGoal("");
  }

  return (
    <div className="mm-modal-back" onClick={onClose}>
      <div className="mm-modal" onClick={(ev) => ev.stopPropagation()} style={{ width: "min(640px, 96%)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div className="serif" style={{ fontSize: 22, flex: 1 }}>Weekly Review</div>
          <button className="mm-btn" onClick={onClose}>Done</button>
        </div>
        <div style={{ fontSize: 12, color: T.inkSoft, marginBottom: 16 }}>
          Five minutes, top to bottom. Reconcile last week, get ahead of the next, and nothing falls through.
        </div>

        <Step n={1} title={`Loose ends · ${missed.length}`}>
          {missed.length === 0
            ? <Good>Clean week — nothing was left undone.</Good>
            : missed.slice(0, 12).map(({ e, on }) => (
                <Line key={e.id + on} e={e} on={on} onEdit={onEdit} note="missed" />
              ))}
          {missed.length > 12 && <Muted>+{missed.length - 12} more</Muted>}
        </Step>

        <Step n={2} title="Get ahead on school work">
          <div className="mm-progress" style={{ height: 14, marginBottom: 6 }}>
            <div className="mm-progress-fill" style={{ width: preDone.pct + "%" }} />
            <div className="mm-progress-text">{preDone.pct}% of next 7 days pre-done</div>
          </div>
          <Muted>{preDone.total === 0 ? "No school work scheduled next week yet — block some in." : `${preDone.total - preDone.done} school items left to clear the week ahead.`}</Muted>
        </Step>

        <Step n={3} title={`The week ahead · ${ahead.length}`}>
          {ahead.length === 0
            ? <Muted>Nothing scheduled. Plan the week.</Muted>
            : ahead.slice(0, 12).map(({ e, on }) => <Line key={e.id + on} e={e} on={on} onEdit={onEdit} />)}
          {ahead.length > 12 && <Muted>+{ahead.length - 12} more</Muted>}
        </Step>

        <Step n={4} title={`Project next actions · ${activeProjects.length}`}>
          {activeProjects.length === 0
            ? <Muted>No active projects.</Muted>
            : activeProjects.map((p) => {
                const next = p.milestones.find((m) => !m.done);
                return (
                  <div key={p.id} style={{ display: "flex", gap: 8, fontSize: 12, alignItems: "baseline", padding: "3px 0" }}>
                    <b style={{ width: 150, minWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name || "(untitled)"}</b>
                    <span style={{ color: next ? T.ink : T.inkTiny, flex: 1 }}>{next ? `→ ${next.text}` : "all milestones done — close it out"}</span>
                  </div>
                );
              })}
        </Step>

        {s.inbox.length > 0 && (
          <Step n={5} title={`Clear the inbox · ${s.inbox.length}`}>
            {s.inbox.slice(0, 10).map((it) => (
              <div key={it.id} style={{ display: "flex", gap: 8, fontSize: 12, alignItems: "center", padding: "2px 0" }}>
                <span style={{ flex: 1 }}>{it.text}</span>
                <button className="mm-btn" style={{ padding: "2px 8px" }} onClick={() => removeInbox(it.id)}>Clear</button>
              </div>
            ))}
            <Muted>Triage the rest on the Today tab.</Muted>
          </Step>
        )}

        <Step n={s.inbox.length > 0 ? 6 : 5} title="Lock this week's goals">
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
            {s.goals.week.map((g) => (
              <div key={g.id} style={{ fontSize: 12, color: g.done ? T.inkTiny : T.ink, textDecoration: g.done ? "line-through" : "none" }}>• {g.text}</div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input placeholder="Add a goal for this week…" value={goal} onChange={(e) => setGoal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addGoal(); }} />
            <button className="mm-btn" onClick={addGoal}>Add</button>
          </div>
        </Step>

        <button className="mm-btn mm-btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={onClose}>Review complete</button>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ width: 20, height: 20, borderRadius: "50%", background: T.mint, color: T.bg, fontSize: 11, fontWeight: 800, display: "grid", placeItems: "center" }}>{n}</span>
        <b style={{ fontSize: 13, letterSpacing: ".04em" }}>{title}</b>
      </div>
      <div style={{ paddingLeft: 28 }}>{children}</div>
    </div>
  );
}
function Line({ e, on, onEdit, note }: { e: CalEvent; on: string; onEdit: (e: CalEvent) => void; note?: string }) {
  const meta = CATEGORY_META[e.category];
  return (
    <div onClick={() => onEdit(e)} style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 12, padding: "2px 0", cursor: "pointer" }}>
      <span className="mm-dot" style={{ ["--c" as never]: meta.color, width: 6, height: 6 }} />
      <span style={{ width: 64, minWidth: 64, fontSize: 10, color: note === "missed" ? T.warn : T.inkTiny }}>
        {new Date(on + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
      </span>
      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title || meta.label}</span>
    </div>
  );
}
function Muted({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, color: T.inkTiny, fontStyle: "italic" }}>{children}</div>;
}
function Good({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color: T.mint }}>{children}</div>;
}
