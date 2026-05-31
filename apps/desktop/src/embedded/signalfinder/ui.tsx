import React from "react";
import { scoreColor } from "./model";

// Component-scoped style block — injected once. We do NOT touch theme.css.
export const SF_STYLE = `
.sf-btn {
  appearance: none; cursor: pointer;
  background: linear-gradient(180deg, rgba(40,18,26,0.9), rgba(22,10,16,0.95));
  border: 1px solid var(--line); border-radius: 9px;
  color: var(--ink); padding: 9px 14px; font-size: 12.5px;
  font-family: inherit; letter-spacing: 0.3px;
  transition: transform .12s ease, border-color .15s ease, box-shadow .2s ease, background .2s ease;
  display: inline-flex; align-items: center; gap: 6px; line-height: 1;
}
.sf-btn:hover { border-color: rgba(255,87,119,0.6); box-shadow: 0 0 0 1px rgba(255,87,119,0.25), 0 6px 18px rgba(255,40,90,0.18); transform: translateY(-1px); }
.sf-btn:active { transform: translateY(0); }
.sf-btn:disabled { opacity: 0.5; cursor: default; transform: none; box-shadow: none; }
.sf-btn.sf-on { color: #fff; border-color: rgba(255,87,119,0.8);
  background: linear-gradient(180deg, rgba(255,70,110,0.32), rgba(150,30,55,0.32));
  box-shadow: 0 0 14px rgba(255,60,100,0.35), inset 0 0 12px rgba(255,80,120,0.12); }
.sf-btn.sf-primary { color: #fff; border-color: rgba(255,120,60,0.7);
  background: linear-gradient(120deg, #ff5577, #ff7a2d); box-shadow: 0 6px 20px rgba(255,80,40,0.35); }
.sf-btn.sf-primary:hover { box-shadow: 0 8px 26px rgba(255,80,40,0.5); }
.sf-btn.sf-sm { padding: 5px 10px; font-size: 11px; border-radius: 7px; }
.sf-btn.sf-ghost { background: rgba(255,255,255,0.02); }
.sf-btn.sf-danger:hover { border-color: rgba(255,70,70,0.7); box-shadow: 0 0 0 1px rgba(255,70,70,0.3); color: #ff8a8a; }

.sf-chip { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 999px;
  font-size: 10.5px; letter-spacing: 0.4px; border: 1px solid; line-height: 1.4; }
.sf-chip-x { cursor: pointer; opacity: 0.6; font-weight: 700; }
.sf-chip-x:hover { opacity: 1; }

.sf-card { background: linear-gradient(165deg, rgba(28,16,22,0.9), rgba(16,10,14,0.92));
  border: 1px solid var(--line); border-radius: 12px; }

.sf-pulse { animation: sf-pulse 1.8s ease-in-out infinite; }
@keyframes sf-pulse { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }
@keyframes sf-sweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes sf-ring { from { stroke-dashoffset: var(--circ); } }
@keyframes sf-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.sf-rise { animation: sf-rise .25s ease; }

.sf-tab { appearance: none; cursor: pointer; background: transparent; border: none;
  color: var(--mute); font-family: inherit; font-size: 12px; letter-spacing: 1.5px;
  text-transform: uppercase; padding: 9px 14px; border-bottom: 2px solid transparent; transition: all .15s; }
.sf-tab:hover { color: var(--ink); }
.sf-tab.sf-tab-on { color: #fff; border-bottom-color: #ff5577;
  text-shadow: 0 0 12px rgba(255,87,119,0.6); }

.sf-input { background: rgba(0,0,0,0.5); border: 1px solid var(--line); border-radius: 8px;
  color: var(--ink); padding: 8px 10px; font-size: 12.5px; width: 100%;
  font-family: ui-monospace, monospace; outline: none; transition: border-color .15s, box-shadow .15s; }
.sf-input:focus { border-color: rgba(255,87,119,0.6); box-shadow: 0 0 0 2px rgba(255,87,119,0.15); }

.sf-range { -webkit-appearance: none; appearance: none; width: 100%; height: 5px; border-radius: 99px;
  background: linear-gradient(90deg, #ff5577, #ff7a2d); outline: none; margin-top: 7px; }
.sf-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 15px; height: 15px;
  border-radius: 50%; background: #fff; border: 2px solid #ff5577; cursor: pointer; box-shadow: 0 0 8px rgba(255,87,119,0.7); }

.sf-kbn { background: rgba(0,0,0,0.25); border: 1px solid var(--line); border-radius: 10px; }
.sf-kbn-drop { border-color: rgba(255,87,119,0.7); box-shadow: 0 0 0 2px rgba(255,87,119,0.2) inset; }
.sf-kcard { cursor: grab; transition: transform .12s, box-shadow .15s; }
.sf-kcard:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(0,0,0,0.4); }
.sf-kcard:active { cursor: grabbing; }
`;

export function Btn({
  children, onClick, on, primary, sm, ghost, danger, disabled, title, style,
}: {
  children: React.ReactNode; onClick?: () => void; on?: boolean; primary?: boolean;
  sm?: boolean; ghost?: boolean; danger?: boolean; disabled?: boolean; title?: string;
  style?: React.CSSProperties;
}) {
  const cls = ["sf-btn", on && "sf-on", primary && "sf-primary", sm && "sf-sm", ghost && "sf-ghost", danger && "sf-danger"]
    .filter(Boolean).join(" ");
  return (
    <button className={cls} onClick={onClick} disabled={disabled} title={title} style={style}>
      {children}
    </button>
  );
}

export function Field({ l, children }: { l: string; children: React.ReactNode }) {
  return (
    <label style={{ fontSize: 10, color: "var(--mute)", textTransform: "uppercase", letterSpacing: 1 }}>
      {l}
      <div style={{ marginTop: 5 }}>{children}</div>
    </label>
  );
}

export function Slider({ l, v, on, min = 1, max = 5 }: { l: string; v: number; on: (v: number) => void; min?: number; max?: number }) {
  return (
    <label style={{ fontSize: 10, color: "var(--mute)", textTransform: "uppercase", letterSpacing: 1, display: "block" }}>
      {l}: <span className="glow-text" style={{ fontSize: 12 }}>{v}</span>
      <input className="sf-range" type="range" min={min} max={max} value={v} onChange={(e) => on(Number(e.target.value))} />
    </label>
  );
}

// Animated circular score ring, color-graded.
export function ScoreRing({ value, size = 64, stroke = 6, label }: { value: number; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ * (1 - Math.min(100, Math.max(0, value)) / 100);
  const color = scoreColor(value);
  const gid = `sfr-${Math.round(value)}-${size}`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor="#ff7a2d" />
        </linearGradient>
        <filter id={`${gid}-glow`}><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${gid})`} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off}
        filter={`url(#${gid}-glow)`}
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1)" }}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill="#fff"
        style={{ fontSize: size * 0.3, fontWeight: 800, fontFamily: "ui-monospace, monospace" }}>{value}</text>
      {label && <text x="50%" y={size - 4} textAnchor="middle" fill="var(--mute)" style={{ fontSize: 7, letterSpacing: 1 }}>{label}</text>}
    </svg>
  );
}
