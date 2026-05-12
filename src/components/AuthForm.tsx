"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LogIn, UserPlus } from "lucide-react";

type Mode = "login" | "signup";

function safeNext(next: string | null | undefined): string {
  if (!next || typeof next !== "string") return "/";
  // Only allow same-origin absolute paths to avoid open-redirect.
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, displayName }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `request failed (${res.status})`);
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {mode === "signup" && (
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-widest text-chuck-mute">
            Display name
          </span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="your display name"
            autoComplete="nickname"
            className="mt-1 w-full rounded-sm border border-chuck-line bg-black/60 px-3 py-2 font-mono text-sm text-chuck-ink outline-none focus:border-chuck-red/60 focus:shadow-glowSoft"
          />
        </label>
      )}
      <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-widest text-chuck-mute">
          Email
        </span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@example.com"
          className="mt-1 w-full rounded-sm border border-chuck-line bg-black/60 px-3 py-2 font-mono text-sm text-chuck-ink outline-none focus:border-chuck-red/60 focus:shadow-glowSoft"
        />
      </label>
      <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-widest text-chuck-mute">
          Password
        </span>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          className="mt-1 w-full rounded-sm border border-chuck-line bg-black/60 px-3 py-2 font-mono text-sm text-chuck-ink outline-none focus:border-chuck-red/60 focus:shadow-glowSoft"
        />
      </label>

      {error && (
        <div className="rounded-sm border border-chuck-red/40 bg-chuck-red/10 px-3 py-2 font-mono text-[11px] text-chuck-pink">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="chuck-btn w-full justify-center disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-chuck-pink" />
        ) : mode === "login" ? (
          <LogIn className="h-4 w-4 text-chuck-pink" />
        ) : (
          <UserPlus className="h-4 w-4 text-chuck-pink" />
        )}
        {mode === "login" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}
