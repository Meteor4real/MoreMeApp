// SignalFinder auto-discovery. Pulls real opportunities from public, key-free
// sources and turns them into scored prospects — so the user isn't typing
// every lead in by hand. Tuned for the IT / dev / homelab audience NCH serves.
//
// Sources (all key-free):
//   GitHub  — trending-ish repos via the search API (most-starred this week),
//             active maintainers = recruit/collab prospects.
//   HN      — Algolia search API: "Who is hiring" + "Who wants to be hired"
//             threads + Show HN (founders = startup/collab prospects).
//   Reddit  — public .json listings for r/homelab, r/sysadmin, r/devops,
//             r/selfhosted (active posters = community prospects).
//   Dev.to  — top articles via its public API (authors = collab prospects).

import { type Target, type NetworkGoalId, type StageId, rid } from "./model";

const net = (url: string, headers?: Record<string, string>) =>
  window.hub.net({ method: "GET", url, headers: { "User-Agent": "Mozilla/5.0 NetworkChuckHub", ...(headers || {}) } });

export type DiscoverySource = "github" | "hn_hiring" | "hn_forhire" | "hn_show" | "reddit" | "devto";

export type Discovered = {
  // Pre-filled Target shape (minus id/createdAt which the caller stamps).
  name: string;
  type: string;
  niche: string;
  platform: string;
  audience: number;
  growth: number; activity: number; accessibility: number; relevance: number;
  goal: string;
  goalAlignment: NetworkGoalId[];
  stage: StageId;
  tags: { label: string; color: string }[];
  channels: { kind: "email" | "x" | "discord" | "site" | "phone"; value: string }[];
  source: DiscoverySource;
  sourceUrl: string;
  dedupeKey: string; // stable identity to avoid re-adding
};

export const SOURCE_META: Record<DiscoverySource, { label: string; color: string; blurb: string }> = {
  github:    { label: "GitHub trending", color: "#a5d6ff", blurb: "active maintainers of hot repos" },
  hn_hiring: { label: "HN · Who's hiring", color: "#ff7a2d", blurb: "companies hiring right now" },
  hn_forhire:{ label: "HN · Wants hired",  color: "#39d98a", blurb: "people open to work" },
  hn_show:   { label: "HN · Show HN",      color: "#ffd166", blurb: "founders shipping projects" },
  reddit:    { label: "Reddit homelab/IT", color: "#ff5577", blurb: "active IT community posters" },
  devto:     { label: "DEV.to",            color: "#b07cff", blurb: "writers in your niche" },
};

const tag = (label: string, color: string) => ({ label, color });

// ── GitHub ──────────────────────────────────────────────────────────────────
async function discoverGithub(query: string): Promise<Discovered[]> {
  // Most-starred repos pushed in the last week matching the query.
  const since = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const q = encodeURIComponent(`${query} pushed:>${since}`);
  const r = await net(`https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=12`, { Accept: "application/vnd.github+json" });
  const items = (r.data as { items?: { name: string; full_name: string; html_url: string; description?: string; stargazers_count: number; language?: string; owner?: { login: string; html_url: string; type: string } }[] } | null)?.items || [];
  return items.filter((it) => it.owner).map((it) => {
    const stars = it.stargazers_count;
    const growth = stars > 5000 ? 5 : stars > 1000 ? 4 : stars > 200 ? 3 : 2;
    return {
      name: it.owner!.login,
      type: it.owner!.type === "Organization" ? "business" : "developer",
      niche: `${it.language || "OSS"} · ${it.name}`,
      platform: "GitHub",
      audience: stars,
      growth, activity: 5, accessibility: 3, relevance: 4,
      goal: `Maintains ${it.full_name} (${stars.toLocaleString()}★)${it.description ? ` — ${it.description.slice(0, 100)}` : ""}`,
      goalAlignment: ["recruit", "collab"] as NetworkGoalId[],
      stage: "prospect" as StageId,
      tags: [tag("OSS", "#a5d6ff"), tag(it.language || "code", "#4dd6ff")],
      channels: [{ kind: "site" as const, value: it.owner!.html_url }],
      source: "github" as DiscoverySource,
      sourceUrl: it.html_url,
      dedupeKey: `github:${it.full_name}`,
    };
  });
}

// ── Hacker News (Algolia) ────────────────────────────────────────────────────
type HnHit = { objectID: string; author: string; title?: string; comment_text?: string; story_text?: string; url?: string; created_at?: string; points?: number };

async function hnSearch(params: string): Promise<HnHit[]> {
  const r = await net(`https://hn.algolia.com/api/v1/search?${params}`);
  return (r.data as { hits?: HnHit[] } | null)?.hits || [];
}

function stripHtml(s: string): string { return s.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/\s+/g, " ").trim(); }

async function discoverHnComments(kind: "hiring" | "forhire", query: string): Promise<Discovered[]> {
  // Find the latest monthly thread, then pull its comments.
  const titleQ = kind === "hiring" ? "Ask HN: Who is hiring?" : "Ask HN: Who wants to be hired?";
  const stories = await hnSearch(`query=${encodeURIComponent(titleQ)}&tags=story&restrictSearchableAttributes=title&hitsPerPage=1`);
  const storyId = stories[0]?.objectID;
  if (!storyId) return [];
  const kw = query.toLowerCase().split(/\s+/).filter(Boolean);
  const comments = await hnSearch(`tags=comment,story_${storyId}&hitsPerPage=60`);
  const out: Discovered[] = [];
  for (const c of comments) {
    const text = stripHtml(c.comment_text || "");
    if (text.length < 40) continue;
    // Keyword-match the user's niche so we don't dump the whole thread.
    if (kw.length && !kw.some((k) => text.toLowerCase().includes(k))) continue;
    const firstLine = text.split(/[.|·\n]/)[0].slice(0, 80);
    out.push({
      name: kind === "hiring" ? firstLine || c.author : c.author,
      type: kind === "hiring" ? "business" : "collaborator",
      niche: firstLine,
      platform: "Hacker News",
      audience: 0,
      growth: 3, activity: 4, accessibility: 4, relevance: 4,
      goal: text.slice(0, 220),
      goalAlignment: (kind === "hiring" ? ["career"] : ["recruit", "startup"]) as NetworkGoalId[],
      stage: "prospect",
      tags: [tag(kind === "hiring" ? "hiring" : "for-hire", kind === "hiring" ? "#ff7a2d" : "#39d98a")],
      channels: [{ kind: "site", value: `https://news.ycombinator.com/item?id=${c.objectID}` }],
      source: kind === "hiring" ? "hn_hiring" : "hn_forhire",
      sourceUrl: `https://news.ycombinator.com/item?id=${c.objectID}`,
      dedupeKey: `hn:${c.objectID}`,
    });
    if (out.length >= 12) break;
  }
  return out;
}

async function discoverHnShow(query: string): Promise<Discovered[]> {
  const hits = await hnSearch(`query=${encodeURIComponent(query)}&tags=show_hn&hitsPerPage=15`);
  return hits.filter((h) => h.title && h.author).map((h) => ({
    name: h.author,
    type: "collaborator",
    niche: (h.title || "").replace(/^Show HN:\s*/i, "").slice(0, 80),
    platform: "Hacker News",
    audience: h.points || 0,
    growth: (h.points || 0) > 100 ? 4 : 3, activity: 4, accessibility: 4, relevance: 4,
    goal: `Shipped on Show HN: ${(h.title || "").replace(/^Show HN:\s*/i, "")}${h.url ? ` (${h.url})` : ""}`,
    goalAlignment: ["collab", "startup"] as NetworkGoalId[],
    stage: "prospect" as StageId,
    tags: [tag("Show HN", "#ffd166"), tag("founder", "#ff9ec4")],
    channels: h.url ? [{ kind: "site" as const, value: h.url }] : [{ kind: "site" as const, value: `https://news.ycombinator.com/item?id=${h.objectID}` }],
    source: "hn_show" as DiscoverySource,
    sourceUrl: `https://news.ycombinator.com/item?id=${h.objectID}`,
    dedupeKey: `hn:${h.objectID}`,
  }));
}

// ── Reddit ──────────────────────────────────────────────────────────────────
const IT_SUBS = ["homelab", "selfhosted", "sysadmin", "devops"];
async function discoverReddit(query: string): Promise<Discovered[]> {
  const out: Discovered[] = [];
  for (const sub of IT_SUBS) {
    try {
      const url = query.trim()
        ? `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=new&limit=8`
        : `https://www.reddit.com/r/${sub}/hot.json?limit=8`;
      const r = await net(url);
      const children = (r.data as { data?: { children?: { data?: { author: string; title: string; permalink: string; ups: number; num_comments: number; subreddit: string } }[] } } | null)?.data?.children || [];
      for (const ch of children) {
        const d = ch.data; if (!d || d.author === "AutoModerator" || !d.author || d.author === "[deleted]") continue;
        out.push({
          name: `u/${d.author}`,
          type: "community",
          niche: `r/${d.subreddit} · ${d.title.slice(0, 60)}`,
          platform: "Reddit",
          audience: d.ups,
          growth: 3, activity: d.num_comments > 20 ? 5 : 3, accessibility: 4, relevance: 3,
          goal: d.title.slice(0, 200),
          goalAlignment: ["community", "mentor"] as NetworkGoalId[],
          stage: "prospect",
          tags: [tag(`r/${d.subreddit}`, "#ff5577")],
          channels: [{ kind: "site", value: `https://reddit.com${d.permalink}` }],
          source: "reddit",
          sourceUrl: `https://reddit.com${d.permalink}`,
          dedupeKey: `reddit:${d.author}:${sub}`,
        });
      }
    } catch { /* ignore per-sub */ }
    if (out.length >= 12) break;
  }
  return out.slice(0, 12);
}

// ── DEV.to ──────────────────────────────────────────────────────────────────
async function discoverDevto(query: string): Promise<Discovered[]> {
  const tag = query.trim().split(/\s+/)[0]?.toLowerCase() || "devops";
  const r = await net(`https://dev.to/api/articles?tag=${encodeURIComponent(tag)}&top=7&per_page=12`);
  const arts = (r.data as { title: string; url: string; positive_reactions_count: number; user?: { name: string; username: string }; tag_list?: string[] }[] | null) || [];
  return arts.filter((a) => a.user).map((a) => ({
    name: a.user!.name,
    type: "creator",
    niche: (a.tag_list || []).slice(0, 2).join(", ") || "dev writing",
    platform: "DEV.to",
    audience: a.positive_reactions_count,
    growth: 3, activity: 4, accessibility: 4, relevance: 4,
    goal: `Wrote "${a.title.slice(0, 90)}" (${a.positive_reactions_count} reactions)`,
    goalAlignment: ["collab", "community"] as NetworkGoalId[],
    stage: "prospect" as StageId,
    tags: [{ label: "writer", color: "#b07cff" }],
    channels: [{ kind: "site" as const, value: `https://dev.to/${a.user!.username}` }],
    source: "devto" as DiscoverySource,
    sourceUrl: a.url,
    dedupeKey: `devto:${a.user!.username}`,
  }));
}

// ── Orchestrator ─────────────────────────────────────────────────────────────
export async function runDiscovery(sources: DiscoverySource[], query: string): Promise<Discovered[]> {
  const jobs: Promise<Discovered[]>[] = [];
  if (sources.includes("github")) jobs.push(discoverGithub(query || "homelab").catch(() => []));
  if (sources.includes("hn_hiring")) jobs.push(discoverHnComments("hiring", query).catch(() => []));
  if (sources.includes("hn_forhire")) jobs.push(discoverHnComments("forhire", query).catch(() => []));
  if (sources.includes("hn_show")) jobs.push(discoverHnShow(query || "devops").catch(() => []));
  if (sources.includes("reddit")) jobs.push(discoverReddit(query).catch(() => []));
  if (sources.includes("devto")) jobs.push(discoverDevto(query).catch(() => []));
  const results = await Promise.all(jobs);
  return results.flat();
}

// Convert a Discovered into a full Target (caller persists).
export function toTarget(d: Discovered): Target {
  return {
    id: rid(),
    name: d.name, type: d.type, niche: d.niche, platform: d.platform,
    audience: d.audience, growth: d.growth, activity: d.activity,
    accessibility: d.accessibility, relevance: d.relevance,
    goal: d.goal, goalAlignment: d.goalAlignment,
    outreach: [], stage: d.stage, tags: d.tags, notes: [{ id: rid(), date: new Date().toISOString().slice(0, 10), text: `Auto-discovered from ${SOURCE_META[d.source].label}: ${d.sourceUrl}` }],
    channels: d.channels, followup: null, createdAt: Date.now(),
  };
}
