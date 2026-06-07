// MoreMe — the Empire. Track the businesses you run: status, monthly
// revenue, next action, link. The hero sums current MRR and lifetime revenue
// so the "rich guy who owns his own businesses" is a number you watch grow.

import { useState } from "react";
import { T } from "./styles";
import type { State, Venture, VentureStatus } from "./types";
import {
  blankVenture, empireLifetime, empireMRR, monthKey, removeVenture,
  setVentureRevenue, upsertVenture, ventureMRR,
} from "./store";

const STATUS: VentureStatus[] = ["idea", "building", "live", "scaling", "sold", "paused"];
const STATUS_COLOR: Record<VentureStatus, string> = {
  idea: "#8b95a5", building: "#FFB23E", live: "#3EDBB5", scaling: "#4ADE80", sold: "#A855F7", paused: "#6A7280",
};
const money = (n: number) => "$" + Math.round(n).toLocaleString();

export function EmpireView({ s }: { s: State }) {
  const mrr = empireMRR(s);
  const lifetime = empireLifetime(s);
  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div className="serif" style={{ fontSize: 22, lineHeight: 1 }}>The Empire</div>
          <div style={{ fontSize: 11, color: T.inkTiny, letterSpacing: ".08em", textTransform: "uppercase", marginTop: 4 }}>
            Everything you build and run
          </div>
        </div>
        <button className="mm-btn mm-btn-primary" onClick={() => upsertVenture({ ...blankVenture(), name: "New venture" })}>+ Venture</button>
      </div>

      <div className="mm-card-mint" style={{ padding: 16, marginBottom: 16, display: "flex", gap: 28, flexWrap: "wrap" }}>
        <Metric label="Monthly revenue" value={money(mrr)} />
        <Metric label="Lifetime revenue" value={money(lifetime)} />
        <Metric label="Active ventures" value={String(s.ventures.filter((v) => v.status === "live" || v.status === "scaling").length)} />
        <Metric label="Total ventures" value={String(s.ventures.length)} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {s.ventures.length === 0 && <Empty>No ventures yet. Add the first one.</Empty>}
        {s.ventures.map((v) => <VentureCard key={v.id} v={v} />)}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 24, fontWeight: 800, color: T.mint, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: T.inkTiny, letterSpacing: ".1em", textTransform: "uppercase", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function VentureCard({ v }: { v: Venture }) {
  const thisMonth = monthKey();
  const cur = v.revenue.find((r) => r.month === thisMonth)?.amount ?? 0;
  const [rev, setRev] = useState(String(cur || ""));
  const history = [...v.revenue].sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
  const max = Math.max(1, ...history.map((h) => h.amount));

  return (
    <div className="mm-card" style={{ padding: 16, opacity: v.status === "sold" || v.status === "paused" ? 0.7 : 1 }}>
      <div className="mm-row" style={{ alignItems: "center" }}>
        <input value={v.name} placeholder="Venture name" onChange={(e) => upsertVenture({ ...v, name: e.target.value })} style={{ flex: 1, fontSize: 15, fontWeight: 600 }} />
        <select value={v.status} onChange={(e) => upsertVenture({ ...v, status: e.target.value as VentureStatus })} style={{ color: STATUS_COLOR[v.status] }}>
          {STATUS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <button className="mm-btn mm-btn-danger" style={{ padding: "4px 8px" }} onClick={() => removeVenture(v.id)}>×</button>
      </div>
      <input value={v.tagline ?? ""} placeholder="One-line tagline" onChange={(e) => upsertVenture({ ...v, tagline: e.target.value })} style={{ width: "100%", marginTop: 8, fontSize: 12 }} />

      <div className="mm-row" style={{ marginTop: 10, alignItems: "flex-end" }}>
        <div className="mm-field" style={{ flex: 1 }}>
          <label>This month's revenue ({thisMonth})</label>
          <div style={{ display: "flex", gap: 6 }}>
            <input value={rev} inputMode="numeric" placeholder="0" onChange={(e) => setRev(e.target.value.replace(/[^0-9.]/g, ""))} onBlur={() => setVentureRevenue(v.id, thisMonth, Number(rev) || 0)} style={{ width: 120 }} />
            <span style={{ alignSelf: "center", fontSize: 11, color: T.inkTiny }}>MRR {money(ventureMRR(v))}</span>
          </div>
        </div>
        <div className="mm-field" style={{ flex: 1 }}>
          <label>Next action</label>
          <input value={v.nextAction ?? ""} placeholder="What moves it forward?" onChange={(e) => upsertVenture({ ...v, nextAction: e.target.value })} />
        </div>
      </div>

      {history.length > 0 && (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 40, marginTop: 12 }}>
          {history.map((h) => (
            <div key={h.id} title={`${h.month}: ${money(h.amount)}`} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" }}>
              <div style={{ width: "70%", height: Math.max(3, (h.amount / max) * 34), background: T.mint, borderRadius: 2 }} />
              <div style={{ fontSize: 8, color: T.inkTiny, marginTop: 2 }}>{h.month.slice(5)}</div>
            </div>
          ))}
        </div>
      )}

      <input value={v.link ?? ""} placeholder="Link (site / dashboard)" onChange={(e) => upsertVenture({ ...v, link: e.target.value })} style={{ width: "100%", marginTop: 10, fontSize: 12 }} />
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color: T.inkTiny, fontStyle: "italic", padding: 16 }}>{children}</div>;
}
