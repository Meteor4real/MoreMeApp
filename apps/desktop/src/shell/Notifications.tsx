import { useEffect, useState } from "react";
import type { FeedItem } from "../feeds";
import { loadPrefs, subscribePrefs } from "../uiPrefs";

// Position map for the toast container, driven by Settings → Notifications.
const POS: Record<string, React.CSSProperties> = {
  tr: { top: 64, right: 14, alignItems: "flex-end" },
  br: { bottom: 64, right: 14, alignItems: "flex-end" },
  tl: { top: 64, left: 14, alignItems: "flex-start" },
  bl: { bottom: 64, left: 14, alignItems: "flex-start" },
};

// A short, soft chime via the Web Audio API — no asset needed.
function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.5);
    setTimeout(() => ctx.close().catch(() => undefined), 700);
  } catch { /* ignore */ }
}

export function Notifications({
  toasts,
  onDismiss,
}: {
  toasts: FeedItem[];
  onDismiss: (id: string) => void;
}) {
  const [prefs, setPrefs] = useState(loadPrefs);
  useEffect(() => subscribePrefs(setPrefs), []);

  // Sound on each newly-arrived toast (when enabled).
  const [seen, setSeen] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!prefs.notificationsEnabled || !prefs.notificationSound) return;
    const fresh = toasts.filter((t) => !seen.has(t.id));
    if (fresh.length) { chime(); setSeen(new Set(toasts.map((t) => t.id))); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toasts]);

  if (!prefs.notificationsEnabled) return null;
  return (
    <div className="toasts" style={{ position: "fixed", display: "flex", flexDirection: "column", gap: 8, zIndex: 9998, ...POS[prefs.notificationPosition] }}>
      {toasts.map((t) => (
        <Toast key={t.id} item={t} onDismiss={onDismiss} durationMs={prefs.notificationDurationMs} />
      ))}
    </div>
  );
}

function Toast({ item, onDismiss, durationMs }: { item: FeedItem; onDismiss: (id: string) => void; durationMs: number }) {
  useEffect(() => {
    const x = setTimeout(() => onDismiss(item.id), durationMs);
    return () => clearTimeout(x);
  }, [item.id, onDismiss, durationMs]);

  return (
    <div className="toast panel">
      <div className="toast-src mono glow-text">{item.source}</div>
      <div className="toast-text">{item.text}</div>
      <button className="toast-x" onClick={() => onDismiss(item.id)}>
        ✕
      </button>
    </div>
  );
}
