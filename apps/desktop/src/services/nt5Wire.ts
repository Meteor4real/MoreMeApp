// The in-app NT5 wire. Generates fresh news items in the anchor desk's voices
// using the bundled house model — runs on a timer as long as the app is open,
// persists to localStorage, and posts new items into any open NT5 iframe so
// the bundled site stays alive too. Subscribers (the FloatingInfo overlay,
// the ticker) get notified on every new batch.
//
// Honest scope: "while the app is open." True 24/7 across system reboots
// needs a background service / tray — not in this slice.

import { loadPrefs, subscribePrefs } from "../uiPrefs";
import { getAiMode } from "./aiMode";
import { getOriginPulse } from "./originRealms";
import { ANCHORS as LORE_ANCHORS, loreContextBlock, STORYLINES } from "./nt5Lore";
import {
  enabledTopics, googleNewsUrl, redditUrl, parseGoogleNews, parseReddit,
  type Topic, type TopicHit,
} from "./nt5Topics";

// Article shapes — every wire item is one of these. The UI renders each shape
// differently so the wire reads as a real network: hard-news briefs, deep
// articles, breaking-news bulletins, opinion columns, anchor social posts,
// ticker fragments. Default to "brief" for items that predate this field
// (existing localStorage state).
export type ArticleKind =
  | "brief"      // 2-3 sentence hard-news brief — the historical default
  | "article"    // long-form, 4-6 paragraphs with structure
  | "broadcast"  // BREAKING bulletin, one urgent sentence, red treatment
  | "blog"       // op-ed / opinion column, 3-4 paragraphs of analysis
  | "social"     // tweet-shaped casual post in anchor voice, ≤280 chars
  | "ticker";    // one-line headline fragment for the crawl only

export type WireArticle = {
  id: string;
  slug: string;
  title: string;
  body: string;
  kind: ArticleKind;
  // og:image / twitter:image pulled from the real source page, when the
  // page yields one. Lore items and imageless sources get a designed
  // typographic plate in the UI instead — no stock-photo fakery.
  image_url?: string;
  category: string;        // "breaking" | "field" | "earth_trending" | "gaming" | "space" | "cc_lore" | "culture" | "tech"
  anchor_id: string;       // "voss" | "zara" | "dex" | "lena" | "orin"
  author_display: string;
  published_at: string;    // ISO
  created_at: string;
  voice_audio_url: null;
  is_broadcast: false;
  broadcast_segment: null;
  source_urls: string[];   // real article link(s); empty for in-universe lore items
  source_name?: string;    // publisher / subreddit for attribution
  topic_label?: string;    // which user topic produced it
  topics: string[];
};

// Weighted distribution for the in-universe generator. Long-form leads —
// the owner's #1 complaint was a wire full of one-sentence items, so
// articles + columns carry the wire and short shapes are the accent, not
// the default.
const KIND_WEIGHTS: Array<[ArticleKind, number]> = [
  ["article", 30], ["brief", 25], ["blog", 15], ["broadcast", 12], ["social", 12], ["ticker", 6],
];

// Real-world re-voicing: articles lead when the source page yields real
// text to work from (fileRealItem demotes to brief when it doesn't), so
// weighting article high is safe — thin sources fall back gracefully.
const REAL_KIND_WEIGHTS: Array<[ArticleKind, number]> = [
  ["article", 40], ["brief", 35], ["broadcast", 12], ["ticker", 5], ["social", 4], ["blog", 4],
];

function pickKind(weights: Array<[ArticleKind, number]>): ArticleKind {
  const total = weights.reduce((a, [, w]) => a + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of weights) { r -= w; if (r <= 0) return k; }
  return weights[0][0];
}

// Per-kind generation directives. Drives the model toward the right length
// + tone + structure for each shape. The model returns body text in the
// shape we ask for; the UI renders it accordingly.
const KIND_PROMPTS: Record<ArticleKind, string> = {
  brief:
    "A tight 2-3 sentence hard-news brief. Lead with the fact. No preamble, no opinion.",
  article:
    "A long-form article, 4-6 paragraphs. Open with a hook lede, then 3-4 paragraphs of body that develop the angle (context, players, stakes), then a 1-sentence closing line. Use double-newlines between paragraphs. No section headers, no markdown.",
  broadcast:
    "A BREAKING NEWS bulletin: ONE urgent sentence, no more. Present tense, active voice, specific. The kind of line an anchor reads cold on-camera as the chyron flashes.",
  blog:
    "An opinion column, 3-4 paragraphs, in the anchor's voice. Take a clear stance, build the argument, land a memorable closer. Double-newlines between paragraphs. No markdown.",
  social:
    "A casual social post from the anchor's account — 1-2 sentences, max ~280 characters total. Conversational, signature anchor voice. Optionally a single hashtag at the end. No quote marks around the post.",
  ticker:
    "A single-line headline fragment, 10-18 words. Just the news beat, no body. This goes on the crawl only.",
};

// Display name lookup — kept thin; the full bible lives in nt5Lore.
const ANCHORS: Record<string, string> = Object.fromEntries(
  Object.values(LORE_ANCHORS).map((a) => [a.id, a.name]),
);
const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);

const KEY = "nt5wire.articles";

const subs = new Set<(arts: WireArticle[]) => void>();

function readAll(): WireArticle[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as WireArticle[];
    if (!Array.isArray(arr)) return [];
    // Newest-first by publish time so the freshest real headlines lead.
    // Backfill kind="brief" on legacy items so the UI's per-kind branching
    // never sees an undefined.
    return arr
      .map((a) => (a.kind ? a : { ...a, kind: "brief" as ArticleKind }))
      .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
  } catch { return []; }
}
function writeAll(arts: WireArticle[]) {
  try { localStorage.setItem(KEY, JSON.stringify(arts.slice(0, 80))); } catch { /* ignore */ }
}

export function getWireArticles(): WireArticle[] {
  return readAll();
}

// Wipe the wire (operator action — lives in the Topics control room).
// The next scheduler tick or manual pull refills it.
export function clearWireArticles(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  subs.forEach((fn) => fn([]));
}

export function subscribeWire(fn: (arts: WireArticle[]) => void): () => void {
  subs.add(fn);
  fn(readAll());
  return () => subs.delete(fn);
}

// Rotating story FORMATS so successive batches don't share one shape. A random
// few are sampled into each prompt.
const STORY_FORMATS = [
  "a hard-news lede (who/what/when, most important fact first)",
  "an explainer angle (what it means / why it matters in one beat)",
  "a reaction piece (how a community or market is responding)",
  "a numbers story (lead with a striking figure or stat)",
  "a human-interest angle (one person/creator/player at the center)",
  "a 'what's next' forward-look (the implication or the next milestone)",
  "a contrast/then-vs-now framing",
  "a field dispatch (Lena's beat — location + time + what she sees)",
  "a quick-hit brief (one tight sentence of fact + one of context)",
];

// SYSTEM prompt is now grounded in the full lore bible — anchors with full
// voice profiles + signatures + tells, places used as shared vocabulary,
// corps + factions to reference, recurring storylines to advance. Coverage
// reads like dispatches from one coherent world instead of generic copy.
const SYSTEM =
  "You are the wire desk for NT5 (Nova Terris 5), the 5th channel of S.P.A.C.E. " +
  "News. Slick, professional sci-fi cable news — play it straight, real-feeling. " +
  // NOTE: no global length rule here — each shape (brief/article/broadcast/
  // blog/social/ticker) carries its OWN length + structure directive in
  // KIND_PROMPTS. A blanket "2-3 sentences" line here used to override the
  // per-shape instructions and flattened every story into a brief.
  "The SHAPE directive below sets this piece's length and structure — follow it exactly. " +
  "Every piece MUST be in the assigned " +
  "anchor's voice — match their cadence, tells, and signatures.\n\n" +
  loreContextBlock() + "\n\n" +
  "RULES:\n" +
  "- The headline must be SPECIFIC. No 'unveils', 'revolutionizes', 'game-changer'.\n" +
  "- No two headlines in a batch share an opening word or sentence shape.\n" +
  "- Reference places/corps/factions/storylines from the bible above WITHOUT " +
  "explaining them — this is the network's shared vocabulary.\n" +
  "- Voss / Lena pieces lean into the bible's anchor signatures (opener phrasing, " +
  "closing tag); Zip / Dex / Orin keep their tells.\n" +
  "- Don't invent specific unverifiable Earth events. In-universe Nova Terris " +
  "storylines can advance freely.\n" +
  "- Categories: breaking, field, earth_trending, gaming, space, tech, culture, cc_lore.\n" +
  "Return ONLY a JSON array, no prose: " +
  '[{"category","anchor_id","title","body"}].';

function parseItems(text: string): { category: string; anchor_id: string; title: string; body: string }[] {
  let t = text.trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const a = t.indexOf("[");
  const b = t.lastIndexOf("]");
  if (a >= 0 && b > a) t = t.slice(a, b + 1);
  try {
    const arr = JSON.parse(t);
    if (Array.isArray(arr)) {
      return arr.filter((x) => x && x.title && x.body).map((x) => ({
        category: String(x.category || "latest"),
        anchor_id: String(x.anchor_id || x.anchor || "voss"),
        title: String(x.title),
        body: String(x.body),
      }));
    }
  } catch { /* ignore */ }
  return [];
}

// Parse a single-item JSON object (used by the per-kind generator that
// asks for one piece at a time). Falls back to wrapping the raw text as
// the body when the model returns prose instead of JSON.
function parseOne(text: string, fallbackAnchor: string): { category: string; anchor_id: string; title: string; body: string } | null {
  let t = text.trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a >= 0 && b > a) t = t.slice(a, b + 1);
  try {
    const obj = JSON.parse(t);
    if (obj && obj.title && obj.body) {
      return {
        category: String(obj.category || "latest"),
        anchor_id: String(obj.anchor_id || obj.anchor || fallbackAnchor),
        title: String(obj.title),
        body: String(obj.body),
      };
    }
  } catch { /* fall through */ }
  return null;
}

// Generate one wire item of a specific shape. The kind drives the prompt
// (length, tone, structure) so the wire reads as a real network instead
// of one repeating shape. Returns null on parse failure / model error.
//
// Earth-topic weighting comes from the user's OWN topic desk (nt5Topics),
// never a hardcoded guess at their interests — the desk starts empty and
// the user sets it. With nothing set yet, the generator is told exactly
// that: cover the ordinary general-news beats, don't assume a personal
// interest that hasn't been configured.
async function generateOne(kind: ArticleKind, recentTitles: string[]): Promise<{ category: string; anchor_id: string; title: string; body: string } | null> {
  const userTopics = enabledTopics();
  // With no Earth topics configured, this generator has no real-world facts
  // to draw on — a local model told to "cover general news" would just
  // invent plausible-sounding Earth events, which is fake news in the most
  // literal sense. So with an empty desk it writes PURE in-universe Nova
  // Terris items only; real Earth coverage comes from the topic desk.
  const topicEarthBlock = userTopics.length
    ? `Earth topics to weight (real, current-world), drawn from the user's own configured desk: ${userTopics.map((t) => t.label).join(", ")}.`
    : "No Earth topics are configured on the user's desk. Write a PURELY in-universe Nova Terris item (category cc_lore, field, or space within the fiction) — do NOT reference or fabricate any real-world Earth event, company, person, or subject.";
  // Only surface the Origin Realms live server pulse if the user actually
  // has an Origin Realms topic on their desk — otherwise this is exactly
  // the same "assumed you're into it" problem as the old hardcoded list.
  const caresAboutOriginRealms = userTopics.some((t) => /origin\s*realms/i.test(t.label) || /origin\s*realms/i.test(t.query));
  const pulse = caresAboutOriginRealms ? getOriginPulse() : null;
  const liveCtx = pulse
    ? `\nLIVE CONTEXT (real-time): play.originrealms.com is ${pulse.online ? `online with ${pulse.players}/${pulse.max} players` : "offline"}; MOTD: "${pulse.motd}"; version: ${pulse.version}. Use this if you write an Origin Realms item (especially in Dex's voice).`
    : "";
  const format = STORY_FORMATS[Math.floor(Math.random() * STORY_FORMATS.length)];
  const avoidBlock = recentTitles.length
    ? `\nDo NOT repeat or lightly reword any of these recently-filed headlines:\n- ${recentTitles.slice(0, 12).join("\n- ")}`
    : "";
  const storyline = STORYLINES[Math.floor(Math.random() * STORYLINES.length)];

  const kindBlock = `\nSHAPE FOR THIS ITEM: ${kind.toUpperCase()}\n${KIND_PROMPTS[kind]}`;

  const res = await window.hub.llm.chat(
    SYSTEM + kindBlock,
    `${topicEarthBlock}${liveCtx}` +
    `\nA Nova Terris storyline to advance OR reference if it fits: ${storyline}` +
    `\nStory angle: ${format}.` +
    avoidBlock +
    `\nReturn ONE JSON object (no array, no prose, no markdown fence): ` +
    `{"category","anchor_id","title","body"}.`,
    { temperature: 0.95 }
  );
  if (!res.ok) return null;
  return parseOne(res.text || "", "voss");
}

export async function runWireOnce(count = 3): Promise<{ ok: boolean; added: WireArticle[]; error?: string }> {
  // AI master switch: with an external agent in the chair, the bundled
  // model files NOTHING — the external agent writes anchor content through
  // fileExternalArticle (via window.moremeAgent.wire or the bridge).
  if (getAiMode() === "external") {
    return { ok: false, added: [], error: "Built-in AI is off — an external agent runs the anchors (AI switch in Customize)." };
  }
  const existing = readAll();
  const existingTitles = new Set(existing.map((a) => a.title.toLowerCase()));
  const added: WireArticle[] = [];
  let lastError: string | undefined;
  for (let i = 0; i < count; i++) {
    const kind = pickKind(KIND_WEIGHTS);
    const titles = [...added.map((a) => a.title), ...existing.slice(0, 10).map((a) => a.title)];
    const item = await generateOne(kind, titles).catch((e) => { lastError = String(e); return null; });
    if (!item) continue;
    if (existingTitles.has(item.title.toLowerCase())) continue;
    const id = `wire-${Date.now()}-${i}`;
    const now = new Date();
    const wire: WireArticle = {
      id,
      slug: slugify(item.title) || id,
      title: item.title,
      body: item.body,
      kind,
      category: item.category,
      anchor_id: item.anchor_id in ANCHORS ? item.anchor_id : "voss",
      author_display: ANCHORS[item.anchor_id] || ANCHORS.voss,
      published_at: now.toISOString(),
      created_at: now.toISOString(),
      voice_audio_url: null,
      is_broadcast: false,
      broadcast_segment: null,
      source_urls: [],
      topics: [],
    };
    added.push(wire);
    existingTitles.add(item.title.toLowerCase());
  }
  if (added.length) {
    const merged = [...added, ...existing].slice(0, 80);
    writeAll(merged);
    subs.forEach((fn) => fn(merged));
    document.querySelectorAll("iframe").forEach((f) => {
      try { f.contentWindow?.postMessage({ type: "nt5-add-articles", articles: added }, "*"); } catch { /* ignore */ }
    });
  }
  return { ok: added.length > 0, added, error: added.length === 0 ? lastError : undefined };
}

// Module-level scheduler — single timer per app load. Restarts when the
// wire-interval pref changes. Skips runs while the model isn't ready yet.
let timer: ReturnType<typeof setInterval> | null = null;
let started = false;

export function startWireScheduler(): void {
  if (started) return;
  started = true;
  schedule(loadPrefs().wireMinutes);
  subscribePrefs((p) => schedule(p.wireMinutes));
  // First run shortly after boot — gives the model a chance to finish ensuring.
  setTimeout(() => { void tryRun(); }, 8000);
}

function schedule(minutes: number) {
  if (timer) clearInterval(timer);
  const ms = Math.max(2, minutes) * 60 * 1000;
  timer = setInterval(() => { void tryRun(); }, ms);
}

async function tryRun() {
  // Real, realtime news is handled per-anchor by the autonomous desk
  // (services/nt5Desk). This timer just adds one in-universe Nova Terris
  // flavor item when the local model is ready, so the wire has some setting
  // colour on top of the real news the desk files.
  if (getAiMode() === "external") return; // external agent owns generation
  try {
    const s = await window.hub.llm.status();
    if (s.ready) await runWireOnce(1).catch(() => undefined);
  } catch { /* ignore — wire stays quiet */ }
}

// ---------------------------------------------------------------------------
// External filing — the write path for an outside agent (Hermes) when the
// AI master switch is set to "external". Exposed on window.moremeAgent.wire
// and, through the localhost bridge, to processes outside the app entirely.
// Validates + defaults everything so a malformed call can't corrupt the wire.
// ---------------------------------------------------------------------------

export type ExternalArticleInput = {
  title: string;
  body: string;
  kind?: ArticleKind;
  category?: string;
  anchor_id?: string;
  image_url?: string;
  source_urls?: string[];
  source_name?: string;
  topic_label?: string;
};

const KINDS: ArticleKind[] = ["brief", "article", "broadcast", "blog", "social", "ticker"];

export function fileExternalArticle(input: ExternalArticleInput): { ok: boolean; id?: string; error?: string } {
  const title = String(input?.title ?? "").trim();
  const body = String(input?.body ?? "").trim();
  if (!title || !body) return { ok: false, error: "title and body are required" };
  const kind: ArticleKind = KINDS.includes(input.kind as ArticleKind) ? (input.kind as ArticleKind) : "brief";
  const anchor = typeof input.anchor_id === "string" && input.anchor_id in ANCHORS ? input.anchor_id : "voss";
  const existing = readAll();
  if (existing.some((a) => a.title.toLowerCase() === title.toLowerCase())) {
    return { ok: false, error: "duplicate title already on the wire" };
  }
  const now = new Date();
  const id = `ext-${Date.now()}-${slugify(title).slice(0, 12)}`;
  const article: WireArticle = {
    id,
    slug: slugify(title) || id,
    title: title.slice(0, 200),
    body: body.slice(0, 12_000),
    kind,
    image_url: typeof input.image_url === "string" && /^https?:\/\//i.test(input.image_url) ? input.image_url : undefined,
    category: typeof input.category === "string" && input.category ? input.category : "latest",
    anchor_id: anchor,
    author_display: ANCHORS[anchor] || ANCHORS.voss,
    published_at: now.toISOString(),
    created_at: now.toISOString(),
    voice_audio_url: null,
    is_broadcast: false,
    broadcast_segment: null,
    source_urls: Array.isArray(input.source_urls) ? input.source_urls.filter((u) => typeof u === "string" && /^https?:\/\//i.test(u)).slice(0, 4) : [],
    source_name: typeof input.source_name === "string" ? input.source_name.slice(0, 80) : undefined,
    topic_label: typeof input.topic_label === "string" ? input.topic_label.slice(0, 80) : undefined,
    topics: [],
  };
  const merged = [article, ...existing].slice(0, 120);
  writeAll(merged);
  subs.forEach((fn) => fn(merged));
  document.querySelectorAll("iframe").forEach((f) => {
    try { f.contentWindow?.postMessage({ type: "nt5-add-articles", articles: [article] }, "*"); } catch { /* ignore */ }
  });
  return { ok: true, id };
}

// ---------------------------------------------------------------------------
// Real-world news engine — the heart of NT5. Walks the user's configured
// topics (services/nt5Topics), fetches actual current headlines per topic
// (Google News search for ANY query, Reddit for community pulse, or a direct
// RSS feed), dedupes, and re-voices each into a tight anchor brief — keeping
// the real source link + publisher for attribution. "Real, realtime news on
// everything you set."
// ---------------------------------------------------------------------------

async function fetchTopic(topic: Topic): Promise<TopicHit[]> {
  let url: string;
  if (topic.source === "reddit") url = redditUrl(topic.query);
  else if (topic.source === "rss") url = topic.query.trim();
  else url = googleNewsUrl(topic.query, topic.recency);

  const r = await window.hub.net({
    method: "GET",
    url,
    headers: { "User-Agent": "Mozilla/5.0 (compatible; NT5Wire/1.0; +https://moreme.app)" },
  });
  if (!r.ok || typeof r.data !== "string") return [];
  if (topic.source === "reddit") return parseReddit(r.data);
  return parseGoogleNews(r.data); // google-news + generic RSS share the <item> shape
}

// `maxPerTopic` caps how many fresh items we re-voice per topic in one pass —
// keeps a single refresh quick and the model from being hammered.
export async function runRealWorldOnce(maxPerTopic = 3): Promise<{ ok: boolean; added: WireArticle[]; error?: string }> {
  const topics = enabledTopics();
  if (!topics.length) return { ok: true, added: [] };
  const existing = readAll();
  const existingTitles = new Set(existing.map((a) => a.title.toLowerCase()));
  const added: WireArticle[] = [];
  for (const topic of topics) {
    let hits: TopicHit[] = [];
    try { hits = await fetchTopic(topic); } catch { continue; }
    const fresh = hits
      .filter((h) => h.title && !existingTitles.has(h.title.toLowerCase()))
      .slice(0, Math.min(topic.perPull, maxPerTopic));
    for (const h of fresh) {
      const filed = await fileRealItem(topic, h);
      if (filed) {
        added.push(filed);
        existingTitles.add(filed.title.toLowerCase());
      }
    }
  }
  if (added.length) {
    const merged = [...added, ...existing].slice(0, 120);
    writeAll(merged);
    subs.forEach((fn) => fn(readAll()));
    document.querySelectorAll("iframe").forEach((f) => {
      try { f.contentWindow?.postMessage({ type: "nt5-add-articles", articles: added }, "*"); } catch { /* ignore */ }
    });
  }
  return { ok: true, added };
}

// Pull a single topic on demand (the Topics manager "Pull now" button).
export async function runTopicOnce(topic: Topic): Promise<{ ok: boolean; added: WireArticle[] }> {
  const existing = readAll();
  const existingTitles = new Set(existing.map((a) => a.title.toLowerCase()));
  const added: WireArticle[] = [];
  let hits: TopicHit[] = [];
  try { hits = await fetchTopic(topic); } catch { return { ok: false, added: [] }; }
  const fresh = hits.filter((h) => h.title && !existingTitles.has(h.title.toLowerCase())).slice(0, topic.perPull);
  for (const h of fresh) {
    const filed = await fileRealItem(topic, h);
    if (filed) { added.push(filed); existingTitles.add(filed.title.toLowerCase()); }
  }
  if (added.length) {
    const merged = [...added, ...existing].slice(0, 120);
    writeAll(merged);
    subs.forEach((fn) => fn(readAll()));
  }
  return { ok: true, added };
}

// og:image / twitter:image extraction — the real story's real picture.
// Returns "" when the page has none (or is a redirect/consent shell).
function extractOgImage(html: string): string {
  try {
    const m =
      /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i.exec(html) ||
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i.exec(html) ||
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i.exec(html);
    const url = m?.[1]?.trim() ?? "";
    return /^https?:\/\//i.test(url) ? url : "";
  } catch { return ""; }
}

// Best-effort main-text extraction from an article page. Strips scripts,
// styles, and tags; joins paragraph contents. Returns "" when the page
// yields nothing usable (paywall, JS-only shell, redirect page).
function extractArticleText(html: string): string {
  try {
    let t = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<header[\s\S]*?<\/header>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ");
    const paras: string[] = [];
    const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let m: RegExpExecArray | null;
    while ((m = pRe.exec(t)) && paras.join(" ").length < 4000) {
      const clean = m[1].replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
      if (clean.length > 60) paras.push(clean); // skip nav crumbs / bylines
    }
    return paras.join("\n\n").slice(0, 2800);
  } catch { return ""; }
}

// Take a real headline + snippet and re-voice it in the topic's anchor.
// Long shapes (article / blog) first try to fetch the ACTUAL source page so
// the piece has real material to work from — a 4-paragraph article written
// off a one-line RSS snippet is padding, not news. Falls back to the cleaned
// snippet (and finally the headline) so the item always lands with its source.
async function fileRealItem(topic: Topic, hit: TopicHit): Promise<WireArticle | null> {
  const anchor = topic.anchor;
  // Roll a shape for this real-world item. Real news leans heavily toward
  // brief + article since blogs / socials risk inventing opinion that isn't
  // in the source snippet — for those, the model is constrained tighter.
  let kind = pickKind(REAL_KIND_WEIGHTS);
  let body = (hit.description || "").slice(0, 360);

  // Pull the source page for EVERY real item: og:image for the front page
  // (real stories get their real pictures), and — for long shapes — the
  // main text so the piece has honest material. If a long shape's page
  // yields too little text, demote to brief instead of letting the model pad.
  let sourceText = "";
  let imageUrl = "";
  try {
    const page = await window.hub.net({
      method: "GET",
      url: hit.link,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NT5Wire/1.0; +https://moreme.app)" },
    });
    if (page.ok && typeof page.data === "string") {
      imageUrl = extractOgImage(page.data);
      if (kind === "article" || kind === "blog") sourceText = extractArticleText(page.data);
    }
  } catch { /* headline+snippet only */ }
  if ((kind === "article" || kind === "blog") && sourceText.length < 400) { kind = "brief"; sourceText = ""; }

  // External-agent mode: no built-in re-voicing. Real stories file AS-IS —
  // the honest headline + snippet (or extracted source text for long
  // shapes). The external agent can rewrite them through the wire API.
  if (getAiMode() === "external") {
    if (sourceText) body = sourceText;
    else if (kind === "blog" || kind === "social") kind = "brief"; // opinion shapes need a writer

  } else try {
    const s = await window.hub.llm.status();
    if (s.ready) {
      const a = LORE_ANCHORS[anchor] ?? LORE_ANCHORS.voss;
      // Per-kind re-voicing instructions. The hard constraint stays the
      // same: use ONLY facts present in the source material for any factual
      // claim. Opinion shapes (blog / social) frame angle but can't invent.
      const shape = KIND_PROMPTS[kind];
      const factsGuard =
        kind === "blog" || kind === "social"
          ? "You may add stance / framing in the anchor's voice, but factual claims must come from the source material only — do not invent events or numbers."
          : "Use ONLY facts present in the source material — invent nothing.";
      const sys =
        `You are NT5 anchor ${a.name} (${a.role}). Voice: ${a.voice}\n` +
        `Re-voice REAL current news in your voice.\n` +
        `SHAPE: ${kind.toUpperCase()} — ${shape}\n` +
        `${factsGuard}\n` +
        `No preamble, no markdown, no quote marks around the output.`;
      const u =
        `TOPIC: ${topic.label}\nHEADLINE: ${hit.title}\nSNIPPET: ${hit.description || "(headline only)"}` +
        (sourceText ? `\nFULL SOURCE TEXT:\n${sourceText}` : "") +
        `\nWrite the piece now.`;
      const r = await window.hub.llm.chat(sys, u);
      if (r.ok && r.text) body = r.text.trim().replace(/^["']|["']$/g, "");
    }
  } catch { /* keep snippet */ }
  if (!body) body = hit.title; // worst case, the headline itself
  const now = new Date(hit.pubDate ? Date.parse(hit.pubDate) : Date.now());
  const ts = isNaN(now.getTime()) ? Date.now() : now.getTime();
  const id = `real-${ts}-${slugify(hit.title).slice(0, 12)}`;
  return {
    id,
    slug: slugify(hit.title) || id,
    title: hit.title,
    body,
    kind,
    image_url: imageUrl || undefined,
    category: topic.category,
    anchor_id: anchor in ANCHORS ? anchor : "voss",
    author_display: ANCHORS[anchor] || ANCHORS.voss,
    published_at: new Date(ts).toISOString(),
    created_at: new Date().toISOString(),
    voice_audio_url: null,
    is_broadcast: false,
    broadcast_segment: null,
    source_urls: [hit.link],
    source_name: hit.source,
    topic_label: topic.label,
    topics: [topic.label],
  };
}
