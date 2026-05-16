"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { ComingSoon } from "@/components/manage/ComingSoon";

type Device = {
  id: string;
  hostname: string;
  os: string;
  addresses: string[];
  online: boolean;
  lastSeen: string;
};

export function TailscaleManage({
  connected,
  devices: initial,
  tailnet,
}: {
  connected: boolean;
  devices: Device[];
  tailnet: string;
}) {
  const [devices, setDevices] = useState<Device[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function remove(d: Device) {
    if (!confirm(`Remove ${d.hostname} from tailnet ${tailnet}?`)) return;
    setBusy(d.id);
    setErr(null);
    try {
      const res = await fetch(
        `/api/integrations/tailscale/device?deviceId=${encodeURIComponent(d.id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `failed (${res.status})`);
      }
      setDevices((ds) => ds.filter((x) => x.id !== d.id));
      setToast(`Removed ${d.hostname}.`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (!connected) {
    return (
      <ComingSoon
        title="Tailscale manage"
        preview={[
          "Revoke / remove a device from your tailnet",
          "Rotate auth keys, list and expire pre-auth keys",
          "Toggle subnet route advertising on a node",
        ]}
      />
    );
  }

  return (
    <div className="space-y-4">
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
          <div className="chuck-title text-xs">Devices</div>
          <span className="font-mono text-[10px] text-chuck-mute">
            tailnet: {tailnet}
          </span>
        </header>
        {devices.length === 0 ? (
          <p className="p-4 font-mono text-xs text-chuck-mute">No devices.</p>
        ) : (
          <ul className="divide-y divide-chuck-line/40">
            {devices.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center gap-2 px-4 py-2 font-mono text-xs"
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    d.online ? "bg-emerald-400" : "bg-chuck-mute"
                  }`}
                />
                <span className="text-chuck-ink">{d.hostname}</span>
                <span className="text-chuck-mute">· {d.os}</span>
                <span className="text-chuck-mute">· {d.addresses[0] ?? "—"}</span>
                <button
                  onClick={() => remove(d)}
                  disabled={busy === d.id}
                  className="ml-auto chuck-btn px-2 py-1 disabled:opacity-50"
                >
                  {busy === d.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-chuck-pink" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 text-chuck-pink" />
                  )}
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
