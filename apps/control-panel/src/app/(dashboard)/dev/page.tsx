import { PageHeader } from "@/components/PageHeader";
import { Panel, Stat } from "@/components/Panel";
import { NotConfigured, IntegrationError } from "@/components/EmptyState";
import { Tabs } from "@/components/Tabs";
import { VercelManage } from "@/components/manage/VercelManage";
import { GithubManage } from "@/components/manage/GithubManage";
import { ComingSoon } from "@/components/manage/ComingSoon";
import { requireAccount } from "@/lib/auth";
import { getGithubOverview } from "@/lib/integrations/github";
import { getVercelOverview } from "@/lib/integrations/vercel";
import { hasServiceToken } from "@/lib/tokens";
import {
  Github,
  Rocket,
  GitPullRequest,
  Star,
  ExternalLink,
} from "lucide-react";

export const dynamic = "force-dynamic";

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function Dev() {
  const account = await requireAccount();

  const hasGh = await hasServiceToken(account.id, "GITHUB_TOKEN");
  const hasVc = await hasServiceToken(account.id, "VERCEL_TOKEN");
  const hasSb = await hasServiceToken(account.id, "SUPABASE_ACCESS_TOKEN");

  let gh = null,
    ghError: string | null = null;
  if (hasGh) {
    try {
      gh = await getGithubOverview(account.id);
    } catch (e) {
      ghError = (e as Error).message;
    }
  }

  let vc = null,
    vcError: string | null = null;
  if (hasVc) {
    try {
      vc = await getVercelOverview(account.id);
    } catch (e) {
      vcError = (e as Error).message;
    }
  }

  const overview = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat
          label="Repos"
          value={gh ? gh.user.public_repos : "—"}
          hint={gh ? `@${gh.user.login}` : "GitHub not connected"}
          glow={!!gh}
        />
        <Stat
          label="Open PRs"
          value={gh ? gh.openPrs.length : "—"}
          hint={gh ? "by you" : "GitHub not connected"}
        />
        <Stat
          label="Vercel deploys"
          value={vc ? vc.deployments.length : "—"}
          hint={vc ? "fetched" : "Vercel not connected"}
          glow={!!vc}
        />
        <Stat
          label="Vercel projects"
          value={vc ? vc.projects.length : "—"}
          hint={vc?.username ? `@${vc.username}` : "Vercel not connected"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel
          title="GitHub — recent repos"
          subtitle={gh ? `@${gh.user.login}` : "not connected"}
          status={gh ? "ok" : "idle"}
          className="lg:col-span-2"
        >
          {!hasGh ? (
            <NotConfigured service="GitHub" envKey="GITHUB_TOKEN" />
          ) : ghError ? (
            <IntegrationError service="GitHub" error={ghError} />
          ) : !gh || gh.repos.length === 0 ? (
            <p className="font-mono text-xs text-chuck-mute">
              No repositories visible to this token.
            </p>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-chuck-line/60 text-[10px] uppercase tracking-widest text-chuck-mute">
                  <th className="py-2 font-mono font-normal">Repo</th>
                  <th className="py-2 font-mono font-normal">Language</th>
                  <th className="py-2 font-mono font-normal text-right">★</th>
                  <th className="py-2 font-mono font-normal">Pushed</th>
                </tr>
              </thead>
              <tbody>
                {gh.repos.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-chuck-line/30 font-mono text-xs hover:bg-black/30"
                  >
                    <td className="py-2.5">
                      <a
                        href={r.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 hover:text-chuck-pink"
                      >
                        <Github className="h-3.5 w-3.5 text-chuck-pink" />
                        {r.name}
                        {r.private && (
                          <span className="chuck-chip">private</span>
                        )}
                      </a>
                    </td>
                    <td className="py-2.5 text-chuck-mute">
                      {r.language ?? "—"}
                    </td>
                    <td className="py-2.5 text-right text-chuck-mute">
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        {r.stargazers_count}
                      </span>
                    </td>
                    <td className="py-2.5 text-chuck-mute">
                      {relTime(r.pushed_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel
          title="Your open PRs"
          subtitle={gh ? `${gh.openPrs.length} open` : "not connected"}
          status={gh && gh.openPrs.length > 0 ? "warn" : "ok"}
          hot={!!gh && gh.openPrs.length > 0}
        >
          {!hasGh ? (
            <NotConfigured service="GitHub" envKey="GITHUB_TOKEN" />
          ) : !gh || gh.openPrs.length === 0 ? (
            <p className="font-mono text-xs text-chuck-mute">
              No open PRs authored by you. Clean inbox.
            </p>
          ) : (
            <ul className="space-y-2 font-mono text-xs">
              {gh.openPrs.map((p) => (
                <li
                  key={p.html_url}
                  className="rounded-sm border border-chuck-line/60 bg-black/30 p-2"
                >
                  <a
                    href={p.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-chuck-pink hover:underline"
                  >
                    <GitPullRequest className="h-3.5 w-3.5" />
                    <span className="text-chuck-ink">
                      #{p.number} {p.title}
                    </span>
                  </a>
                  <div className="ml-5 mt-1 text-[10px] text-chuck-mute">
                    {p.repository_url.replace("https://api.github.com/repos/", "")}{" "}
                    · {relTime(p.updated_at)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Vercel — deployments"
          subtitle={vc?.username ? `@${vc.username}` : "not connected"}
          status={vc ? "ok" : "idle"}
          hot={!!vc?.deployments.some((d) => d.state === "BUILDING")}
          className="lg:col-span-2"
        >
          {!hasVc ? (
            <NotConfigured service="Vercel" envKey="VERCEL_TOKEN" />
          ) : vcError ? (
            <IntegrationError service="Vercel" error={vcError} />
          ) : !vc || vc.deployments.length === 0 ? (
            <p className="font-mono text-xs text-chuck-mute">No deployments yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {vc.deployments.map((d) => (
                <li
                  key={d.uid}
                  className="flex items-center justify-between rounded-sm border border-chuck-line/60 bg-black/30 px-3 py-2 font-mono text-xs"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Rocket className="h-3.5 w-3.5 text-chuck-pink" />
                    <span className="truncate">{d.name}</span>
                    {d.target && (
                      <span className="font-mono text-[10px] uppercase tracking-widest text-chuck-mute">
                        · {d.target}
                      </span>
                    )}
                  </span>
                  <span
                    className={
                      d.state === "READY"
                        ? "chuck-chip text-emerald-300 border-emerald-400/40"
                        : d.state === "ERROR"
                        ? "chuck-chip-live"
                        : "chuck-chip"
                    }
                  >
                    {d.state.toLowerCase()}
                  </span>
                  <a
                    href={`https://${d.url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 text-chuck-mute hover:text-chuck-pink"
                    aria-label="Open deployment"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Supabase"
          subtitle={hasSb ? "management token saved" : "not connected"}
          status={hasSb ? "ok" : "idle"}
        >
          {!hasSb ? (
            <NotConfigured
              service="Supabase"
              envKey="SUPABASE_ACCESS_TOKEN"
              description="Add a Supabase management API token to surface project & DB info."
            />
          ) : (
            <p className="font-mono text-xs text-chuck-mute">
              Set SUPABASE_PROJECT_REF env var to fetch project details. Use Manage
              tab for project-level actions when wired.
            </p>
          )}
        </Panel>
      </div>
    </div>
  );

  const manage = (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 chuck-title text-xs">Vercel</h3>
        <VercelManage connected={!!vc} />
      </section>
      <section>
        <h3 className="mb-3 chuck-title text-xs">GitHub</h3>
        <GithubManage
          connected={!!gh}
          repos={
            gh?.repos.map((r) => ({
              full_name: r.full_name,
              html_url: r.html_url,
              name: r.name,
            })) ?? []
          }
        />
      </section>
      <section>
        <h3 className="mb-3 chuck-title text-xs">Supabase</h3>
        <ComingSoon
          title="Supabase manage"
          preview={[
            "Browse tables and inline-edit rows",
            "View and rotate project API keys",
            "Toggle row-level-security policies per table",
          ]}
        />
      </section>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="// ship it"
        title="Dev & Deploy"
        description="Overview shows live data; Manage lets you take action — redeploy, dispatch workflows, edit env vars."
      />

      <Tabs
        tabs={[
          { id: "overview", label: "Overview", content: overview },
          { id: "manage", label: "Manage", content: manage, badge: "live" },
        ]}
      />
    </div>
  );
}
