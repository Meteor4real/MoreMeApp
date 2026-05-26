"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Settings as SettingsIcon, ChevronDown } from "lucide-react";

type Account = {
  id: string;
  email: string;
  display_name: string | null;
};

export function UserMenu({ account }: { account: Account }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  const name = account.display_name || account.email.split("@")[0];
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-sm border border-chuck-line bg-black/40 px-2 py-1 transition hover:border-chuck-red/60"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-sm border border-chuck-red/60 bg-black font-mono text-[11px] font-bold text-chuck-pink shadow-glowSoft">
          {initials}
        </div>
        <div className="hidden flex-col leading-none md:flex">
          <span className="font-mono text-[11px] text-chuck-ink">{name}</span>
          <span className="truncate font-mono text-[9px] uppercase tracking-widest text-chuck-mute">
            {account.email}
          </span>
        </div>
        <ChevronDown className="hidden h-3.5 w-3.5 text-chuck-mute md:block" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-sm border border-chuck-line bg-chuck-panel/95 shadow-glow backdrop-blur-md"
        >
          <div className="border-b border-chuck-line px-3 py-2">
            <div className="font-mono text-xs text-chuck-ink">{name}</div>
            <div className="truncate font-mono text-[10px] text-chuck-mute">
              {account.email}
            </div>
          </div>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 font-mono text-xs text-chuck-ink hover:bg-black/40"
          >
            <SettingsIcon className="h-3.5 w-3.5 text-chuck-pink" />
            Settings
          </Link>
          <button
            onClick={signOut}
            disabled={signingOut}
            className="flex w-full items-center gap-2 px-3 py-2 font-mono text-xs text-chuck-ink hover:bg-black/40 disabled:opacity-60"
            role="menuitem"
          >
            <LogOut className="h-3.5 w-3.5 text-chuck-pink" />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
