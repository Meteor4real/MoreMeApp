import { PageHeader } from "@/components/PageHeader";
import { Panel, Stat } from "@/components/Panel";
import { Github, Rocket, Database, GitPullRequest, CheckCircle2, XCircle, Clock } from "lucide-react";

export default function Dev() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="// ship it"
        title="Dev & Deploy"
        description="GitHub, Vercel, Supabase. From commit to production in one glance."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Repos" value="18" glow />
        <Stat label="Open PRs" value="6" hint="3 awaiting review" />
        <Stat label="Builds today" value="14" hint="13 ✓ · 1 ✗" glow />
        <Stat label="DB rows" value="412k" hint="Supabase" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="GitHub" subtitle="pinned repos" status="ok" className="lg:col-span-2">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-chuck-line/60 text-[10px] uppercase tracking-widest text-chuck-mute">
                <th className="py-2 font-mono font-normal">Repo</th>
                <th className="py-2 font-mono font-normal">Branch</th>
                <th className="py-2 font-mono font-normal">Last commit</th>
                <th className="py-2 font-mono font-normal">CI</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["chuckhub", "claude/personal-ops-dashboard-5iNr1", "just now", "ok"],
                ["homelab-iac", "main", "2h ago", "ok"],
                ["robin-darkweb-scraper", "main", "1d ago", "ok"],
                ["terry-inbox-agent", "feat/llm-router", "3h ago", "pending"],
                ["academy-platform", "main", "6h ago", "ok"],
                ["frigate-configs", "main", "2d ago", "fail"],
              ].map(([repo, br, when, ci]) => (
                <tr key={repo as string} className="border-b border-chuck-line/30 font-mono text-xs">
                  <td className="py-2.5">
                    <span className="flex items-center gap-2">
                      <Github className="h-3.5 w-3.5 text-chuck-pink" />
                      {repo}
                    </span>
                  </td>
                  <td className="py-2.5 text-chuck-mute">{br}</td>
                  <td className="py-2.5 text-chuck-mute">{when}</td>
                  <td className="py-2.5">
                    {ci === "ok" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : ci === "fail" ? (
                      <XCircle className="h-4 w-4 text-chuck-red animate-pulseGlow" />
                    ) : (
                      <Clock className="h-4 w-4 text-amber-400" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Open PRs" subtitle="awaiting review" status="warn" hot>
          <ul className="space-y-2 font-mono text-xs">
            {[
              ["chuckhub", "#1 Personal ops dashboard"],
              ["terry-inbox-agent", "#42 LLM router refactor"],
              ["homelab-iac", "#18 Migrate to opentofu"],
              ["academy-platform", "#103 Video chapter markers"],
            ].map(([repo, title]) => (
              <li key={title as string} className="rounded-sm border border-chuck-line/60 bg-black/30 p-2">
                <div className="flex items-center gap-2 text-chuck-pink">
                  <GitPullRequest className="h-3.5 w-3.5" />
                  <span className="text-chuck-ink">{title}</span>
                </div>
                <div className="ml-5 mt-1 text-[10px] text-chuck-mute">{repo}</div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Vercel" subtitle="deployments" status="live" hot>
          <ul className="space-y-2 font-mono text-xs">
            {[
              ["chuckhub", "Ready", "prod · 2m ago"],
              ["academy", "Ready", "prod · 6h ago"],
              ["chuck.coffee", "Building", "preview · now"],
              ["api-gateway", "Ready", "prod · 1d ago"],
            ].map(([proj, status, when]) => (
              <li
                key={proj as string}
                className="flex items-center justify-between rounded-sm border border-chuck-line/60 bg-black/30 px-3 py-2"
              >
                <span className="flex items-center gap-2">
                  <Rocket className="h-3.5 w-3.5 text-chuck-pink" />
                  {proj}
                </span>
                <span className="text-chuck-mute text-[10px]">{when}</span>
                <span
                  className={
                    status === "Ready" ? "chuck-chip-live" : "chuck-chip text-amber-300"
                  }
                >
                  {status}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Supabase" subtitle="postgres · auth · storage" status="ok" className="lg:col-span-2">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Tables" value="12" />
            <Stat label="Rows" value="412k" glow />
            <Stat label="Storage" value="3.8 GB" />
            <Stat label="Auth users" value="1,204" glow />
            <Stat label="Connections" value="34 / 60" />
            <Stat label="Edge fns" value="6" />
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-sm border border-chuck-line bg-black/40 px-3 py-2 font-mono text-[11px]">
            <Database className="h-3.5 w-3.5 text-chuck-pink" />
            <span className="text-chuck-mute">POSTGRES_URL configured via Vercel env</span>
            <span className="ml-auto chuck-chip-live">Connected</span>
          </div>
        </Panel>
      </div>
    </div>
  );
}
