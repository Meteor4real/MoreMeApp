// MoreMe — Day + Week timeline views. Events render as positioned blocks on
// a vertical hour grid (6 AM – 11 PM), with an all-day strip at the top.
// Click a block to edit; click empty space to add at that hour.

import { useState } from "react";
import { T } from "./styles";
import { CATEGORY_META } from "./types";
import type { CalEvent, State } from "./types";
import {
  blankEvent, conflictIds, eventsOnDate, fmtTime, isDone, toMin, toggleDone,
} from "./store";

const DAY_START = 6 * 60;     // 06:00
const DAY_END   = 23 * 60;    // 23:00
const SPAN_MIN  = DAY_END - DAY_START;
const PX_PER_HR = 56;
const GRID_H    = (SPAN_MIN / 60) * PX_PER_HR;

function pos(e: CalEvent): { top: number; height: number } | null {
  if (e.allDay || !e.start || !e.end) return null;
  const s = Math.max(toMin(e.start), DAY_START);
  const en = Math.min(toMin(e.end), DAY_END);
  if (en <= s) return null;
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
      <div style={{ borderBottom: `1px solid ${T.line}`, padding: "4px 6px", minHeight: 32 }}>
        {allDay.length === 0 ? <div style={{ fontSize: 10, color: T.inkTiny }}>—</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {allDay.map((e) => (
              <button key={e.id} onClick={() => onEdit(e)} title={e.title}
                style={{ textAlign: "left", padding: "2px 6px", fontSize: 10, borderRadius: 5, border: "none", color: T.bg, fontWeight: 700, background: CATEGORY_META[e.category].color, cursor: "pointer", opacity: isDone(e, date, s) ? 0.5 : 1, textDecoration: isDone(e, date, s) ? "line-through" : "none" }}>
                {e.title || CATEGORY_META[e.category].label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ position: "relative", height: GRID_H, background: T.sunk }} onClick={onClickEmpty}>
        {Array.from({ length: (SPAN_MIN / 60) + 1 }).map((_, i) => (
          <div key={i} style={{ position: "absolute", left: 0, right: 0, top: i * PX_PER_HR, borderTop: `1px solid ${T.line}`, opacity: 0.5 }} />
        ))}
        {timed.map((e) => {
          const p = pos(e);
          if (!p) return null;
          const meta = CATEGORY_META[e.category];
          const done = isDone(e, date, s);
          const conflict = conflicts.has(e.id);
          return (
            <div
              key={e.id}
              onClick={(ev) => { ev.stopPropagation(); onEdit(e); }}
              title={`${e.title || meta.label}\n${fmtTime(e.start)}–${fmtTime(e.end)}${e.location ? "\n" + e.location : ""}`}
              style={{
                position: "absolute", left: 4, right: 4, top: p.top + 1, height: Math.max(p.height - 2, 18),
                background: meta.color + "22", borderLeft: `3px solid ${meta.color}`,
                borderRadius: 5, padding: "3px 6px", cursor: "pointer", overflow: "hidden",
                outline: conflict ? `1px solid ${T.warn}` : undefined,
                opacity: done ? 0.5 : 1, textDecoration: done ? "line-through" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button
                  onClick={(ev) => { ev.stopPropagation(); toggleDone(e.id, date); }}
                  title={done ? "Mark not done" : "Complete (+XP)"}
                  style={{ width: 14, height: 14, flex: "none", borderRadius: 3, border: `1.5px solid ${meta.color}`, background: done ? meta.color : "transparent", color: T.bg, cursor: "pointer", fontSize: 10, lineHeight: 1, padding: 0 }}
                >{done ? "✓" : ""}</button>
                <b style={{ fontSize: 11, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {e.visibility === "hidden" ? "• " : ""}{e.title || meta.label}
                </b>
              </div>
              {p.height > 30 && (
                <div style={{ fontSize: 10, color: T.inkSoft, marginTop: 2 }}>
                  {fmtTime(e.start)}{e.location ? ` · ${e.location}` : ""}
                </div>
              )}
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
      <div style={{ display: "flex", gap: 0 }}>
        <HourLabels />
        <Column date={date} s={s} onEdit={onEdit} />
      </div>
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
                style={{ background: "transparent", border: "none", color: isToday ? T.mint : T.ink, fontSize: 11, cursor: "pointer", letterSpacing: ".05em", textTransform: "uppercase" }}
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
    return d.toISOString().slice(0, 10);
  });
}

function todayStr(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function shiftWeek(anchor: string, weeks: number): string {
  const d = new Date(anchor + "T00:00:00");
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}
