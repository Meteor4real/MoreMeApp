"use client";

import { useEffect, useState } from "react";
import { CircleDot } from "lucide-react";
import { UserMenu } from "@/components/UserMenu";
import { AlertBell } from "@/components/AlertBell";
import { CommandPalette } from "@/components/CommandPalette";

type Account = {
  id: string;
  email: string;
  display_name: string | null;
};

type Status = { label: string; ok: boolean };

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
          checks?: Record<string, { ok?: boolean }>;
        };
        if (cancelled) return;
        const ok = (k: string) => !!j.checks?.[k]?.ok;
        setStatus([
          { label: "Postgres", ok: ok("postgres") },
          { label: "GitHub", ok: ok("GITHUB_TOKEN") },
          { label: "Vercel", ok: ok("VERCEL_TOKEN") },
          { label: "Cloudflare", ok: ok("CLOUDFLARE_API_TOKEN") },
          { label: "n8n", ok: ok("N8N_API_KEY") },
          { label: "Supabase", ok: ok("SUPABASE_ACCESS_TOKEN") },
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

      <CommandPalette />

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

      <AlertBell />

      <UserMenu account={account} />
    </header>
  );
}
