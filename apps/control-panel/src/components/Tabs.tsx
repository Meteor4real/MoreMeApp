"use client";

import { useState } from "react";
import type { ReactNode } from "react";

export type Tab = {
  id: string;
  label: string;
  badge?: string;
  content: ReactNode;
};

export function Tabs({ tabs, initial }: { tabs: Tab[]; initial?: string }) {
  const [active, setActive] = useState<string>(initial ?? tabs[0]?.id ?? "");
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        className="flex items-center gap-1 border-b border-chuck-line"
      >
        {tabs.map((t) => {
          const isActive = t.id === current?.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(t.id)}
              className={[
                "relative px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] transition",
                isActive
                  ? "text-chuck-ink"
                  : "text-chuck-mute hover:text-chuck-ink",
              ].join(" ")}
            >
              <span className="flex items-center gap-2">
                {t.label}
                {t.badge && (
                  <span className="chuck-chip text-[9px]">{t.badge}</span>
                )}
              </span>
              {isActive && (
                <span className="chuck-strip absolute inset-x-0 -bottom-px h-[2px]" />
              )}
            </button>
          );
        })}
      </div>
      <div role="tabpanel">{current?.content}</div>
    </div>
  );
}
