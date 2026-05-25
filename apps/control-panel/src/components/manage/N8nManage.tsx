"use client";

import { useState } from "react";
import { Loader2, Pause, Play } from "lucide-react";
import { ComingSoon } from "@/components/manage/ComingSoon";

type Workflow = { id: string; name: string; active: boolean };

export function N8nManage({
  connected,
  workflows: initial,
  baseUrl,
}: {
  connected: boolean;
  workflows: Workflow[];
  baseUrl: string | null;
}) {
  const [workflows, setWorkflows] = useState<Workflow[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function toggle(w: Workflow) {
    setBusy(w.id);
    setErr(null);
    try {
      const res = await fetch(`/api/integrations/n8n/workflow`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workflowId: w.id, active: !w.active }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `failed (${res.status})`);
      }
      setWorkflows((ws) =>
        ws.map((x) => (x.id === w.id ? { ...x, active: !w.active } : x))
      );
      setToast(`${!w.active ? "Activated" : "Deactivated"} ${w.name}.`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (!connected) {
    return (
      <ComingSoon
        title="n8n manage"
        preview={[
          "Activate / deactivate any workflow without opening n8n",
          "Trigger a workflow via its webhook URL with custom payload",
          "Re-run a failed execution from the dashboard",
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
          <div className="chuck-title text-xs">Workflows</div>
          {baseUrl && (
            <span className="font-mono text-[10px] text-chuck-mute">
              {baseUrl}
            </span>
          )}
        </header>
        <ul className="divide-y divide-chuck-line/40">
          {workflows.length === 0 ? (
            <li className="p-4 font-mono text-xs text-chuck-mute">
              No workflows visible.
            </li>
          ) : (
            workflows.map((w) => (
              <li
                key={w.id}
                className="flex items-center gap-3 px-4 py-2 font-mono text-xs"
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    w.active ? "bg-emerald-400" : "bg-chuck-mute"
                  }`}
                />
                <span className="text-chuck-ink">{w.name}</span>
                <span className="text-chuck-mute">· {w.id}</span>
                <button
                  onClick={() => toggle(w)}
                  disabled={busy === w.id}
                  className="ml-auto chuck-btn px-2 py-1 disabled:opacity-50"
                  title={w.active ? "Deactivate" : "Activate"}
                >
                  {busy === w.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-chuck-pink" />
                  ) : w.active ? (
                    <Pause className="h-3.5 w-3.5 text-chuck-pink" />
                  ) : (
                    <Play className="h-3.5 w-3.5 text-chuck-pink" />
                  )}
                  {w.active ? "Deactivate" : "Activate"}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
