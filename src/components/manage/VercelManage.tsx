"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Rocket, Trash2, RefreshCcw, ExternalLink } from "lucide-react";
import { ComingSoon } from "@/components/manage/ComingSoon";

type Project = { id: string; name: string; framework: string | null };
type EnvVar = {
  id: string;
  key: string;
  type: string;
  target: string[];
};

export function VercelManage({ connected }: { connected: boolean }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [envs, setEnvs] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Add-env form state
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newTargets, setNewTargets] = useState({
    production: true,
    preview: true,
    development: true,
  });
  const [addBusy, setAddBusy] = useState(false);
  const [redeployBusy, setRedeployBusy] = useState(false);

  useEffect(() => {
    if (!connected) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/integrations/vercel/projects");
        if (!res.ok) throw new Error((await res.json()).error || "failed");
        const j = await res.json();
        setProjects(j.projects ?? []);
        if (j.projects?.[0]) setProjectId(j.projects[0].id);
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [connected]);

  useEffect(() => {
    if (!projectId) return;
    loadEnvs(projectId);
  }, [projectId]);

  async function loadEnvs(pid: string) {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/integrations/vercel/env?projectId=${encodeURIComponent(pid)}`
      );
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "failed");
      setEnvs(j.envs ?? []);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function addEnv(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !newKey || !newValue) return;
    const targets = Object.entries(newTargets)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (targets.length === 0) {
      setErr("pick at least one target");
      return;
    }
    setAddBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/integrations/vercel/env", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId,
          key: newKey,
          value: newValue,
          target: targets,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "failed");
      setNewKey("");
      setNewValue("");
      setToast(`Added ${j.env?.key ?? "env var"}.`);
      await loadEnvs(projectId);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setAddBusy(false);
    }
  }

  async function delEnv(envId: string, key: string) {
    if (!confirm(`Delete env var ${key}?`)) return;
    setErr(null);
    try {
      const res = await fetch(
        `/api/integrations/vercel/env?projectId=${encodeURIComponent(
          projectId
        )}&envId=${encodeURIComponent(envId)}`,
        { method: "DELETE" }
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "failed");
      setToast(`Deleted ${key}.`);
      setEnvs((es) => es.filter((e) => e.id !== envId));
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function redeploy(target: "production" | "preview") {
    const proj = projects.find((p) => p.id === projectId);
    if (!proj) return;
    if (!confirm(`Redeploy ${proj.name} to ${target}?`)) return;
    setRedeployBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/integrations/vercel/redeploy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId,
          projectName: proj.name,
          target,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "failed");
      setToast(`Triggered ${target} deploy for ${proj.name}.`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setRedeployBusy(false);
    }
  }

  if (!connected) {
    return (
      <ComingSoon
        title="Vercel manage"
        preview={[
          "Add, edit, and delete environment variables per project",
          "Trigger a redeploy to production or preview",
          "Promote a deployment to production",
        ]}
      />
    );
  }

  const proj = projects.find((p) => p.id === projectId);

  return (
    <div className="space-y-4">
      <div className="chuck-panel-hot overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b border-chuck-line/70 bg-black/30 px-4 py-2.5">
          <div className="chuck-title text-xs">Project</div>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="rounded-sm border border-chuck-line bg-black/60 px-2 py-1 font-mono text-xs text-chuck-ink outline-none focus:border-chuck-red/60"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </header>
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => redeploy("production")}
              disabled={!proj || redeployBusy}
              className="chuck-btn disabled:opacity-50"
            >
              {redeployBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-chuck-pink" />
              ) : (
                <Rocket className="h-3.5 w-3.5 text-chuck-pink" />
              )}
              Redeploy → production
            </button>
            <button
              onClick={() => redeploy("preview")}
              disabled={!proj || redeployBusy}
              className="chuck-btn disabled:opacity-50"
            >
              <Rocket className="h-3.5 w-3.5 text-chuck-pink" />
              Redeploy → preview
            </button>
            <button
              onClick={() => projectId && loadEnvs(projectId)}
              className="chuck-btn"
            >
              <RefreshCcw className="h-3.5 w-3.5 text-chuck-pink" />
              Refresh
            </button>
            {proj && (
              <a
                href={`https://vercel.com/dashboard/projects/${proj.name}`}
                target="_blank"
                rel="noreferrer"
                className="chuck-btn"
              >
                <ExternalLink className="h-3.5 w-3.5 text-chuck-pink" />
                Open in Vercel
              </a>
            )}
          </div>
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
          <div className="chuck-title text-xs">Environment variables</div>
          <span className="font-mono text-[10px] text-chuck-mute">
            {envs.length} total
          </span>
        </header>
        <div className="p-4">
          <form
            onSubmit={addEnv}
            className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-[1fr_2fr_auto] md:items-end"
          >
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-widest text-chuck-mute">
                Key
              </span>
              <input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="API_KEY"
                className="mt-1 w-full rounded-sm border border-chuck-line bg-black/60 px-2 py-1.5 font-mono text-xs text-chuck-ink outline-none focus:border-chuck-red/60"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-widest text-chuck-mute">
                Value
              </span>
              <input
                type="password"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="••••"
                className="mt-1 w-full rounded-sm border border-chuck-line bg-black/60 px-2 py-1.5 font-mono text-xs text-chuck-ink outline-none focus:border-chuck-red/60"
              />
            </label>
            <button
              type="submit"
              disabled={addBusy || !newKey || !newValue}
              className="chuck-btn justify-center disabled:opacity-50"
            >
              {addBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-chuck-pink" />
              ) : (
                <Plus className="h-3.5 w-3.5 text-chuck-pink" />
              )}
              Add
            </button>
            <div className="col-span-full flex items-center gap-3 font-mono text-[11px] text-chuck-mute">
              <span>Targets:</span>
              {(["production", "preview", "development"] as const).map((t) => (
                <label key={t} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={newTargets[t]}
                    onChange={(e) =>
                      setNewTargets((s) => ({ ...s, [t]: e.target.checked }))
                    }
                    className="accent-chuck-pink"
                  />
                  {t}
                </label>
              ))}
            </div>
          </form>

          {loading ? (
            <div className="flex items-center gap-2 font-mono text-xs text-chuck-mute">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
            </div>
          ) : envs.length === 0 ? (
            <p className="font-mono text-xs text-chuck-mute">No env vars set.</p>
          ) : (
            <ul className="space-y-1.5">
              {envs.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center gap-2 rounded-sm border border-chuck-line/60 bg-black/30 px-3 py-2 font-mono text-xs"
                >
                  <span className="text-chuck-pink">{e.key}</span>
                  <span className="text-chuck-mute">· {e.type}</span>
                  <span className="text-chuck-mute">
                    · {e.target.join(", ")}
                  </span>
                  <button
                    onClick={() => delEnv(e.id, e.key)}
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
