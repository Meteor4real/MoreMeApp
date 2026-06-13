// MoreMe widgets — the atoms an external agent (or the in-app builder)
// composes into custom tabs. Each widget kind has:
//   - a renderer (WidgetView) that shows it
//   - an editor (WidgetEditor) for the builder UI
// Built-in tabs accept widgets too (rendered above their default content).

import { useState } from "react";
import { T } from "./styles";
import { STAT_SOURCES, type StatSource, type Widget } from "./types";
import { removeWidget, statValue, updateWidget } from "./store";
import type { State } from "./types";
import { quoteOfDay } from "./quotes";

// ── Renderer ──────────────────────────────────────────────────────────────
export function WidgetView({ s, tabId, w }: { s: State; tabId: string; w: Widget }) {
  switch (w.kind) {
    case "text":      return <TextView w={w} />;
    case "counter":   return <CounterView w={w} tabId={tabId} />;
    case "note":      return <NoteView w={w} tabId={tabId} />;
    case "checklist": return <ChecklistView w={w} tabId={tabId} />;
    case "link":      return <LinkView w={w} />;
    case "iframe":    return <IframeView w={w} />;
    case "stat":      return <StatView w={w} s={s} />;
    case "image":     return <ImageView w={w} />;
    case "divider":   return <DividerView />;
    case "quote":     return <QuoteView w={w} />;
  }
}

function Frame({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="mm-card" style={{ padding: 14 }}>
      {title && <div style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: T.inkTiny, marginBottom: 8 }}>{title}</div>}
      {children}
    </div>
  );
}

function TextView({ w }: { w: Extract<Widget, { kind: "text" }> }) {
  return <Frame title={w.title}><div style={{ fontSize: 14, lineHeight: 1.55, color: T.ink, whiteSpace: "pre-wrap" }}>{w.body}</div></Frame>;
}

function CounterView({ w, tabId }: { w: Extract<Widget, { kind: "counter" }>; tabId: string }) {
  const step = w.step ?? 1;
  const set = (v: number) => updateWidget(tabId, w.id, { value: Math.max(0, v) });
  return (
    <Frame title={w.title}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="mm-btn" onClick={() => set(w.value - step)}>−</button>
        <div style={{ fontSize: 36, fontWeight: 800, color: T.mint, lineHeight: 1, minWidth: 60, textAlign: "center" }}>{w.value}</div>
        <button className="mm-btn mm-btn-primary" onClick={() => set(w.value + step)}>+ {step}</button>
      </div>
    </Frame>
  );
}

function NoteView({ w, tabId }: { w: Extract<Widget, { kind: "note" }>; tabId: string }) {
  return (
    <Frame title={w.title}>
      <textarea value={w.body} onChange={(e) => updateWidget(tabId, w.id, { body: e.target.value })} rows={4} style={{ width: "100%", resize: "vertical" }} />
    </Frame>
  );
}

function ChecklistView({ w, tabId }: { w: Extract<Widget, { kind: "checklist" }>; tabId: string }) {
  const [v, setV] = useState("");
  const setItems = (items: typeof w.items) => updateWidget(tabId, w.id, { items });
  const add = () => { if (v.trim()) { setItems([...w.items, { id: Math.random().toString(36).slice(2, 8), text: v.trim(), done: false }]); setV(""); } };
  return (
    <Frame title={w.title}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {w.items.map((it) => (
          <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={it.done} onChange={() => setItems(w.items.map((x) => x.id === it.id ? { ...x, done: !x.done } : x))} style={{ width: "auto" }} />
            <span style={{ flex: 1, fontSize: 13, textDecoration: it.done ? "line-through" : "none", color: it.done ? T.inkTiny : T.ink }}>{it.text}</span>
            <button className="mm-btn" style={{ padding: "2px 8px" }} onClick={() => setItems(w.items.filter((x) => x.id !== it.id))}>×</button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <input placeholder="Add an item…" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} style={{ flex: 1 }} />
        <button className="mm-btn" onClick={add}>Add</button>
      </div>
    </Frame>
  );
}

function LinkView({ w }: { w: Extract<Widget, { kind: "link" }> }) {
  return (
    <Frame>
      <a href={w.url} target="_blank" rel="noreferrer" className="mm-btn mm-btn-primary" style={{ display: "inline-block", textDecoration: "none" }}>{w.title} →</a>
      <div style={{ fontSize: 11, color: T.inkTiny, marginTop: 6, fontFamily: "ui-monospace, monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.url}</div>
    </Frame>
  );
}

function IframeView({ w }: { w: Extract<Widget, { kind: "iframe" }> }) {
  return (
    <Frame title={w.title}>
      <iframe src={w.url} style={{ width: "100%", height: w.height ?? 360, border: `1px solid ${T.line}`, borderRadius: 8 }} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
    </Frame>
  );
}

function StatView({ w, s }: { w: Extract<Widget, { kind: "stat" }>; s: State }) {
  const v = statValue(w.source, s);
  const display = w.format === "minutes" ? (v < 60 ? `${Math.round(v)}m` : `${Math.floor(v / 60)}h ${Math.round(v % 60)}m`)
    : w.format === "percent" ? `${Math.round(v)}%`
    : v.toLocaleString();
  return (
    <Frame>
      <div style={{ fontSize: 32, fontWeight: 800, color: T.mint, lineHeight: 1 }}>{display}</div>
      <div style={{ fontSize: 11, color: T.inkTiny, letterSpacing: ".08em", textTransform: "uppercase", marginTop: 6 }}>{w.title}</div>
    </Frame>
  );
}

function ImageView({ w }: { w: Extract<Widget, { kind: "image" }> }) {
  return (
    <Frame title={w.title}>
      <img
        src={w.url}
        alt={w.title || ""}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        style={{ width: "100%", height: w.height ?? 240, objectFit: "cover", borderRadius: 10, display: "block" }}
      />
    </Frame>
  );
}

function DividerView() {
  return <div style={{ height: 1, background: T.line, margin: "4px 0" }} />;
}

function QuoteView({ w }: { w: Extract<Widget, { kind: "quote" }> }) {
  const today = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  const q = quoteOfDay(today);
  return (
    <Frame title={w.title}>
      <div className="serif" style={{ fontSize: 17, lineHeight: 1.35, color: T.ink }}>“{q.text}”</div>
      <div style={{ fontSize: 11, color: T.inkTiny, marginTop: 4, letterSpacing: ".06em", textTransform: "uppercase" }}>— {q.by}</div>
    </Frame>
  );
}

// ── Editor (builder UI) ───────────────────────────────────────────────────
export function WidgetEditor({ tabId, w, onMove }: { tabId: string; w: Widget; onMove: (dir: -1 | 1) => void }) {
  return (
    <div className="mm-card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="mm-pill" style={{ background: T.mint + "22", color: T.mint }}>{w.kind}</span>
        <span style={{ fontSize: 11, color: T.inkTiny, fontFamily: "ui-monospace, monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{w.id}</span>
        <button className="mm-btn" style={{ padding: "2px 8px" }} onClick={() => onMove(-1)}>↑</button>
        <button className="mm-btn" style={{ padding: "2px 8px" }} onClick={() => onMove(1)}>↓</button>
        <button className="mm-btn mm-btn-danger" style={{ padding: "2px 8px" }} onClick={() => removeWidget(tabId, w.id)}>×</button>
      </div>
      <WidgetFields tabId={tabId} w={w} />
    </div>
  );
}

function WidgetFields({ tabId, w }: { tabId: string; w: Widget }) {
  const set = (patch: Partial<Widget>) => updateWidget(tabId, w.id, patch);
  switch (w.kind) {
    case "text":
    case "note":
      return (
        <>
          <input value={w.title ?? ""} placeholder="Title (optional)" onChange={(e) => set({ title: e.target.value })} />
          <textarea value={w.body} rows={3} placeholder="Body" onChange={(e) => set({ body: e.target.value })} />
        </>
      );
    case "counter":
      return (
        <>
          <input value={w.title} placeholder="Title" onChange={(e) => set({ title: e.target.value })} />
          <div className="mm-row">
            <label style={{ fontSize: 11, color: T.inkTiny }}>Start</label>
            <input type="number" value={w.value} onChange={(e) => set({ value: parseInt(e.target.value, 10) || 0 })} style={{ width: 90 }} />
            <label style={{ fontSize: 11, color: T.inkTiny }}>Step</label>
            <input type="number" value={w.step ?? 1} onChange={(e) => set({ step: parseInt(e.target.value, 10) || 1 })} style={{ width: 70 }} />
          </div>
        </>
      );
    case "checklist":
      return <input value={w.title} placeholder="Title" onChange={(e) => set({ title: e.target.value })} />;
    case "link":
    case "iframe":
    case "image":
      return (
        <>
          <input value={"title" in w ? w.title ?? "" : ""} placeholder="Title" onChange={(e) => set({ title: e.target.value })} />
          <input value={w.url} placeholder="URL" onChange={(e) => set({ url: e.target.value })} style={{ fontFamily: "ui-monospace, monospace" }} />
          {(w.kind === "iframe" || w.kind === "image") && (
            <div className="mm-row">
              <label style={{ fontSize: 11, color: T.inkTiny }}>Height (px)</label>
              <input type="number" value={w.height ?? 240} onChange={(e) => set({ height: parseInt(e.target.value, 10) || 240 })} style={{ width: 90 }} />
            </div>
          )}
        </>
      );
    case "stat":
      return (
        <>
          <input value={w.title} placeholder="Title" onChange={(e) => set({ title: e.target.value })} />
          <select value={w.source} onChange={(e) => set({ source: e.target.value as StatSource })}>
            {STAT_SOURCES.map((src) => <option key={src} value={src}>{src}</option>)}
          </select>
          <select value={w.format ?? "number"} onChange={(e) => set({ format: e.target.value as Extract<Widget, { kind: "stat" }>["format"] })}>
            <option value="number">number</option>
            <option value="minutes">minutes (Xh Ym)</option>
            <option value="percent">percent</option>
          </select>
        </>
      );
    case "divider":
      return null;
    case "quote":
      return <input value={w.title ?? ""} placeholder="Title (optional)" onChange={(e) => set({ title: e.target.value })} />;
  }
}
