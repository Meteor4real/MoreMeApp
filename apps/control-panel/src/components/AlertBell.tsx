"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, AlertTriangle, ShieldAlert } from "lucide-react";

type Alert = {
  id: string;
  source: string;
  severity: "info" | "warn" | "crit";
  message: string;
  created_at: string;
};

export function AlertBell() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/alerts", { cache: "no-store" });
        if (!res.ok) return;
        const j = (await res.json()) as { alerts: Alert[] };
        if (!cancelled) setAlerts(j.alerts.slice(0, 20));
      } catch {
        /* ignore */
      }
    }
    load();
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const count = alerts.length;
  const hasCrit = alerts.some((a) => a.severity === "crit");

  return (
    <div ref={ref} className="relative">
      <button
        className="relative chuck-btn"
        aria-label="Alerts"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="h-4 w-4 text-chuck-pink" />
        {count > 0 && (
          <span
            className={[
              "absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 font-mono text-[9px] font-bold text-white",
              hasCrit ? "bg-chuck-red shadow-glow animate-pulseGlow" : "bg-chuck-pink",
            ].join(" ")}
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-sm border border-chuck-line bg-chuck-panel/95 shadow-glow backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-chuck-line px-3 py-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-chuck-mute">
              Alerts ({count})
            </span>
            <Link
              href="/security"
              onClick={() => setOpen(false)}
              className="font-mono text-[10px] uppercase tracking-widest text-chuck-pink hover:text-chuck-ink"
            >
              View all
            </Link>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {count === 0 ? (
              <div className="p-4 font-mono text-xs text-chuck-mute">
                No alerts. POST to /api/alerts to ingest.
              </div>
            ) : (
              <ul className="divide-y divide-chuck-line/40">
                {alerts.map((a) => {
                  const Icon = a.severity === "crit" ? AlertTriangle : ShieldAlert;
                  const color =
                    a.severity === "crit"
                      ? "text-chuck-red"
                      : a.severity === "warn"
                      ? "text-amber-300"
                      : "text-chuck-mute";
                  return (
                    <li key={a.id} className="flex gap-2 px-3 py-2 hover:bg-black/40">
                      <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${color}`} />
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-[10px] uppercase tracking-widest text-chuck-mute">
                          {a.source} · {a.severity}
                        </div>
                        <div className="truncate font-mono text-xs text-chuck-ink">
                          {a.message}
                        </div>
                        <div className="font-mono text-[10px] text-chuck-mute">
                          {new Date(a.created_at).toLocaleString()}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
