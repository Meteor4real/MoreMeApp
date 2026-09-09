// MoreMe — calendar-first UI. Today / Calendar / Projects (incl. goals) /
// Achievements / Levels, plus a full event editor. Subscribes to the single
// store; XP is earned by completing scheduled items and project milestones.

import { useEffect, useMemo, useRef, useState } from "react";
import { T } from "./styles";
import {
  CATEGORY_META, CATEGORY_ORDER, DEFAULT_XP_BY_CATEGORY, GOAL_CATEGORIES, GOAL_SOURCES, GOAL_TIMEFRAMES, HELP_KINDS, HELP_KIND_LABEL, MAX_LEVEL, RANK_NAMES, cumulativeXp, levelStep,
} from "./types";
import type {
  CalEvent, Category, ChecklistItem, Class, HelpKind, InboxItem, Priority,
  Project, Recurrence, SchoolPath, State, Visibility,
} from "./types";
import {
  ACHIEVEMENTS, achievementProgress, blankClass, blankEvent, blankProject,
  captureInbox, conflictIds, dayComplete, distractionsOn, dueReminders,
  eventsOnDate, fmtTime, gradeLabel, gradeStatus, inboxToEventDraft,
  inboxToProject, insights, iso, isDone, levelInfo, loadState, logDistraction, monthLabel,
  removeClass, removeDistraction, removeEvent, removeInbox,
  removeProject, revealEvent, schoolYearLabel, setReward, setSchool,
  classColor, eventColor, loggingStreakInfo, streakInfo, subscribeState, today, toggleDone, uid, upcomingWithReminders,
  upsertClass, upsertEvent, upsertProject, xpForDate,
} from "./store";
import { DayView, WeekView, shiftWeek } from "./timeline";
import { GetAheadView } from "./getahead";
import { EmpireView } from "./empire";
import { InsightsView } from "./insights";
import { WeeklyReview } from "./review";
import { PlansView } from "./plans";
import { CustomizeView } from "./customize";
import { ScreensView, ScreenCardToday, LogSessionModal, UrgeModal } from "./screens";
import { FitnessCardToday, LogFitnessModal } from "./fitness";
import { SchoolModsCard } from "./school";
import { IntegrationsSection } from "./integrations";
import { empireMRR, empireLifetime } from "./store";
import { isTabHidden, rankFor, tabLabel } from "./store";
import { WidgetView } from "./widgets";
import { generateClassPeriods, clearClassPeriods, setClassPeriod } from "./store";
import { ROUTINE_TEMPLATES, applyRoutineTemplate, removeRoutineTemplate, routineTemplateApplied, type RoutineTemplateId } from "./store";
import { syncIcsFeed } from "./store";
import { addDays } from "./store";
import { ChecklistEditor } from "./checklist";
import { ParentGate } from "./parentGate";
import { quoteOfDay } from "./quotes";
import { makePrintHandler } from "./print";

// Built-in tab ids. The render code accepts ANY string so dynamic tab ids
// (created at runtime) can be the active tab too — the only routing needs
// are the well-known ids plus a default-cases fall-through.
// "projects" hosts Projects | Plans as segments; "progress" hosts
// Achievements | Levels | Insights. The old ids stay valid for hiddenTabs /
// tabLabels / widgets so nothing customized is lost.
type BuiltInTab = "today" | "ahead" | "calendar" | "screens" | "empire" | "projects" | "plans" | "achievements" | "insights" | "levels" | "progress" | "customize";
type Tab = BuiltInTab | string;
type CalMode = "month" | "week" | "day";
const TAB_LABELS: Record<string, string> = {
  today: "Overview", ahead: "Get Ahead", calendar: "Calendar", screens: "Screens", empire: "Companies",
  projects: "Projects", plans: "Plans", achievements: "Achievements",
  insights: "Insights", levels: "Levels", progress: "Progress", customize: "Customize",
};

// Sidebar order — a flat list, no category grouping. Merged surfaces keep
// their old ids alive as segments inside (Projects/Plans, Progress).
const NAV_ITEMS: BuiltInTab[] = ["today", "calendar", "ahead", "projects", "empire", "screens", "progress"];

function useStore(): State {
  const [s, setS] = useState<State>(loadState);
  useEffect(() => subscribeState(setS), []);
  return s;
}

export function MoreMeUI() {
  const s = useStore();
  const [tab, setTab] = useState<Tab>("today");
  const [editing, setEditing] = useState<CalEvent | null>(null);
  // Inbox item pending the editor's Save — the capture is only removed once
  // the drafted event actually exists, so closing the editor can't eat it.
  const [pendingInboxId, setPendingInboxId] = useState<string | null>(null);
  const openEditor = (e: CalEvent, inboxId?: string) => { setEditing(e); setPendingInboxId(inboxId ?? null); };

  // External calendar feeds — sync on launch, then every 2 hours, so Canvas
  // due dates and the Veracross schedule stay current without a manual click.
  useEffect(() => {
    if (typeof window === "undefined" || !window.hub?.net) return;
    const run = () => {
      const cur = loadState();
      if (cur.integrations.canvas.url) void syncIcsFeed("canvas");
      if (cur.integrations.veracross.url) void syncIcsFeed("veracross");
    };
    run();
    const id = window.setInterval(run, 2 * 60 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  const dyn = s.customization.dynamicTabs;
  const tabIdStr = String(tab);
  const dynamicCurrent = dyn.find((d) => d.id === tabIdStr);

  // Widgets dropped onto this destination id. Merged hubs (projects /
  // progress) render their segments' widgets themselves.
  const widgetsHere = s.customization.widgets[tabIdStr] ?? [];
  const mergedHub = tab === "projects" || tab === "progress";

  return (
    <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "196px 1fr", position: "relative" }}>
      <SideNav s={s} tab={tab} onTab={setTab} />

      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
        <CaptureBar />
        <div className="scrolly" style={{ flex: 1, minHeight: 0, padding: 18 }}>
          {widgetsHere.length > 0 && tab !== "customize" && !dynamicCurrent && !mergedHub && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 1400, margin: "0 auto 16px" }}>
              {widgetsHere.map((w) => <WidgetView key={w.id} s={s} tabId={tabIdStr} w={w} />)}
            </div>
          )}
          {tab === "today" && <TodayView s={s} onEdit={openEditor} />}
          {tab === "ahead" && <GetAheadView s={s} onEdit={openEditor} />}
          {tab === "calendar" && <CalendarView s={s} onEdit={openEditor} />}
          {tab === "screens" && <ScreensView s={s} />}
          {tab === "empire" && <EmpireView s={s} />}
          {tab === "projects" && <SegmentHub s={s} segments={[{ id: "projects", label: tabLabel("projects", "Projects", s) }, { id: "plans", label: tabLabel("plans", "Plans", s) }]}
            render={(seg) => seg === "plans" ? <PlansView s={s} /> : <ProjectsView s={s} />} />}
          {tab === "progress" && <SegmentHub s={s} segments={[{ id: "achievements", label: tabLabel("achievements", "Achievements", s) }, { id: "levels", label: tabLabel("levels", "Levels", s) }, { id: "insights", label: tabLabel("insights", "Insights", s) }]}
            render={(seg) => seg === "levels" ? <LevelsView s={s} /> : seg === "insights" ? <InsightsView s={s} /> : <AchievementsView s={s} />} />}
          {tab === "customize" && <CustomizeView s={s} />}
          {dynamicCurrent && <DynamicTabView s={s} tabId={dynamicCurrent.id} />}
        </div>
      </div>

      {editing && (
        <EventEditor
          s={s}
          draft={editing}
          onClose={() => { setEditing(null); setPendingInboxId(null); }}
          onSaved={() => { if (pendingInboxId) removeInbox(pendingInboxId); }}
        />
      )}
      <ReminderToasts s={s} onOpen={openEditor} />
      <RewardToasts s={s} />
    </div>
  );
}

// ── merged destination: segmented sub-views sharing one sidebar slot ──────
// Old tab ids live on as segments, so hiddenTabs / tabLabels / widgets keyed
// to them keep working. Widgets render per active segment.
function SegmentHub({ s, segments, render }: {
  s: State;
  segments: { id: string; label: string }[];
  render: (segId: string) => React.ReactNode;
}) {
  const visible = segments.filter((x) => !isTabHidden(x.id, s));
  const list = visible.length ? visible : segments.slice(0, 1);
  const [seg, setSeg] = useState(list[0].id);
  const active = list.some((x) => x.id === seg) ? seg : list[0].id;
  const widgets = s.customization.widgets[active] ?? [];
  return (
    <div>
      {list.length > 1 && (
        <div className="mm-seg" style={{ marginBottom: 16, display: "inline-flex" }}>
          {list.map((x) => (
            <button key={x.id} className={active === x.id ? "on" : ""} onClick={() => setSeg(x.id)}>{x.label}</button>
          ))}
        </div>
      )}
      {widgets.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 1400, margin: "0 auto 16px" }}>
          {widgets.map((w) => <WidgetView key={w.id} s={s} tabId={active} w={w} />)}
        </div>
      )}
      {render(active)}
    </div>
  );
}

// ── sidebar: identity, grouped nav, progress, controls ────────────────────
function SideNav({ s, tab, onTab }: { s: State; tab: Tab; onTab: (t: Tab) => void }) {
  const lv = levelInfo(s);
  const { current } = streakInfo(s);
  const tx = xpForDate(today(), s);
  const pct = lv.isMax ? 100 : Math.round((lv.into / lv.span) * 100);
  const status = gradeStatus(s);
  const chipColor =
    status.kind === "summer"  ? "#FFD23E" :
    status.kind === "alumnus" ? "#A855F7" :
    status.kind === "break"   ? "#FF8A3E" : T.mint;
  const chipText =
    status.kind === "summer"  ? "Summer" :
    status.kind === "alumnus" ? "Alumnus" :
    status.kind === "break"   ? "Break" : "In school";
  const dyn = s.customization.dynamicTabs;

  const item = (id: string, label: string) => {
    const active = tab === id;
    return (
      <button
        key={id}
        onClick={() => onTab(id as Tab)}
        style={{
          display: "flex", alignItems: "center", width: "100%",
          padding: "7px 10px", borderRadius: 8, border: "none", cursor: "pointer",
          background: active ? T.mint + "2e" : "transparent",
          borderLeft: `3px solid ${active ? T.mint : "transparent"}`,
          color: active ? T.mintHi : T.inkSoft,
          font: "inherit", fontSize: 13, fontWeight: active ? 600 : 400, textAlign: "left",
          transition: "background .15s, color .15s",
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <aside style={{ display: "flex", flexDirection: "column", minHeight: 0, background: T.elev, borderRight: `1px solid ${T.line}` }}>
      {/* identity */}
      <div style={{ padding: "14px 14px 12px", borderBottom: `1px solid ${T.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
          <div style={{ flex: "none" }}><MoreMeMark size={38} /></div>
          <div className="mm-h1" style={{ fontSize: 21, lineHeight: 1, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>MoreMe</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          <span className="mm-pill" style={{ background: chipColor + "22", color: chipColor, border: `1px solid ${chipColor}55` }}>{chipText}</span>
          <span style={{ fontSize: 10, color: T.inkTiny }}>{gradeLabel(s).split(" · ")[0]}</span>
        </div>
      </div>

      {/* nav */}
      <div className="scrolly" style={{ flex: 1, minHeight: 0, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV_ITEMS.filter((id) => !isTabHidden(id, s)).map((id) => item(id, tabLabel(id, TAB_LABELS[id], s)))}
        {dyn.map((d) => item(d.id, d.label))}
      </div>

      {/* footer: progress + controls */}
      <div style={{ padding: "10px 12px 12px", borderTop: `1px solid ${T.line}`, display: "flex", flexDirection: "column", gap: 8 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 11, marginBottom: 4 }}>
            <b style={{ color: T.mint }}>Lv {lv.level} · {rankFor(lv.level, s)}</b>
            <span style={{ color: T.inkTiny }}>{pct}%</span>
          </div>
          <div className="mm-progress" style={{ height: 8 }}><div className="mm-progress-fill" style={{ width: pct + "%" }} /></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.inkTiny, marginTop: 4 }}>
            <span>Streak {current}d</span>
            <span>{tx.earned}/{tx.possible} XP today</span>
          </div>
        </div>
        {item("customize", tabLabel("customize", "Customize", s))}
        <DDDBanner />
      </div>
    </aside>
  );
}

// The anchor — fixed, not part of the user-editable quote bank, never
// rotates out. Verbatim, always here.
const DDD_QUOTE = "Discipline. Dedication. Domination.";
const DDD_WHO = 'Dwayne "The Rock" Johnson';
function DDDBanner() {
  return (
    <div style={{ fontSize: 9, color: T.inkTiny, fontStyle: "italic", textAlign: "center", lineHeight: 1.5, padding: "4px 4px 0" }}>
      “{DDD_QUOTE}”<br />— {DDD_WHO}
    </div>
  );
}

// The mindset + the mission, spelled out where the day actually happens —
// not just a tiny footer line. DDD is the discipline; F.L.O.W. is what
// doing the work looks like when it's real.
function MissionBanner() {
  return (
    <div
      className="mm-no-print"
      style={{
        display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center",
        padding: "8px 14px", marginBottom: 16, borderRadius: 10,
        border: `1px solid ${T.line}`, background: T.sunk,
        fontSize: 11, color: T.inkTiny, position: "relative", zIndex: 1,
      }}
    >
      <span><b style={{ color: T.mint }}>DDD</b> — {DDD_QUOTE} <span style={{ opacity: 0.7 }}>— {DDD_WHO}</span></span>
      <span style={{ opacity: 0.4 }}>·</span>
      <span><b style={{ color: T.cool }}>F.L.O.W.</b> — Full-Length Optimal Work. One thing, zero context-switching.</span>
    </div>
  );
}

// The MoreMe mark — sun + peaks + barbell, same geometry as the app icon.
export function MoreMeMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 68" aria-label="MoreMe">
      <circle cx="32" cy="10" r="4" fill={T.cool} />
      <path d="M6 52 L20 24 L32 42 L44 24 L58 52" fill="none" stroke={T.ink} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 58 L42 58" fill="none" stroke={T.mint} strokeWidth="3" strokeLinecap="round" />
      <circle cx="20" cy="58" r="3" fill={T.mint} />
      <circle cx="44" cy="58" r="3" fill={T.mint} />
    </svg>
  );
}

// ── Dynamic tab renderer ──────────────────────────────────────────────────
// A user/agent-created tab. Renders its widget list and an honest empty
// state pointing to the Customize builder.
function DynamicTabView({ s, tabId }: { s: State; tabId: string }) {
  const t = s.customization.dynamicTabs.find((x) => x.id === tabId);
  const list = s.customization.widgets[tabId] ?? [];
  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="serif" style={{ fontSize: 22 }}>{t?.label ?? "Tab"}</div>
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
            <div style={{ fontSize: 10, letterSpacing: ".1em", color: T.mint, marginBottom: 4 }}>
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
              <button className="mm-btn mm-btn-primary" style={{ padding: "3px 10px", fontSize: 11 }} onClick={() => { toggleDone(t.e.id, t.date); setActive((c) => c.filter((x) => x.key !== t.key)); }}>Done +{t.e.xp} XP</button>
              <button className="mm-btn" style={{ padding: "3px 10px", fontSize: 11 }} onClick={() => { onOpen(t.e); setActive((c) => c.filter((x) => x.key !== t.key)); }}>Open</button>
              <button className="mm-btn" style={{ padding: "3px 10px", fontSize: 11 }} onClick={() => setActive((c) => c.filter((x) => x.key !== t.key))}>Dismiss</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── reward toasts: the moment you earn something, you SEE it ──────────────
// Diffs unlocked achievements + level between state changes and surfaces a
// toast for each new unlock / level-up. No fake celebration — these only
// fire on real, observable progress the store just recorded.
function RewardToasts({ s }: { s: State }) {
  type Toast = { key: string; kind: "achievement" | "level"; title: string; sub: string };
  const [toasts, setToasts] = useState<Toast[]>([]);
  const prevUnlocked = useRef<Set<string> | null>(null);
  const prevLevel = useRef<number | null>(null);

  useEffect(() => {
    const unlocked = new Set(Object.keys(s.unlockedAchievements));
    const level = levelInfo(s).level;
    const fresh: Toast[] = [];
    // First render just establishes the baseline — no toast storm on boot.
    if (prevUnlocked.current) {
      for (const id of unlocked) {
        if (prevUnlocked.current.has(id)) continue;
        const def = ACHIEVEMENTS.find((a) => a.id === id);
        if (def) fresh.push({ key: `ach-${id}-${Date.now()}`, kind: "achievement", title: def.title, sub: def.desc });
      }
    }
    if (prevLevel.current !== null && level > prevLevel.current) {
      fresh.push({ key: `lvl-${level}-${Date.now()}`, kind: "level", title: `Level ${level}`, sub: `${rankFor(level, s)} reached` });
    }
    prevUnlocked.current = unlocked;
    prevLevel.current = level;
    if (fresh.length) {
      setToasts((cur) => [...cur, ...fresh]);
      // Self-dismiss after 6s — a moment, not a chore to close.
      for (const t of fresh) {
        window.setTimeout(() => setToasts((cur) => cur.filter((x) => x.key !== t.key)), 6000);
      }
    }
  }, [s]);

  if (!toasts.length) return null;
  return (
    <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: 20, display: "flex", flexDirection: "column", gap: 8, zIndex: 70, alignItems: "center" }}>
      {toasts.map((t) => (
        <div key={t.key} className="mm-card-mint mm-toast-in" style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 12, boxShadow: `0 12px 40px rgba(0,0,0,.5), 0 0 24px ${T.mint}33` }}>
          <span style={{ color: T.mint, fontSize: 18 }}>{t.kind === "level" ? "◆" : "✦"}</span>
          <div>
            <div style={{ fontSize: 10, letterSpacing: ".14em", color: T.mint }}>
              {t.kind === "level" ? "Level up" : "Achievement unlocked"}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
              <b style={{ fontSize: 14 }}>{t.title}</b>
              <span style={{ fontSize: 11, color: T.inkSoft }}>{t.sub}</span>
            </div>
          </div>
          <button className="mm-btn" style={{ padding: "2px 8px", fontSize: 11 }} onClick={() => setToasts((c) => c.filter((x) => x.key !== t.key))}>×</button>
        </div>
      ))}
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
        className="mm-donebtn"
        data-done={done}
        onClick={() => toggleDone(e.id, date)}
        title={done ? "Mark not done" : "Complete (+XP)"}
        style={{ width: 22, height: 22, flex: "none", borderRadius: 6, border: `2px solid ${meta.color}`, background: done ? meta.color : "transparent", color: T.bg, cursor: "pointer", fontSize: 13, lineHeight: 1 }}
      >{done ? "✓" : ""}</button>
      <span title={meta.label} style={{ flex: "none", width: 16, textAlign: "center", color: meta.color, fontSize: 13, lineHeight: 1 }}>{meta.glyph}</span>
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
  const [fitnessModal, setFitnessModal] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const print = makePrintHandler(() => printRef.current);
  const quote = quoteOfDay(date, s.customization.quotes);

  return (
    <div ref={printRef} style={{ maxWidth: 1400, margin: "0 auto", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, position: "relative", zIndex: 1, marginBottom: 16 }}>
        <div className="serif" style={{ fontSize: 20 }}>{new Date(date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>
        <div className="mm-no-print" style={{ display: "flex", gap: 6 }}>
          <button className="mm-btn" onClick={print} title="Print today">⎙ Print</button>
          <button className="mm-btn mm-btn-primary" onClick={() => onEdit({ ...blankEvent(date) })}>+ New item</button>
        </div>
      </div>

      <MissionBanner />

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
        {/* Main column — the day's actual work. */}
        <div style={{ flex: "3 1 520px", minWidth: 320, display: "flex", flexDirection: "column", gap: 16 }}>
          {s.inbox.length > 0 && (
            <Section title={`Inbox · ${s.inbox.length} to triage`}>
              {s.inbox.map((it) => <InboxRow key={it.id} item={it} onEdit={onEdit} />)}
            </Section>
          )}

          <Section title={`Routine · ${routines.filter((e) => isDone(e, date, s)).length}/${routines.length}`}>
            <RoutineSectionBody s={s} date={date} routines={routines} onEdit={onEdit} />
          </Section>

          <Section title="Scheduled">
            {rest.length === 0 ? <Empty>Nothing scheduled. Add a class, meeting, or project block.</Empty> : rest.map((e) => <EventRow key={e.id} e={e} date={date} s={s} onEdit={onEdit} />)}
          </Section>

          <Section title="Distraction-free check">
            <div style={{ fontSize: 12, color: T.inkSoft, marginBottom: 8 }}>
              A clean day (nothing logged) counts toward Quiet streaks.
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

          <Section title="Weekly Review">
            <WeeklyReview s={s} onEdit={onEdit} />
          </Section>
        </div>

        {/* Side rail — quote, alerts, reminders, screen status. */}
        <div style={{ flex: "1 1 320px", minWidth: 280, display: "flex", flexDirection: "column", gap: 16 }}>
          {quote && <QuoteBanner quote={quote} />}

          {conflicts.size > 0 && (
            <div className="mm-card" style={{ padding: "10px 14px", borderColor: T.warn, color: T.warn, fontSize: 12 }}>
              {conflicts.size} item{conflicts.size === 1 ? "" : "s"} overlap in time today — adjust the schedule.
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="mm-card-mint" style={{ padding: "10px 14px" }}>
              <div style={{ fontSize: 11, letterSpacing: ".1em", color: T.mint, marginBottom: 6 }}>
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

          <EmpirePulseCard s={s} />
          <FitnessCardToday s={s} onOpenLog={() => setFitnessModal(true)} />
          <ScreenCardToday s={s} onOpenLog={() => setScreenModal("log")} onOpenUrge={() => setScreenModal("urge")} />
          <LoggingStreakCard s={s} />
        </div>
      </div>

      {screenModal === "log" && <LogSessionModal onClose={() => setScreenModal(null)} />}
      {screenModal === "urge" && <UrgeModal s={s} onClose={() => setScreenModal(null)} />}
      {fitnessModal && <LogFitnessModal onClose={() => setFitnessModal(false)} />}
    </div>
  );
}

// No XP, no reward, nothing to earn here — just whether the logs are real.
// Insights and Weekly Review are only as honest as what actually gets
// logged, so seeing that plainly (not as a score) is the point.
function LoggingStreakCard({ s }: { s: State }) {
  const { current, totalDays } = loggingStreakInfo(s);
  return (
    <div className="mm-card" style={{ padding: 14 }}>
      <div style={{ fontSize: 11, letterSpacing: ".1em", color: T.inkTiny, marginBottom: 6 }}>Logging streak</div>
      <div style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.5 }}>
        {current > 0
          ? `${current} day${current === 1 ? "" : "s"} straight telling it something real — a screen session, an urge, honest school help.`
          : "Nothing logged today. Insights and Weekly Review only know what actually gets written down."}
        {totalDays > 0 && <span style={{ color: T.inkTiny }}> · {totalDays} day{totalDays === 1 ? "" : "s"} total.</span>}
      </div>
    </div>
  );
}

// The business side gets the same daily-pulse weight as routines/screens
// instead of living only inside its own tab. Hidden until there's a venture
// to report on — nothing to summarize otherwise.
function EmpirePulseCard({ s }: { s: State }) {
  if (s.ventures.length === 0) return null;
  const mrr = empireMRR(s);
  const lifetime = empireLifetime(s);
  const live = s.ventures.filter((v) => v.status === "live" || v.status === "scaling");
  const nextActions = s.ventures.filter((v) => v.nextAction?.trim()).slice(0, 2);
  return (
    <div className="mm-card" style={{ padding: 14, borderLeft: `3px solid ${T.cool}` }}>
      <div style={{ fontSize: 11, letterSpacing: ".1em", color: T.inkTiny, marginBottom: 10 }}>Companies</div>
      <div style={{ display: "flex", gap: 18, marginBottom: nextActions.length ? 10 : 0 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.cool, lineHeight: 1 }}>${Math.round(mrr).toLocaleString()}</div>
          <div style={{ fontSize: 10, color: T.inkTiny, marginTop: 2 }}>MRR</div>
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.ink, lineHeight: 1 }}>${Math.round(lifetime).toLocaleString()}</div>
          <div style={{ fontSize: 10, color: T.inkTiny, marginTop: 2 }}>lifetime</div>
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.ink, lineHeight: 1 }}>{live.length}</div>
          <div style={{ fontSize: 10, color: T.inkTiny, marginTop: 2 }}>live</div>
        </div>
      </div>
      {nextActions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {nextActions.map((v) => (
            <div key={v.id} style={{ fontSize: 11, color: T.inkSoft }}>
              <b style={{ color: T.ink }}>{v.name || "Venture"}</b> — {v.nextAction}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function InboxRow({ item, onEdit }: { item: InboxItem; onEdit: (e: CalEvent, inboxId?: string) => void }) {
  // Schedule hands the capture's id along with the draft — the inbox item is
  // only removed when the editor actually saves, so Close/backdrop-click
  // can't eat the note.
  return (
    <div className="mm-action" style={{ cursor: "default" }}>
      <span className="mm-dot" style={{ ["--c" as never]: "#FFD23E" }} />
      <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>{item.text}</div>
      <button className="mm-btn" style={{ padding: "3px 8px" }} title="Schedule it" onClick={() => onEdit(inboxToEventDraft(item), item.id)}>Schedule</button>
      <button className="mm-btn" style={{ padding: "3px 8px" }} title="Make it a project" onClick={() => inboxToProject(item)}>Project</button>
      <button className="mm-btn" style={{ padding: "3px 8px" }} title="Add as this week's goal" onClick={() => inboxToProject(item, "Week")}>Goal</button>
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
      <div className="condensed" style={{ fontSize: 12, letterSpacing: ".14em", color: T.inkTiny, marginBottom: 10 }}>{title}</div>
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
        <div style={{ fontSize: 11, color: T.inkTiny, marginTop: 4, letterSpacing: ".06em" }}>— {quote.by}</div>
      </div>
    </div>
  );
}

// ── Calendar ────────────────────────────────────────────────────────────────
function CalendarView({ s, onEdit }: { s: State; onEdit: (e: CalEvent) => void }) {
  const [mode, setMode] = useState<CalMode>("week");
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [sel, setSel] = useState(today());
  const [manage, setManage] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const print = makePrintHandler(() => printRef.current);

  const grid = useMemo(() => buildMonth(cursor.y, cursor.m), [cursor]);

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
    <div ref={printRef} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 16, alignItems: "start" }}>
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
            const hasConflict = conflictIds(cell.date, s).size > 0;
            return (
              <div
                key={cell.date}
                className={"mm-day" + (cell.inMonth ? "" : " other") + (isToday ? " today" : "") + (cell.date === sel ? " selected" : "")}
                style={hasConflict ? { boxShadow: `0 0 0 1px ${T.warn}` } : undefined}
                title="Click to add an item"
                onClick={() => { setSel(cell.date); onEdit({ ...blankEvent(cell.date) }); }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="mm-daynum">{cell.day}</span>
                  {dayComplete(cell.date, s) && <span style={{ color: T.mint, fontSize: 11 }}>✓</span>}
                </div>
                {evs.slice(0, 3).map((e) => (
                  <div
                    key={e.id}
                    className={"mm-chip" + (isDone(e, cell.date, s) ? " done" : "")}
                    style={{ ["--c" as never]: eventColor(e, s), cursor: "pointer" }}
                    title={[e.title || CATEGORY_META[e.category].label, e.checklist.map((c) => c.text).join(" · ")].filter(Boolean).join("\n")}
                    onClick={(ev) => { ev.stopPropagation(); onEdit(e); }}
                  >
                    <span style={{ color: eventColor(e, s), flex: "none" }}>{CATEGORY_META[e.category].glyph}</span>
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

      <div>
        <button className="mm-btn" onClick={() => setManage((v) => !v)}>
          {manage ? "Hide" : ""} School schedule &amp; connected calendars {manage ? "" : "▾"}
        </button>
        {manage && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 14 }}>
            <SchoolModsCard s={s} />
            <IntegrationsSection s={s} />
          </div>
        )}
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
function EventEditor({ s, draft, onClose, onSaved }: { s: State; draft: CalEvent; onClose: () => void; onSaved?: () => void }) {
  const [e, setE] = useState<CalEvent>(draft);
  const exists = s.events.some((x) => x.id === e.id);
  const set = <K extends keyof CalEvent>(k: K, v: CalEvent[K]) => setE((p) => ({ ...p, [k]: v }));
  const meta = CATEGORY_META[e.category];

  // Guards against events that could never occur (and so could never be
  // found again to fix or delete): a weekly repeat with zero days, a
  // repeat-until before the start date, or an end at/before the start.
  const problems: string[] = [];
  if (e.recurrence.kind === "weekly" && e.recurrence.days.length === 0) problems.push("Weekly repeat needs at least one day selected.");
  if (e.recurrence.kind !== "none" && e.until && e.until < e.date) problems.push("Repeat-until is before the start date.");
  if (!e.allDay && e.start && e.end && e.end <= e.start) problems.push("End time must be after the start time.");

  function save() {
    if (problems.length) return;
    upsertEvent({ ...e, title: e.title.trim() || CATEGORY_META[e.category].label });
    onSaved?.();
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
            <select value={e.category} onChange={(ev) => { const c = ev.target.value as Category; setE((p) => ({ ...p, category: c, xp: DEFAULT_XP_BY_CATEGORY[c] })); }}>
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

          <Field label="Location"><input value={e.location ?? ""} placeholder="Room · library · gym · home" onChange={(ev) => set("location", ev.target.value)} /></Field>

          <div className="mm-row">
            <Field label="Priority">
              <div className="mm-seg">
                {(["low", "normal", "high"] as Priority[]).map((p) => (
                  <button key={p} className={e.priority === p ? "on" : ""} onClick={() => set("priority", p)}>{p}</button>
                ))}
              </div>
            </Field>
            <Field label="XP reward">
              <div style={{ padding: "6px 10px", fontSize: 13, color: T.inkSoft }} title="Fixed by category — not user-editable">{e.xp} XP</div>
            </Field>
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

          {e.category === "school" && e.externalSource === "canvas" && (
            <div style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}>
              {e.canvasSubmittedAt ? (
                <span style={{ color: T.mint }}>✓ Submitted on Canvas, {new Date(e.canvasSubmittedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
              ) : (
                <span style={{ color: T.inkTiny }}>Not submitted on Canvas yet — this is Canvas's own record, not your checklist above.</span>
              )}
            </div>
          )}

          {e.category === "school" && (
            <div style={{ padding: 12, background: T.sunk, border: `1px dashed ${T.mint}55`, borderRadius: 10, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 11, letterSpacing: ".1em", color: T.mint }}>
                Honesty log
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

          {problems.length > 0 && (
            <div style={{ padding: "8px 12px", border: `1px solid ${T.warn}66`, borderRadius: 8, color: T.warn, fontSize: 12, display: "flex", flexDirection: "column", gap: 2 }}>
              {problems.map((p, i) => <span key={i}>{p}</span>)}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "space-between", marginTop: 4 }}>
            <div style={{ display: "flex", gap: 8 }}>
              {exists && <button className="mm-btn mm-btn-danger" onClick={() => { removeEvent(e.id); onClose(); }}>Delete</button>}
              {exists && e.visibility === "hidden" && <button className="mm-btn" onClick={() => { revealEvent(e.id); onClose(); }}>Reveal</button>}
            </div>
            <button className="mm-btn mm-btn-primary" onClick={save} disabled={problems.length > 0} style={problems.length > 0 ? { opacity: 0.5, cursor: "not-allowed" } : undefined}>Save</button>
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
// ── Overview's Routine section — today's checklist, plus (collapsed once
// something's applied) the template cards so applying/switching/removing
// one never requires a trip to another tab.
function RoutineSectionBody({ s, date, routines, onEdit }: { s: State; date: string; routines: CalEvent[]; onEdit: (e: CalEvent) => void }) {
  const [manage, setManage] = useState(routines.length === 0);
  if (routines.length === 0) return <RoutineTemplatesSection s={s} />;
  return (
    <div>
      {routines.map((e) => <EventRow key={e.id} e={e} date={date} s={s} onEdit={onEdit} />)}
      <button className="mm-btn" style={{ marginTop: 8 }} onClick={() => setManage((v) => !v)}>
        {manage ? "Hide" : "Manage"} routine templates
      </button>
      {manage && <div style={{ marginTop: 10 }}><RoutineTemplatesSection s={s} /></div>}
    </div>
  );
}

// ── Routine templates — the real weekday/weekend/beach/travel schedule
// content, ported off the original site. Apply/remove them right here or
// from Overview's Routine section.
const ROUTINE_TEMPLATE_ORDER: RoutineTemplateId[] = ["weekday", "weekend", "beach", "anywhere"];
function RoutineTemplatesSection({ s }: { s: State }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: 11, color: T.inkTiny, marginBottom: 8 }}>Nothing applied yet — pick one and it's on the calendar for good.</div>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", alignItems: "start", marginBottom: 4 }}>
        {ROUTINE_TEMPLATE_ORDER.map((id) => <RoutineTemplateCard key={id} id={id} s={s} />)}
      </div>
    </div>
  );
}
function RoutineTemplateCard({ id, s }: { id: RoutineTemplateId; s: State }) {
  const def = ROUTINE_TEMPLATES[id];
  const applied = routineTemplateApplied(id, s);
  return (
    <div className="mm-card" style={{ padding: 14, borderColor: applied ? T.mint : T.line }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <b style={{ fontSize: 14, flex: 1 }}>{def.label}</b>
        {applied && <span className="mm-pill" style={{ background: T.mint, color: T.bg }}>On calendar</span>}
      </div>
      <div style={{ fontSize: 11, color: T.inkSoft, lineHeight: 1.5, marginBottom: 8 }}>{def.blurb}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
        {def.items.map((it) => (
          <div key={it.slug} style={{ fontSize: 11, color: T.inkSoft }}>
            <b style={{ color: T.ink }}>{it.title}</b> · {fmtTime(it.start)}–{fmtTime(it.end)}
            <div style={{ color: T.inkTiny, marginTop: 1 }}>{it.checklist.join(" · ")}</div>
          </div>
        ))}
      </div>
      {applied && <button className="mm-btn mm-btn-danger" onClick={() => removeRoutineTemplate(id)}>Remove from calendar</button>}
    </div>
  );
}

function ProjectsView({ s }: { s: State }) {
  const [catFilter, setCatFilter] = useState<string>("");
  const [srcFilter, setSrcFilter] = useState<string>("");
  const [tfFilter, setTfFilter] = useState<string>("");
  const filtered = s.projects.filter((p) =>
    (!catFilter || p.category === catFilter) &&
    (!srcFilter || p.source === srcFilter) &&
    (!tfFilter || p.timeframe === tfFilter)
  );
  const anyFilter = catFilter || srcFilter || tfFilter;
  return (
    <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0,1fr) 300px", alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="serif" style={{ fontSize: 20 }}>Projects &amp; Goals</div>
          <button className="mm-btn mm-btn-primary" onClick={() => upsertProject({ ...blankProject(), name: "New project" })}>+ Project</button>
        </div>
        <div style={{ fontSize: 11, color: T.inkTiny, marginTop: -8 }}>
          Everything you're building or working toward lives here — a business idea and "run a 7-min mile" are both projects, just tagged differently.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} style={{ width: 130 }}>
            <option value="">Any category</option>
            {GOAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={srcFilter} onChange={(e) => setSrcFilter(e.target.value)} style={{ width: 140 }}>
            <option value="">Any source</option>
            {GOAL_SOURCES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={tfFilter} onChange={(e) => setTfFilter(e.target.value)} style={{ width: 130 }}>
            <option value="">Any timeframe</option>
            {GOAL_TIMEFRAMES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {anyFilter && <button className="mm-btn" onClick={() => { setCatFilter(""); setSrcFilter(""); setTfFilter(""); }}>Clear filters</button>}
        </div>
        {filtered.length === 0 && <Empty>{anyFilter ? "Nothing matches those filters." : "No projects yet."}</Empty>}
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", alignItems: "start" }}>
          {filtered.map((p) => <ProjectCard key={p.id} p={p} />)}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <SchoolCard s={s} />
        <BackgroundCard />
        <ClassesCard s={s} />
      </div>
    </div>
  );
}
function BackgroundCard() {
  const bg = (window.hub as { bg?: { get(): Promise<{ minimizeToTray: boolean; runOnStartup: boolean }>; set(p: Partial<{ minimizeToTray: boolean; runOnStartup: boolean }>): Promise<{ minimizeToTray: boolean; runOnStartup: boolean }> } } | undefined)?.bg;
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
        Keep MoreMe running and reminding even when the window's closed.
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
  const paths: SchoolPath[] = ["Inquiry", "Innovation", "Impact"];
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
              <input
                type="color"
                value={classColor(c.id, s) ?? "#33B5FF"}
                onChange={(e) => upsertClass({ ...c, color: e.target.value })}
                title="Color for this class on the calendar"
                style={{ width: 24, height: 24, padding: 0, border: "none", borderRadius: 5, background: "transparent", cursor: "pointer", flex: "none" }}
              />
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
        <input placeholder="Teacher" value={c.teacher ?? ""} onChange={(e) => upsertClass({ ...c, teacher: e.target.value || undefined })} style={{ width: 110 }} />
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
        <input value={p.kind} placeholder="Kind (optional)" onChange={(e) => upsertProject({ ...p, kind: e.target.value })} style={{ width: 110 }} />
        <select value={p.status} onChange={(e) => upsertProject({ ...p, status: e.target.value as Project["status"] })}>
          {(["active", "paused", "done"] as Project["status"][]).map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <button className="mm-btn mm-btn-danger" style={{ padding: "4px 8px" }} onClick={() => removeProject(p.id)}>×</button>
      </div>
      <div className="mm-row" style={{ marginTop: 6 }}>
        <select value={p.category ?? ""} onChange={(e) => upsertProject({ ...p, category: (e.target.value || undefined) as Project["category"] })} style={{ flex: 1 }}>
          <option value="">No category</option>
          {GOAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={p.source ?? ""} onChange={(e) => upsertProject({ ...p, source: (e.target.value || undefined) as Project["source"] })} style={{ flex: 1 }}>
          <option value="">No source</option>
          {GOAL_SOURCES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={p.timeframe ?? ""} onChange={(e) => upsertProject({ ...p, timeframe: (e.target.value || undefined) as Project["timeframe"] })} style={{ flex: 1 }}>
          <option value="">No timeframe</option>
          {GOAL_TIMEFRAMES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="mm-progress" style={{ margin: "10px 0" }}><div className="mm-progress-fill" style={{ width: pct + "%" }} /><div className="mm-progress-text">{done}/{p.milestones.length} milestones · {pct}%</div></div>
      <ChecklistEditor items={p.milestones} onChange={(milestones) => upsertProject({ ...p, milestones })} />
      <div style={{ fontSize: 11, color: T.inkTiny, marginTop: 8 }}>Each milestone +30 XP · completing the project +100 XP</div>
    </div>
  );
}
// ── Achievements ──────────────────────────────────────────────────────────
// Per-category accent so unlocked achievements read as five different
// tracks, not one monochrome mint wall. Colors echo the calendar category
// hues already used elsewhere in the app; "level" gets DP's cool blue
// since it's the rank ladder, not the daily-discipline loop.
const ACH_CAT_COLOR: Record<string, string> = {
  discipline: T.mint,
  school: "#3EA0FF",
  build: "#A855F7",
  social: "#E0529C",
  level: T.cool,
  special: T.cool,
  fitness: "#4ADE80",
};

function AchievementsView({ s }: { s: State }) {
  const prog = achievementProgress(s);
  const unlockedCount = ACHIEVEMENTS.filter((a) => s.unlockedAchievements[a.id]).length;
  const cats = ["discipline", "school", "build", "fitness", "social", "level", "special"] as const;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
        <div className="serif" style={{ fontSize: 20 }}>Achievements</div>
        <div style={{ fontSize: 12, color: T.inkTiny }}>{unlockedCount}/{ACHIEVEMENTS.length} earned{s.customization.customAchievements.length ? ` · ${s.customization.customAchievements.filter((a) => a.claimedAt).length}/${s.customization.customAchievements.length} of yours` : ""}</div>
      </div>
      {cats.map((cat) => {
        const list = ACHIEVEMENTS.filter((a) => a.category === cat);
        const accent = ACH_CAT_COLOR[cat] ?? T.mint;
        return (
          <div key={cat} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, letterSpacing: ".12em", color: T.inkTiny, marginBottom: 8 }}>{cat}</div>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
              {list.map((a) => {
                const p = prog[a.id];
                const unlocked = !!s.unlockedAchievements[a.id];
                return (
                  <div key={a.id} className={"mm-ach" + (unlocked ? " unlocked" : "")} style={{ ["--c" as never]: accent }}>
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
          <div style={{ fontSize: 11, letterSpacing: ".12em", color: T.cool, marginBottom: 8 }}>yours</div>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {s.customization.customAchievements.map((a) => (
              <div key={a.id} className={"mm-ach" + (a.claimedAt ? " unlocked" : "")} style={{ ["--c" as never]: T.cool }}>
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
  const [editingRewards, setEditingRewards] = useState(false);
  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div className="serif" style={{ fontSize: 20, marginBottom: 6 }}>The Road</div>
      <div style={{ fontSize: 12, color: T.inkSoft, marginBottom: 16 }}>
        {MAX_LEVEL} levels on a steep curve — each one costs more than the last. Rewards need the parent code to set or change.
      </div>
      {lv.isMax && <CapstoneCard s={s} />}

      <div className="mm-card" style={{ padding: 16, marginBottom: 16 }}>
        {editingRewards ? (
          <ParentGate s={s}>
            <RewardsEditor s={s} />
            <div style={{ fontSize: 10, color: T.inkTiny, marginTop: 8 }}>
              <button className="mm-btn" style={{ fontSize: 10, padding: "3px 8px" }} onClick={() => setEditingRewards(false)}>Done editing</button>
            </div>
          </ParentGate>
        ) : (
          <button className="mm-btn" onClick={() => setEditingRewards(true)}>Set / change rewards (parent code)</button>
        )}
      </div>

      <div style={{ position: "relative", padding: "8px 0 24px" }}>
        {/* the road: a single winding line down the middle, nodes alternate L/R */}
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 3, background: T.line, transform: "translateX(-1.5px)", borderRadius: 2 }} />
        <div style={{ position: "absolute", left: "50%", top: 0, width: 3, height: `${lv.isMax ? 100 : (lv.level - 1) / (MAX_LEVEL - 1) * 100}%`, background: T.mint, transform: "translateX(-1.5px)", borderRadius: 2, transition: "height .3s" }} />

        {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((level, i) => {
          const reached = lv.level >= level;
          const current = lv.level === level && !lv.isMax;
          const need = cumulativeXp(level);
          const reward = s.rewards.find((r) => r.level === level)?.reward ?? "";
          const onLeft = i % 2 === 0;
          return (
            <div key={level} style={{ position: "relative", display: "flex", justifyContent: onLeft ? "flex-end" : "flex-start", padding: "10px 0" }}>
              <div
                className="mm-card"
                style={{
                  width: "44%", padding: "10px 12px",
                  borderColor: current ? T.mint : reached ? T.mint + "88" : T.line,
                  background: reached ? T.mint + "0d" : T.elev,
                  boxShadow: current ? `0 0 0 2px ${T.mint}55` : undefined,
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: reached ? T.mint : T.inkTiny }}>{level}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: reached ? T.ink : T.inkSoft }}>{rankFor(level, s)}</div>
                  {reached && <span className="mm-pill" style={{ marginLeft: "auto", background: T.mint, color: T.bg, fontSize: 9 }}>Reached</span>}
                </div>
                <div style={{ fontSize: 10, color: T.inkTiny, marginTop: 2 }}>
                  {need.toLocaleString()} XP{level < MAX_LEVEL ? ` · +${levelStep(level).toLocaleString()}` : " · max"}
                </div>
                {reward && <div style={{ fontSize: 11, color: T.cool, marginTop: 6, fontStyle: "italic" }}>“{reward}”</div>}
              </div>
              {/* node dot on the road */}
              <div style={{
                position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)",
                width: 14, height: 14, borderRadius: "50%",
                background: reached ? T.mint : T.sunk, border: `2px solid ${reached ? T.mint : T.line}`,
                boxShadow: current ? `0 0 0 4px ${T.mint}33` : undefined,
              }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RewardsEditor({ s }: { s: State }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((level) => {
        const reward = s.rewards.find((r) => r.level === level)?.reward ?? "";
        return (
          <div key={level} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, textAlign: "right", fontSize: 12, color: T.inkTiny }}>{level}</div>
            <input style={{ flex: 1 }} placeholder={`Reward for reaching level ${level}…`} value={reward} onChange={(e) => setReward(level, e.target.value)} />
          </div>
        );
      })}
    </div>
  );
}

// The payoff for playing the whole ladder: a retrospective, not just a
// bigger number. Shown once you've actually maxed out (Dude Perfect).
function CapstoneCard({ s }: { s: State }) {
  const lv = levelInfo(s);
  const { best } = streakInfo(s);
  const ins = insights(s);
  const days = Math.max(1, Math.ceil((Date.now() - s.startedAt) / 86_400_000));
  const unlockedCount = ACHIEVEMENTS.filter((a) => s.unlockedAchievements[a.id]).length;
  const topCategory = ins.byCategory[0];
  return (
    <div className="mm-card-mint" style={{ padding: 20, marginBottom: 16 }}>
      <div className="serif" style={{ fontSize: 20, color: T.mint, marginBottom: 4 }}>Dude Perfect.</div>
      <div style={{ fontSize: 12, color: T.inkSoft, marginBottom: 14 }}>
        {days} days in, {lv.total.toLocaleString()} total XP, and you topped the ladder. Here's what that actually took.
      </div>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.mint }}>{best}d</div>
          <div style={{ fontSize: 10, color: T.inkTiny, marginTop: 2 }}>best streak</div>
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.ink }}>{unlockedCount}/{ACHIEVEMENTS.length}</div>
          <div style={{ fontSize: 10, color: T.inkTiny, marginTop: 2 }}>achievements</div>
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.ink }}>{s.projects.filter((p) => p.status === "done").length}</div>
          <div style={{ fontSize: 10, color: T.inkTiny, marginTop: 2 }}>projects shipped</div>
        </div>
        {topCategory && (
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.ink }}>{CATEGORY_META[topCategory.category].label}</div>
            <div style={{ fontSize: 10, color: T.inkTiny, marginTop: 2 }}>where most of it went</div>
          </div>
        )}
      </div>
    </div>
  );
}
