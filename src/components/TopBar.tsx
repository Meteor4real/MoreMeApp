"use client";

import { useEffect, useState } from "react";
import { Bell, Search, Terminal, CircleDot } from "lucide-react";
import Image from "next/image";

const STATUS = [
  { label: "Proxmox", ok: true },
  { label: "n8n", ok: true },
  { label: "Cloudflare", ok: true },
  { label: "Supabase", ok: true },
  { label: "Vercel", ok: true },
  { label: "Pi-hole", ok: true },
];

export function TopBar() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const fmt = () => {
      const d = new Date();
      const hh = d.getHours().toString().padStart(2, "0");
      const mm = d.getMinutes().toString().padStart(2, "0");
      const ss = d.getSeconds().toString().padStart(2, "0");
      setTime(`${hh}:${mm}:${ss}`);
    };
    fmt();
    const id = setInterval(fmt, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="relative flex h-16 shrink-0 items-center gap-4 border-b border-chuck-line bg-chuck-panel/60 px-6 backdrop-blur-sm">
      {/* Bottom glow strip */}
      <span className="chuck-strip absolute inset-x-0 bottom-0" />

      {/* Search */}
      <div className="relative flex-1 max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-chuck-mute" />
        <input
          type="text"
          placeholder="Search repos, workflows, containers, DNS records…"
          className="w-full rounded-sm border border-chuck-line bg-black/50 px-9 py-2 font-mono text-xs text-chuck-ink outline-none transition placeholder:text-chuck-mute focus:border-chuck-red/60 focus:shadow-glowSoft"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm border border-chuck-line bg-black px-1.5 py-0.5 font-mono text-[10px] text-chuck-mute">
          ⌘K
        </kbd>
      </div>

      {/* Status pills */}
      <div className="hidden items-center gap-2 lg:flex">
        {STATUS.map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-1.5 rounded-sm border border-chuck-line bg-black/40 px-2 py-1"
            title={`${s.label} — ${s.ok ? "OK" : "DOWN"}`}
          >
            <CircleDot
              className={[
                "h-3 w-3",
                s.ok ? "text-emerald-400" : "text-chuck-red animate-pulseGlow",
              ].join(" ")}
            />
            <span className="font-mono text-[10px] uppercase tracking-widest text-chuck-mute">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Clock */}
      <div className="hidden font-mono text-xs text-chuck-mute md:block">
        <span className="chuck-glow-text">{time}</span>
        <span className="ml-2 text-[10px] uppercase tracking-widest">LOCAL</span>
      </div>

      {/* Quick terminal */}
      <button
        className="chuck-btn"
        title="Quick-launch terminal"
        aria-label="Quick terminal"
      >
        <Terminal className="h-4 w-4 text-chuck-pink" />
        <span className="hidden sm:inline">Term</span>
      </button>

      {/* Alerts */}
      <button className="relative chuck-btn" aria-label="Alerts">
        <Bell className="h-4 w-4 text-chuck-pink" />
        <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-chuck-red px-1 font-mono text-[9px] font-bold text-white shadow-glow">
          3
        </span>
      </button>

      {/* User */}
      <div className="flex items-center gap-2 rounded-sm border border-chuck-line bg-black/40 px-2 py-1">
        <div className="relative h-7 w-7 overflow-hidden rounded-sm border border-chuck-red/60 shadow-glowSoft">
          {/* NetworkChuck avatar — public GitHub avatar */}
          <Image
            src="https://avatars.githubusercontent.com/u/14959748?v=4"
            alt="NetworkChuck"
            fill
            sizes="28px"
            className="object-cover"
            unoptimized
          />
        </div>
        <div className="hidden flex-col leading-none md:flex">
          <span className="font-mono text-[11px] text-chuck-ink">chuck</span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-chuck-mute">
            root@hub
          </span>
        </div>
      </div>
    </header>
  );
}
