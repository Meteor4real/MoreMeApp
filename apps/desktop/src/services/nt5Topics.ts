// NT5 topic desk — the user's news interests. This is what makes NT5 "real,
// realtime news on EVERYTHING I set": each topic is a live query the wire
// pulls actual current headlines for, then re-voices in the assigned anchor.
//
// Sources (all key-free, fetched main-process via window.hub.net so no CORS):
//   google-news — news.google.com/rss/search?q=<query>  → ANY topic, with a
//                 when: recency operator for freshness. The universal spine.
//   reddit      — reddit.com/r/<sub>/hot.json            → community/gaming pulse.
//   rss         — a direct feed URL                      → a specific outlet.
//
// Persisted to localStorage; the wire reads enabled topics every tick.

import type { AnchorId } from "./nt5Lore";
import type { WireCategory } from "./nt5Lore";

export type TopicSource = "google-news" | "reddit" | "rss";
export type Recency = "3h" | "6h" | "12h" | "1d" | "3d" | "7d";

export type Topic = {
  id: string;
  label: string;          // display name, e.g. "Minecraft"
  query: string;          // google-news search terms · subreddit name · or RSS URL
  source: TopicSource;
  anchor: AnchorId;       // who files it
  category: WireCategory; // which desk it lands on
  recency: Recency;       // freshness window (google-news only)
  perPull: number;        // max items pulled per refresh
  enabled: boolean;
};

const KEY = "nt5.topics.v1";
const subs = new Set<(t: Topic[]) => void>();

export const RECENCIES: Recency[] = ["3h", "6h", "12h", "1d", "3d", "7d"];
export const SOURCES: TopicSource[] = ["google-news", "reddit", "rss"];

const uid = () => Math.random().toString(36).slice(2, 10);

// A strong starter desk — "news for anything and everything": every broad
// beat a real network runs (world, business, sports, science, culture,
// gaming) each routed to the right anchor. Fully editable in the Topics
// manager; deleting one you don't want is one click.
function seedTopics(): Topic[] {
  const t = (
    label: string, query: string, anchor: AnchorId, category: WireCategory,
    source: TopicSource = "google-news", recency: Recency = "1d", perPull = 3,
  ): Topic => ({ id: uid(), label, query, anchor, category, source, recency, perPull, enabled: true });
  return [
    t("Minecraft", "Minecraft", "dex", "gaming"),
    t("Origin Realms", "Origin Realms Minecraft server", "dex", "gaming", "google-news", "3d", 2),
    t("Gaming", "video game news", "dex", "gaming"),
    t("r/Minecraft", "Minecraft", "dex", "gaming", "reddit", "1d", 3),
    t("Celebrities", "celebrity news", "zara", "culture"),
    t("Music", "music news new release", "zara", "culture"),
    t("Movies & TV", "movie OR streaming series news", "zara", "earth_trending"),
    t("Space & NASA", "NASA OR SpaceX OR space mission", "orin", "space"),
    t("AI & Tech", "artificial intelligence technology", "orin", "tech"),
    t("Science", "science discovery research", "orin", "space", "google-news", "3d"),
    t("World", "world breaking news", "voss", "breaking", "google-news", "6h"),
    t("US News", "United States national news", "voss", "earth_trending", "google-news", "12h"),
    t("Business", "business markets economy", "voss", "breaking", "google-news", "1d"),
    t("Sports", "sports news highlights", "lena", "earth_trending", "google-news", "12h"),
    t("NBA", "NBA basketball", "lena", "earth_trending"),
    t("NFL", "NFL football", "lena", "earth_trending"),
    t("Fitness & Training", "fitness training athletics", "lena", "culture", "google-news", "3d", 2),
    t("Health", "health medicine research news", "orin", "tech", "google-news", "3d", 2),
  ];
}

// Bump when seedTopics gains new beats. loadTopics() appends any NEW seed
// topics (by label) to an existing install once per version — user edits and
// deletions of their own topics are never touched, and re-deleting an
// appended default won't resurrect it until the next version bump.
const SEED_VERSION = 2;
const SEED_VERSION_KEY = "nt5.topics.seedv";

let cache: Topic[] | null = null;

export function loadTopics(): Topic[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const arr = JSON.parse(raw) as Topic[];
      if (Array.isArray(arr)) {
        cache = arr;
        // One-time append of newly-added default beats for existing installs.
        let seedv = 0;
        try { seedv = Number(localStorage.getItem(SEED_VERSION_KEY)) || 0; } catch { /* ignore */ }
        if (seedv < SEED_VERSION) {
          const have = new Set(arr.map((t) => t.label.toLowerCase()));
          const fresh = seedTopics().filter((t) => !have.has(t.label.toLowerCase()));
          if (fresh.length) writeTopics([...arr, ...fresh]);
          try { localStorage.setItem(SEED_VERSION_KEY, String(SEED_VERSION)); } catch { /* ignore */ }
        }
        return cache;
      }
    }
  } catch { /* ignore */ }
  cache = seedTopics();
  writeTopics(cache);
  try { localStorage.setItem(SEED_VERSION_KEY, String(SEED_VERSION)); } catch { /* ignore */ }
  return cache;
}

function writeTopics(list: Topic[]) {
  cache = list;
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ }
  subs.forEach((fn) => fn(list));
}

export function subscribeTopics(fn: (t: Topic[]) => void): () => void {
  subs.add(fn); fn(loadTopics()); return () => subs.delete(fn);
}
export function enabledTopics(): Topic[] {
  return loadTopics().filter((t) => t.enabled && t.query.trim());
}

export const blankTopic = (): Topic => ({
  id: uid(), label: "", query: "", source: "google-news", anchor: "voss",
  category: "earth_trending", recency: "1d", perPull: 3, enabled: true,
});

export function upsertTopic(topic: Topic) {
  const list = loadTopics();
  writeTopics(list.some((x) => x.id === topic.id) ? list.map((x) => (x.id === topic.id ? topic : x)) : [...list, topic]);
}
export function removeTopic(id: string) {
  writeTopics(loadTopics().filter((t) => t.id !== id));
}
export function resetTopics() {
  writeTopics(seedTopics());
}

// ── source URL builders + parsers ──────────────────────────────────────────

// Google News reads a recency operator inside the query: "<terms> when:1d".
export function googleNewsUrl(query: string, recency: Recency): string {
  const q = encodeURIComponent(`${query} when:${recency}`);
  return `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
}
export function redditUrl(sub: string): string {
  const clean = sub.replace(/^\/?r\//i, "").trim();
  return `https://www.reddit.com/r/${encodeURIComponent(clean)}/hot.json?limit=12&raw_json=1`;
}

export type TopicHit = { title: string; link: string; pubDate?: string; description?: string; source?: string };

// Decode the common HTML entities Google News double-encodes its descriptions
// with, strip any tags, collapse whitespace. Google News snippets are usually
// just the headline as a link + the source — so a cleaned result that's barely
// more than the title is treated as junk and dropped (the re-voicer then works
// from the clean headline, which is the real fact anyway).
export function cleanSnippet(raw: string, title: string): string {
  if (!raw) return "";
  let v = raw
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // If what's left is basically the headline (or shorter), it carries no
  // extra information — drop it.
  const t = title.toLowerCase().slice(0, 40);
  if (v.length < 30 || v.toLowerCase().includes(t) && v.length < title.length + 40) return "";
  return v.slice(0, 360);
}

// Google News titles arrive as "Headline - Publisher" — split the publisher
// off into `source` and keep the clean headline.
export function splitGoogleTitle(raw: string): { title: string; source?: string } {
  const idx = raw.lastIndexOf(" - ");
  if (idx > 20 && idx > raw.length - 60) {
    return { title: raw.slice(0, idx).trim(), source: raw.slice(idx + 3).trim() };
  }
  return { title: raw.trim() };
}

export function parseGoogleNews(xml: string): TopicHit[] {
  const out: TopicHit[] = [];
  const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml))) {
    const block = m[1];
    const pick = (tag: string) => {
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`).exec(block);
      if (!r) return "";
      let v = r[1].trim();
      const cdata = /<!\[CDATA\[([\s\S]*?)\]\]>/.exec(v);
      if (cdata) v = cdata[1];
      return v.replace(/<[^>]+>/g, "").trim();
    };
    const rawTitle = pick("title");
    const link = pick("link");
    if (!rawTitle || !link) continue;
    const { title, source } = splitGoogleTitle(rawTitle);
    const srcTag = /<source[^>]*>([\s\S]*?)<\/source>/.exec(block);
    out.push({
      title, link,
      pubDate: pick("pubDate"),
      description: cleanSnippet(pick("description"), title),
      source: source || (srcTag ? srcTag[1].replace(/<[^>]+>/g, "").trim() : undefined),
    });
  }
  return out;
}

type RedditChild = { data?: { title?: string; permalink?: string; url?: string; created_utc?: number; selftext?: string; stickied?: boolean; subreddit?: string } };
export function parseReddit(json: string): TopicHit[] {
  try {
    const root = JSON.parse(json) as { data?: { children?: RedditChild[] } };
    const kids = root.data?.children ?? [];
    return kids
      .map((k) => k.data)
      .filter((d): d is NonNullable<RedditChild["data"]> => !!d && !!d.title && !d.stickied)
      .map((d) => ({
        title: d.title!,
        link: d.permalink ? `https://www.reddit.com${d.permalink}` : (d.url ?? ""),
        pubDate: d.created_utc ? new Date(d.created_utc * 1000).toUTCString() : undefined,
        description: (d.selftext ?? "").slice(0, 400),
        source: d.subreddit ? `r/${d.subreddit}` : "Reddit",
      }))
      .filter((h) => h.link);
  } catch { return []; }
}
