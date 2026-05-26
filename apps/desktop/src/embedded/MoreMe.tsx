import { useEffect, useMemo, useState } from "react";

// Embedded MoreMe — strict daily time-blocked checklist whose schedule is
// chosen AUTOMATICALLY from a year Calendar you fill in: weekends are detected,
// and any day-type or event you set (Vacation / Exam / Travel) overrides the
// default Semester schedule. XP is earned only by checking a block off during
// or after its window.

type Mode = "semester" | "weekend" | "vacation" | "exam" | "travel";
type Block = { id: string; start: string; end: string; label: string; xp: number };

// Modes the user can assign to a date (weekend is auto-detected, not assignable).
const ASSIGNABLE: Mode[] = ["semester", "vacation", "exam", "travel"];

const MODE_COLOR: Record<Mode, string> = {
  semester: "#3b82f6",
  weekend: "#7a7a85",
  vacation: "#22c55e",
  exam: "#ff7a2d",
  travel: "#a855f7",
};

const SCHEDULES: Record<Mode, Block[]> = {
  semester: [
    { id: "morning", start: "06:30", end: "06:50", label: "Morning routine — water, stretch, movement, top 3", xp: 10 },
    { id: "ontime", start: "07:30", end: "08:30", label: "On time", xp: 10 },
    { id: "focus", start: "12:00", end: "12:30", label: "One 20-min deep focus block", xp: 15 },
    { id: "noyt", start: "15:00", end: "15:30", label: "No distractions / YouTube at school", xp: 10 },
    { id: "sport", start: "15:30", end: "17:30", label: "After-school sport / movement", xp: 15 },
    { id: "move", start: "17:00", end: "21:00", label: "2-minute movement (minimum)", xp: 5 },
    { id: "homework", start: "18:00", end: "20:00", label: "Homework", xp: 20 },
    { id: "project", start: "19:00", end: "21:00", label: "Project work", xp: 20 },
    { id: "bed", start: "21:40", end: "22:00", label: "Bedtime routine — lights out by 10:00", xp: 10 },
  ],
  weekend: [
    { id: "morning", start: "08:00", end: "09:00", label: "Morning routine + water", xp: 10 },
    { id: "move", start: "10:00", end: "13:00", label: "Sport / flexible movement", xp: 15 },
    { id: "project", start: "13:00", end: "16:00", label: "Project time", xp: 20 },
    { id: "learn", start: "16:00", end: "17:00", label: "Reading / learning", xp: 10 },
    { id: "gaming", start: "17:00", end: "21:00", label: "Gaming (only after goals)", xp: 0 },
    { id: "bed", start: "22:00", end: "23:00", label: "Wind down + bedtime", xp: 10 },
  ],
  vacation: [
    { id: "morning", start: "06:30", end: "07:00", label: "Morning routine", xp: 10 },
    { id: "workout", start: "07:00", end: "08:00", label: "20–30 min workout", xp: 20 },
    { id: "breakfast", start: "08:00", end: "08:30", label: "Healthy breakfast + plan top 3", xp: 5 },
    { id: "learn", start: "09:30", end: "11:00", label: "Khan Academy / reading / learning", xp: 15 },
    { id: "sports", start: "12:00", end: "14:00", label: "Sports (1–2 hours)", xp: 15 },
    { id: "project", start: "14:00", end: "16:30", label: "Project / clean / skill", xp: 20 },
    { id: "gaming", start: "19:00", end: "21:00", label: "Gaming (≤2h, after goals)", xp: 0 },
    { id: "bed", start: "21:40", end: "22:30", label: "Stretch + bedtime routine", xp: 10 },
  ],
  exam: [
    { id: "morning", start: "06:30", end: "06:50", label: "Morning routine", xp: 10 },
    { id: "review1", start: "08:00", end: "09:30", label: "Focused study block 1", xp: 20 },
    { id: "review2", start: "11:00", end: "12:30", label: "Focused study block 2", xp: 20 },
    { id: "move", start: "12:30", end: "13:00", label: "Movement + food reset", xp: 5 },
    { id: "review3", start: "14:00", end: "15:30", label: "Focused study block 3", xp: 20 },
    { id: "project", start: "16:00", end: "17:30", label: "Project / big-week work", xp: 20 },
    { id: "light", start: "17:30", end: "18:00", label: "Light workout", xp: 10 },
    { id: "bed", start: "21:30", end: "22:00", label: "Wind down — sleep is part of the grind", xp: 10 },
  ],
  travel: [
    { id: "morning", start: "07:00", end: "07:30", label: "Morning routine + water", xp: 10 },
    { id: "twork", start: "07:30", end: "08:00", label: "Travel workout (squats/pushups/JJ/plank ×2–3)", xp: 20 },
    { id: "move", start: "10:00", end: "18:00", label: "Walking / stairs / exploring", xp: 15 },
    { id: "learn", start: "13:00", end: "14:00", label: "Reading / learning", xp: 15 },
    { id: "project", start: "18:00", end: "19:30", label: "Project work", xp: 20 },
    { id: "bed", start: "22:00", end: "22:45", label: "Stretch + bedtime", xp: 10 },
  ],
};

const TIERS = [
  "Initiate", "Worker", "Hard Worker", "Dedicated Worker", "Gymnast",
  "Dedicated Gymnast", "Athlete", "Dedicated Athlete", "Unstoppable", "Dude Perfect",
];

type Day = { checked: string[] };
type Event = { id: string; start: string; end: string; title: string; mode?: Mode };
type State = {
  days: Record<string, Day>;        // checklist progress per date
  dayTypes: Record<string, Mode>;   // user-assigned day type per date
  events: Event[];                  // multi-day events (can set a mode)
};

const KEY = "nchub.moreme.v3";
const iso = (d: Date) => d.toISOString().slice(0, 10);
const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const fmt = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

function load(): State {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "");
    if (s && s.days) return { days: s.days, dayTypes: s.dayTypes || {}, events: s.events || [] };
  } catch {
    /* ignore */
  }
  return { days: {}, dayTypes: {}, events: [] };
}
function save(s: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

// The schedule for a date is derived: an event covering it wins, then a
// user-assigned day type, then weekend auto-detect, else Semester.
function effectiveMode(dateStr: string, state: State): { mode: Mode; reason: string } {
  const ev = state.events.find((e) => e.mode && dateStr >= e.start && dateStr <= e.end);
  if (ev) return { mode: ev.mode!, reason: `event: ${ev.title}` };
  if (state.dayTypes[dateStr]) return { mode: state.dayTypes[dateStr], reason: "set on calendar" };
  const dow = new Date(dateStr + "T00:00:00").getDay();
  if (dow === 0 || dow === 6) return { mode: "weekend", reason: "weekend" };
  return { mode: "semester", reason: "default" };
}

function dayXp(dateStr: string, state: State): number {
  const day = state.days[dateStr];
  if (!day) return 0;
  const sched = SCHEDULES[effectiveMode(dateStr, state).mode];
  return day.checked.reduce((s, id) => s + (sched.find((b) => b.id === id)?.xp || 0), 0);
}
function dayComplete(dateStr: string, state: State): boolean {
  const sched = SCHEDULES[effectiveMode(dateStr, state).mode];
  const total = sched.reduce((s, b) => s + b.xp, 0);
  return total > 0 && dayXp(dateStr, state) >= total * 0.7;
}

export function MoreMe() {
  const [state, setState] = useState<State>(load);
  const [now, setNow] = useState(() => new Date());
  const [tab, setTab] = useState<"today" | "calendar">("today");

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const tk = iso(now);
  const { mode, reason } = effectiveMode(tk, state);
  const schedule = SCHEDULES[mode];
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today: Day = state.days[tk] || { checked: [] };

  const totals = useMemo(() => {
    const totalXp = Object.keys(state.days).reduce((s, d) => s + dayXp(d, state), 0);
    const level = Math.floor(totalXp / 100);
    const tier = TIERS[Math.min(TIERS.length - 1, Math.floor(level / 5))];
    let streak = 0;
    const d = new Date(now);
    if (!dayComplete(iso(d), state)) d.setDate(d.getDate() - 1);
    while (dayComplete(iso(d), state)) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return { totalXp, level, tier, xpIntoLevel: totalXp % 100, streak };
  }, [state, now]);

  function toggle(b: Block) {
    if (nowMin < toMin(b.start)) return;
    setState((s) => {
      const day = s.days[tk] || { checked: [] };
      const checked = day.checked.includes(b.id) ? day.checked.filter((x) => x !== b.id) : [...day.checked, b.id];
      const next = { ...s, days: { ...s.days, [tk]: { checked } } };
      save(next);
      return next;
    });
  }

  const earned = dayXp(tk, state);
  const possible = schedule.reduce((s, b) => s + b.xp, 0);

  return (
    <div className="stage">
      <div className="mono" style={{ padding: "8px 14px", borderBottom: "1px solid var(--line)", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "var(--mute)", display: "flex", alignItems: "center", gap: 14 }}>
        <span>MoreMe <span className="glow-text">· daily system</span></span>
        <div style={{ display: "flex", gap: 6 }}>
          {(["today", "calendar"] as const).map((t) => (
            <button key={t} className="btn" onClick={() => setTab(t)} style={{ padding: "2px 10px", color: tab === t ? "var(--pink)" : undefined, borderColor: tab === t ? "rgba(255,87,119,0.6)" : undefined }}>{t}</button>
          ))}
        </div>
      </div>

      {tab === "today" ? (
        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          <div className="panel" style={{ padding: 16, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div className="mono glow-text" style={{ fontSize: 18, letterSpacing: 2 }}>LVL {totals.level} · {totals.tier}</div>
                <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 2 }}>{totals.totalXp} XP total · {totals.streak}-day streak</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="mono" style={{ fontSize: 13, textTransform: "uppercase", color: MODE_COLOR[mode] }}>{mode}</div>
                <div style={{ fontSize: 11, color: "var(--mute)" }}>{reason} · set in Calendar</div>
              </div>
            </div>
            <div style={{ marginTop: 12, height: 6, background: "#15151a", borderRadius: 4, overflow: "hidden" }}>
              <div className="strip" style={{ height: "100%", width: `${totals.xpIntoLevel}%` }} />
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--mute)" }}>
              Today: <span className="glow-text">{earned}</span> / {possible} XP · {dayComplete(tk, state) ? "day complete" : `${Math.ceil(possible * 0.7)} XP completes the day`}
            </div>
          </div>

          {schedule.map((b) => {
            const done = today.checked.includes(b.id);
            const locked = nowMin < toMin(b.start);
            const active = !locked && nowMin <= toMin(b.end);
            return (
              <button key={b.id} onClick={() => toggle(b)} disabled={locked} className="panel"
                style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", marginBottom: 8, cursor: locked ? "not-allowed" : "pointer", opacity: locked ? 0.5 : 1, borderColor: active ? "rgba(255,87,119,0.5)" : undefined, color: "var(--ink)" }}>
                <span className="mono" style={{ width: 18, height: 18, borderRadius: 4, border: "1px solid var(--line)", display: "grid", placeItems: "center", color: done ? "var(--pink)" : "transparent", flex: "none" }}>✕</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--mute)", width: 150, flex: "none" }}>{fmt(b.start)} – {fmt(b.end)}</span>
                <span style={{ flex: 1, fontSize: 13, textDecoration: done ? "line-through" : "none" }}>{b.label}</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--orange)", flex: "none" }}>{locked ? `unlocks ${fmt(b.start)}` : `+${b.xp}`}</span>
              </button>
            );
          })}
          <p style={{ color: "var(--mute)", fontSize: 12, marginTop: 14 }}>
            The schedule is chosen automatically from your Calendar — weekends, day-types, and events. XP comes only from the day's blocks.
          </p>
        </div>
      ) : (
        <Calendar state={state} setState={setState} now={now} />
      )}
    </div>
  );
}

function Calendar({ state, setState, now }: { state: State; setState: React.Dispatch<React.SetStateAction<State>>; now: Date }) {
  const [view, setView] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [evt, setEvt] = useState({ start: iso(now), end: iso(now), title: "", mode: "vacation" as Mode });

  const year = view.getFullYear();
  const month = view.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = first.getDay();
  const cells: (string | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(iso(new Date(year, month, d)));

  function cycleType(dateStr: string) {
    setState((s) => {
      const cur = s.dayTypes[dateStr];
      const idx = cur ? ASSIGNABLE.indexOf(cur) : -1;
      const next = idx + 1 >= ASSIGNABLE.length ? undefined : ASSIGNABLE[idx + 1];
      const dayTypes = { ...s.dayTypes };
      if (next) dayTypes[dateStr] = next;
      else delete dayTypes[dateStr];
      const ns = { ...s, dayTypes };
      save(ns);
      return ns;
    });
  }
  function addEvent() {
    if (!evt.title.trim()) return;
    setState((s) => {
      const ns = { ...s, events: [...s.events, { ...evt, id: String(Date.now()) }] };
      save(ns);
      return ns;
    });
    setEvt({ ...evt, title: "" });
  }
  function removeEvent(id: string) {
    setState((s) => {
      const ns = { ...s, events: s.events.filter((e) => e.id !== id) };
      save(ns);
      return ns;
    });
  }

  const monthName = view.toLocaleString(undefined, { month: "long", year: "numeric" });

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <button className="btn" onClick={() => setView(new Date(year, month - 1, 1))}>‹</button>
        <div className="mono" style={{ minWidth: 180, textAlign: "center" }}>{monthName}</div>
        <button className="btn" onClick={() => setView(new Date(year, month + 1, 1))}>›</button>
        <span style={{ fontSize: 11, color: "var(--mute)", marginLeft: 8 }}>click a day to cycle its type (semester → vacation → exam → travel → clear)</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="mono" style={{ fontSize: 10, color: "var(--mute)", textAlign: "center", padding: 4 }}>{d}</div>
        ))}
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={i} />;
          const m = effectiveMode(dateStr, state).mode;
          const isToday = dateStr === iso(now);
          const ev = state.events.find((e) => dateStr >= e.start && dateStr <= e.end);
          return (
            <button key={i} onClick={() => cycleType(dateStr)} title={ev?.title || m}
              style={{ aspectRatio: "1", border: `1px solid ${isToday ? "var(--pink)" : "var(--line)"}`, borderRadius: 6, background: `${MODE_COLOR[m]}22`, color: "var(--ink)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, padding: 2 }}>
              <span className="mono" style={{ fontSize: 12 }}>{Number(dateStr.slice(8))}</span>
              <span style={{ width: 14, height: 3, borderRadius: 2, background: MODE_COLOR[m] }} />
              {ev && <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--orange)" }} />}
            </button>
          );
        })}
      </div>

      {/* legend */}
      <div style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap", fontSize: 11, color: "var(--mute)" }}>
        {(Object.keys(MODE_COLOR) as Mode[]).map((m) => (
          <span key={m} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: MODE_COLOR[m] }} /> {m}
          </span>
        ))}
      </div>

      {/* events */}
      <div className="panel" style={{ padding: 14, marginTop: 16 }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: 1, color: "var(--mute)", marginBottom: 8 }}>EVENTS (set a date range + the mode it should run)</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
          <input type="date" value={evt.start} onChange={(e) => setEvt({ ...evt, start: e.target.value })} style={inp} />
          <span style={{ color: "var(--mute)" }}>→</span>
          <input type="date" value={evt.end} onChange={(e) => setEvt({ ...evt, end: e.target.value })} style={inp} />
          <input placeholder="title (e.g. Winter break)" value={evt.title} onChange={(e) => setEvt({ ...evt, title: e.target.value })} style={{ ...inp, flex: 1, minWidth: 140 }} />
          <select value={evt.mode} onChange={(e) => setEvt({ ...evt, mode: e.target.value as Mode })} style={inp}>
            {ASSIGNABLE.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <button className="btn" onClick={addEvent}>Add</button>
        </div>
        {state.events.length === 0 && <div style={{ fontSize: 12, color: "var(--mute)" }}>No events yet.</div>}
        {state.events.slice().sort((a, b) => a.start.localeCompare(b.start)).map((e) => (
          <div key={e.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0" }}>
            <span><span style={{ color: MODE_COLOR[e.mode || "vacation"] }}>●</span> {e.start} – {e.end} · {e.title} <span style={{ color: "var(--mute)" }}>({e.mode})</span></span>
            <button onClick={() => removeEvent(e.id)} style={{ background: "none", border: "none", color: "var(--mute)", cursor: "pointer" }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 6, color: "var(--ink)",
  padding: "6px 8px", fontSize: 12, fontFamily: "ui-monospace, monospace", outline: "none",
};
