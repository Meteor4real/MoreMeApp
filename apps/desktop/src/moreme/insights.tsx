// MoreMe — Insights. See yourself achieving it: XP trend, completion rate,
// best streak, where your effort actually goes, AND the data mirror for
// screens (routine days vs. no-routine days, worst hour, urges resisted,
// 30-day trend vs. earned budget). Real data, real reflection.

import { T } from "./styles";
import { CATEGORY_META, SCREEN_CATEGORY_LABEL, type ScreenCategory } from "./types";
import type { State } from "./types";
import { insights, levelInfo } from "./store";
import { fmtMin } from "./screens";

export function InsightsView({ s }: { s: State }) {
  const ins = insights(s);
  const lv = levelInfo(s);
  const maxXp = Math.max(1, ...ins.xpByDay.map((d) => d.xp));
  const maxScreenMin = Math.max(60, ...ins.screenMinutesByDay.map((d) => Math.max(d.minutes, d.budget)));
  const hasScreens = ins.screenLast30 > 0;
  const hasRoutineDelta = ins.routineDays > 0 && ins.noRoutineDays > 0;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div className="serif" style={{ fontSize: 22, marginBottom: 14 }}>Insights</div>

      {/* Top KPI strip */}
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", marginBottom: 16 }}>
        <Card label="Level" value={`${lv.level}`} sub={`${lv.total.toLocaleString()} XP total`} />
        <Card label="XP · last 7 days" value={ins.xpLast7.toLocaleString()} />
        <Card label="XP · last 30 days" value={ins.xpLast30.toLocaleString()} />
        <Card label="Completion rate" value={`${ins.completionRate30}%`} sub="last 30 days" />
        <Card label="Best streak" value={`${ins.bestStreak}d`} />
        <Card label="Achievements" value={`${ins.achievementsEarned}`} sub="earned" />
        <Card label="Distractions" value={`${ins.distractions30}`} sub="last 30 days" tone={ins.distractions30 === 0 ? "good" : "warn"} />
      </div>

      {/* XP 30-day chart */}
      <div className="mm-card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: T.inkTiny, marginBottom: 12 }}>XP earned · last 30 days</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 90 }}>
          {ins.xpByDay.map((d) => (
            <div key={d.date} title={`${d.date}: ${d.xp} XP`} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
              <div style={{ height: Math.max(2, (d.xp / maxXp) * 84), background: d.xp ? T.mint : T.line, borderRadius: 2, opacity: d.xp ? 1 : 0.4 }} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: T.inkTiny, marginTop: 4 }}>
          <span>{ins.xpByDay[0]?.date.slice(5)}</span>
          <span>today</span>
        </div>
      </div>

      {/* SCREENS — data mirror */}
      <div className="mm-card" style={{ padding: 16, marginBottom: 16, border: hasScreens ? `1px solid ${T.mint}55` : undefined }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: T.mint }}>Screens · the mirror</div>
          <div style={{ fontSize: 11, color: T.inkTiny }}>{hasScreens ? `last 30 days · ${fmtMin(ins.screenLast30)} total` : "log a session to start the mirror"}</div>
        </div>

        {!hasScreens && (
          <div style={{ fontSize: 12, color: T.inkTiny, fontStyle: "italic" }}>
            Once you log screen sessions for a few days, the numbers below will start telling you the truth about the trade.
          </div>
        )}

        {hasScreens && (
          <>
            {/* KPI strip */}
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", marginBottom: 14 }}>
              <Card label="Last 7 days" value={fmtMin(ins.screenLast7)} />
              <Card label="Daily average" value={fmtMin(ins.screenAvgDaily)} sub="on days with sessions" />
              <Card label="Best under-budget streak" value={`${ins.bestUnderBudgetStreak}d`} />
              <Card label="Urges resisted" value={`${ins.urgesResistedLast30}`} sub={`of ${ins.urgesLast30} logged`} tone="good" />
            </div>

            {/* THE COMPARISON — routine days vs. no-routine days */}
            {hasRoutineDelta ? (
              <div style={{ padding: 14, background: T.sunk, border: `1px solid ${T.mint}66`, borderRadius: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: T.mint, marginBottom: 8 }}>
                  Days you did the morning routine vs. days you didn't
                </div>
                <BarComparison
                  a={{ label: "Morning routine done", days: ins.routineDays, minutes: ins.routineDayAvgMin, color: T.mint }}
                  b={{ label: "Skipped the routine",   days: ins.noRoutineDays, minutes: ins.noRoutineDayAvgMin, color: "#FFD23E" }}
                />
                <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 10, lineHeight: 1.55 }}>
                  {ins.routineDayAvgMin < ins.noRoutineDayAvgMin
                    ? <>On routine days you spent <b style={{ color: T.mint }}>{fmtMin(ins.routineDayAvgMin)}</b> on screens — about <b style={{ color: T.mint }}>{fmtMin(Math.max(0, ins.noRoutineDayAvgMin - ins.routineDayAvgMin))}</b> less than the days you skipped. That's the trade.</>
                    : ins.routineDayAvgMin > ins.noRoutineDayAvgMin
                    ? <>Routine days currently averaging <b>{fmtMin(ins.routineDayAvgMin)}</b> vs <b>{fmtMin(ins.noRoutineDayAvgMin)}</b> without — counterintuitive; you're earning the budget and spending it. Worth deciding whether that's the trade you actually want.</>
                    : <>Both buckets averaging about the same. Could be the dataset's still small, or the morning routine isn't the lever — try comparing other patterns.</>}
                </div>
              </div>
            ) : (
              <div style={{ padding: 12, background: T.sunk, border: `1px dashed ${T.line}`, borderRadius: 10, marginBottom: 12, fontSize: 12, color: T.inkTiny }}>
                Need both kinds of days — at least one where you did the morning routine and one where you didn't — for the comparison to mean anything.
              </div>
            )}

            {/* 30-day trend vs budget */}
            <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: T.inkTiny, marginBottom: 6 }}>
              Daily screens vs. earned budget · last 30 days
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 84, marginBottom: 6 }}>
              {ins.screenMinutesByDay.map((d) => {
                const h = (d.minutes / maxScreenMin) * 78;
                const budH = (d.budget / maxScreenMin) * 78;
                const over = d.minutes > d.budget && d.minutes > 0;
                return (
                  <div key={d.date} title={`${d.date}: ${fmtMin(d.minutes)} of ${fmtMin(d.budget)} earned`} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%", position: "relative" }}>
                    {/* budget line marker */}
                    <div style={{ position: "absolute", left: 0, right: 0, bottom: budH, height: 1, background: T.mint, opacity: 0.35 }} />
                    <div style={{ height: Math.max(2, h), background: d.minutes === 0 ? T.line : over ? "#FFD23E" : T.mint, borderRadius: 2, opacity: d.minutes === 0 ? 0.3 : 1 }} />
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: T.inkTiny }}>
              <span>{ins.screenMinutesByDay[0]?.date.slice(5)}</span>
              <span style={{ color: T.mint, opacity: 0.6 }}>— budget</span>
              <span>today</span>
            </div>

            {/* Worst hour + category breakdown */}
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr", marginTop: 14 }}>
              <div style={{ padding: 12, background: T.sunk, borderRadius: 8 }}>
                <div style={{ fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: T.inkTiny, marginBottom: 6 }}>Worst hour</div>
                {ins.worstHour ? (
                  <>
                    <div style={{ fontSize: 22, fontWeight: 800, color: T.ink }}>{fmtHour(ins.worstHour.hour)}</div>
                    <div style={{ fontSize: 11, color: T.inkTiny, marginTop: 2 }}>{fmtMin(ins.worstHour.minutes)} starts in this hour, last 30 days</div>
                  </>
                ) : <div style={{ fontSize: 12, color: T.inkTiny, fontStyle: "italic" }}>Not enough data yet.</div>}
              </div>
              <div style={{ padding: 12, background: T.sunk, borderRadius: 8 }}>
                <div style={{ fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: T.inkTiny, marginBottom: 6 }}>Where the time goes</div>
                {ins.byScreenCategory.length === 0 ? <div style={{ fontSize: 12, color: T.inkTiny, fontStyle: "italic" }}>—</div> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {ins.byScreenCategory.slice(0, 4).map((c) => {
                      const max = ins.byScreenCategory[0]?.minutes || 1;
                      return (
                        <div key={c.category} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
                          <span style={{ width: 78, color: T.inkSoft }}>{SCREEN_CATEGORY_LABEL[c.category as ScreenCategory]}</span>
                          <div style={{ flex: 1, height: 8, background: T.bg, borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ width: (c.minutes / max) * 100 + "%", height: "100%", background: T.mint }} />
                          </div>
                          <span style={{ color: T.inkTiny, width: 56, textAlign: "right" }}>{fmtMin(c.minutes)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Existing "where your effort goes" */}
      <div className="mm-card" style={{ padding: 16 }}>
        <div style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: T.inkTiny, marginBottom: 12 }}>Where your effort goes</div>
        {ins.byCategory.length === 0 ? (
          <div style={{ fontSize: 12, color: T.inkTiny, fontStyle: "italic" }}>Complete some items to see the breakdown.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ins.byCategory.map(({ category, count }) => {
              const meta = CATEGORY_META[category];
              const max = Math.max(...ins.byCategory.map((c) => c.count));
              return (
                <div key={category} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 96, fontSize: 12, color: T.inkSoft }}>{meta.label}</span>
                  <div style={{ flex: 1, height: 14, background: T.sunk, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: (count / max) * 100 + "%", height: "100%", background: meta.color }} />
                  </div>
                  <span style={{ width: 32, textAlign: "right", fontSize: 12, color: T.inkTiny }}>{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "warn" }) {
  const color = tone === "warn" ? T.warn : T.mint;
  return (
    <div className="mm-card" style={{ padding: 14 }}>
      <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: T.inkTiny, letterSpacing: ".08em", textTransform: "uppercase", marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: T.inkTiny, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function BarComparison({ a, b }: { a: { label: string; days: number; minutes: number; color: string }; b: { label: string; days: number; minutes: number; color: string } }) {
  const max = Math.max(a.minutes, b.minutes, 1);
  const Row = ({ x }: { x: typeof a }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
      <span style={{ width: 180, fontSize: 12, color: T.inkSoft }}>
        {x.label} <span style={{ color: T.inkTiny }}>· {x.days}d</span>
      </span>
      <div style={{ flex: 1, height: 18, background: T.bg, borderRadius: 4, overflow: "hidden", position: "relative" }}>
        <div style={{ width: (x.minutes / max) * 100 + "%", height: "100%", background: x.color, transition: "width .4s" }} />
        <span style={{ position: "absolute", left: 8, top: 1, fontSize: 11, color: "#fff", fontWeight: 700, textShadow: "0 1px 2px rgba(0,0,0,.5)" }}>{fmtMin(x.minutes)}</span>
      </div>
    </div>
  );
  return <div><Row x={a} /><Row x={b} /></div>;
}

function fmtHour(h: number): string {
  const period = h < 12 ? "am" : "pm";
  const hh = h % 12 || 12;
  return `${hh}${period}–${(hh % 12) + 1}${(h + 1) % 24 < 12 ? "am" : "pm"}`;
}
