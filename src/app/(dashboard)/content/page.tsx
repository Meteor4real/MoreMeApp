import Image from "next/image";
import { PageHeader } from "@/components/PageHeader";
import { Panel, Stat } from "@/components/Panel";
import { NotConfigured, IntegrationError } from "@/components/EmptyState";
import { Tabs } from "@/components/Tabs";
import { ComingSoon } from "@/components/manage/ComingSoon";
import { requireAccount } from "@/lib/auth";
import { hasServiceToken } from "@/lib/tokens";
import { getYouTubeOverview } from "@/lib/integrations/youtube";
import { ExternalLink, Youtube } from "lucide-react";

export const dynamic = "force-dynamic";

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86_400_000);
  if (d < 1) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

export default async function Content() {
  const account = await requireAccount();

  const hasKey = await hasServiceToken(account.id, "YOUTUBE_API_KEY");
  const channelId = process.env.YOUTUBE_CHANNEL_ID;

  let yt = null,
    ytError: string | null = null;
  if (hasKey && channelId) {
    try {
      yt = await getYouTubeOverview(account.id);
    } catch (e) {
      ytError = (e as Error).message;
    }
  }

  const overview = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat
          label="Subscribers"
          value={yt ? Number(yt.channel.subscriberCount).toLocaleString() : "—"}
          hint={yt ? yt.channel.title : "YouTube not connected"}
          glow={!!yt}
        />
        <Stat
          label="Total views"
          value={yt ? Number(yt.channel.viewCount).toLocaleString() : "—"}
        />
        <Stat
          label="Videos published"
          value={yt ? Number(yt.channel.videoCount).toLocaleString() : "—"}
          glow={!!yt}
        />
        <Stat
          label="Recent fetched"
          value={yt ? yt.recent.length : "—"}
          hint="uploads playlist"
        />
      </div>

      <Panel
        title="YouTube — recent uploads"
        subtitle={yt ? yt.channel.title : "not connected"}
        status={yt ? "ok" : "idle"}
        hot={!!yt}
      >
        {!hasKey ? (
          <NotConfigured
            service="YouTube"
            envKey="YOUTUBE_API_KEY"
            description="Create a YouTube Data API v3 key at console.cloud.google.com, save it here, and set the YOUTUBE_CHANNEL_ID env var."
          />
        ) : !channelId ? (
          <NotConfigured
            service="YouTube"
            envKey="YOUTUBE_CHANNEL_ID"
            description="YOUTUBE_API_KEY is saved, but YOUTUBE_CHANNEL_ID env var is missing — set it in Vercel."
          />
        ) : ytError ? (
          <IntegrationError service="YouTube" error={ytError} />
        ) : !yt || yt.recent.length === 0 ? (
          <p className="font-mono text-xs text-chuck-mute">
            No uploads returned.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {yt.recent.map((v) => (
              <li
                key={v.id}
                className="flex items-start gap-3 rounded-sm border border-chuck-line/60 bg-black/30 p-3"
              >
                <a
                  href={v.url}
                  target="_blank"
                  rel="noreferrer"
                  className="relative h-16 w-28 shrink-0 overflow-hidden rounded-sm border border-chuck-line"
                >
                  <Image
                    src={v.thumbnail}
                    alt=""
                    fill
                    sizes="112px"
                    className="object-cover"
                    unoptimized
                  />
                </a>
                <div className="min-w-0 flex-1">
                  <a
                    href={v.url}
                    target="_blank"
                    rel="noreferrer"
                    className="line-clamp-2 font-mono text-xs text-chuck-ink hover:text-chuck-pink"
                  >
                    {v.title}
                  </a>
                  <div className="mt-1 flex items-center gap-2 font-mono text-[10px] text-chuck-mute">
                    <Youtube className="h-3 w-3" />
                    {relTime(v.publishedAt)}
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto inline-flex items-center gap-1 hover:text-chuck-pink"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );

  const manage = (
    <ComingSoon
      title="YouTube manage"
      preview={[
        "Title & description edits via OAuth (the Data API key is read-only)",
        "Schedule / unschedule premieres and shorts",
        "Bulk-update video tags and thumbnails",
        "Triggers a YouTube OAuth flow on first use — coming next",
      ]}
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="// content"
        title="Content Stack"
        description="Overview shows live YouTube channel data. Manage will land once the OAuth flow is wired (read-only API keys can't write)."
      />
      <Tabs
        tabs={[
          { id: "overview", label: "Overview", content: overview },
          { id: "manage", label: "Manage", content: manage, badge: "soon" },
        ]}
      />
    </div>
  );
}
