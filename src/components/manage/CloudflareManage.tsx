"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Plus, RefreshCcw, Trash2, Zap } from "lucide-react";
import { ComingSoon } from "@/components/manage/ComingSoon";

type Zone = { id: string; name: string };
type Record_ = {
  id: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied: boolean;
};

const RECORD_TYPES = ["A", "AAAA", "CNAME", "TXT", "MX", "NS", "SRV"];

export function CloudflareManage({
  connected,
  zones,
}: {
  connected: boolean;
  zones: Zone[];
}) {
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [records, setRecords] = useState<Record_[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [type, setType] = useState("A");
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [ttl, setTtl] = useState(1);
  const [proxied, setProxied] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [purgeBusy, setPurgeBusy] = useState(false);

  useEffect(() => {
    if (zoneId) load();
  }, [zoneId]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/integrations/cloudflare/dns?zoneId=${zoneId}`
      );
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "failed");
      setRecords(j.records ?? []);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!zoneId || !type || !name || !content) return;
    setAddBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/integrations/cloudflare/dns`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ zoneId, type, name, content, ttl, proxied }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "failed");
      setName("");
      setContent("");
      setToast(`Added ${type} ${j.record?.name}.`);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setAddBusy(false);
    }
  }

  async function del(id: string, label: string) {
    if (!confirm(`Delete DNS record ${label}?`)) return;
    setErr(null);
    try {
      const res = await fetch(
        `/api/integrations/cloudflare/dns?zoneId=${zoneId}&recordId=${id}`,
        { method: "DELETE" }
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "failed");
      setRecords((rs) => rs.filter((r) => r.id !== id));
      setToast(`Deleted ${label}.`);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function purge() {
    if (!confirm("Purge ALL cached content for this zone?")) return;
    setPurgeBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/integrations/cloudflare/dns`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ zoneId, purgeAll: true }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "failed");
      setToast("Cache purged.");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setPurgeBusy(false);
    }
  }

  if (!connected) {
    return (
      <ComingSoon
        title="Cloudflare manage"
        preview={[
          "Add, edit, and delete DNS records on any zone",
          "Purge zone-wide cache in one click",
          "View and rotate tunnels (with CLOUDFLARE_ACCOUNT_ID set)",
        ]}
      />
    );
  }

  const zone = zones.find((z) => z.id === zoneId);

  return (
    <div className="space-y-4">
      <div className="chuck-panel-hot overflow-hidden">
        <header className="flex flex-wrap items-center gap-3 border-b border-chuck-line/70 bg-black/30 px-4 py-2.5">
          <div className="chuck-title text-xs">Zone</div>
          <select
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            className="rounded-sm border border-chuck-line bg-black/60 px-2 py-1 font-mono text-xs text-chuck-ink outline-none focus:border-chuck-red/60"
          >
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={purge} disabled={purgeBusy} className="chuck-btn">
              {purgeBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-chuck-pink" />
              ) : (
                <Zap className="h-3.5 w-3.5 text-chuck-pink" />
              )}
              Purge cache
            </button>
            <button onClick={load} className="chuck-btn">
              <RefreshCcw className="h-3.5 w-3.5 text-chuck-pink" />
              Refresh
            </button>
            {zone && (
              <a
                href={`https://dash.cloudflare.com/?to=/:account/${zone.name}`}
                target="_blank"
                rel="noreferrer"
                className="chuck-btn"
              >
                <ExternalLink className="h-3.5 w-3.5 text-chuck-pink" />
                Open
              </a>
            )}
          </div>
        </header>
      </div>

      {toast && (
        <div className="rounded-sm border border-emerald-400/30 bg-emerald-400/5 px-3 py-2 font-mono text-[11px] text-emerald-300">
          {toast}
        </div>
      )}
      {err && (
        <div className="rounded-sm border border-chuck-red/40 bg-chuck-red/10 px-3 py-2 font-mono text-[11px] text-chuck-pink">
          {err}
        </div>
      )}

      <div className="chuck-panel overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b border-chuck-line/70 bg-black/30 px-4 py-2.5">
          <div className="chuck-title text-xs">DNS records</div>
          <span className="font-mono text-[10px] text-chuck-mute">
            {records.length} total
          </span>
        </header>
        <div className="p-4">
          <form
            onSubmit={add}
            className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-[auto_1fr_2fr_auto_auto_auto] md:items-end"
          >
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-widest text-chuck-mute">
                Type
              </span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="mt-1 rounded-sm border border-chuck-line bg-black/60 px-2 py-1.5 font-mono text-xs text-chuck-ink outline-none focus:border-chuck-red/60"
              >
                {RECORD_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-widest text-chuck-mute">
                Name
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="sub or @"
                className="mt-1 w-full rounded-sm border border-chuck-line bg-black/60 px-2 py-1.5 font-mono text-xs text-chuck-ink outline-none focus:border-chuck-red/60"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-widest text-chuck-mute">
                Content
              </span>
              <input
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="192.0.2.1 / target.example.com / TXT value"
                className="mt-1 w-full rounded-sm border border-chuck-line bg-black/60 px-2 py-1.5 font-mono text-xs text-chuck-ink outline-none focus:border-chuck-red/60"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-widest text-chuck-mute">
                TTL
              </span>
              <input
                type="number"
                min={1}
                value={ttl}
                onChange={(e) => setTtl(Number(e.target.value))}
                className="mt-1 w-20 rounded-sm border border-chuck-line bg-black/60 px-2 py-1.5 font-mono text-xs text-chuck-ink outline-none focus:border-chuck-red/60"
              />
            </label>
            <label className="flex items-center gap-1 font-mono text-[11px] text-chuck-mute">
              <input
                type="checkbox"
                checked={proxied}
                onChange={(e) => setProxied(e.target.checked)}
                className="accent-chuck-pink"
              />
              proxied
            </label>
            <button
              type="submit"
              disabled={addBusy || !name || !content}
              className="chuck-btn justify-center disabled:opacity-50"
            >
              {addBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-chuck-pink" />
              ) : (
                <Plus className="h-3.5 w-3.5 text-chuck-pink" />
              )}
              Add
            </button>
          </form>

          {loading ? (
            <div className="flex items-center gap-2 font-mono text-xs text-chuck-mute">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
            </div>
          ) : records.length === 0 ? (
            <p className="font-mono text-xs text-chuck-mute">No records.</p>
          ) : (
            <ul className="space-y-1.5">
              {records.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-2 rounded-sm border border-chuck-line/60 bg-black/30 px-3 py-2 font-mono text-xs"
                >
                  <span className="rounded-sm border border-chuck-line bg-black/40 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-chuck-pink">
                    {r.type}
                  </span>
                  <span className="text-chuck-ink">{r.name}</span>
                  <span className="text-chuck-mute">→ {r.content}</span>
                  <span className="text-chuck-mute">
                    ttl {r.ttl === 1 ? "auto" : r.ttl}
                  </span>
                  {r.proxied && <span className="chuck-chip-live">proxied</span>}
                  <button
                    onClick={() => del(r.id, `${r.type} ${r.name}`)}
                    className="ml-auto chuck-btn px-2 py-1"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-chuck-pink" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
