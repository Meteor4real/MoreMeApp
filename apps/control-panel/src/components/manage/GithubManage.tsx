"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Play, RefreshCcw, Star } from "lucide-react";
import { ComingSoon } from "@/components/manage/ComingSoon";

type Repo = { full_name: string; name: string; owner: { login: string } };
type Workflow = { id: number; name: string; path: string; state: string };

export function GithubManage({
  connected,
  repos,
}: {
  connected: boolean;
  repos: Array<{ full_name: string; html_url: string; name: string }>;
}) {
  const [selected, setSelected] = useState<string>(repos[0]?.full_name ?? "");
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [starred, setStarred] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [ref, setRef] = useState("main");
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [owner, repo] = selected.split("/");

  useEffect(() => {
    if (!selected) return;
    loadAll();
  }, [selected]);

  async function loadAll() {
    if (!owner || !repo) return;
    setLoading(true);
    setErr(null);
    try {
      const [wRes, sRes] = await Promise.all([
        fetch(
          `/api/integrations/github/workflows?owner=${owner}&repo=${repo}`
        ),
        fetch(`/api/integrations/github/star?owner=${owner}&repo=${repo}`),
      ]);
      const wJson = await wRes.json();
      if (!wRes.ok) throw new Error(wJson.error || "workflows failed");
      setWorkflows(wJson.workflows ?? []);
      const sJson = await sRes.json();
      setStarred(!!sJson.starred);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function dispatch(workflowId: number, name: string) {
    if (!confirm(`Trigger '${name}' on ${selected}@${ref}?`)) return;
    setBusy(`dispatch-${workflowId}`);
    setErr(null);
    try {
      const res = await fetch(`/api/integrations/github/workflows`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ owner, repo, workflowId, ref }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `failed (${res.status})`);
      }
      setToast(`Dispatched ${name} on ${ref}.`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function toggleStar() {
    if (starred === null) return;
    setBusy("star");
    setErr(null);
    try {
      const res = await fetch(
        `/api/integrations/github/star?owner=${owner}&repo=${repo}`,
        { method: starred ? "DELETE" : "PUT" }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `failed (${res.status})`);
      }
      setStarred((s) => !s);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (!connected) {
    return (
      <ComingSoon
        title="GitHub manage"
        preview={[
          "Trigger any workflow_dispatch job from the dashboard",
          "Star or unstar your repos in one click",
          "Open issues and dispatch comments without leaving the hub",
        ]}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="chuck-panel-hot overflow-hidden">
        <header className="flex flex-wrap items-center gap-3 border-b border-chuck-line/70 bg-black/30 px-4 py-2.5">
          <div className="chuck-title text-xs">Repository</div>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-sm border border-chuck-line bg-black/60 px-2 py-1 font-mono text-xs text-chuck-ink outline-none focus:border-chuck-red/60"
          >
            {repos.map((r) => (
              <option key={r.full_name} value={r.full_name}>
                {r.full_name}
              </option>
            ))}
          </select>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={toggleStar}
              disabled={busy === "star" || starred === null}
              className="chuck-btn"
            >
              <Star
                className={`h-3.5 w-3.5 ${
                  starred ? "fill-chuck-pink text-chuck-pink" : "text-chuck-mute"
                }`}
              />
              {starred ? "Starred" : "Star"}
            </button>
            <button onClick={loadAll} className="chuck-btn">
              <RefreshCcw className="h-3.5 w-3.5 text-chuck-pink" />
              Refresh
            </button>
            <a
              href={`https://github.com/${selected}`}
              target="_blank"
              rel="noreferrer"
              className="chuck-btn"
            >
              <ExternalLink className="h-3.5 w-3.5 text-chuck-pink" />
              Open
            </a>
          </div>
        </header>
        <div className="space-y-3 p-4">
          <label className="block max-w-xs">
            <span className="font-mono text-[10px] uppercase tracking-widest text-chuck-mute">
              Ref (branch / tag / SHA)
            </span>
            <input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              className="mt-1 w-full rounded-sm border border-chuck-line bg-black/60 px-2 py-1.5 font-mono text-xs text-chuck-ink outline-none focus:border-chuck-red/60"
            />
          </label>
        </div>
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
          <div className="chuck-title text-xs">Workflows</div>
          <span className="font-mono text-[10px] text-chuck-mute">
            {workflows.length} found
          </span>
        </header>
        <div className="p-4">
          {loading ? (
            <div className="flex items-center gap-2 font-mono text-xs text-chuck-mute">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
            </div>
          ) : workflows.length === 0 ? (
            <p className="font-mono text-xs text-chuck-mute">
              No workflows in this repo, or this token can&apos;t see Actions.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {workflows.map((w) => (
                <li
                  key={w.id}
                  className="flex items-center gap-2 rounded-sm border border-chuck-line/60 bg-black/30 px-3 py-2 font-mono text-xs"
                >
                  <span className="text-chuck-ink">{w.name}</span>
                  <span className="text-chuck-mute">· {w.path}</span>
                  <span className="ml-auto">
                    <button
                      onClick={() => dispatch(w.id, w.name)}
                      disabled={busy === `dispatch-${w.id}` || w.state !== "active"}
                      className="chuck-btn disabled:opacity-40"
                      title={
                        w.state !== "active"
                          ? "Workflow is disabled or doesn't accept workflow_dispatch"
                          : "Trigger workflow_dispatch"
                      }
                    >
                      {busy === `dispatch-${w.id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-chuck-pink" />
                      ) : (
                        <Play className="h-3.5 w-3.5 text-chuck-pink" />
                      )}
                      Run
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
