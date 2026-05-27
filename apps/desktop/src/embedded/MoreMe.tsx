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
  semester: "#33B5FF",
  weekend: "#6A7280",
  vacation: "#3EDBB5",
  exam: "#FF7A2D",
  travel: "#A855F7",
};

// Dude Perfect mint palette (dark theme) — matches the real More Me site:
// mint pops off deep black, Cormorant Garamond headers, Inter body.
const T = {
  bg: "#0F1318", elev: "#1A2028", sunk: "#070A0D",
  ink: "#FFFFFF", inkSoft: "#A8B3C0", inkTiny: "#6A7280", line: "#2A3038",
  mint: "#3EDBB5", mintDeep: "#00C896", mintHi: "#7FEBD0", warn: "#FF5C5F",
};
const MM_STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Inter:wght@400;500;600;700&display=swap');
.moreme-embed { background: ${T.bg}; color: ${T.ink}; font-family: "Inter", system-ui, sans-serif; }
.moreme-embed .serif { font-family: "Cormorant Garamond", Georgia, serif; font-weight: 600; letter-spacing: .01em; }
.moreme-embed .mm-card { background: ${T.elev}; border: 1px solid ${T.line}; border-radius: 14px; box-shadow: 0 1px 2px rgba(0,0,0,.3), 0 8px 24px rgba(0,0,0,.35); }
.moreme-embed .mm-action { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border: 1px solid ${T.line}; border-radius: 10px; background: ${T.sunk}; transition: border-color .15s, background .15s; width: 100%; text-align: left; }
.moreme-embed .mm-action:hover:not(:disabled) { border-color: ${T.mint}; }
.moreme-embed .mm-action.done { opacity: .6; }
.moreme-embed .mm-tab { font-family: "Inter", sans-serif; font-size: 12px; padding: 5px 14px; border-radius: 999px; border: 1px solid ${T.line}; background: transparent; color: ${T.inkSoft}; cursor: pointer; transition: all .15s; text-transform: capitalize; }
.moreme-embed .mm-tab.active { background: ${T.mint}; border-color: ${T.mint}; color: ${T.bg}; font-weight: 600; }
.moreme-embed .mm-btn { font-family: "Inter", sans-serif; font-size: 12px; padding: 8px 14px; border-radius: 10px; border: 1px solid ${T.line}; background: ${T.sunk}; color: ${T.ink}; cursor: pointer; transition: all .15s; }
.moreme-embed .mm-btn:hover { border-color: ${T.mint}; }
.moreme-embed .mm-btn-primary { background: ${T.mint}; border-color: ${T.mint}; color: ${T.bg}; font-weight: 600; }
.moreme-embed input, .moreme-embed select { background: ${T.bg}; border: 1px solid ${T.line}; border-radius: 10px; color: ${T.ink}; padding: 8px 10px; font: inherit; outline: none; }
.moreme-embed input:focus, .moreme-embed select:focus { border-color: ${T.mint}; }
`;

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
    <div className="stage moreme-embed">
      <style>{MM_STYLE}</style>
      <div style={{ padding: "12px 18px", borderBottom: `1px solid ${T.line}`, display: "flex", alignItems: "center", gap: 16 }}>
        <span className="serif" style={{ fontSize: 24, color: T.ink }}>More Me</span>
        <span style={{ fontSize: 11, color: T.inkTiny, letterSpacing: "0.14em", textTransform: "uppercase" }}>Daily System</span>
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          {(["today", "calendar"] as const).map((t) => (
            <button key={t} className={`mm-tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
      </div>

      {tab === "today" ? (
        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
          <div className="mm-card" style={{ padding: 22, marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div className="serif" style={{ fontSize: 26, color: T.ink }}>Level {totals.level} · {totals.tier}</div>
                <div style={{ fontSize: 13, color: T.inkSoft, marginTop: 2 }}>{totals.totalXp} XP total · {totals.streak}-day streak</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, color: MODE_COLOR[mode] }}>{mode}</div>
                <div style={{ fontSize: 11, color: T.inkTiny }}>{reason} · set in Calendar</div>
              </div>
            </div>
            <div style={{ position: "relative", marginTop: 16, height: 12, background: T.bg, border: `1px solid ${T.line}`, borderRadius: 6, overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, width: `${totals.xpIntoLevel}%`, background: `linear-gradient(90deg, ${T.mintHi}, ${T.mint})`, transition: "width .35s ease" }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: T.inkSoft, letterSpacing: "0.04em", mixBlendMode: "luminosity" }}>{totals.xpIntoLevel} / 100 XP</div>
            </div>
            <div style={{ marginTop: 10, fontSize: 13, color: T.inkSoft }}>
              Today: <span style={{ color: T.mint, fontWeight: 600 }}>{earned}</span> / {possible} XP · {dayComplete(tk, state) ? "day complete" : `${Math.ceil(possible * 0.7)} XP completes the day`}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {schedule.map((b) => {
            const done = today.checked.includes(b.id);
            const locked = nowMin < toMin(b.start);
            const active = !locked && nowMin <= toMin(b.end);
            return (
              <button key={b.id} onClick={() => toggle(b)} disabled={locked} className={`mm-action${done ? " done" : ""}`}
                style={{ cursor: locked ? "not-allowed" : "pointer", opacity: locked ? 0.5 : undefined, borderColor: active ? T.mint : undefined }}>
                <span style={{ width: 22, height: 22, borderRadius: 6, border: `1px solid ${done ? T.mint : T.line}`, background: done ? T.mint : T.bg, color: T.bg, display: "grid", placeItems: "center", flex: "none", fontSize: 13, fontWeight: 700 }}>{done ? "✓" : ""}</span>
                <span style={{ fontSize: 11, color: T.inkTiny, width: 150, flex: "none", fontVariantNumeric: "tabular-nums" }}>{fmt(b.start)} – {fmt(b.end)}</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, textDecoration: done ? "line-through" : "none" }}>{b.label}</span>
                <span style={{ fontSize: 12, color: locked ? T.inkTiny : T.mint, fontWeight: 600, flex: "none", fontVariantNumeric: "tabular-nums" }}>{locked ? `unlocks ${fmt(b.start)}` : `+${b.xp}`}</span>
              </button>
            );
          })}
          </div>
          <p style={{ color: T.inkTiny, fontSize: 12, marginTop: 16 }}>
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
    <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <button className="mm-btn" onClick={() => setView(new Date(year, month - 1, 1))}>‹</button>
        <div className="serif" style={{ minWidth: 200, textAlign: "center", fontSize: 22, color: T.ink }}>{monthName}</div>
        <button className="mm-btn" onClick={() => setView(new Date(year, month + 1, 1))}>›</button>
        <span style={{ fontSize: 11, color: T.inkTiny, marginLeft: 8 }}>click a day to cycle its type (semester → vacation → exam → travel → clear)</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} style={{ fontSize: 11, color: T.inkTiny, textAlign: "center", padding: 4, fontWeight: 600, letterSpacing: "0.06em" }}>{d}</div>
        ))}
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={i} />;
          const m = effectiveMode(dateStr, state).mode;
          const isToday = dateStr === iso(now);
          const ev = state.events.find((e) => dateStr >= e.start && dateStr <= e.end);
          return (
            <button key={i} onClick={() => cycleType(dateStr)} title={ev?.title || m}
              style={{ aspectRatio: "1", border: `1px solid ${isToday ? T.mint : T.line}`, borderRadius: 10, background: `${MODE_COLOR[m]}1f`, color: T.ink, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, padding: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{Number(dateStr.slice(8))}</span>
              <span style={{ width: 16, height: 3, borderRadius: 2, background: MODE_COLOR[m] }} />
              {ev && <span style={{ width: 4, height: 4, borderRadius: "50%", background: T.mintHi }} />}
            </button>
          );
        })}
      </div>

      {/* legend */}
      <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap", fontSize: 11, color: T.inkSoft }}>
        {(Object.keys(MODE_COLOR) as Mode[]).map((m) => (
          <span key={m} style={{ display: "flex", alignItems: "center", gap: 5, textTransform: "capitalize" }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: MODE_COLOR[m] }} /> {m}
          </span>
        ))}
      </div>

      {/* events */}
      <div className="mm-card" style={{ padding: 18, marginTop: 18 }}>
        <div className="serif" style={{ fontSize: 18, color: T.ink, marginBottom: 4 }}>Events</div>
        <div style={{ fontSize: 12, color: T.inkTiny, marginBottom: 12 }}>Set a date range and the mode it should run.</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
          <input type="date" value={evt.start} onChange={(e) => setEvt({ ...evt, start: e.target.value })} style={{ fontSize: 12 }} />
          <span style={{ color: T.inkTiny }}>→</span>
          <input type="date" value={evt.end} onChange={(e) => setEvt({ ...evt, end: e.target.value })} style={{ fontSize: 12 }} />
          <input placeholder="title (e.g. Winter break)" value={evt.title} onChange={(e) => setEvt({ ...evt, title: e.target.value })} style={{ flex: 1, minWidth: 140, fontSize: 12 }} />
          <select value={evt.mode} onChange={(e) => setEvt({ ...evt, mode: e.target.value as Mode })} style={{ fontSize: 12 }}>
            {ASSIGNABLE.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <button className="mm-btn mm-btn-primary" onClick={addEvent}>Add</button>
        </div>
        {state.events.length === 0 && <div style={{ fontSize: 12, color: T.inkTiny }}>No events yet.</div>}
        {state.events.slice().sort((a, b) => a.start.localeCompare(b.start)).map((e) => (
          <div key={e.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
            <span><span style={{ color: MODE_COLOR[e.mode || "vacation"] }}>●</span> {e.start} – {e.end} · {e.title} <span style={{ color: T.inkTiny }}>({e.mode})</span></span>
            <button onClick={() => removeEvent(e.id)} style={{ background: "none", border: "none", color: T.inkTiny, cursor: "pointer" }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
