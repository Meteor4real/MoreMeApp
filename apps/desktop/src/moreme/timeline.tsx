// MoreMe — Day + Week timeline views. Events render as positioned blocks on
// a vertical hour grid (6 AM – 11 PM), with an all-day strip at the top.
// Click a block to edit; click empty space to add at that hour.

import { useState } from "react";
import { T } from "./styles";
import { CATEGORY_META, DAY_TYPE_LABEL } from "./types";
import type { CalEvent, DayType, State } from "./types";
import {
  ROUTINE_TEMPLATES, applyRoutineTemplate, addDays, blankEvent, conflictIds, dayTypeFor, eventColor, eventsOnDate,
  fmtTime, iso, isDone, routineTemplateApplied, setDayType, toMin, today, toggleDone,
} from "./store";

const DAY_TYPES: DayType[] = ["school", "weekend", "vacation", "beach"];
// Non-school day types map onto the existing routine templates — same real
// content Projects has always used, just applicable from the calendar too.
const TEMPLATE_FOR: Partial<Record<DayType, "weekday" | "weekend" | "beach" | "anywhere">> = {
  school: "weekday", weekend: "weekend", beach: "beach", vacation: "anywhere",
};

const DAY_START = 6 * 60;     // 06:00
const DAY_END   = 23 * 60;    // 23:00
const SPAN_MIN  = DAY_END - DAY_START;
const PX_PER_HR = 56;
const GRID_H    = (SPAN_MIN / 60) * PX_PER_HR;

function pos(e: CalEvent): { top: number; height: number } | null {
  if (e.allDay || !e.start || !e.end) return null;
  let s = Math.max(toMin(e.start), DAY_START);
  let en = Math.min(toMin(e.end), DAY_END);
  // An event entirely outside the 06:00–23:00 window (a 05:15 run, a 23:15
  // wind-down) must still render SOMEWHERE — Month view shows it, so Day/Week
  // silently dropping it makes the views disagree about what exists. Pin it
  // as a minimum-height chip at the nearest edge instead.
  if (en <= s) {
    if (toMin(e.end) <= DAY_START) { s = DAY_START; en = DAY_START + 20; }
    else { s = DAY_END - 20; en = DAY_END; }
  }
  return { top: ((s - DAY_START) / 60) * PX_PER_HR, height: ((en - s) / 60) * PX_PER_HR };
}

function HourLabels() {
  const rows: React.ReactNode[] = [];
  for (let h = DAY_START / 60; h <= DAY_END / 60; h++) {
    rows.push(
      <div key={h} style={{ height: PX_PER_HR, fontSize: 10, color: T.inkTiny, textAlign: "right", paddingRight: 6, lineHeight: "12px" }}>
        {(h % 12 || 12)}{h < 12 ? "a" : "p"}
      </div>,
    );
  }
  return <div style={{ width: 38, position: "relative", top: -6 }}>{rows}</div>;
}

// All-day items (due today, no specific time) don't get their own separate
// strip anymore — they're pinned into the last few minutes of the visible
// window instead, stacked if there's more than one, so the whole day (timed
// or not) reads as one continuous timeline instead of two disconnected
// areas.
const ALLDAY_SLOT_H = 20;
function allDaySlot(index: number): { top: number; height: number } {
  const bottom = GRID_H - index * (ALLDAY_SLOT_H + 3);
  return { top: bottom - ALLDAY_SLOT_H, height: ALLDAY_SLOT_H };
}

function Column({ date, s, onEdit }: { date: string; s: State; onEdit: (e: CalEvent) => void }) {
  const evs = eventsOnDate(date, s);
  const conflicts = conflictIds(date, s);
  const timed = evs.filter((e) => !e.allDay && e.start && e.end);
  const allDay = evs.filter((e) => e.allDay);

  function onClickEmpty(ev: React.MouseEvent<HTMLDivElement>) {
    if (ev.target !== ev.currentTarget) return;
    const rect = ev.currentTarget.getBoundingClientRect();
    const y = ev.clientY - rect.top;
    const min = Math.round((y / PX_PER_HR) * 60 / 15) * 15 + DAY_START;
    const hh = Math.floor(min / 60), mm = min % 60;
    const start = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    const eh = Math.min(23, hh + 1);
    const end = `${String(eh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    onEdit({ ...blankEvent(date), start, end });
  }

  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", borderLeft: `1px solid ${T.line}` }}>
      <div style={{ position: "relative", height: GRID_H, background: T.sunk }} onClick={onClickEmpty}>
        {Array.from({ length: (SPAN_MIN / 60) + 1 }).map((_, i) => (
          <div key={i} style={{ position: "absolute", left: 0, right: 0, top: i * PX_PER_HR, borderTop: `1px solid ${T.line}`, opacity: 0.5 }} />
        ))}
        {timed.map((e) => {
          const p = pos(e);
          if (!p) return null;
          const meta = CATEGORY_META[e.category];
          const color = eventColor(e, s);
          const done = isDone(e, date, s);
          const conflict = conflicts.has(e.id);
          // What's actually in it, right on the block — no reason a routine
          // should only reveal its checklist inside the full edit form.
          const checklistPreview = e.checklist.map((c) => c.text).join(" · ");
          const tooltip = [
            e.title || meta.label,
            `${fmtTime(e.start)}–${fmtTime(e.end)}`,
            e.location,
            checklistPreview,
          ].filter(Boolean).join("\n");
          return (
            <div
              key={e.id}
              onClick={(ev) => { ev.stopPropagation(); onEdit(e); }}
              title={tooltip}
              style={{
                position: "absolute", left: 4, right: 4, top: p.top + 1, height: Math.max(p.height - 2, 18),
                background: color + "22", borderLeft: `3px solid ${color}`,
                borderRadius: 5, padding: "3px 6px", cursor: "pointer", overflow: "hidden",
                outline: conflict ? `1px solid ${T.warn}` : undefined,
                opacity: done ? 0.5 : 1, textDecoration: done ? "line-through" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button
                  className="mm-donebtn"
                  data-done={done}
                  onClick={(ev) => { ev.stopPropagation(); toggleDone(e.id, date); }}
                  title={done ? "Mark not done" : "Complete (+XP)"}
                  style={{ width: 14, height: 14, flex: "none", borderRadius: 3, border: `1.5px solid ${color}`, background: done ? color : "transparent", color: T.bg, cursor: "pointer", fontSize: 10, lineHeight: 1, padding: 0 }}
                >{done ? "✓" : ""}</button>
                <b style={{ fontSize: 11, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {e.visibility === "hidden" ? "• " : ""}{e.title || meta.label}
                </b>
              </div>
              {p.height > 30 && (
                <div style={{ fontSize: 10, color: T.inkSoft, marginTop: 2 }}>
                  {fmtTime(e.start)}–{fmtTime(e.end)}{e.location ? ` · ${e.location}` : ""}
                </div>
              )}
              {p.height > 48 && checklistPreview && (
                <div style={{ fontSize: 9, color: T.inkTiny, marginTop: 2, display: "-webkit-box", WebkitLineClamp: Math.max(1, Math.floor((p.height - 48) / 12)), WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {checklistPreview}
                </div>
              )}
            </div>
          );
        })}
        {allDay.map((e, i) => {
          const p = allDaySlot(i);
          const meta = CATEGORY_META[e.category];
          const color = eventColor(e, s);
          const done = isDone(e, date, s);
          return (
            <div
              key={e.id}
              onClick={(ev) => { ev.stopPropagation(); onEdit(e); }}
              title={`${e.title || meta.label} — due today, no set time${e.location ? "\n" + e.location : ""}`}
              style={{
                position: "absolute", left: 4, right: 4, top: p.top, height: p.height,
                background: color + "33", borderLeft: `3px solid ${color}`,
                borderRadius: 5, padding: "2px 6px", cursor: "pointer", overflow: "hidden",
                display: "flex", alignItems: "center", gap: 4,
                opacity: done ? 0.5 : 1, textDecoration: done ? "line-through" : "none",
              }}
            >
              <button
                className="mm-donebtn"
                data-done={done}
                onClick={(ev) => { ev.stopPropagation(); toggleDone(e.id, date); }}
                title={done ? "Mark not done" : "Complete (+XP)"}
                style={{ width: 12, height: 12, flex: "none", borderRadius: 3, border: `1.5px solid ${color}`, background: done ? color : "transparent", color: T.bg, cursor: "pointer", fontSize: 9, lineHeight: 1, padding: 0 }}
              >{done ? "✓" : ""}</button>
              <b style={{ fontSize: 10, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {e.visibility === "hidden" ? "• " : ""}{e.title || meta.label}
              </b>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DayView({ s, date, onEdit }: { s: State; date: string; onEdit: (e: CalEvent) => void }) {
  return (
    <div className="mm-card scrolly" style={{ padding: 12, maxHeight: "70vh" }}>
      <Header label={new Date(date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} />
      <DayTypeBanner s={s} date={date} />
      <div style={{ display: "flex", gap: 0 }}>
        <HourLabels />
        <Column date={date} s={s} onEdit={onEdit} />
      </div>
    </div>
  );
}

// The day's real shape at a glance: what it is, and — for weekend/vacation/
// beach — whether that routine is actually on the calendar yet (real
// scheduled items, not a guess) with a one-click way to put it there.
function DayTypeBanner({ s, date }: { s: State; date: string }) {
  const auto = dayTypeFor(date, { ...s, dayTypes: {} });
  const override = s.dayTypes[date];
  const type = override ?? auto;
  const tmplId = TEMPLATE_FOR[type];
  const applied = tmplId ? routineTemplateApplied(tmplId, s) : false;

  return (
    <div style={{ marginBottom: 10, padding: "8px 10px", borderRadius: 8, background: T.sunk, border: `1px solid ${T.line}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span className="mm-pill" style={{ background: T.mint + "22", color: T.mint }}>{DAY_TYPE_LABEL[type]}</span>
        {!override && <span style={{ fontSize: 10, color: T.inkTiny }}>auto-detected</span>}
        <div style={{ flex: 1 }} />
        <select value={override ?? ""} onChange={(e) => setDayType(date, (e.target.value || undefined) as DayType | undefined)} style={{ fontSize: 11, width: 140 }}>
          <option value="">Auto ({DAY_TYPE_LABEL[auto]})</option>
          {DAY_TYPES.map((t) => <option key={t} value={t}>{DAY_TYPE_LABEL[t]}</option>)}
        </select>
      </div>
      {tmplId && !applied && (
        <div style={{ marginTop: 6, fontSize: 11, color: T.inkTiny, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span>{ROUTINE_TEMPLATES[tmplId].label} isn't on the calendar yet — {ROUTINE_TEMPLATES[tmplId].items.map((it) => `${it.title} ${fmtTime(it.start)}–${fmtTime(it.end)}`).join(", ")}.</span>
          <button
            className="mm-btn"
            style={{ padding: "2px 8px", fontSize: 10 }}
            onClick={() => applyRoutineTemplate(tmplId, date, ROUTINE_TEMPLATES[tmplId].bounded ? addDays(date, 6) : undefined)}
          >Apply it{ROUTINE_TEMPLATES[tmplId].bounded ? " (7 days)" : ""}</button>
        </div>
      )}
      {type === "school" && (
        <div style={{ marginTop: 6, fontSize: 11, color: T.inkTiny }}>
          {s.schoolMods.length === 0 ? "No Mod Schedule set up yet — add one in Projects." : "Real Mod Schedule — periods below are what's actually on the calendar."}
        </div>
      )}
    </div>
  );
}

export function WeekView({ s, anchor, onEdit, onPickDate }: { s: State; anchor: string; onEdit: (e: CalEvent) => void; onPickDate: (d: string) => void }) {
  const days = weekDays(anchor);
  return (
    <div className="mm-card scrolly" style={{ padding: 12, maxHeight: "70vh" }}>
      <div style={{ display: "flex", gap: 0, marginBottom: 4 }}>
        <div style={{ width: 38 }} />
        {days.map((d) => {
          const isToday = d === todayStr();
          return (
            <div key={d} style={{ flex: 1, textAlign: "center", padding: "0 4px" }}>
              <button
                onClick={() => onPickDate(d)}
                style={{ background: "transparent", border: "none", color: isToday ? T.mint : T.ink, fontSize: 11, cursor: "pointer", letterSpacing: ".05em" }}
              >
                {new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" })}
                <br />
                <b style={{ fontSize: 14 }}>{new Date(d + "T00:00:00").getDate()}</b>
              </button>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 0 }}>
        <HourLabels />
        {days.map((d) => <Column key={d} date={d} s={s} onEdit={onEdit} />)}
      </div>
    </div>
  );
}

function Header({ label }: { label: string }) {
  return <div className="serif" style={{ fontSize: 18, marginBottom: 8 }}>{label}</div>;
}

function weekDays(anchor: string): string[] {
  const d0 = new Date(anchor + "T00:00:00");
  d0.setDate(d0.getDate() - d0.getDay()); // Sunday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(d0); d.setDate(d0.getDate() + i);
    return iso(d); // tz-safe local date, consistent with the rest of the app
  });
}

function todayStr(): string {
  return today();
}

export function shiftWeek(anchor: string, weeks: number): string {
  const d = new Date(anchor + "T00:00:00");
  d.setDate(d.getDate() + weeks * 7);
  return iso(d);
}
