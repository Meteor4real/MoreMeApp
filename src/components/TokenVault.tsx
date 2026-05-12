"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Save, Trash2, Check } from "lucide-react";

type Service = {
  key: string;
  label: string;
  service: string;
  required?: boolean;
};

type StoredToken = {
  service: string;
  key_name: string;
  masked: string;
  created_at: string;
};

export function TokenVault({
  services,
  initial,
}: {
  services: Service[];
  initial: StoredToken[];
}) {
  const router = useRouter();
  const [stored, setStored] = useState<Record<string, StoredToken>>(
    Object.fromEntries(initial.map((t) => [t.key_name, t]))
  );
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function save(svc: Service) {
    const val = drafts[svc.key];
    if (!val) return;
    setBusy(svc.key);
    setError(null);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ service: svc.service, keyName: svc.key, value: val }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `save failed (${res.status})`);
      }
      const j = (await res.json()) as { masked: string };
      setStored((s) => ({
        ...s,
        [svc.key]: {
          service: svc.service,
          key_name: svc.key,
          masked: j.masked,
          created_at: new Date().toISOString(),
        },
      }));
      setDrafts((d) => ({ ...d, [svc.key]: "" }));
      setSavedAt(Date.now());
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function remove(svc: Service) {
    setBusy(svc.key);
    setError(null);
    try {
      const res = await fetch(`/api/tokens?keyName=${encodeURIComponent(svc.key)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("delete failed");
      setStored((s) => {
        const next = { ...s };
        delete next[svc.key];
        return next;
      });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-3 rounded-sm border border-chuck-red/40 bg-chuck-red/10 px-3 py-2 font-mono text-[11px] text-chuck-pink">
          {error}
        </div>
      )}
      {savedAt && (
        <div className="mb-3 flex items-center gap-2 rounded-sm border border-emerald-400/30 bg-emerald-400/5 px-3 py-2 font-mono text-[11px] text-emerald-300">
          <Check className="h-3.5 w-3.5" /> Saved · encrypted at rest with AES-256-GCM.
        </div>
      )}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {services.map((s) => {
          const present = stored[s.key];
          return (
            <div
              key={s.key}
              className="flex items-center gap-2 rounded-sm border border-chuck-line/60 bg-black/30 px-3 py-2"
            >
              <KeyRound className="h-3.5 w-3.5 text-chuck-pink" />
              <div className="min-w-0 flex-1">
                <div className="font-mono text-xs">{s.label}</div>
                <div className="truncate font-mono text-[10px] text-chuck-mute">
                  {present ? present.masked : s.key}
                </div>
              </div>
              {s.required && !present && (
                <span className="chuck-chip-live">required</span>
              )}
              {present && (
                <span className="chuck-chip text-emerald-300 border-emerald-400/30">
                  saved
                </span>
              )}
              <input
                type="password"
                value={drafts[s.key] ?? ""}
                onChange={(e) =>
                  setDrafts((d) => ({ ...d, [s.key]: e.target.value }))
                }
                placeholder={present ? "•••• replace" : "•••• paste token"}
                className="w-32 rounded-sm border border-chuck-line bg-black/60 px-2 py-1 font-mono text-[11px] text-chuck-ink outline-none focus:border-chuck-red/60"
              />
              <button
                onClick={() => save(s)}
                disabled={!drafts[s.key] || busy === s.key}
                className="chuck-btn px-2 py-1 disabled:opacity-40"
                title="Save"
              >
                {busy === s.key ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-chuck-pink" />
                ) : (
                  <Save className="h-3.5 w-3.5 text-chuck-pink" />
                )}
              </button>
              {present && (
                <button
                  onClick={() => remove(s)}
                  disabled={busy === s.key}
                  className="chuck-btn px-2 py-1 disabled:opacity-40"
                  title="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5 text-chuck-pink" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
