import { getServiceToken } from "@/lib/tokens";

const API = "https://www.googleapis.com/youtube/v3";

async function yt<T>(key: string, path: string): Promise<T> {
  const url = `${API}${path}${path.includes("?") ? "&" : "?"}key=${encodeURIComponent(key)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`youtube ${path} ${res.status}`);
  return res.json() as Promise<T>;
}

export type YtChannel = {
  id: string;
  title: string;
  thumbnail: string;
  subscriberCount: string;
  viewCount: string;
  videoCount: string;
};

export type YtVideo = {
  id: string;
  title: string;
  publishedAt: string;
  thumbnail: string;
  url: string;
};

export type YtOverview = {
  channel: YtChannel;
  recent: YtVideo[];
};

export async function getYouTubeOverview(accountId: string): Promise<YtOverview | null> {
  const key = await getServiceToken(accountId, "YOUTUBE_API_KEY");
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  if (!key || !channelId) return null;

  type ChResp = {
    items: Array<{
      id: string;
      snippet: { title: string; thumbnails: { default: { url: string } } };
      statistics: { subscriberCount: string; viewCount: string; videoCount: string };
      contentDetails: { relatedPlaylists: { uploads: string } };
    }>;
  };
  type PlResp = {
    items: Array<{
      snippet: {
        title: string;
        publishedAt: string;
        thumbnails: { medium: { url: string } };
        resourceId: { videoId: string };
      };
    }>;
  };

  const ch = await yt<ChResp>(
    key,
    `/channels?part=snippet,statistics,contentDetails&id=${encodeURIComponent(channelId)}`
  );
  const item = ch.items?.[0];
  if (!item) return null;

  const uploads = item.contentDetails.relatedPlaylists.uploads;
  const pl = await yt<PlResp>(
    key,
    `/playlistItems?part=snippet&playlistId=${encodeURIComponent(uploads)}&maxResults=6`
  );

  return {
    channel: {
      id: item.id,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.default.url,
      subscriberCount: item.statistics.subscriberCount,
      viewCount: item.statistics.viewCount,
      videoCount: item.statistics.videoCount,
    },
    recent: pl.items.map((v) => ({
      id: v.snippet.resourceId.videoId,
      title: v.snippet.title,
      publishedAt: v.snippet.publishedAt,
      thumbnail: v.snippet.thumbnails.medium.url,
      url: `https://www.youtube.com/watch?v=${v.snippet.resourceId.videoId}`,
    })),
  };
}
