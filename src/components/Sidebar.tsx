"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/nav";
import { Coffee } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="relative flex h-full w-60 shrink-0 flex-col border-r border-chuck-line bg-chuck-panel/60 backdrop-blur-sm">
      {/* Glowing right edge — the signature strip */}
      <span
        className="chuck-strip-vertical animate-flicker"
        style={{ top: 0, bottom: 0, right: 0 }}
      />

      {/* Logo */}
      <Link
        href="/"
        className="group flex items-center gap-3 border-b border-chuck-line px-5 py-4"
      >
        <div className="relative">
          <div className="flex h-9 w-9 items-center justify-center rounded-sm border border-chuck-red/60 bg-black shadow-glow">
            <Coffee className="h-5 w-5 text-chuck-red animate-pulseGlow" strokeWidth={2.5} />
          </div>
        </div>
        <div className="flex flex-col leading-none">
          <span className="font-display text-base font-bold tracking-tight">
            CHUCK<span className="chuck-glow-text">HUB</span>
          </span>
          <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.3em] text-chuck-mute">
            Personal Ops
          </span>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-2 px-2 font-mono text-[10px] uppercase tracking-[0.25em] text-chuck-mute">
          Modules
        </div>
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={[
                    "group relative flex items-center gap-3 rounded-sm border border-transparent px-3 py-2 text-sm transition",
                    active
                      ? "border-chuck-red/40 bg-black/50 text-white shadow-glowSoft"
                      : "text-chuck-ink/80 hover:border-chuck-line hover:bg-black/30 hover:text-white",
                  ].join(" ")}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 bg-chuck-red shadow-glow" />
                  )}
                  <Icon
                    className={[
                      "h-4 w-4 shrink-0",
                      active ? "text-chuck-red" : "text-chuck-mute group-hover:text-chuck-pink",
                    ].join(" ")}
                  />
                  <span className="flex-1 font-mono text-[12px] uppercase tracking-wider">
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="chuck-chip-live animate-pulseGlow">{item.badge}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer — coffee count :) */}
      <div className="border-t border-chuck-line p-4">
        <div className="chuck-panel-hot p-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-chuck-mute">
              Coffee
            </span>
            <span className="chuck-glow-text font-mono text-sm">∞</span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-black">
            <div className="chuck-strip h-full w-[88%]" />
          </div>
          <p className="mt-2 font-mono text-[10px] leading-tight text-chuck-mute">
            because coffee, and because hacker.
          </p>
        </div>
      </div>
    </aside>
  );
}
