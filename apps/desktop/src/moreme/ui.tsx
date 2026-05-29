import { useEffect, useMemo, useState } from "react";
import type { CalendarEvent, Goal, Goals, Mode, Project, ProjectCategory, ProjectStatus, State, Achievement } from "./types";
import { LEVELS_PER_TIER, MAX_LEVEL, TIERS, XP_PER_LEVEL } from "./types";
import {
  ACHIEVEMENTS, addEvent, cycleDayType, dayComplete, effectiveMode, fmtTime, getSchedule, iso, levelInfo,
  loadState, logBonus, logPenalty, prestige, refreshAchievements, removeEvent, removeProject,
  resetSeason, setBattlepassReward, setGoals, setReflection, streakInfo, subscribeState,
  toggleBlock, toMin, totalXp, upsertProject, xpForDay,
} from "./store";
import { ASSIGNABLE_MODES, BONUS_CATALOG, FITNESS_DAYS, FOOD_RULES, GAMING_RULES, MODE_COLOR, MODE_LABEL, PENALTY_CATALOG, TRAVEL_KIT } from "./schedules";
import { T, inp } from "./styles";

type Tab = "today" | "calendar" | "routines" | "goals" | "projects" | "battlepass" | "achievements" | "settings";

export function MoreMeUI() {
  const [state, setState] = useState<State>(loadState);
  const [tab, setTab] = useState<Tab>("today");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => subscribeState(setState), []);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  useEffect(() => { refreshAchievements(); }, [state]);

  return (
    <>
      <Header tab={tab} setTab={setTab} state={state} now={now} />
      {tab === "today" && <Today state={state} now={now} />}
      {tab === "calendar" && <CalendarPanel state={state} now={now} />}
      {tab === "routines" && <RoutinesPanel />}
      {tab === "goals" && <GoalsPanel state={state} />}
      {tab === "projects" && <ProjectsPanel state={state} />}
      {tab === "battlepass" && <BattlepassPanel state={state} />}
      {tab === "achievements" && <AchievementsPanel state={state} />}
      {tab === "settings" && <SettingsPanel state={state} />}
    </>
  );
}

// ── Header / nav ─────────────────────────────────────────────────────────
function Header({ tab, setTab, state, now }: { tab: Tab; setTab: (t: Tab) => void; state: State; now: Date }) {
  const tk = iso(now);
  const lv = levelInfo(state);
  const { mode } = effectiveMode(tk, state);
  const { current } = streakInfo(now, state);
  const tabs: Tab[] = ["today", "calendar", "routines", "goals", "projects", "battlepass", "achievements", "settings"];
  return (
    <div style={{ padding: "12px 18px", borderBottom: `1px solid ${T.line}`, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <span className="serif" style={{ fontSize: 24, color: T.ink }}>More Me</span>
      <span style={{ fontSize: 11, color: T.inkTiny, letterSpacing: ".14em", textTransform: "uppercase" }}>{lv.tier} · Lvl {lv.level}{state.prestige > 0 && ` · P${state.prestige}`}</span>
      <span className="mm-pill" style={{ background: MODE_COLOR[mode] + "22", color: MODE_COLOR[mode], border: `1px solid ${MODE_COLOR[mode]}66` }}>{MODE_LABEL[mode]}</span>
      <span style={{ fontSize: 11, color: T.inkSoft }}>🔥 {current}-day streak</span>
      <div style={{ display: "flex", gap: 6, marginLeft: "auto", flexWrap: "wrap" }}>
        {tabs.map((t) => <button key={t} className={`mm-tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>{t}</button>)}
      </div>
    </div>
  );
}

// ── TODAY ───────────────────────────────────────────────────────────────
function Today({ state, now }: { state: State; now: Date }) {
  const tk = iso(now);
  const { mode, reason } = effectiveMode(tk, state);
  const schedule = getSchedule(tk, state);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const day = state.dayLogs[tk] ?? { checked: [], bonus: [], penalty: [] };
  const xp = xpForDay(tk, state);
  const lv = levelInfo(state);

  const [oneWin, setOneWin] = useState(day.oneWin || "");
  const [improvement, setImprovement] = useState(day.improvement || "");
  useEffect(() => { setOneWin(day.oneWin || ""); setImprovement(day.improvement || ""); }, [tk]);

  function saveReflection() { setReflection(tk, oneWin.trim(), improvement.trim()); }

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
      {/* XP / Level card */}
      <div className="mm-card-mint" style={{ padding: 22, marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="serif" style={{ fontSize: 28, color: T.ink }}>Level {lv.level} · {lv.tier}</div>
            <div style={{ fontSize: 13, color: T.inkSoft, marginTop: 2 }}>{lv.total.toLocaleString()} XP total · season started {state.seasonStart}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, color: MODE_COLOR[mode] }}>{MODE_LABEL[mode]} mode</div>
            <div style={{ fontSize: 11, color: T.inkTiny }}>{reason}</div>
          </div>
        </div>
        <div className="mm-progress" style={{ marginTop: 16 }}>
          <div className="mm-progress-fill" style={{ width: `${(lv.xpIntoLevel / lv.levelXp) * 100}%` }} />
          <div className="mm-progress-text">{lv.xpIntoLevel} / {lv.levelXp} XP to next level</div>
        </div>
        <div style={{ marginTop: 10, fontSize: 13, color: T.inkSoft }}>
          Today: <span style={{ color: T.mint, fontWeight: 600 }}>{xp.net}</span> / {xp.possible} XP{xp.bonus !== 0 && ` · bonus +${xp.bonus}`}{xp.penalty !== 0 && ` · penalty ${xp.penalty}`} · {dayComplete(tk, state) ? "day complete ✓" : `${Math.ceil(xp.possible * 0.7)} XP completes the day`}
        </div>
      </div>

      {/* Schedule blocks */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {schedule.map((b) => {
          const done = day.checked.includes(b.id);
          const locked = nowMin < toMin(b.start);
          const active = !locked && nowMin <= toMin(b.end);
          return (
            <button key={b.id} onClick={() => toggleBlock(tk, b.id, nowMin)} disabled={locked}
              className={`mm-action${done ? " done" : ""}${locked ? " locked" : ""}`}
              style={{ cursor: locked ? "not-allowed" : "pointer", opacity: locked ? 0.5 : undefined, borderColor: active ? T.mint : undefined }}>
              <span style={{ width: 22, height: 22, borderRadius: 6, border: `1px solid ${done ? T.mint : T.line}`, background: done ? T.mint : T.bg, color: T.bg, display: "grid", placeItems: "center", flex: "none", fontSize: 13, fontWeight: 700 }}>{done ? "✓" : ""}</span>
              <span style={{ fontSize: 11, color: T.inkTiny, width: 150, flex: "none", fontVariantNumeric: "tabular-nums" }}>{fmtTime(b.start)} – {fmtTime(b.end)}</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, textDecoration: done ? "line-through" : "none" }}>
                {b.label}
                {b.note && <div style={{ fontSize: 11, color: T.inkTiny, marginTop: 2, textDecoration: "none" }}>{b.note}</div>}
              </span>
              <span style={{ fontSize: 12, color: locked ? T.inkTiny : T.mint, fontWeight: 600, flex: "none", fontVariantNumeric: "tabular-nums" }}>
                {locked ? `unlocks ${fmtTime(b.start)}` : `+${b.xp}`}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bonus + Penalty */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20 }}>
        <div className="mm-card" style={{ padding: 16 }}>
          <div className="serif" style={{ fontSize: 18, color: T.ink, marginBottom: 6 }}>Bonus XP</div>
          <div style={{ fontSize: 12, color: T.inkTiny, marginBottom: 10 }}>Stack extra effort.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {BONUS_CATALOG.map((b) => (
              <button key={b.kind} className="mm-btn" onClick={() => logBonus(tk, b.kind)}>
                + {b.label} <span style={{ color: T.mint, marginLeft: 6 }}>+{b.xp}</span>
              </button>
            ))}
          </div>
          {day.bonus.length > 0 && <div style={{ marginTop: 10, fontSize: 11, color: T.inkSoft }}>Today: {day.bonus.map((b) => `${b.kind} +${b.xp}`).join(" · ")}</div>}
        </div>
        <div className="mm-card" style={{ padding: 16 }}>
          <div className="serif" style={{ fontSize: 18, color: T.ink, marginBottom: 6 }}>Penalty</div>
          <div style={{ fontSize: 12, color: T.inkTiny, marginBottom: 10 }}>Own the slip so the streak still counts.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {PENALTY_CATALOG.map((p) => (
              <button key={p.kind} className="mm-btn" style={{ borderColor: T.warn + "66", color: T.warn }} onClick={() => logPenalty(tk, p.kind)}>
                − {p.label} <span style={{ marginLeft: 6 }}>{p.xp}</span>
              </button>
            ))}
          </div>
          {day.penalty.length > 0 && <div style={{ marginTop: 10, fontSize: 11, color: T.warn }}>Today: {day.penalty.map((p) => `${p.kind} ${p.xp}`).join(" · ")}</div>}
        </div>
      </div>

      {/* End-of-day reflection */}
      <div className="mm-card" style={{ padding: 16, marginTop: 16 }}>
        <div className="serif" style={{ fontSize: 18, color: T.ink, marginBottom: 6 }}>End-of-day check-in</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ fontSize: 11, color: T.inkSoft, letterSpacing: ".08em", textTransform: "uppercase" }}>
            One win
            <input style={inp} value={oneWin} onChange={(e) => setOneWin(e.target.value)} placeholder="celebrate one thing" />
          </label>
          <label style={{ fontSize: 11, color: T.inkSoft, letterSpacing: ".08em", textTransform: "uppercase" }}>
            One thing to improve
            <input style={inp} value={improvement} onChange={(e) => setImprovement(e.target.value)} placeholder="tomorrow's small fix" />
          </label>
        </div>
        <button className="mm-btn mm-btn-primary" style={{ marginTop: 10 }} onClick={saveReflection}>Save</button>
      </div>

      <p style={{ color: T.inkTiny, fontSize: 12, marginTop: 18 }}>
        The day's schedule is chosen automatically from your Calendar — weekends auto, day-types and events override. XP only comes from blocks you check during or after their window, plus bonus/penalty adjustments.
      </p>
    </div>
  );
}

// ── CALENDAR ────────────────────────────────────────────────────────────
function CalendarPanel({ state, now }: { state: State; now: Date }) {
  const [year, setYear] = useState(now.getFullYear());
  const [evt, setEvt] = useState<{ start: string; end: string; title: string; mode: Mode }>({ start: iso(now), end: iso(now), title: "", mode: "vacation" });

  function add() {
    if (!evt.title.trim()) return;
    addEvent({ ...evt, title: evt.title.trim() });
    setEvt({ ...evt, title: "" });
  }

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
      {/* year nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <button className="mm-btn" onClick={() => setYear((y) => y - 1)}>‹</button>
        <div className="serif" style={{ fontSize: 24, color: T.ink, minWidth: 100, textAlign: "center" }}>{year}</div>
        <button className="mm-btn" onClick={() => setYear((y) => y + 1)}>›</button>
        <button className="mm-btn" onClick={() => setYear(now.getFullYear())}>Today's year</button>
        <span style={{ fontSize: 11, color: T.inkTiny, marginLeft: 8 }}>
          Click a day to cycle its mode (semester → vacation → exam → travel → clear). Events take priority.
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {Array.from({ length: 12 }).map((_, m) => <MonthCard key={m} year={year} month={m} state={state} now={now} />)}
      </div>

      {/* legend */}
      <div style={{ display: "flex", gap: 18, marginTop: 18, flexWrap: "wrap", fontSize: 12, color: T.inkSoft }}>
        {(Object.keys(MODE_COLOR) as Mode[]).map((m) => (
          <span key={m} style={{ display: "flex", alignItems: "center", gap: 6, textTransform: "capitalize" }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: MODE_COLOR[m] }} /> {MODE_LABEL[m]}
          </span>
        ))}
      </div>

      {/* events */}
      <div className="mm-card" style={{ padding: 18, marginTop: 18 }}>
        <div className="serif" style={{ fontSize: 18, color: T.ink, marginBottom: 4 }}>Events</div>
        <div style={{ fontSize: 12, color: T.inkTiny, marginBottom: 12 }}>School blocks, breaks, finals weeks, trips. Each event forces its mode for the range.</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
          <input type="date" value={evt.start} onChange={(e) => setEvt({ ...evt, start: e.target.value })} style={{ fontSize: 12 }} />
          <span style={{ color: T.inkTiny }}>→</span>
          <input type="date" value={evt.end} onChange={(e) => setEvt({ ...evt, end: e.target.value })} style={{ fontSize: 12 }} />
          <input placeholder="title (e.g. Winter break · Spring Trip · Finals)" value={evt.title} onChange={(e) => setEvt({ ...evt, title: e.target.value })} style={{ flex: 1, minWidth: 200, fontSize: 12 }} />
          <select value={evt.mode} onChange={(e) => setEvt({ ...evt, mode: e.target.value as Mode })} style={{ fontSize: 12 }}>
            {ASSIGNABLE_MODES.map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
          </select>
          <button className="mm-btn mm-btn-primary" onClick={add}>Add event</button>
        </div>
        {state.events.length === 0 && <div style={{ fontSize: 12, color: T.inkTiny }}>No events yet. Add breaks, finals weeks, and trips so the schedule auto-adjusts.</div>}
        {state.events.slice().sort((a, b) => a.start.localeCompare(b.start)).map((e) => (
          <div key={e.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
            <span><span style={{ color: MODE_COLOR[e.mode] }}>●</span> {e.start} – {e.end} · {e.title} <span style={{ color: T.inkTiny }}>({MODE_LABEL[e.mode]})</span></span>
            <button onClick={() => removeEvent(e.id)} style={{ background: "none", border: "none", color: T.inkTiny, cursor: "pointer" }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthCard({ year, month, state, now }: { year: number; month: number; state: State; now: Date }) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = first.getDay();
  const cells: (string | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(iso(new Date(year, month, d)));
  const monthName = first.toLocaleString(undefined, { month: "long" });
  return (
    <div className="mm-card" style={{ padding: 12 }}>
      <div className="serif" style={{ fontSize: 16, color: T.ink, marginBottom: 8 }}>{monthName}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {["S","M","T","W","T","F","S"].map((d, i) => <div key={i} style={{ fontSize: 10, color: T.inkTiny, textAlign: "center", padding: 2, fontWeight: 600 }}>{d}</div>)}
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={i} />;
          const m = effectiveMode(dateStr, state).mode;
          const isToday = dateStr === iso(now);
          const ev = state.events.find((e) => dateStr >= e.start && dateStr <= e.end);
          return (
            <button key={i} onClick={() => cycleDayType(dateStr)} title={ev?.title || `${MODE_LABEL[m]}`}
              style={{ aspectRatio: "1", border: `1px solid ${isToday ? T.mint : T.line}`, borderRadius: 6, background: `${MODE_COLOR[m]}22`, color: T.ink, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, padding: 1, fontSize: 11 }}>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{Number(dateStr.slice(8))}</span>
              <span style={{ width: 10, height: 2, borderRadius: 2, background: MODE_COLOR[m] }} />
              {ev && <span style={{ width: 3, height: 3, borderRadius: "50%", background: T.mintHi }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── ROUTINES ────────────────────────────────────────────────────────────
function RoutinesPanel() {
  return (
    <div style={{ flex: 1, overflow: "auto", padding: 20, display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
      <div className="mm-card" style={{ padding: 16 }}>
        <div className="serif" style={{ fontSize: 18, color: T.ink, marginBottom: 6 }}>Morning routine</div>
        <ul style={{ paddingLeft: 18, color: T.inkSoft, fontSize: 13, lineHeight: 1.6 }}>
          <li>Drink water</li><li>Stretch (2–3 min)</li><li>Quick movement (push-ups, squats, or walk)</li><li>Set top 3 goals</li><li>Deep breaths</li>
        </ul>
      </div>
      <div className="mm-card" style={{ padding: 16 }}>
        <div className="serif" style={{ fontSize: 18, color: T.ink, marginBottom: 6 }}>Bedtime routine</div>
        <ul style={{ paddingLeft: 18, color: T.inkSoft, fontSize: 13, lineHeight: 1.6 }}>
          <li>Light stretching or slow breathing</li><li>Set clothes out</li><li>Think of one win</li><li>Turn off loud stuff + screens</li><li>Lights out by 22:00</li>
        </ul>
      </div>
      <div className="mm-card" style={{ padding: 16 }}>
        <div className="serif" style={{ fontSize: 18, color: T.ink, marginBottom: 6 }}>Fitness · weekly cycle</div>
        {FITNESS_DAYS.map((d) => (
          <div key={d.day} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 13, color: T.mint, fontWeight: 600 }}>{d.day} · {d.title}</div>
            <ul style={{ paddingLeft: 18, color: T.inkSoft, fontSize: 12, lineHeight: 1.5, margin: "2px 0 0" }}>
              {d.items.map((i) => <li key={i}>{i}</li>)}
            </ul>
          </div>
        ))}
        <div style={{ fontSize: 11, color: T.inkTiny }}>Minimum daily commitment: 2 minutes of movement. Anything counts.</div>
      </div>
      <div className="mm-card" style={{ padding: 16 }}>
        <div className="serif" style={{ fontSize: 18, color: T.ink, marginBottom: 6 }}>Food + hydration</div>
        <ul style={{ paddingLeft: 18, color: T.inkSoft, fontSize: 13, lineHeight: 1.6 }}>
          {FOOD_RULES.map((r) => <li key={r}>{r}</li>)}
        </ul>
      </div>
      <div className="mm-card" style={{ padding: 16 }}>
        <div className="serif" style={{ fontSize: 18, color: T.ink, marginBottom: 6 }}>Gaming rules</div>
        <ul style={{ paddingLeft: 18, color: T.inkSoft, fontSize: 13, lineHeight: 1.6 }}>
          {GAMING_RULES.map((r) => <li key={r}>{r}</li>)}
        </ul>
      </div>
      <div className="mm-card" style={{ padding: 16, gridColumn: "1 / -1" }}>
        <div className="serif" style={{ fontSize: 18, color: T.ink, marginBottom: 6 }}>Travel kit</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {TRAVEL_KIT.map((k) => (
            <div key={k.group}>
              <div style={{ fontSize: 13, color: T.mint, fontWeight: 600, marginBottom: 4 }}>{k.group}</div>
              <ul style={{ paddingLeft: 18, color: T.inkSoft, fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                {k.items.map((i) => <li key={i}>{i}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── GOALS ───────────────────────────────────────────────────────────────
function GoalsPanel({ state }: { state: State }) {
  const [g, setG] = useState<Goals>(state.goals);
  useEffect(() => setG(state.goals), [state.goals]);
  function commit(next: Goals) { setG(next); setGoals(next); }

  function GoalList({ title, keyName }: { title: string; keyName: keyof Goals }) {
    const list = g[keyName];
    const [add, setAdd] = useState("");
    return (
      <div className="mm-card" style={{ padding: 16 }}>
        <div className="serif" style={{ fontSize: 18, color: T.ink, marginBottom: 6 }}>{title}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {list.map((item) => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={!!item.done} onChange={(e) => commit({ ...g, [keyName]: list.map((x: Goal) => x.id === item.id ? { ...x, done: e.target.checked } : x) })} />
              <input value={item.text} onChange={(e) => commit({ ...g, [keyName]: list.map((x: Goal) => x.id === item.id ? { ...x, text: e.target.value } : x) })} style={{ ...inp, fontSize: 13, padding: "4px 8px", textDecoration: item.done ? "line-through" : "none" }} />
              <button className="mm-btn" onClick={() => commit({ ...g, [keyName]: list.filter((x: Goal) => x.id !== item.id) })}>✕</button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <input value={add} onChange={(e) => setAdd(e.target.value)} placeholder="add goal" style={{ ...inp, fontSize: 13, padding: "4px 8px" }} onKeyDown={(e) => {
            if (e.key === "Enter" && add.trim()) { commit({ ...g, [keyName]: [...list, { id: Math.random().toString(36).slice(2,8), text: add.trim() }] }); setAdd(""); }
          }} />
          <button className="mm-btn mm-btn-primary" onClick={() => { if (add.trim()) { commit({ ...g, [keyName]: [...list, { id: Math.random().toString(36).slice(2,8), text: add.trim() }] }); setAdd(""); } }}>Add</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 20, display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
      <GoalList title="Weekly · Digital" keyName="weeklyDigital" />
      <GoalList title="Weekly · Physical" keyName="weeklyPhysical" />
      <GoalList title="Weekly · Identity" keyName="weeklyIdentity" />
      <GoalList title="Semester · Digital" keyName="semesterDigital" />
      <GoalList title="Semester · Physical" keyName="semesterPhysical" />
      <GoalList title="Yearly · Academic" keyName="yearlyAcademic" />
      <GoalList title="Yearly · Personal" keyName="yearlyPersonal" />
      <GoalList title="Yearly · Physical" keyName="yearlyPhysical" />
      <GoalList title="Identity" keyName="identity" />
    </div>
  );
}

// ── PROJECTS ────────────────────────────────────────────────────────────
function ProjectsPanel({ state }: { state: State }) {
  const [editing, setEditing] = useState<Project | null>(null);
  const [draft, setDraft] = useState<Project>({ id: "", title: "", category: "school", status: "active", nextAction: "", milestones: 0 });
  const activeCount = state.projects.filter((p) => p.status === "active").length;
  const overActive = activeCount >= 3;

  function open(p: Project | null) {
    setEditing(p);
    setDraft(p ?? { id: Math.random().toString(36).slice(2,9), title: "", category: "school", status: "active", nextAction: "", milestones: 0 });
  }
  function save() {
    if (!draft.title.trim()) return;
    upsertProject(draft);
    setEditing(null);
  }

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
        <div className="serif" style={{ fontSize: 22, color: T.ink }}>Projects</div>
        <span style={{ fontSize: 12, color: overActive ? T.warn : T.inkSoft }}>{activeCount} active{overActive ? " — over the 3-project cap" : ""}</span>
        <div style={{ flex: 1 }} />
        <button className="mm-btn mm-btn-primary" onClick={() => open(null)}>+ New project</button>
      </div>

      {state.projects.length === 0 && <div className="mm-card" style={{ padding: 22, color: T.inkSoft }}>No projects yet. Pick one — only 3 active at a time.</div>}

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        {state.projects.map((p) => (
          <div key={p.id} className="mm-card" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="serif" style={{ fontSize: 17, color: T.ink }}>{p.title}</span>
              <span className="mm-pill" style={{ background: T.mint + "22", color: T.mint, border: `1px solid ${T.mint}55` }}>{p.category}</span>
            </div>
            <div style={{ fontSize: 11, color: T.inkTiny, marginTop: 4 }}>{p.status.toUpperCase()}{p.deadline && ` · due ${p.deadline}`}</div>
            <div style={{ fontSize: 13, color: T.inkSoft, marginTop: 8 }}>
              <span style={{ color: T.inkTiny, textTransform: "uppercase", fontSize: 10, letterSpacing: ".08em" }}>Next action</span><br/>
              {p.nextAction || "—"}
            </div>
            {p.notes && <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 8 }}>{p.notes}</div>}
            <div style={{ fontSize: 11, color: T.mint, marginTop: 8 }}>{p.milestones} milestones logged</div>
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              <button className="mm-btn" onClick={() => open(p)}>Edit</button>
              <button className="mm-btn" onClick={() => upsertProject({ ...p, milestones: p.milestones + 1 })}>+ milestone</button>
              <button className="mm-btn" onClick={() => upsertProject({ ...p, status: p.status === "done" ? "active" : "done" })}>{p.status === "done" ? "Reopen" : "Mark done"}</button>
              <button className="mm-btn" style={{ borderColor: T.warn + "66", color: T.warn }} onClick={() => removeProject(p.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {editing !== null || draft.id ? null : null}
      {(editing !== null || (draft.id && !state.projects.some((p) => p.id === draft.id))) && (
        <div className="mm-card" style={{ padding: 16, marginTop: 16, borderColor: T.mint + "55" }}>
          <div className="serif" style={{ fontSize: 18, color: T.ink, marginBottom: 8 }}>{editing ? "Edit project" : "New project"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="title" style={{ gridColumn: "1 / -1" }} />
            <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as ProjectCategory })}>
              {(["school","personal","physical","digital"] as ProjectCategory[]).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as ProjectStatus })}>
              {(["active","paused","done"] as ProjectStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input value={draft.nextAction} onChange={(e) => setDraft({ ...draft, nextAction: e.target.value })} placeholder="next action (concrete, doable today)" style={{ gridColumn: "1 / -1" }} />
            <input type="date" value={draft.deadline || ""} onChange={(e) => setDraft({ ...draft, deadline: e.target.value })} />
            <input value={draft.notes || ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="notes" />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button className="mm-btn mm-btn-primary" onClick={save}>{editing ? "Save" : "Add project"}</button>
            <button className="mm-btn" onClick={() => { setEditing(null); setDraft({ id: "", title: "", category: "school", status: "active", nextAction: "", milestones: 0 }); }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── BATTLEPASS ──────────────────────────────────────────────────────────
function BattlepassPanel({ state }: { state: State }) {
  const lv = levelInfo(state);
  return (
    <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
      <div className="mm-card-mint" style={{ padding: 18, marginBottom: 18 }}>
        <div className="serif" style={{ fontSize: 22, color: T.ink }}>Battlepass · Season</div>
        <div style={{ fontSize: 13, color: T.inkSoft, marginTop: 4 }}>
          Started {state.seasonStart} · {lv.total.toLocaleString()} XP earned · prestige {state.prestige}
        </div>
        <div className="mm-progress" style={{ marginTop: 14 }}>
          <div className="mm-progress-fill" style={{ width: `${(lv.level / MAX_LEVEL) * 100}%` }} />
          <div className="mm-progress-text">Level {lv.level} / {MAX_LEVEL} · {lv.tier}</div>
        </div>
        {lv.level >= MAX_LEVEL && (
          <button className="mm-btn mm-btn-primary" style={{ marginTop: 12 }} onClick={prestige}>Prestige</button>
        )}
      </div>

      {/* tier track */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${TIERS.length}, 1fr)`, gap: 8, marginBottom: 18 }}>
        {TIERS.map((tier, i) => {
          const reached = lv.tierIndex >= i;
          return (
            <div key={tier} className="mm-card" style={{ padding: 10, textAlign: "center", borderColor: reached ? T.mint : T.line, opacity: reached ? 1 : 0.55 }}>
              <div className="serif" style={{ fontSize: 13, color: reached ? T.mint : T.ink }}>{tier}</div>
              <div style={{ fontSize: 10, color: T.inkTiny }}>Lvl {i * LEVELS_PER_TIER + 1}–{(i + 1) * LEVELS_PER_TIER}</div>
            </div>
          );
        })}
      </div>

      {/* level rewards (user-set) */}
      <div className="mm-card" style={{ padding: 16 }}>
        <div className="serif" style={{ fontSize: 18, color: T.ink, marginBottom: 6 }}>Set your level rewards</div>
        <div style={{ fontSize: 12, color: T.inkTiny, marginBottom: 12 }}>Whatever you want to unlock at each level. Be specific — it's part of the carrot.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 8 }}>
          {state.battlepass.map((r) => {
            const reached = lv.level >= r.level;
            return (
              <div key={r.level} style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, borderRadius: 8, background: reached ? T.mint + "11" : "transparent", border: `1px solid ${reached ? T.mint + "55" : T.line}` }}>
                <span className="mm-pill" style={{ background: reached ? T.mint : T.line, color: T.bg, minWidth: 36, textAlign: "center" }}>{r.level}</span>
                <input style={{ ...inp, fontSize: 13, padding: "4px 8px" }} value={r.reward} onChange={(e) => setBattlepassReward(r.level, e.target.value)} placeholder={`reward at level ${r.level}`} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── ACHIEVEMENTS ────────────────────────────────────────────────────────
function AchievementsPanel({ state }: { state: State }) {
  const cats: Achievement["category"][] = ["skill", "learning", "discipline", "project", "special"];
  return (
    <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
      <div className="mm-card-mint" style={{ padding: 18, marginBottom: 18 }}>
        <div className="serif" style={{ fontSize: 22, color: T.ink }}>Achievements</div>
        <div style={{ fontSize: 13, color: T.inkSoft, marginTop: 4 }}>{Object.keys(state.unlockedAchievements).length} / {ACHIEVEMENTS.length} unlocked.</div>
      </div>
      {cats.map((c) => (
        <div key={c} style={{ marginBottom: 18 }}>
          <div className="serif" style={{ fontSize: 18, color: T.ink, textTransform: "capitalize", marginBottom: 8 }}>{c}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
            {ACHIEVEMENTS.filter((a) => a.category === c).map((a) => {
              const unlocked = !!state.unlockedAchievements[a.id];
              return (
                <div key={a.id} className="mm-card" style={{ padding: 14, opacity: unlocked ? 1 : 0.5, borderColor: unlocked ? T.mint + "66" : T.line }}>
                  <div className="serif" style={{ fontSize: 15, color: unlocked ? T.mint : T.ink }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 4 }}>{a.desc}</div>
                  {unlocked && <div style={{ fontSize: 10, color: T.inkTiny, marginTop: 6 }}>Unlocked {new Date(state.unlockedAchievements[a.id]).toLocaleDateString()}</div>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── SETTINGS ────────────────────────────────────────────────────────────
function SettingsPanel({ state }: { state: State }) {
  const today = iso(new Date());
  const lv = levelInfo(state);
  const [adjust, setAdjust] = useState(0);
  return (
    <div style={{ flex: 1, overflow: "auto", padding: 20, display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
      <div className="mm-card" style={{ padding: 16 }}>
        <div className="serif" style={{ fontSize: 18, color: T.ink, marginBottom: 6 }}>Season</div>
        <div style={{ fontSize: 12, color: T.inkSoft, marginBottom: 10 }}>Started {state.seasonStart}. Reset to start a fresh 1-month season.</div>
        <button className="mm-btn" onClick={resetSeason}>Reset season start</button>
      </div>
      <div className="mm-card" style={{ padding: 16 }}>
        <div className="serif" style={{ fontSize: 18, color: T.ink, marginBottom: 6 }}>XP adjustment</div>
        <div style={{ fontSize: 12, color: T.inkSoft, marginBottom: 10 }}>For life events the schedule didn't cover. Logged on today.</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="number" value={adjust} onChange={(e) => setAdjust(Number(e.target.value))} style={{ width: 100 }} />
          <button className="mm-btn" onClick={() => { logBonus(today, "difficult-thing"); }}>+ Quick bonus</button>
          <button className="mm-btn" onClick={() => { logPenalty(today, "rule-break"); }}>− Quick penalty</button>
        </div>
        {/* Adjust slot kept for raw delta if user wants */}
        <div style={{ fontSize: 11, color: T.inkTiny, marginTop: 8 }}>Custom value: {adjust} (use the per-day bonus/penalty buttons on the Today page for tracked entries).</div>
      </div>
      <div className="mm-card" style={{ padding: 16 }}>
        <div className="serif" style={{ fontSize: 18, color: T.ink, marginBottom: 6 }}>Prestige</div>
        <div style={{ fontSize: 12, color: T.inkSoft, marginBottom: 10 }}>Available at Dude Perfect (level {MAX_LEVEL}). Resets your day-logs and season; tier remains tracked separately via prestige count.</div>
        <div style={{ fontSize: 11, color: T.inkTiny }}>Current: {state.prestige}</div>
        <button className="mm-btn mm-btn-primary" disabled={lv.level < MAX_LEVEL} onClick={prestige} style={{ marginTop: 10, opacity: lv.level < MAX_LEVEL ? 0.5 : 1 }}>
          {lv.level < MAX_LEVEL ? `Locked · level ${lv.level}/${MAX_LEVEL}` : "Prestige now"}
        </button>
      </div>
      <div className="mm-card" style={{ padding: 16 }}>
        <div className="serif" style={{ fontSize: 18, color: T.ink, marginBottom: 6 }}>XP rules</div>
        <ul style={{ paddingLeft: 18, color: T.inkSoft, fontSize: 13, lineHeight: 1.6 }}>
          <li>{XP_PER_LEVEL} XP per level · {LEVELS_PER_TIER} levels per tier · {MAX_LEVEL} levels to Dude Perfect</li>
          <li>Day completes at 70% of scheduled XP</li>
          <li>Blocks only check during or after their window</li>
          <li>Bonus/penalty stack on the day's net</li>
        </ul>
      </div>
    </div>
  );
}
