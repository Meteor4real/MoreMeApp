"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

export function AccountRecovery() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<
    | { ok: true; deleted: boolean }
    | { ok: false; error: string }
    | null
  >(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, masterCode: code }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({ ok: false, error: j.error || `request failed (${res.status})` });
      } else {
        setResult({ ok: true, deleted: !!j.deleted });
        setEmail("");
        setCode("");
      }
    } catch (err) {
      setResult({ ok: false, error: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full text-center font-mono text-[11px] uppercase tracking-widest text-chuck-mute hover:text-chuck-pink"
      >
        Locked out? Reset an account →
      </button>
    );
  }

  return (
    <div className="rounded-sm border border-chuck-red/40 bg-chuck-red/5 p-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-chuck-pink" />
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-chuck-pink">
          Account recovery
        </span>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setResult(null);
          }}
          className="ml-auto font-mono text-[10px] uppercase tracking-widest text-chuck-mute hover:text-chuck-pink"
        >
          Close
        </button>
      </div>
      <p className="mt-2 font-mono text-[11px] leading-relaxed text-chuck-mute">
        Permanently delete the account tied to an email, along with every
        encrypted token, session, and activity row. Requires the master code.
        Use only if you&apos;ve locked yourself out.
      </p>

      <form onSubmit={submit} className="mt-3 space-y-2">
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-widest text-chuck-mute">
            Email
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-sm border border-chuck-line bg-black/60 px-3 py-2 font-mono text-sm text-chuck-ink outline-none focus:border-chuck-red/60"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-widest text-chuck-mute">
            Master code
          </span>
          <input
            type="password"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            className="mt-1 w-full rounded-sm border border-chuck-line bg-black/60 px-3 py-2 font-mono text-sm text-chuck-ink outline-none focus:border-chuck-red/60"
          />
        </label>

        {result && !result.ok && (
          <div className="rounded-sm border border-chuck-red/40 bg-chuck-red/10 px-3 py-2 font-mono text-[11px] text-chuck-pink">
            {result.error}
          </div>
        )}
        {result && result.ok && (
          <div className="rounded-sm border border-emerald-400/30 bg-emerald-400/5 px-3 py-2 font-mono text-[11px] text-emerald-300">
            {result.deleted
              ? "Account deleted. You can sign up again with this email."
              : "If an account existed with that email, it has been removed."}
          </div>
        )}

        <button
          type="submit"
          disabled={busy || !email || !code}
          className="chuck-btn w-full justify-center disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin text-chuck-pink" />
          ) : (
            <Trash2 className="h-4 w-4 text-chuck-pink" />
          )}
          Delete account
        </button>
      </form>
    </div>
  );
}
