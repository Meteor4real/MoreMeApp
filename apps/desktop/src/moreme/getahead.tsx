// MoreMe — "Get Ahead" view. This is the story's superpower made concrete:
// for each Mount Vernon class, see the upcoming N-day window of school work
// and how much of it you've already crushed. Quick-add an assignment in one
// click. Plus a top-level hero (% pre-done over the whole window) for the
// satisfying number.

import { useState } from "react";
import { T } from "./styles";
import { CATEGORY_META } from "./types";
import type { State } from "./types";
import {
  addDays, aheadByClass, aheadTotal, blankEvent, fmtTime, today, toggleDone,
} from "./store";
import type { CalEvent } from "./types";

const WINDOWS: { label: string; days: number }[] = [
  { label: "Next 7 days",  days: 7 },
  { label: "Next 14 days", days: 14 },
  { label: "Next 30 days", days: 30 },
];

export function GetAheadView({ s, onEdit }: { s: State; onEdit: (e: CalEvent) => void }) {
  const [days, setDays] = useState(7);
  const rows = aheadByClass(days, s);
  const totals = aheadTotal(days, s);

  function quickAdd(classId: string | null) {
    const draft: CalEvent = {
      ...blankEvent(addDays(today(), 1)),
      title: "",
      category: "school",
      linkedClassId: classId ?? undefined,
      xp: 25,
      allDay: true,
    };
    onEdit(draft);
  }

  return (
    <div style={{ maxWidth: 920, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div className="serif" style={{ fontSize: 22, lineHeight: 1 }}>Get Ahead</div>
          <div style={{ fontSize: 11, color: T.inkTiny, letterSpacing: ".08em", textTransform: "uppercase", marginTop: 4 }}>
            Finish next week's work before next week starts
          </div>
        </div>
        <div className="mm-seg">
          {WINDOWS.map((w) => (
            <button key={w.days} className={days === w.days ? "on" : ""} onClick={() => setDays(w.days)}>{w.label}</button>
          ))}
        </div>
      </div>

      <div className="mm-card-mint" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <b style={{ fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", color: T.mint }}>Pre-done across all classes</b>
          <span style={{ fontSize: 12, color: T.inkSoft }}>{totals.done} / {totals.total} items</span>
        </div>
        <div className="mm-progress" style={{ height: 18 }}>
          <div className="mm-progress-fill" style={{ width: totals.pct + "%" }} />
          <div className="mm-progress-text">{totals.pct}%</div>
        </div>
        <div style={{ fontSize: 11, color: T.inkTiny, marginTop: 8 }}>
          {totals.total === 0 ? "No school work scheduled in this window — add some so this view has teeth." : totals.pct >= 100 ? "Window cleared. The bell can't catch you." : `${totals.total - totals.done} more to clear ${days} days ahead.`}
        </div>
      </div>

      {rows.length === 0 && <Empty>Add some classes in Projects → Classes to start grouping school work.</Empty>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map((r) => (
          <div key={r.classId ?? "_"} className="mm-card" style={{ padding: 14, borderColor: r.pct >= 100 ? T.mint : T.line }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: 14 }}>{r.className}</b>
                <div style={{ fontSize: 11, color: T.inkTiny, marginTop: 2 }}>{r.done}/{r.total} done · next {days} days</div>
              </div>
              <button className="mm-btn" style={{ padding: "4px 10px" }} onClick={() => quickAdd(r.classId)}>+ Assignment</button>
            </div>
            <div className="mm-progress" style={{ height: 10 }}>
              <div className="mm-progress-fill" style={{ width: r.pct + "%" }} />
              <div className="mm-progress-text">{r.pct}%</div>
            </div>
            {r.upcoming.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
                {r.upcoming.slice(0, 8).map((u) => {
                  const meta = CATEGORY_META[u.e.category];
                  return (
                    <div key={u.e.id + u.on} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: u.done ? T.inkTiny : T.ink, textDecoration: u.done ? "line-through" : "none" }}>
                      <button
                        onClick={() => toggleDone(u.e.id, u.on)}
                        title={u.done ? "Mark not done" : "Complete (+XP)"}
                        style={{ width: 16, height: 16, flex: "none", borderRadius: 4, border: `2px solid ${meta.color}`, background: u.done ? meta.color : "transparent", color: T.bg, cursor: "pointer", fontSize: 10, lineHeight: 1, padding: 0 }}
                      >{u.done ? "✓" : ""}</button>
                      <span style={{ width: 86, color: T.inkTiny, fontFamily: "ui-monospace,monospace", fontSize: 10 }}>
                        {new Date(u.on + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                      </span>
                      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }} onClick={() => quickEdit(u.e, onEdit)}>
                        {u.e.visibility === "hidden" ? "• " : ""}{u.e.title || meta.label}
                      </span>
                      <span style={{ fontSize: 10, color: T.inkTiny }}>{u.e.xp} XP</span>
                      {!u.e.allDay && u.e.start && <span style={{ fontSize: 10, color: T.inkTiny }}>{fmtTime(u.e.start)}</span>}
                    </div>
                  );
                })}
                {r.upcoming.length > 8 && (
                  <div style={{ fontSize: 10, color: T.inkTiny, fontStyle: "italic" }}>+{r.upcoming.length - 8} more</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function quickEdit(e: CalEvent, onEdit: (e: CalEvent) => void) { onEdit(e); }

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color: T.inkTiny, fontStyle: "italic", padding: 16 }}>{children}</div>;
}
