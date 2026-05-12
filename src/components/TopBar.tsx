"use client";

import { useEffect, useState } from "react";
import { Bell, Search, Terminal, CircleDot } from "lucide-react";
import { UserMenu } from "@/components/UserMenu";

type Account = {
  id: string;
  email: string;
  display_name: string | null;
};

type Status = { label: string; ok: boolean; detail?: string };

const DEFAULT_STATUS: Status[] = [
  { label: "Postgres", ok: false },
  { label: "GitHub", ok: false },
  { label: "Vercel", ok: false },
  { label: "Cloudflare", ok: false },
  { label: "n8n", ok: false },
  { label: "Supabase", ok: false },
];

export function TopBar({ account }: { account: Account }) {
  const [time, setTime] = useState<string>("");
  const [status, setStatus] = useState<Status[]>(DEFAULT_STATUS);

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

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        if (!res.ok) return;
        const j = (await res.json()) as {
          checks?: { postgres?: { ok: boolean }; env?: { detail?: string } };
        };
        if (cancelled) return;
        const envDetail = j.checks?.env?.detail || "";
        const hasEnv = (k: string) => envDetail.includes(`${k}:set`);
        setStatus([
          { label: "Postgres", ok: !!j.checks?.postgres?.ok },
          { label: "GitHub", ok: hasEnv("GITHUB_TOKEN") },
          { label: "Vercel", ok: hasEnv("VERCEL_TOKEN") },
          { label: "Cloudflare", ok: hasEnv("CLOUDFLARE_API_TOKEN") },
          { label: "n8n", ok: hasEnv("N8N_API_KEY") },
          { label: "Supabase", ok: hasEnv("SUPABASE_ACCESS_TOKEN") },
        ]);
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

  return (
    <header className="relative flex h-16 shrink-0 items-center gap-4 border-b border-chuck-line bg-chuck-panel/60 px-6 backdrop-blur-sm">
      <span className="chuck-strip absolute inset-x-0 bottom-0" />

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

      <div className="hidden items-center gap-2 lg:flex">
        {status.map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-1.5 rounded-sm border border-chuck-line bg-black/40 px-2 py-1"
            title={`${s.label} — ${s.ok ? "OK" : "not configured"}`}
          >
            <CircleDot
              className={[
                "h-3 w-3",
                s.ok ? "text-emerald-400" : "text-chuck-mute",
              ].join(" ")}
            />
            <span className="font-mono text-[10px] uppercase tracking-widest text-chuck-mute">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <div className="hidden font-mono text-xs text-chuck-mute md:block">
        <span className="chuck-glow-text">{time}</span>
        <span className="ml-2 text-[10px] uppercase tracking-widest">LOCAL</span>
      </div>

      <button
        className="chuck-btn"
        title="Quick-launch terminal"
        aria-label="Quick terminal"
      >
        <Terminal className="h-4 w-4 text-chuck-pink" />
        <span className="hidden sm:inline">Term</span>
      </button>

      <button className="relative chuck-btn" aria-label="Alerts">
        <Bell className="h-4 w-4 text-chuck-pink" />
        <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-chuck-red px-1 font-mono text-[9px] font-bold text-white shadow-glow">
          3
        </span>
      </button>

      <UserMenu account={account} />
    </header>
  );
}
