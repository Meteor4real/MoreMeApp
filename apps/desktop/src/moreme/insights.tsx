// MoreMe — Insights. See yourself achieving it: XP trend over 30 days,
// completion rate, best streak, where your effort actually goes, and a
// distraction tally. All derived from the same store, no new tracking.

import { T } from "./styles";
import { CATEGORY_META } from "./types";
import type { State } from "./types";
import { insights, levelInfo } from "./store";

export function InsightsView({ s }: { s: State }) {
  const ins = insights(s);
  const lv = levelInfo(s);
  const maxXp = Math.max(1, ...ins.xpByDay.map((d) => d.xp));

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div className="serif" style={{ fontSize: 22, marginBottom: 14 }}>Insights</div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", marginBottom: 16 }}>
        <Card label="Level" value={`${lv.level}`} sub={`${lv.total.toLocaleString()} XP total`} />
        <Card label="XP · last 7 days" value={ins.xpLast7.toLocaleString()} />
        <Card label="XP · last 30 days" value={ins.xpLast30.toLocaleString()} />
        <Card label="Completion rate" value={`${ins.completionRate30}%`} sub="last 30 days" />
        <Card label="Best streak" value={`${ins.bestStreak}d`} />
        <Card label="Achievements" value={`${ins.achievementsEarned}`} sub="earned" />
        <Card label="Distractions" value={`${ins.distractions30}`} sub="last 30 days" tone={ins.distractions30 === 0 ? "good" : "warn"} />
      </div>

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
