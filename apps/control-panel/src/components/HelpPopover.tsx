"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, HelpCircle, X } from "lucide-react";
import { HELP } from "@/lib/integrations-help";

export function HelpPopover({ envKey }: { envKey: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const entry = HELP[envKey];

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onClick);
      document.addEventListener("keydown", onKey);
    }
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!entry) {
    return (
      <button
        type="button"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-chuck-line bg-black/40 text-chuck-mute opacity-40"
        title="No instructions for this key"
        aria-label="No instructions"
        disabled
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-chuck-line bg-black/40 text-chuck-mute transition hover:border-chuck-red/60 hover:text-chuck-pink"
        aria-label={`How to get the ${entry.title}`}
        aria-expanded={open}
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-sm border border-chuck-red/40 bg-chuck-panel/95 shadow-glow backdrop-blur-md">
          <div className="flex items-start justify-between gap-3 border-b border-chuck-line bg-black/40 px-4 py-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-chuck-pink">
                // {envKey}
              </div>
              <div className="font-display text-sm font-semibold text-chuck-ink">
                {entry.title}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-chuck-mute hover:text-chuck-pink"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3 px-4 py-3">
            <p className="font-mono text-xs text-chuck-mute">{entry.description}</p>

            <div>
              <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-chuck-mute">
                Steps
              </div>
              <ol className="space-y-1.5 font-mono text-xs text-chuck-ink">
                {entry.steps.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="chuck-glow-text shrink-0">{i + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>

            {entry.scopes && entry.scopes.length > 0 && (
              <div>
                <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-chuck-mute">
                  Required scopes
                </div>
                <div className="flex flex-wrap gap-1">
                  {entry.scopes.map((s) => (
                    <span key={s} className="chuck-chip">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {entry.envCompanions && entry.envCompanions.length > 0 && (
              <div>
                <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-chuck-mute">
                  Also set in env vars
                </div>
                <ul className="space-y-1.5 font-mono text-xs">
                  {entry.envCompanions.map((c) => (
                    <li
                      key={c.key}
                      className="rounded-sm border border-chuck-line/60 bg-black/30 px-2 py-1.5"
                    >
                      <div className="text-chuck-pink">{c.key}</div>
                      <div className="text-chuck-mute">{c.description}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {entry.notes && entry.notes.length > 0 && (
              <div className="rounded-sm border border-amber-400/30 bg-amber-400/5 px-3 py-2">
                <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-amber-300">
                  Heads up
                </div>
                <ul className="space-y-1 font-mono text-[11px] text-chuck-ink">
                  {entry.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </div>
            )}

            {entry.url && (
              <a
                href={entry.url}
                target="_blank"
                rel="noreferrer"
                className="chuck-btn w-full justify-center"
              >
                <ExternalLink className="h-3.5 w-3.5 text-chuck-pink" />
                Open token page
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
