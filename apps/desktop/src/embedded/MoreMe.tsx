import { useEffect, useMemo, useState } from "react";

// Embedded MoreMe — the corrected design: a STRICT daily time-blocked
// checklist. XP is earned ONLY by checking a block off during or after its
// window (no free-form logging, no spamming). Four modes, levels/tiers/streak.

type Mode = "semester" | "vacation" | "exam" | "travel";
type Block = { id: string; start: string; end: string; label: string; xp: number };

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
  vacation: [
    { id: "morning", start: "06:30", end: "07:00", label: "Morning routine", xp: 10 },
    { id: "workout", start: "07:00", end: "08:00", label: "20–30 min workout", xp: 20 },
    { id: "breakfast", start: "08:00", end: "08:30", label: "Healthy breakfast + plan top 3", xp: 5 },
    { id: "learn", start: "09:30", end: "11:00", label: "Khan Academy / reading / learning", xp: 15 },
    { id: "sports", start: "12:00", end: "14:00", label: "Sports (1–2 hours)", xp: 15 },
    { id: "project", start: "14:00", end: "16:30", label: "Project work / clean / skill", xp: 20 },
    { id: "gaming", start: "19:00", end: "21:00", label: "Gaming (≤2h, only after goals)", xp: 0 },
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

type Day = { mode: Mode; checked: string[] };
type State = { mode: Mode; days: Record<string, Day> };

const KEY = "nchub.moreme.v2";
const todayKey = (d = new Date()) => d.toISOString().slice(0, 10);
const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const fmt = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const ap = h < 12 ? "AM" : "PM";
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, "0")} ${ap}`;
};

function load(): State {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "");
    if (s && s.days) return s;
  } catch {
    /* ignore */
  }
  return { mode: "semester", days: {} };
}
function save(s: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function dayXp(day: Day | undefined): number {
  if (!day) return 0;
  const sched = SCHEDULES[day.mode];
  return day.checked.reduce((sum, id) => sum + (sched.find((b) => b.id === id)?.xp || 0), 0);
}
function dayComplete(day: Day | undefined): boolean {
  if (!day) return false;
  const total = SCHEDULES[day.mode].reduce((s, b) => s + b.xp, 0);
  return total > 0 && dayXp(day) >= total * 0.7;
}

export function MoreMe() {
  const [state, setState] = useState<State>(load);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const tk = todayKey(now);
  const today: Day = state.days[tk] || { mode: state.mode, checked: [] };
  const schedule = SCHEDULES[today.mode];
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const totals = useMemo(() => {
    const totalXp = Object.values(state.days).reduce((s, d) => s + dayXp(d), 0);
    const level = Math.floor(totalXp / 100);
    const tier = TIERS[Math.min(TIERS.length - 1, Math.floor(level / 5))];
    // streak: consecutive complete days ending today (or yesterday if today not done yet)
    let streak = 0;
    const d = new Date(now);
    if (!dayComplete(state.days[todayKey(d)])) d.setDate(d.getDate() - 1);
    for (;;) {
      if (dayComplete(state.days[todayKey(d)])) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return { totalXp, level, tier, xpIntoLevel: totalXp % 100, streak };
  }, [state, now]);

  function setMode(mode: Mode) {
    setState((s) => {
      const day = s.days[tk];
      // switching modes mid-day swaps the schedule → reset today's checks
      const days = { ...s.days, [tk]: { mode, checked: day && day.mode === mode ? day.checked : [] } };
      const next = { mode, days };
      save(next);
      return next;
    });
  }

  function toggle(b: Block) {
    if (nowMin < toMin(b.start)) return; // locked until its window starts
    setState((s) => {
      const day = s.days[tk] || { mode: today.mode, checked: [] };
      const checked = day.checked.includes(b.id)
        ? day.checked.filter((x) => x !== b.id)
        : [...day.checked, b.id];
      const next = { ...s, days: { ...s.days, [tk]: { mode: day.mode, checked } } };
      save(next);
      return next;
    });
  }

  const earned = dayXp(today);
  const possible = schedule.reduce((s, b) => s + b.xp, 0);

  return (
    <div className="stage">
      <div
        className="mono"
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--line)",
          fontSize: 12,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: "var(--mute)",
        }}
      >
        MoreMe <span className="glow-text">· daily system</span>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {/* Header stats */}
        <div className="panel" style={{ padding: 16, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div className="mono glow-text" style={{ fontSize: 18, letterSpacing: 2 }}>
                LVL {totals.level} · {totals.tier}
              </div>
              <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 2 }}>
                {totals.totalXp} XP total · {totals.streak}-day streak
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {(["semester", "vacation", "exam", "travel"] as Mode[]).map((m) => (
                <button
                  key={m}
                  className="btn"
                  onClick={() => setMode(m)}
                  style={{
                    textTransform: "capitalize",
                    borderColor: today.mode === m ? "rgba(255,87,119,0.7)" : undefined,
                    color: today.mode === m ? "var(--pink)" : undefined,
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          {/* XP into level bar */}
          <div style={{ marginTop: 12, height: 6, background: "#15151a", borderRadius: 4, overflow: "hidden" }}>
            <div className="strip" style={{ height: "100%", width: `${totals.xpIntoLevel}%` }} />
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--mute)" }}>
            Today: <span className="glow-text">{earned}</span> / {possible} XP ·{" "}
            {dayComplete(today) ? "day complete ✓" : `${Math.ceil(possible * 0.7)} XP completes the day`}
          </div>
        </div>

        {/* The time-blocked checklist */}
        {schedule.map((b) => {
          const done = today.checked.includes(b.id);
          const locked = nowMin < toMin(b.start);
          const active = !locked && nowMin <= toMin(b.end);
          return (
            <button
              key={b.id}
              onClick={() => toggle(b)}
              disabled={locked}
              className="panel"
              style={{
                width: "100%",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                marginBottom: 8,
                cursor: locked ? "not-allowed" : "pointer",
                opacity: locked ? 0.5 : 1,
                borderColor: active ? "rgba(255,87,119,0.5)" : undefined,
                color: "var(--ink)",
              }}
            >
              <span
                className="mono"
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  border: "1px solid var(--line)",
                  display: "grid",
                  placeItems: "center",
                  color: done ? "var(--pink)" : "transparent",
                  flex: "none",
                }}
              >
                ✕
              </span>
              <span className="mono" style={{ fontSize: 11, color: "var(--mute)", width: 150, flex: "none" }}>
                {fmt(b.start)} – {fmt(b.end)}
              </span>
              <span style={{ flex: 1, fontSize: 13, textDecoration: done ? "line-through" : "none" }}>
                {b.label}
              </span>
              <span className="mono" style={{ fontSize: 11, color: "var(--orange)", flex: "none" }}>
                {locked ? `unlocks ${fmt(b.start)}` : `+${b.xp}`}
              </span>
            </button>
          );
        })}

        <p style={{ color: "var(--mute)", fontSize: 12, marginTop: 14 }}>
          Blocks unlock at their start time and stay checkable for the rest of the
          day. XP comes only from the day's blocks — no free-form logging.
        </p>
      </div>
    </div>
  );
}
