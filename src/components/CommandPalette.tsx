"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Terminal, ArrowRight } from "lucide-react";
import { NAV } from "@/lib/nav";

type Cmd = {
  label: string;
  hint: string;
  action: () => void;
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const commands = useMemo<Cmd[]>(() => {
    const nav: Cmd[] = NAV.map((n) => ({
      label: n.label,
      hint: `Go to ${n.href}`,
      action: () => {
        router.push(n.href);
        setOpen(false);
      },
    }));
    const extras: Cmd[] = [
      {
        label: "Sign out",
        hint: "End your session",
        action: async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          router.push("/login");
          router.refresh();
          setOpen(false);
        },
      },
      {
        label: "Health check",
        hint: "Open /api/health JSON",
        action: () => {
          window.open("/api/health", "_blank");
          setOpen(false);
        },
      },
    ];
    return [...nav, ...extras];
  }, [router]);

  const filtered = commands.filter((c) =>
    (c.label + " " + c.hint).toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group relative flex flex-1 max-w-xl items-center rounded-sm border border-chuck-line bg-black/50 px-9 py-2 text-left font-mono text-xs text-chuck-mute transition hover:border-chuck-red/60"
        aria-label="Open command palette"
      >
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-chuck-mute" />
        <span className="truncate">Search ChuckHub…</span>
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm border border-chuck-line bg-black px-1.5 py-0.5 font-mono text-[10px] text-chuck-mute">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 px-4 pt-24 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-sm border border-chuck-line bg-chuck-panel shadow-glow"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-chuck-line px-3 py-2">
              <Terminal className="h-4 w-4 text-chuck-pink" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Jump to a page or run a command…"
                className="flex-1 bg-transparent font-mono text-sm text-chuck-ink outline-none placeholder:text-chuck-mute"
              />
              <kbd className="rounded-sm border border-chuck-line bg-black px-1.5 py-0.5 font-mono text-[10px] text-chuck-mute">
                Esc
              </kbd>
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {filtered.length === 0 && (
                <li className="p-4 font-mono text-xs text-chuck-mute">
                  No matches.
                </li>
              )}
              {filtered.map((c) => (
                <li key={c.label}>
                  <button
                    onClick={c.action}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-black/40"
                  >
                    <ArrowRight className="h-3.5 w-3.5 text-chuck-pink" />
                    <span className="font-mono text-sm text-chuck-ink">
                      {c.label}
                    </span>
                    <span className="ml-auto font-mono text-[10px] text-chuck-mute">
                      {c.hint}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
