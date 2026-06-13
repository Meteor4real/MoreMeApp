// MoreMe — calendar-first UI. Today / Calendar / Projects / Goals /
// Achievements / Levels, plus a full event editor. Subscribes to the single
// store; XP is earned by completing scheduled items and project milestones.

import { useEffect, useMemo, useRef, useState } from "react";
import { T } from "./styles";
import {
  CATEGORY_META, CATEGORY_ORDER, HELP_KINDS, HELP_KIND_LABEL, MAX_LEVEL, RANK_NAMES, cumulativeXp, levelStep,
} from "./types";
import type {
  CalEvent, Category, ChecklistItem, Class, Goal, HelpKind, InboxItem, Person, Priority,
  Project, ProjectKind, Recurrence, SchoolPath, State, Visibility,
} from "./types";
import {
  ACHIEVEMENTS, achievementProgress, blankClass, blankEvent, blankProject,
  captureInbox, conflictIds, dayComplete, distractionsOn, dueReminders,
  eventsOnDate, fmtTime, gradeLabel, gradeStatus, inboxToEventDraft,
  inboxToProject, iso, isDone, levelInfo, loadState, logDistraction, monthLabel,
  removeClass, removeDistraction, removeEvent, removeInbox, removePerson,
  removeProject, revealEvent, schoolYearLabel, setGoals, setReward, setSchool,
  streakInfo, subscribeState, today, toggleDone, uid, upcomingWithReminders,
  upsertClass, upsertEvent, upsertPerson, upsertProject, xpForDate,
} from "./store";
import { DayView, WeekView, shiftWeek } from "./timeline";
import { GetAheadView } from "./getahead";
import { EmpireView } from "./empire";
import { InsightsView } from "./insights";
import { WeeklyReview } from "./review";
import { PlansView } from "./plans";
import { CustomizeView } from "./customize";
import { ScreensView, ScreenCardToday, LogSessionModal, UrgeModal } from "./screens";
import { isTabHidden, rankFor, tabLabel } from "./store";
import { WidgetView } from "./widgets";
import { generateClassPeriods, clearClassPeriods, setClassPeriod } from "./store";
import { pullOnce, pushOnce, subscribeSync, type SyncStatus } from "./sync";
import { THEME_META, currentThemeName, heroImageUrl, setTheme, subscribeTheme, type ThemeName } from "./styles";
import { quoteOfDay } from "./quotes";
import { makePrintHandler } from "./print";

// Built-in tab ids. The render code accepts ANY string so dynamic tab ids
// (created at runtime) can be the active tab too — the only routing needs
// are the well-known ids plus a default-cases fall-through.
type BuiltInTab = "today" | "ahead" | "calendar" | "screens" | "empire" | "projects" | "plans" | "goals" | "achievements" | "insights" | "levels" | "customize";
type Tab = BuiltInTab | string;
type CalMode = "month" | "week" | "day";
const TAB_LABELS: Record<BuiltInTab, string> = {
  today: "today", ahead: "get ahead", calendar: "calendar", screens: "screens", empire: "empire",
  projects: "projects", plans: "plans", goals: "goals", achievements: "achievements",
  insights: "insights", levels: "levels", customize: "customize",
};

function useStore(): State {
  const [s, setS] = useState<State>(loadState);
  useEffect(() => subscribeState(setS), []);
  return s;
}

export function MoreMeUI() {
  const s = useStore();
  const [tab, setTab] = useState<Tab>("today");
  const [editing, setEditing] = useState<CalEvent | null>(null);
  const [review, setReview] = useState(false);
  // Force a re-render of every component using `T.*` when the theme flips.
  const [, bumpTheme] = useState(0);
  useEffect(() => subscribeTheme(() => bumpTheme((n) => n + 1)), []);

  const ALL_TABS: BuiltInTab[] = ["today", "ahead", "calendar", "screens", "empire", "projects", "plans", "goals", "achievements", "insights", "levels", "customize"];
  // Customize is always available — otherwise you could hide it and lose the
  // way back. Everything else respects the user's `hiddenTabs` choice.
  const tabs = ALL_TABS.filter((t) => t === "customize" || !isTabHidden(t, s));
  const dyn = s.customization.dynamicTabs;
  // The active tab id is a string — built-in Tab type union OR a dynamic tab id.
  const tabIdStr = String(tab);
  const dynamicCurrent = dyn.find((d) => d.id === tabIdStr);

  // Render widgets dropped onto this tab id (built-in OR dynamic).
  const widgetsHere = s.customization.widgets[tabIdStr] ?? [];

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", position: "relative" }}>
      <Header s={s} onReview={() => setReview(true)} />
      <CaptureBar />
      <div style={{ display: "flex", gap: 6, padding: "10px 18px", flexWrap: "wrap", borderBottom: `1px solid ${T.line}` }}>
        {tabs.map((t) => (
          <button key={t} className={"mm-tab" + (tab === t ? " active" : "")} onClick={() => setTab(t)}>{tabLabel(t, TAB_LABELS[t], s)}</button>
        ))}
        {dyn.map((d) => (
          <button key={d.id} className={"mm-tab" + (tabIdStr === d.id ? " active" : "")} onClick={() => setTab(d.id as Tab)}>
            {d.icon ? `${d.icon} ` : ""}{d.label}
          </button>
        ))}
      </div>
      <div className="scrolly" style={{ flex: 1, minHeight: 0, padding: 18 }}>
        {/* Widgets dropped onto any built-in tab render here first. */}
        {widgetsHere.length > 0 && tab !== "customize" && !dynamicCurrent && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 760, margin: "0 auto 16px" }}>
            {widgetsHere.map((w) => <WidgetView key={w.id} s={s} tabId={tabIdStr} w={w} />)}
          </div>
        )}
        {tab === "today" && <TodayView s={s} onEdit={setEditing} />}
        {tab === "ahead" && <GetAheadView s={s} onEdit={setEditing} />}
        {tab === "calendar" && <CalendarView s={s} onEdit={setEditing} />}
        {tab === "screens" && <ScreensView s={s} />}
        {tab === "empire" && <EmpireView s={s} />}
        {tab === "projects" && <ProjectsView s={s} />}
        {tab === "plans" && <PlansView s={s} />}
        {tab === "goals" && <GoalsView s={s} />}
        {tab === "achievements" && <AchievementsView s={s} />}
        {tab === "insights" && <InsightsView s={s} />}
        {tab === "levels" && <LevelsView s={s} />}
        {tab === "customize" && <CustomizeView s={s} />}
        {dynamicCurrent && <DynamicTabView s={s} tabId={dynamicCurrent.id} />}
      </div>
      {editing && <EventEditor s={s} draft={editing} onClose={() => setEditing(null)} />}
      {review && <WeeklyReview s={s} onClose={() => setReview(false)} onEdit={(e) => { setReview(false); setEditing(e); }} />}
      <ReminderToasts s={s} onOpen={setEditing} />
    </div>
  );
}

// ── Dynamic tab renderer ──────────────────────────────────────────────────
// A user/agent-created tab. Renders its widget list and an honest empty
// state pointing to the Customize builder.
function DynamicTabView({ s, tabId }: { s: State; tabId: string }) {
  const t = s.customization.dynamicTabs.find((x) => x.id === tabId);
  const list = s.customization.widgets[tabId] ?? [];
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="serif" style={{ fontSize: 22 }}>{t?.icon ? `${t.icon} ` : ""}{t?.label ?? "Tab"}</div>
      {list.length === 0
        ? <div style={{ fontSize: 12, color: T.inkTiny, fontStyle: "italic", padding: 16 }}>No widgets here yet. Open <b>Customize → Pages &amp; widgets</b> to drop some in.</div>
        : list.map((w) => <WidgetView key={w.id} s={s} tabId={tabId} w={w} />)}
    </div>
  );
}

// ── GTD quick capture: dump anything from anywhere, triage later ──────────
function CaptureBar() {
  const [v, setV] = useState("");
  const fire = () => { if (v.trim()) { captureInbox(v); setV(""); } };
  return (
    <div style={{ display: "flex", gap: 8, padding: "8px 18px", borderBottom: `1px solid ${T.line}`, background: T.sunk }}>
      <input
        placeholder="Capture anything — a task, idea, follow-up… (lands in your inbox to triage)"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") fire(); }}
        style={{ flex: 1 }}
      />
      <button className="mm-btn" onClick={fire}>Capture</button>
    </div>
  );
}

// ── in-app reminder toasts (fire while the app is open) ───────────────────
function ReminderToasts({ s, onOpen }: { s: State; onOpen: (e: CalEvent) => void }) {
  const [active, setActive] = useState<{ key: string; e: CalEvent; date: string; lead: number }[]>([]);
  const [fired] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    // Ask once for OS notification permission so reminders surface even when
    // you're on the News tab or the window is in the background.
    try { if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission(); } catch { /* ignore */ }
    const tick = () => {
      const due = dueReminders(loadState());
      const fresh = due.filter((d) => !fired.has(d.key));
      if (fresh.length) {
        fresh.forEach((d) => fired.add(d.key));
        for (const d of fresh) {
          try {
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification(`MoreMe · ${d.lead}m before`, {
                body: `${d.e.title || CATEGORY_META[d.e.category].label}${d.e.start ? " · " + fmtTime(d.e.start) : ""}${d.e.location ? " · " + d.e.location : ""}`,
              });
            }
          } catch { /* ignore */ }
        }
        setActive((cur) => [...cur, ...fresh.map((d) => ({ key: d.key, e: d.e, date: d.date, lead: d.lead }))]);
      }
    };
    tick();
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  void s;

  if (!active.length) return null;
  return (
    <div style={{ position: "absolute", right: 16, bottom: 16, display: "flex", flexDirection: "column", gap: 8, zIndex: 60, maxWidth: 320 }}>
      {active.map((t) => {
        const meta = CATEGORY_META[t.e.category];
        return (
          <div key={t.key} className="mm-card-mint" style={{ padding: "12px 14px", boxShadow: "0 12px 40px rgba(0,0,0,.5)" }}>
            <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: T.mint, marginBottom: 4 }}>
              Reminder · {t.lead}m before
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="mm-dot" style={{ ["--c" as never]: meta.color }} />
              <b style={{ flex: 1, fontSize: 13 }}>{t.e.title || meta.label}</b>
            </div>
            <div style={{ fontSize: 11, color: T.inkSoft, margin: "4px 0 8px" }}>
              {fmtTime(t.e.start)}{t.e.location ? ` · ${t.e.location}` : ""}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="mm-btn" style={{ padding: "3px 10px", fontSize: 11 }} onClick={() => { onOpen(t.e); setActive((c) => c.filter((x) => x.key !== t.key)); }}>Open</button>
              <button className="mm-btn" style={{ padding: "3px 10px", fontSize: 11 }} onClick={() => setActive((c) => c.filter((x) => x.key !== t.key))}>Dismiss</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── header: level bar + streak + today XP ─────────────────────────────────
function Header({ s, onReview }: { s: State; onReview: () => void }) {
  const lv = levelInfo(s);
  const { current } = streakInfo(s);
  const tx = xpForDate(today(), s);
  const pct = lv.isMax ? 100 : Math.round((lv.into / lv.span) * 100);
  const status = gradeStatus(s);
  const chipColor =
    status.kind === "summer"  ? "#FFD23E" :
    status.kind === "alumnus" ? "#A855F7" : T.mint;
  const chipText =
    status.kind === "summer"  ? "Summer" :
    status.kind === "alumnus" ? "Alumnus" : "In school";
  return (
    <div style={{ padding: "16px 18px 12px", borderBottom: `1px solid ${T.line}`, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="mm-h1" style={{ fontSize: 26, lineHeight: 1 }}>MoreMe</div>
          <span className="mm-pill" style={{ background: chipColor + "22", color: chipColor, border: `1px solid ${chipColor}55` }}>{chipText}</span>
        </div>
        <div style={{ fontSize: 11, color: T.inkTiny, letterSpacing: ".08em", textTransform: "uppercase", marginTop: 3 }}>
          Mount Vernon · {s.school.path} · {gradeLabel(s)} · {schoolYearLabel(s)}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 240 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
          <b style={{ color: T.mint }}>Level {lv.level} · {rankFor(lv.level, s)}{lv.isMax ? " · MAX" : ""}</b>
          <span style={{ color: T.inkTiny }}>{lv.total.toLocaleString()} XP{lv.isMax ? "" : ` · ${Math.max(0, lv.nextAt - lv.total).toLocaleString()} to L${lv.level + 1} (${rankFor(lv.level + 1, s)})`}</span>
        </div>
        <div className="mm-progress"><div className="mm-progress-fill" style={{ width: pct + "%" }} /><div className="mm-progress-text">{pct}%</div></div>
      </div>
      <Stat label="Streak" value={`${current}d`} />
      <Stat label="Today" value={`${tx.earned}/${tx.possible} XP`} />
      <SyncPip />
      <button className="mm-btn" onClick={onReview} title="Run your weekly review">Weekly Review</button>
    </div>
  );
}

function SyncPip() {
  const [s, setS] = useState<{ status: SyncStatus; error: string; at: number | null }>({ status: "off", error: "", at: null });
  useEffect(() => subscribeSync(setS), []);
  const color = s.status === "idle" ? T.mint : s.status === "error" ? T.warn : s.status === "off" ? T.inkTiny : "#FFD23E";
  const label =
    s.status === "off"     ? "Sync · guest" :
    s.status === "idle"    ? (s.at ? `Synced · ${new Date(s.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Synced") :
    s.status === "pulling" ? "Pulling…" :
    s.status === "pushing" ? "Saving…" :
                              `Sync error · ${s.error}`;
  return (
    <button
      className="mm-btn"
      title={`${label}\nClick to force a sync`}
      onClick={() => { void pullOnce().then(() => pushOnce()); }}
      style={{ padding: "5px 10px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 6 }}
    >
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}` }} />
      {label}
    </button>
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
  const upcoming = upcomingWithReminders(s);
  const [screenModal, setScreenModal] = useState<"log" | "urge" | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const print = makePrintHandler(() => printRef.current);
  const quote = quoteOfDay(date);

  const hero = heroImageUrl();

  return (
    <div ref={printRef} style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr", maxWidth: 760, margin: "0 auto", position: "relative" }}>
      {/* Decorative backdrop — theme's hero image, very faint. Fixed
          position absolutely behind the content; img.onerror hides it so
          a broken URL doesn't leave a placeholder. */}
      {hero && (
        <img
          src={hero}
          alt=""
          aria-hidden="true"
          className="mm-no-print"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.07, zIndex: 0, pointerEvents: "none", borderRadius: 14 }}
        />
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, position: "relative", zIndex: 1 }}>
        <div className="serif" style={{ fontSize: 20 }}>{new Date(date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>
        <div className="mm-no-print" style={{ display: "flex", gap: 6 }}>
          <button className="mm-btn" onClick={print} title="Print today">⎙ Print</button>
          <button className="mm-btn mm-btn-primary" onClick={() => onEdit({ ...blankEvent(date) })}>+ New item</button>
        </div>
      </div>

      <QuoteBanner quote={quote} />

      {conflicts.size > 0 && (
        <div className="mm-card" style={{ padding: "10px 14px", borderColor: T.warn, color: T.warn, fontSize: 12 }}>
          {conflicts.size} item{conflicts.size === 1 ? "" : "s"} overlap in time today — adjust the schedule.
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="mm-card-mint" style={{ padding: "10px 14px" }}>
          <div style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: T.mint, marginBottom: 6 }}>
            Upcoming reminders
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {upcoming.map((u) => (
              <div key={u.e.id + u.on} onClick={() => onEdit(u.e)} style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 12, cursor: "pointer" }}>
                <span className="mm-dot" style={{ ["--c" as never]: CATEGORY_META[u.e.category].color, width: 6, height: 6 }} />
                <b style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.e.title || CATEGORY_META[u.e.category].label}</b>
                <span style={{ color: T.inkSoft, fontSize: 11 }}>
                  {u.on === date ? "today" : new Date(u.on + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" })}
                  {" · "}{fmtTime(u.e.start)} · -{u.firstReminderMin}m
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ScreenCardToday s={s} onOpenLog={() => setScreenModal("log")} onOpenUrge={() => setScreenModal("urge")} />

      {s.inbox.length > 0 && (
        <Section title={`Inbox · ${s.inbox.length} to triage`}>
          {s.inbox.map((it) => <InboxRow key={it.id} item={it} onEdit={onEdit} />)}
        </Section>
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

      {screenModal === "log" && <LogSessionModal onClose={() => setScreenModal(null)} />}
      {screenModal === "urge" && <UrgeModal s={s} onClose={() => setScreenModal(null)} />}
    </div>
  );
}
function InboxRow({ item, onEdit }: { item: InboxItem; onEdit: (e: CalEvent) => void }) {
  return (
    <div className="mm-action" style={{ cursor: "default" }}>
      <span className="mm-dot" style={{ ["--c" as never]: "#FFD23E" }} />
      <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>{item.text}</div>
      <button className="mm-btn" style={{ padding: "3px 8px" }} title="Schedule it" onClick={() => { onEdit(inboxToEventDraft(item)); removeInbox(item.id); }}>Schedule</button>
      <button className="mm-btn" style={{ padding: "3px 8px" }} title="Make it a project" onClick={() => inboxToProject(item)}>Project</button>
      <button className="mm-btn mm-btn-danger" style={{ padding: "3px 8px" }} title="Discard" onClick={() => removeInbox(item.id)}>×</button>
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
function QuoteBanner({ quote }: { quote: { text: string; by: string } }) {
  return (
    <div className="mm-card-mint" style={{ padding: "14px 18px", display: "flex", gap: 14, alignItems: "center", borderLeft: `4px solid ${T.mint}` }}>
      <span className="condensed" style={{ fontSize: 10, color: T.mint, letterSpacing: ".2em", flex: "none", writingMode: "vertical-rl", transform: "rotate(180deg)" }}>Today</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="serif" style={{ fontSize: 17, lineHeight: 1.35, color: T.ink }}>“{quote.text}”</div>
        <div style={{ fontSize: 11, color: T.inkTiny, marginTop: 4, letterSpacing: ".06em", textTransform: "uppercase" }}>— {quote.by}</div>
      </div>
    </div>
  );
}

// ── Calendar ────────────────────────────────────────────────────────────────
function CalendarView({ s, onEdit }: { s: State; onEdit: (e: CalEvent) => void }) {
  const [mode, setMode] = useState<CalMode>("month");
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [sel, setSel] = useState(today());
  const printRef = useRef<HTMLDivElement>(null);
  const print = makePrintHandler(() => printRef.current);

  const grid = useMemo(() => buildMonth(cursor.y, cursor.m), [cursor]);
  const selEvents = eventsOnDate(sel, s);
  const selConflicts = conflictIds(sel, s);

  function shiftMonth(n: number) {
    setCursor((c) => { const d = new Date(c.y, c.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  }
  function shift(n: number) {
    if (mode === "month") shiftMonth(n);
    else if (mode === "week") setSel((d) => shiftWeek(d, n));
    else { const d = new Date(sel + "T00:00:00"); d.setDate(d.getDate() + n); setSel(iso(d)); }
  }
  function goToday() {
    const d = new Date();
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
    setSel(today());
  }

  return (
    <div ref={printRef} style={{ display: "grid", gridTemplateColumns: mode === "month" ? "minmax(0,1fr) 320px" : "minmax(0,1fr)", gap: 16, alignItems: "start" }}>
      <div className="mm-card" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <button className="mm-btn" onClick={() => shift(-1)}>‹</button>
          <div className="serif" style={{ fontSize: 18, flex: 1, textAlign: "center", minWidth: 160 }}>
            {mode === "month"
              ? monthLabel(cursor.y, cursor.m)
              : mode === "week"
                ? `Week of ${new Date(sel + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                : new Date(sel + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </div>
          <button className="mm-btn" onClick={() => shift(1)}>›</button>
          <button className="mm-btn" onClick={goToday}>Today</button>
          <button className="mm-btn mm-no-print" onClick={print} title="Print this calendar view">⎙</button>
          <div className="mm-seg">
            {(["month", "week", "day"] as CalMode[]).map((m) => (
              <button key={m} className={mode === m ? "on" : ""} onClick={() => setMode(m)}>{m}</button>
            ))}
          </div>
        </div>
        {mode === "month" && <div className="mm-cal">
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
        </div>}
        {mode === "week" && <WeekView s={s} anchor={sel} onEdit={onEdit} onPickDate={(d) => { setSel(d); setMode("day"); }} />}
        {mode === "day"  && <DayView  s={s} date={sel} onEdit={onEdit} />}
      </div>

      {mode === "month" && (
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
      )}
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

          <div className="mm-row">
            <Field label="Link to project">
              <select value={e.linkedProjectId ?? ""} onChange={(ev) => set("linkedProjectId", ev.target.value || undefined)}>
                <option value="">None</option>
                {s.projects.map((p) => <option key={p.id} value={p.id}>{p.name || "(untitled)"}</option>)}
              </select>
            </Field>
            <Field label="Class">
              <select value={e.linkedClassId ?? ""} onChange={(ev) => set("linkedClassId", ev.target.value || undefined)}>
                <option value="">None</option>
                {s.classes.map((c) => <option key={c.id} value={c.id}>{c.name || "(untitled)"}</option>)}
              </select>
            </Field>
            <Field label="Reminders (min before)">
              <input
                value={e.reminders.join(", ")}
                placeholder="e.g. 10, 60"
                onChange={(ev) => set("reminders", ev.target.value.split(",").map((x) => parseInt(x.trim(), 10)).filter((x) => Number.isFinite(x) && x >= 0))}
                style={{ width: 140 }}
              />
            </Field>
          </div>

          <Field label="Sub-tasks">
            <ChecklistEditor items={e.checklist} onChange={(items) => set("checklist", items)} />
          </Field>

          {e.category === "school" && (
            <div style={{ padding: 12, background: T.sunk, border: `1px dashed ${T.mint}55`, borderRadius: 10, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: T.mint }}>
                Honesty log
              </div>
              <div style={{ fontSize: 11, color: T.inkSoft, lineHeight: 1.5 }}>
                Just for you. No judgment, no nags — just the mirror.
              </div>
              <div className="mm-row" style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
                <Field label="Prepared">
                  <div className="mm-seg">
                    <button className={e.prepared ? "on" : ""} onClick={() => set("prepared", true)}>I read first</button>
                    <button className={e.prepared === false ? "on" : ""} onClick={() => set("prepared", false)}>Dove in</button>
                    <button className={e.prepared == null ? "on" : ""} onClick={() => set("prepared", undefined)}>—</button>
                  </div>
                </Field>
                <Field label="Help used">
                  <select value={e.helpUsed ?? ""} onChange={(ev) => set("helpUsed", (ev.target.value || undefined) as HelpKind | undefined)}>
                    <option value="">—</option>
                    {HELP_KINDS.map((k) => <option key={k} value={k}>{HELP_KIND_LABEL[k]}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="One thing you learned (optional)">
                <input value={e.learned ?? ""} placeholder="What stuck?" onChange={(ev) => set("learned", ev.target.value || undefined)} />
              </Field>
            </div>
          )}

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
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <SchoolCard s={s} />
        <ThemeCard />
        <BackgroundCard />
        <ClassesCard s={s} />
        <CircleCard s={s} />
      </div>
    </div>
  );
}
function ThemeCard() {
  const [name, setName] = useState<ThemeName>(currentThemeName);
  return (
    <div className="mm-card" style={{ padding: 16 }}>
      <div className="serif" style={{ fontSize: 16, marginBottom: 4 }}>Theme</div>
      <div style={{ fontSize: 11, color: T.inkTiny, marginBottom: 10 }}>
        Switch the whole app's palette. Saves the second you pick.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(Object.keys(THEME_META) as ThemeName[]).map((k) => {
          const meta = THEME_META[k];
          const on = name === k;
          return (
            <button
              key={k}
              onClick={() => { setName(k); setTheme(k); }}
              className="mm-action"
              style={{ borderColor: on ? T.mint : undefined, background: on ? T.mint + "0d" : undefined, cursor: "pointer" }}
            >
              <span style={{ display: "inline-flex", gap: 0, borderRadius: 6, overflow: "hidden", flex: "none", boxShadow: `0 0 0 1px ${T.line}` }}>
                {meta.swatch.map((c) => <span key={c} style={{ width: 14, height: 22, background: c, display: "inline-block" }} />)}
              </span>
              <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <b style={{ fontSize: 13 }}>{meta.label}</b>
                <div style={{ fontSize: 11, color: T.inkTiny }}>{meta.note}</div>
              </div>
              {on && <span className="mm-pill" style={{ background: T.mint, color: T.bg }}>Active</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
function BackgroundCard() {
  const bg = (window.hub as { bg?: { get(): Promise<{ minimizeToTray: boolean; runOnStartup: boolean }>; set(p: Partial<{ minimizeToTray: boolean; runOnStartup: boolean }>): Promise<{ minimizeToTray: boolean; runOnStartup: boolean }> } }).bg;
  const [prefs, setPrefs] = useState<{ minimizeToTray: boolean; runOnStartup: boolean } | null>(null);
  useEffect(() => { if (bg) void bg.get().then(setPrefs); }, [bg]);
  if (!bg) return null;
  const toggle = (k: "minimizeToTray" | "runOnStartup") => {
    if (!prefs) return;
    void bg.set({ [k]: !prefs[k] }).then(setPrefs);
  };
  return (
    <div className="mm-card" style={{ padding: 16 }}>
      <div className="serif" style={{ fontSize: 16, marginBottom: 4 }}>Background</div>
      <div style={{ fontSize: 11, color: T.inkTiny, marginBottom: 10 }}>
        Keep MoreMe syncing, reminding, and running the wire even when the window's closed.
      </div>
      <Toggle on={!!prefs?.minimizeToTray} disabled={!prefs} onClick={() => toggle("minimizeToTray")} label="Closing hides to tray (keeps running)" />
      <Toggle on={!!prefs?.runOnStartup} disabled={!prefs} onClick={() => toggle("runOnStartup")} label="Launch on system startup" />
    </div>
  );
}
function Toggle({ on, label, onClick, disabled }: { on: boolean; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="mm-action" style={{ marginTop: 8, opacity: disabled ? 0.5 : 1 }}>
      <span style={{ width: 34, height: 18, borderRadius: 999, background: on ? T.mint : T.line, position: "relative", flex: "none", transition: "background .15s" }}>
        <span style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
      </span>
      <span style={{ flex: 1, fontSize: 12, textAlign: "left" }}>{label}</span>
    </button>
  );
}
function SchoolCard({ s }: { s: State }) {
  const paths: SchoolPath[] = ["Inquiry", "Global Impact Diploma", "Innovation Diploma"];
  const incoming9 = new Date().getFullYear() + (new Date().getMonth() >= 7 ? 1 : 0);
  // offer a sensible range of "year you started 9th grade"
  const years: number[] = [];
  for (let y = incoming9 + 1; y >= incoming9 - 5; y--) years.push(y);
  return (
    <div className="mm-card" style={{ padding: 16 }}>
      <div className="serif" style={{ fontSize: 16, marginBottom: 4 }}>School</div>
      <div style={{ fontSize: 12, color: T.mint, marginBottom: 10 }}>{gradeLabel(s)} · {schoolYearLabel(s)}</div>
      <div style={{ fontSize: 11, color: T.inkTiny, marginBottom: 10 }}>
        Your grade advances automatically every August — no need to bump it.
      </div>
      <div className="mm-field" style={{ marginBottom: 10 }}>
        <label>Upper School path</label>
        <select value={s.school.path} onChange={(e) => setSchool({ path: e.target.value as SchoolPath })}>
          {paths.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div className="mm-field">
        <label>Year you started (or start) 9th grade</label>
        <select value={s.school.grade9Year} onChange={(e) => setSchool({ grade9Year: Number(e.target.value) })}>
          {years.map((y) => <option key={y} value={y}>{y}–{String(y + 1).slice(2)}</option>)}
        </select>
      </div>
    </div>
  );
}
function ClassesCard({ s }: { s: State }) {
  const [name, setName] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <div className="mm-card" style={{ padding: 16 }}>
      <div className="serif" style={{ fontSize: 16, marginBottom: 10 }}>Classes</div>
      <div style={{ fontSize: 11, color: T.inkTiny, marginBottom: 10 }}>
        Link school work to a class for Get Ahead %. Set a weekly period to drop the class onto your calendar automatically.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {s.classes.map((c: Class) => (
          <div key={c.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input value={c.name} placeholder="Class name" onChange={(e) => upsertClass({ ...c, name: e.target.value })} style={{ flex: 1 }} />
              <button className="mm-btn" style={{ padding: "4px 8px", color: c.period ? T.mint : undefined }} title="Weekly schedule" onClick={() => setOpenId(openId === c.id ? null : c.id)}>
                {c.period ? "◷ set" : "◷"}
              </button>
              <button className="mm-btn mm-btn-danger" style={{ padding: "4px 8px" }} onClick={() => removeClass(c.id)}>×</button>
            </div>
            {openId === c.id && <ClassPeriodEditor s={s} c={c} />}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input placeholder="Add a class…" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) { upsertClass({ ...blankClass(), name: name.trim() }); setName(""); } }} />
        <button className="mm-btn" onClick={() => { if (name.trim()) { upsertClass({ ...blankClass(), name: name.trim() }); setName(""); } }}>Add</button>
      </div>
    </div>
  );
}
function ClassPeriodEditor({ s, c }: { s: State; c: Class }) {
  const p = c.period ?? { days: [], start: "09:00", end: "10:00" };
  const setP = (next: Partial<typeof p>) => setClassPeriod(c.id, { ...p, ...next });
  return (
    <div style={{ marginTop: 6, padding: 10, background: T.sunk, borderRadius: 8, display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="mm-seg">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => {
          const on = p.days.includes(i);
          return <button key={i} className={on ? "on" : ""} onClick={() => setP({ days: on ? p.days.filter((x) => x !== i) : [...p.days, i].sort() })}>{d}</button>;
        })}
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input type="time" value={p.start} onChange={(e) => setP({ start: e.target.value })} style={{ width: 110 }} />
        <span style={{ color: T.inkTiny }}>–</span>
        <input type="time" value={p.end} onChange={(e) => setP({ end: e.target.value })} style={{ width: 110 }} />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input placeholder="Room" value={c.room ?? ""} onChange={(e) => upsertClass({ ...c, room: e.target.value })} style={{ flex: 1 }} />
        <select value={c.teacher ?? ""} onChange={(e) => upsertClass({ ...c, teacher: e.target.value || undefined })} style={{ width: 110 }}>
          <option value="">Teacher</option>
          {s.people.map((pp) => <option key={pp.id} value={pp.id}>{pp.name}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button className="mm-btn mm-btn-primary" style={{ flex: 1 }} disabled={!p.days.length} onClick={() => generateClassPeriods(c.id)}>Add to calendar</button>
        <button className="mm-btn" onClick={() => clearClassPeriods(c.id)}>Remove from calendar</button>
      </div>
      <div style={{ fontSize: 10, color: T.inkTiny }}>Generates a recurring class block for this school year ({schoolYearLabel(s)}).</div>
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
        <div style={{ fontSize: 12, color: T.inkTiny }}>{unlockedCount}/{ACHIEVEMENTS.length} earned{s.customization.customAchievements.length ? ` · ${s.customization.customAchievements.filter((a) => a.claimedAt).length}/${s.customization.customAchievements.length} of yours` : ""}</div>
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
      {s.customization.customAchievements.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: T.mint, marginBottom: 8 }}>yours</div>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {s.customization.customAchievements.map((a) => (
              <div key={a.id} className={"mm-ach" + (a.claimedAt ? " unlocked" : "")}>
                <div className="mm-medal">{a.claimedAt ? "★" : "◇"}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: 13 }}>{a.title || "(untitled)"}</b>
                  {a.desc && <div style={{ fontSize: 11, color: T.inkSoft, margin: "2px 0 5px" }}>{a.desc}</div>}
                  <div style={{ fontSize: 10, color: T.inkTiny, marginTop: 3 }}>
                    {a.claimedAt ? `Claimed · +${a.xp} XP` : `Reward: ${a.xp} XP · claim in Customize`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
              <div style={{ width: 150 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: reached ? T.ink : T.inkSoft }}>{rankFor(level, s)}</div>
                <div style={{ fontSize: 10, color: T.inkTiny, marginTop: 2 }}>
                  {need.toLocaleString()} XP{level < MAX_LEVEL ? ` · +${levelStep(level).toLocaleString()}` : " · max"}
                </div>
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
