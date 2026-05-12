import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Panel, Stat } from "@/components/Panel";
import { Logo } from "@/components/Logo";
import { requireAccount } from "@/lib/auth";
import { listActivity } from "@/lib/activity";
import { listAlerts } from "@/lib/alerts";
import { hasServiceToken } from "@/lib/tokens";
import { getGithubOverview } from "@/lib/integrations/github";
import { getVercelOverview } from "@/lib/integrations/vercel";
import { getYouTubeOverview } from "@/lib/integrations/youtube";
import {
  AlertTriangle,
  Github,
  KeyRound,
  Rocket,
  Settings as SettingsIcon,
} from "lucide-react";

export const dynamic = "force-dynamic";

const INTEGRATIONS: Array<{ label: string; envKey: string }> = [
  { label: "GitHub", envKey: "GITHUB_TOKEN" },
  { label: "Vercel", envKey: "VERCEL_TOKEN" },
  { label: "Supabase", envKey: "SUPABASE_ACCESS_TOKEN" },
  { label: "n8n", envKey: "N8N_API_KEY" },
  { label: "Cloudflare", envKey: "CLOUDFLARE_API_TOKEN" },
  { label: "Tailscale", envKey: "TAILSCALE_API_KEY" },
  { label: "YouTube", envKey: "YOUTUBE_API_KEY" },
  { label: "Pi-hole", envKey: "PIHOLE_PASSWORD" },
];

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function Overview() {
  const account = await requireAccount();
  const name = account.display_name || account.email.split("@")[0];

  const tokenChecks = await Promise.all(
    INTEGRATIONS.map(async (i) => ({
      ...i,
      connected: await hasServiceToken(account.id, i.envKey),
    }))
  );
  const connectedCount = tokenChecks.filter((t) => t.connected).length;

  const [activity, alerts, gh, vc, yt] = await Promise.all([
    listActivity(account.id, 8),
    listAlerts(5),
    getGithubOverview(account.id).catch(() => null),
    getVercelOverview(account.id).catch(() => null),
    getYouTubeOverview(account.id).catch(() => null),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`// ${account.email}`}
        title={`Welcome back, ${name}`}
        description="Real data only — every panel below is pulled from your connected services. Connect more in Settings."
        actions={
          <Link href="/settings" className="chuck-btn">
            <KeyRound className="h-4 w-4 text-chuck-pink" />
            Manage tokens
          </Link>
        }
      />

      <section className="chuck-panel-hot relative overflow-hidden">
        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-chuck-pink">
              // integrations
            </div>
            <h2 className="mt-1 font-display text-2xl font-bold leading-tight">
              <span className="chuck-glow-text">
                {connectedCount} of {INTEGRATIONS.length}
              </span>{" "}
              services connected
            </h2>
            <p className="mt-2 max-w-xl font-mono text-xs text-chuck-mute">
              ChuckHub only shows data for services you have tokens for. Paste a
              token in Settings and the matching panels light up — nothing here is
              simulated.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {tokenChecks.map((t) => (
                <span
                  key={t.envKey}
                  className={
                    t.connected
                      ? "chuck-chip text-emerald-300 border-emerald-400/40"
                      : "chuck-chip"
                  }
                  title={t.envKey}
                >
                  <span
                    className={[
                      "h-1.5 w-1.5 rounded-full",
                      t.connected ? "bg-emerald-400" : "bg-chuck-mute",
                    ].join(" ")}
                  />
                  {t.label}
                </span>
              ))}
            </div>
          </div>
          <div className="relative hidden h-32 w-32 shrink-0 md:flex md:items-center md:justify-center">
            <div className="absolute inset-0 animate-pulseGlow rounded-full bg-chuck-red/20 blur-2xl" />
            <Logo size={120} className="relative" />
          </div>
        </div>
        <span className="chuck-strip absolute inset-x-0 bottom-0" />
      </section>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
        <Stat
          label="GitHub repos"
          value={gh ? gh.user.public_repos : "—"}
          hint={gh ? `@${gh.user.login}` : "not connected"}
          glow={!!gh}
        />
        <Stat
          label="Open PRs"
          value={gh ? gh.openPrs.length : "—"}
          hint={gh ? "authored by you" : "not connected"}
        />
        <Stat
          label="Vercel deploys"
          value={vc ? vc.deployments.length : "—"}
          hint={vc ? `last ${vc.deployments.length}` : "not connected"}
          glow={!!vc}
        />
        <Stat
          label="Vercel projects"
          value={vc ? vc.projects.length : "—"}
          hint={vc?.username ? `@${vc.username}` : "not connected"}
        />
        <Stat
          label="YouTube subs"
          value={yt ? Number(yt.channel.subscriberCount).toLocaleString() : "—"}
          hint={yt ? yt.channel.title : "not connected"}
          glow={!!yt}
        />
        <Stat
          label="Alerts"
          value={alerts.length}
          hint={alerts.length === 0 ? "none yet" : "see below"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel
          title="GitHub"
          subtitle={gh ? `@${gh.user.login}` : "not connected"}
          status={gh ? "ok" : "idle"}
          href="/dev"
          cta="Open"
        >
          {!gh ? (
            <NotConnectedInline service="GitHub" envKey="GITHUB_TOKEN" />
          ) : (
            <ul className="space-y-1.5">
              {gh.repos.slice(0, 5).map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-sm border border-chuck-line/60 bg-black/30 px-3 py-1.5 font-mono text-xs"
                >
                  <a
                    href={r.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 items-center gap-2 hover:text-chuck-pink"
                  >
                    <Github className="h-3.5 w-3.5 text-chuck-pink" />
                    <span className="truncate">{r.name}</span>
                  </a>
                  <span className="font-mono text-[10px] text-chuck-mute">
                    {relTime(r.pushed_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Vercel"
          subtitle={vc?.username ? `@${vc.username}` : "not connected"}
          status={vc ? "ok" : "idle"}
          href="/dev"
          cta="Open"
        >
          {!vc ? (
            <NotConnectedInline service="Vercel" envKey="VERCEL_TOKEN" />
          ) : (
            <ul className="space-y-1.5">
              {vc.deployments.slice(0, 5).map((d) => (
                <li
                  key={d.uid}
                  className="flex items-center justify-between rounded-sm border border-chuck-line/60 bg-black/30 px-3 py-1.5 font-mono text-xs"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Rocket className="h-3.5 w-3.5 text-chuck-pink" />
                    <span className="truncate">{d.name}</span>
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
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="YouTube"
          subtitle={yt ? yt.channel.title : "not connected"}
          status={yt ? "ok" : "idle"}
          href="/content"
          cta="Open"
        >
          {!yt ? (
            <NotConnectedInline
              service="YouTube"
              envKey="YOUTUBE_API_KEY"
              extra="Also requires YOUTUBE_CHANNEL_ID env var."
            />
          ) : (
            <ul className="space-y-2 font-mono text-xs">
              <li className="flex justify-between">
                <span>Subscribers</span>
                <span className="chuck-glow-text">
                  {Number(yt.channel.subscriberCount).toLocaleString()}
                </span>
              </li>
              <li className="flex justify-between">
                <span>Total views</span>
                <span>{Number(yt.channel.viewCount).toLocaleString()}</span>
              </li>
              <li className="flex justify-between">
                <span>Videos</span>
                <span>{Number(yt.channel.videoCount).toLocaleString()}</span>
              </li>
              {yt.recent[0] && (
                <li className="mt-2 border-t border-chuck-line/40 pt-2 text-chuck-mute">
                  latest:{" "}
                  <a
                    href={yt.recent[0].url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-chuck-ink hover:text-chuck-pink"
                  >
                    {yt.recent[0].title}
                  </a>
                </li>
              )}
            </ul>
          )}
        </Panel>

        <Panel
          title="Recent Activity"
          subtitle={`signed in as ${account.email}`}
          status="ok"
          className="lg:col-span-2"
        >
          {activity.length === 0 ? (
            <p className="font-mono text-xs text-chuck-mute">
              No activity yet. Save a token in Settings or sign in again to
              populate this feed.
            </p>
          ) : (
            <ol className="space-y-2 font-mono text-[11px]">
              {activity.map((a) => (
                <li
                  key={a.id}
                  className="border-l-2 border-chuck-red/60 pl-3 text-chuck-ink/80"
                >
                  <span className="text-chuck-mute">
                    [{relTime(a.created_at)}]
                  </span>{" "}
                  <span className="text-chuck-pink">{a.kind}</span> · {a.message}
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel
          title="Alerts"
          subtitle="ingest at POST /api/alerts"
          status={alerts.length ? "warn" : "idle"}
          hot={alerts.some((a) => a.severity === "crit")}
        >
          {alerts.length === 0 ? (
            <p className="font-mono text-xs text-chuck-mute">
              No alerts. Anything posted to /api/alerts shows here.
            </p>
          ) : (
            <ul className="space-y-1.5 font-mono text-xs">
              {alerts.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-2 rounded-sm border border-chuck-line/60 bg-black/30 px-3 py-2"
                >
                  <AlertTriangle
                    className={
                      a.severity === "crit"
                        ? "h-3.5 w-3.5 text-chuck-red animate-pulseGlow"
                        : a.severity === "warn"
                        ? "h-3.5 w-3.5 text-amber-400"
                        : "h-3.5 w-3.5 text-chuck-mute"
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-chuck-mute">
                      {a.source} · {a.severity}
                    </div>
                    <div className="truncate">{a.message}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function NotConnectedInline({
  service,
  envKey,
  extra,
}: {
  service: string;
  envKey: string;
  extra?: string;
}) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-xs text-chuck-mute">
        Add your {service} token in Settings — env key{" "}
        <span className="text-chuck-ink">{envKey}</span>.
        {extra ? ` ${extra}` : ""}
      </p>
      <Link href="/settings" className="chuck-btn">
        <SettingsIcon className="h-3.5 w-3.5 text-chuck-pink" />
        Connect {service}
      </Link>
    </div>
  );
}
