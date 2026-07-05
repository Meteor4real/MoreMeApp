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

// No starter desk. NT5 doesn't know what you're into — you tell it, one
// topic at a time, in the Topics manager. Empty by default, same as every
// other first-launch surface in MoreMe.
function seedTopics(): Topic[] {
  return [];
}

// label+query pairs of every topic the OLD seeds ever auto-installed. Used
// once (below) to scrub un-edited seed topics out of existing installs —
// the seed lists were removed from the code, but localStorage kept them,
// so upgraded installs still showed "hardcoded" interests the user never
// chose. A topic the user edited (changed label or query) no longer
// matches and is kept.
const LEGACY_SEEDS = new Set([
  "minecraft|minecraft", "origin realms|origin realms minecraft server",
  "gaming|video game news", "r/minecraft|minecraft",
  "celebrities|celebrity news", "music|music news new release",
  "movies & tv|movie or streaming series news",
  "space & nasa|nasa or spacex or space mission",
  "ai & tech|artificial intelligence technology",
  "science|science discovery research", "world|world breaking news",
  "us news|united states national news", "business|business markets economy",
  "sports|sports news highlights", "nba|nba basketball", "nfl|nfl football",
  "fitness & training|fitness training athletics",
  "health|health medicine research news",
]);
const CLEANED_KEY = "nt5.topics.cleaned.v1";

let cache: Topic[] | null = null;

export function loadTopics(): Topic[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const arr = JSON.parse(raw) as Topic[];
      if (Array.isArray(arr)) {
        cache = arr;
        // One-time scrub: drop topics that exactly match an old auto-seed
        // (label + query, case-insensitive) — the user never chose those.
        let cleaned = false;
        try { cleaned = localStorage.getItem(CLEANED_KEY) === "1"; } catch { /* ignore */ }
        if (!cleaned) {
          const kept = arr.filter((t) => !LEGACY_SEEDS.has(`${t.label.trim().toLowerCase()}|${t.query.trim().toLowerCase()}`));
          if (kept.length !== arr.length) writeTopics(kept);
          try { localStorage.setItem(CLEANED_KEY, "1"); } catch { /* ignore */ }
        }
        return cache;
      }
    }
  } catch { /* ignore */ }
  cache = seedTopics();
  writeTopics(cache);
  try { localStorage.setItem(CLEANED_KEY, "1"); } catch { /* ignore */ }
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
export function clearTopics() {
  writeTopics([]);
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
