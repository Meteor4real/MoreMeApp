// MoreMe — Screens. Honest mirror for screentime, not a nag.
//
// Design rules:
//   - Numbers, not judgments. "2h 13m today" not "TOO MUCH."
//   - The user is the only enforcer. The app reflects, never blocks.
//   - The win is awareness + resistance, not zero.
//   - Routines earn budget; budget isn't punishment, it's a trade.
//   - The urge button is FOR you, not against you — log it, see the wins.

import { useEffect, useMemo, useRef, useState } from "react";
import { makePrintHandler } from "./print";
import { T } from "./styles";
import { SCREEN_CATEGORIES, SCREEN_CATEGORY_LABEL } from "./types";
import type { Replacement, ScreenCategory, ScreenSession, State, UrgeResolution } from "./types";
import {
  activeScreenSession, addReplacement, computeSessionMinutes, earnedBudgetOn,
  isInWindow, loadState, logScreenSession, logUrge, removeReplacement,
  removeScreenSession, removeUrge, screenMinutesOn, screenSessionsOn,
  setScreenSettings, startScreenSession, stopScreenSession, subscribeState,
  today, updateReplacement, urgesOn,
} from "./store";

// "1h 23m" / "47m" — never a bare integer in UI; it's about the read.
export function fmtMin(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

// ── Today card: compact, on the Today tab so it's visible at a glance ─────
export function ScreenCardToday({ s, onOpenUrge, onOpenLog }: {
  s: State;
  onOpenUrge: () => void;
  onOpenLog: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  // Re-tick once a minute so an in-progress session shows live elapsed time.
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(id); }, []);
  void now;
  const date = today();
  const used = screenMinutesOn(date, s);
  const budget = earnedBudgetOn(date, s);
  const pct = budget.total > 0 ? Math.min(100, Math.round((used / budget.total) * 100)) : 0;
  const over = used > budget.total;
  const active = activeScreenSession(s);
  const urgeCount = urgesOn(date, s).length;
  const resistedToday = urgesOn(date, s).filter((u) => u.resolution === "resisted").length;
  const winNow = isInWindow(s);

  return (
    <div className="mm-card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: T.inkTiny }}>Screens today</div>
        <div style={{ flex: 1 }} />
        {winNow === false && <span className="mm-pill" style={{ background: "#FFD23E22", color: "#FFD23E" }}>Outside window</span>}
        {winNow === true && <span className="mm-pill" style={{ background: T.mint + "22", color: T.mint }}>In window</span>}
      </div>

      {/* Numbers row */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 800, color: over ? "#FFD23E" : T.ink }}>{fmtMin(used)}</div>
          <div style={{ fontSize: 10, color: T.inkTiny }}>used</div>
        </div>
        <div style={{ fontSize: 16, color: T.inkTiny }}>/</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.mint }}>{fmtMin(budget.total)}</div>
          <div style={{ fontSize: 10, color: T.inkTiny }}>earned · base {fmtMin(budget.base)}{budget.bonus > 0 ? ` + ${fmtMin(budget.bonus)} bonus` : ""}</div>
        </div>
        <div style={{ flex: 1 }} />
        {resistedToday > 0 && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.mint }}>{resistedToday}</div>
            <div style={{ fontSize: 10, color: T.inkTiny }}>urges resisted{urgeCount > resistedToday ? ` · ${urgeCount} logged` : ""}</div>
          </div>
        )}
      </div>

      {/* Bar */}
      <div className="mm-progress" style={{ height: 10 }}>
        <div className="mm-progress-fill" style={{ width: pct + "%", background: over ? "linear-gradient(90deg, #FFD23E, #FF8A3E)" : undefined }} />
      </div>

      {/* Active or actions */}
      {active ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: T.sunk, borderRadius: 10, border: `1px dashed ${T.mint}88` }}>
          <span className="mm-dot" style={{ ["--c" as never]: T.mint, animation: "mm-blink 1.4s infinite" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{SCREEN_CATEGORY_LABEL[active.category]} · {active.what}</div>
            <div style={{ fontSize: 11, color: T.inkTiny }}>Running · {fmtMin(computeSessionMinutes(active))}</div>
          </div>
          <button className="mm-btn mm-btn-danger" onClick={() => stopScreenSession(active.id)}>■ Stop</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="mm-btn mm-btn-primary" onClick={onOpenLog}>+ Log session</button>
          <button className="mm-btn" onClick={onOpenUrge}>Felt the urge?</button>
        </div>
      )}
      <style>{`@keyframes mm-blink { 50% { opacity: .35 } }`}</style>
    </div>
  );
}

// ── Screens tab: full surface ─────────────────────────────────────────────
export function ScreensView({ s }: { s: State }) {
  const [tick, setTick] = useState(0);
  useEffect(() => subscribeState(() => setTick((n) => n + 1)), []);
  useEffect(() => { const id = window.setInterval(() => setTick((n) => n + 1), 30_000); return () => window.clearInterval(id); }, []);
  void tick;
  const [logOpen, setLogOpen] = useState(false);
  const [urgeOpen, setUrgeOpen] = useState(false);
  const date = today();
  const used = screenMinutesOn(date, s);
  const budget = earnedBudgetOn(date, s);
  const todays = screenSessionsOn(date, s);
  const trend = useMemo(() => last30Trend(s), [s, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const urges = useMemo(() => [...s.urges].slice().sort((a, b) => b.ts - a.ts).slice(0, 30), [s.urges]);
  const printRef = useRef<HTMLDivElement>(null);
  const print = makePrintHandler(() => printRef.current);

  return (
    <div ref={printRef} style={{ maxWidth: 920, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div className="serif" style={{ fontSize: 22, lineHeight: 1 }}>Screens</div>
          <div style={{ fontSize: 11, color: T.inkTiny, letterSpacing: ".08em", textTransform: "uppercase", marginTop: 4 }}>
            honest mirror — no nags
          </div>
        </div>
        <button className="mm-btn mm-no-print" onClick={print} title="Print last-30-days screen report">⎙ Print report</button>
      </div>

      {/* Hero */}
      <ScreenCardToday s={s} onOpenLog={() => setLogOpen(true)} onOpenUrge={() => setUrgeOpen(true)} />

      {/* Today's sessions */}
      <Section title={`Today's sessions · ${todays.length}`}>
        {todays.length === 0
          ? <Empty>No sessions logged yet today.</Empty>
          : todays.map((x) => <SessionRow key={x.id} x={x} />)}
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <button className="mm-btn" onClick={() => setLogOpen(true)}>+ Log a session</button>
          <button className="mm-btn" onClick={() => setUrgeOpen(true)}>Felt the urge</button>
        </div>
      </Section>

      {/* 30-day trend */}
      <Section title="Last 30 days">
        <TrendBars data={trend} />
        <div style={{ fontSize: 11, color: T.inkTiny, marginTop: 8 }}>
          {used <= budget.total ? `Today: ${fmtMin(used)} of ${fmtMin(budget.total)} earned.` : `Today: ${fmtMin(used)}, ${fmtMin(used - budget.total)} over.`}
        </div>
      </Section>

      {/* Urges */}
      <Section title={`Urges · ${s.urges.filter((u) => u.resolution === "resisted").length} resisted, ${s.urges.length} logged`}>
        {urges.length === 0
          ? <Empty>None logged yet. Hit "Felt the urge" the next time something pulls at you — that's the win.</Empty>
          : urges.map((u) => (
            <div key={u.id} className="mm-action" style={{ cursor: "default" }}>
              <span className="mm-dot" style={{ ["--c" as never]: u.resolution === "resisted" ? T.mint : (u.resolution === "later" ? "#FFD23E" : "#FF7A2D") }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontSize: 13 }}>{u.what || "Urge"} · {RESOLUTION_LABEL[u.resolution]}</b>
                <div style={{ fontSize: 11, color: T.inkTiny }}>
                  {new Date(u.ts).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {new Date(u.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {u.replacement ? ` · chose: ${u.replacement}` : ""}
                </div>
              </div>
              <button className="mm-btn" style={{ padding: "3px 8px" }} onClick={() => removeUrge(u.id)}>×</button>
            </div>
          ))}
      </Section>

      {/* Settings */}
      <ScreenSettingsCard s={s} />

      {/* Replacement drawer manager */}
      <ReplacementDrawerCard s={s} />

      <div style={{ fontSize: 11, color: T.inkTiny, fontStyle: "italic", textAlign: "center", padding: "6px 0 20px" }}>
        MoreMe doesn't lock anything. The lever is yours.
      </div>

      {logOpen && <LogSessionModal onClose={() => setLogOpen(false)} />}
      {urgeOpen && <UrgeModal s={s} onClose={() => setUrgeOpen(false)} />}
    </div>
  );
}

const RESOLUTION_LABEL: Record<UrgeResolution, string> = {
  resisted: "resisted", later: "pushed later", "did-it": "gave in (honest)",
};

function SessionRow({ x }: { x: ScreenSession }) {
  return (
    <div className="mm-action" style={{ cursor: "default" }}>
      <span className="mm-dot" style={{ ["--c" as never]: T.mint }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <b style={{ fontSize: 13 }}>{x.what} <span style={{ color: T.inkTiny, fontWeight: 400 }}>· {SCREEN_CATEGORY_LABEL[x.category]}</span></b>
        <div style={{ fontSize: 11, color: T.inkTiny }}>
          {fmtMin(computeSessionMinutes(x))} · {new Date(x.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          {x.endedAt == null && x.minutes == null ? " · running" : ""}
        </div>
      </div>
      <button className="mm-btn mm-btn-danger" style={{ padding: "3px 8px" }} onClick={() => removeScreenSession(x.id)}>×</button>
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

// ── Log a session modal ───────────────────────────────────────────────────
export function LogSessionModal({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState<ScreenCategory>("gaming");
  const [what, setWhat] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [useTimer, setUseTimer] = useState(false);
  function save() {
    if (useTimer) {
      startScreenSession(category, what);
      onClose();
      return;
    }
    const m = parseInt(minutes, 10);
    if (!Number.isFinite(m) || m <= 0) return;
    logScreenSession(category, what, m);
    onClose();
  }
  return (
    <div className="mm-modal-back" onClick={onClose}>
      <div className="mm-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div className="serif" style={{ fontSize: 20, flex: 1 }}>Log screens</div>
          <button className="mm-btn" onClick={onClose}>Close</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="What were you on?"><input autoFocus value={what} placeholder="Minecraft, YouTube, TikTok…" onChange={(e) => setWhat(e.target.value)} /></Field>
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value as ScreenCategory)}>
              {SCREEN_CATEGORIES.map((c) => <option key={c} value={c}>{SCREEN_CATEGORY_LABEL[c]}</option>)}
            </select>
          </Field>
          <Field label="Mode">
            <div className="mm-seg">
              <button className={!useTimer ? "on" : ""} onClick={() => setUseTimer(false)}>Done already · log minutes</button>
              <button className={useTimer ? "on" : ""} onClick={() => setUseTimer(true)}>About to start · run a timer</button>
            </div>
          </Field>
          {!useTimer && (
            <Field label="Minutes">
              <input type="number" inputMode="numeric" min={1} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
            </Field>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="mm-btn mm-btn-primary" onClick={save}>{useTimer ? "▶ Start" : "Log"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Urge modal — replacement drawer + honest resolution ───────────────────
export function UrgeModal({ s, onClose }: { s: State; onClose: () => void }) {
  const [what, setWhat] = useState("");
  const [picked, setPicked] = useState<Replacement | null>(null);
  const [resolution, setResolution] = useState<UrgeResolution>("resisted");
  const [note, setNote] = useState("");
  function save() {
    logUrge({
      what: what.trim() || undefined,
      resolution,
      replacement: picked?.label,
      note: note.trim() || undefined,
    });
    onClose();
  }
  return (
    <div className="mm-modal-back" onClick={onClose}>
      <div className="mm-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div className="serif" style={{ fontSize: 20, flex: 1 }}>Felt the urge</div>
          <button className="mm-btn" onClick={onClose}>Close</button>
        </div>
        <div style={{ fontSize: 12, color: T.inkSoft, marginBottom: 14 }}>
          Catching it is the win. Pick a 2-minute alternative, or be honest about what happened.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="What was pulling at you? (optional)">
            <input value={what} placeholder="Minecraft, YouTube, the group chat…" onChange={(e) => setWhat(e.target.value)} autoFocus />
          </Field>

          <Field label="Pick a replacement (optional)">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {s.replacements.map((r) => (
                <button key={r.id} className={"mm-tab" + (picked?.id === r.id ? " active" : "")} onClick={() => setPicked(picked?.id === r.id ? null : r)}>
                  {r.label} · {r.minutes}m
                </button>
              ))}
              {s.replacements.length === 0 && <Empty>Add a replacement in the Screens tab.</Empty>}
            </div>
          </Field>

          <Field label="What did you do?">
            <div className="mm-seg">
              <button className={resolution === "resisted" ? "on" : ""} onClick={() => setResolution("resisted")}>Resisted</button>
              <button className={resolution === "later" ? "on" : ""} onClick={() => setResolution("later")}>Pushed it later</button>
              <button className={resolution === "did-it" ? "on" : ""} onClick={() => setResolution("did-it")}>Gave in</button>
            </div>
          </Field>

          <Field label="Note (optional)">
            <textarea value={note} rows={2} onChange={(e) => setNote(e.target.value)} placeholder="What were you feeling? What set it off?" />
          </Field>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 11, color: T.inkTiny }}>
              {resolution === "resisted" ? `+${s.screen.awardXpPerUrgeResisted} XP for noticing + resisting` : "Honest log only."}
            </div>
            <button className="mm-btn mm-btn-primary" onClick={save}>Log it</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Settings card ─────────────────────────────────────────────────────────
function ScreenSettingsCard({ s }: { s: State }) {
  return (
    <Section title="Settings · earn the screens">
      <div className="mm-row" style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
        <Field label="Base daily budget (min)">
          <input type="number" min={0} max={720} value={s.screen.baseBudgetMinutes}
            onChange={(e) => setScreenSettings({ baseBudgetMinutes: clamp(+e.target.value, 0, 720) })} style={{ width: 100 }} />
        </Field>
        <Field label="Bonus per routine (min)">
          <input type="number" min={0} max={120} value={s.screen.bonusPerRoutineMinutes}
            onChange={(e) => setScreenSettings({ bonusPerRoutineMinutes: clamp(+e.target.value, 0, 120) })} style={{ width: 100 }} />
        </Field>
        <Field label="Ceiling (max even with bonuses)">
          <input type="number" min={30} max={960} value={s.screen.capBudgetMinutes}
            onChange={(e) => setScreenSettings({ capBudgetMinutes: clamp(+e.target.value, 30, 960) })} style={{ width: 100 }} />
        </Field>
        <Field label="XP per urge resisted">
          <input type="number" min={0} max={200} value={s.screen.awardXpPerUrgeResisted}
            onChange={(e) => setScreenSettings({ awardXpPerUrgeResisted: clamp(+e.target.value, 0, 200) })} style={{ width: 80 }} />
        </Field>
      </div>
      <div className="mm-row" style={{ alignItems: "flex-end", marginTop: 6, flexWrap: "wrap" }}>
        <Field label="Pre-committed window starts">
          <input type="time" value={s.screen.windowStart ?? ""} onChange={(e) => setScreenSettings({ windowStart: e.target.value || undefined })} />
        </Field>
        <Field label="…and ends">
          <input type="time" value={s.screen.windowEnd ?? ""} onChange={(e) => setScreenSettings({ windowEnd: e.target.value || undefined })} />
        </Field>
        {(s.screen.windowStart && s.screen.windowEnd) && (
          <button className="mm-btn" onClick={() => setScreenSettings({ windowStart: undefined, windowEnd: undefined })}>Clear window</button>
        )}
      </div>
      <div style={{ fontSize: 11, color: T.inkTiny, marginTop: 6 }}>
        Pre-commit a window when you're calm. Future-you will thank present-you.
      </div>
    </Section>
  );
}

function ReplacementDrawerCard({ s }: { s: State }) {
  const [label, setLabel] = useState("");
  const [mins, setMins] = useState("5");
  return (
    <Section title="Replacement drawer">
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {s.replacements.map((r) => (
          <div key={r.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input value={r.label} onChange={(e) => updateReplacement(r.id, { label: e.target.value })} style={{ flex: 1 }} />
            <input type="number" min={1} max={120} value={r.minutes} onChange={(e) => updateReplacement(r.id, { minutes: clamp(+e.target.value, 1, 120) })} style={{ width: 70 }} />
            <button className="mm-btn mm-btn-danger" style={{ padding: "3px 8px" }} onClick={() => removeReplacement(r.id)}>×</button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <input value={label} placeholder="A 2-minute alternative…" onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && label.trim()) { addReplacement(label, +mins || 2); setLabel(""); } }} style={{ flex: 1 }} />
        <input type="number" min={1} max={120} value={mins} onChange={(e) => setMins(e.target.value)} style={{ width: 70 }} />
        <button className="mm-btn" onClick={() => { if (label.trim()) { addReplacement(label, +mins || 2); setLabel(""); } }}>Add</button>
      </div>
    </Section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mm-field"><label>{label}</label>{children}</div>;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(Number.isFinite(n) ? n : 0)));
}

// 30-day trend: minutes per day, painted as bars.
function last30Trend(s: State): { date: string; minutes: number; budget: number }[] {
  const out: { date: string; minutes: number; budget: number }[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i);
    const date = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const minutes = screenMinutesOn(date, s);
    const budget = earnedBudgetOn(date, s).total;
    out.push({ date, minutes, budget });
  }
  return out;
}

function TrendBars({ data }: { data: { date: string; minutes: number; budget: number }[] }) {
  const max = Math.max(60, ...data.map((d) => Math.max(d.minutes, d.budget)));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 90 }}>
      {data.map((d) => {
        const h = (d.minutes / max) * 84;
        const over = d.minutes > d.budget;
        return (
          <div key={d.date} title={`${d.date}: ${fmtMin(d.minutes)} of ${fmtMin(d.budget)}`} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
            <div style={{
              height: Math.max(2, h),
              background: d.minutes === 0 ? T.line : over ? "#FFD23E" : T.mint,
              borderRadius: 2,
              opacity: d.minutes === 0 ? 0.4 : 1,
            }} />
          </div>
        );
      })}
    </div>
  );
}

// Make the load helper available without re-importing in tests.
export { loadState as _loadStateForScreens };
