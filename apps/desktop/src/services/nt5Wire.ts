// The in-app NT5 wire. Generates fresh news items in the anchor desk's voices
// using the bundled house model — runs on a timer as long as the app is open,
// persists to localStorage, and posts new items into any open NT5 iframe so
// the bundled site stays alive too. Subscribers (the FloatingInfo overlay,
// the ticker) get notified on every new batch.
//
// Honest scope: "while the app is open." True 24/7 across system reboots
// needs a background service / tray — not in this slice.

import { loadPrefs, subscribePrefs } from "../uiPrefs";
import { getOriginPulse } from "./originRealms";
import { ANCHORS as LORE_ANCHORS, loreContextBlock, STORYLINES } from "./nt5Lore";
import {
  enabledTopics, googleNewsUrl, redditUrl, parseGoogleNews, parseReddit,
  type Topic, type TopicHit,
} from "./nt5Topics";

export type WireArticle = {
  id: string;
  slug: string;
  title: string;
  body: string;
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

// Display name lookup — kept thin; the full bible lives in nt5Lore.
const ANCHORS: Record<string, string> = Object.fromEntries(
  Object.values(LORE_ANCHORS).map((a) => [a.id, a.name]),
);
const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);

const KEY = "nt5wire.articles";
// Topic seeds. Real-world threads + Nova Terris storylines mixed so every
// batch has both an Earth hook and an in-universe through-line.
const DEFAULT_TOPICS = ["Origin Realms", "Minecraft updates", "space + NASA", "AI", "viral creators", "gaming"];

const subs = new Set<(arts: WireArticle[]) => void>();

function readAll(): WireArticle[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as WireArticle[];
    if (!Array.isArray(arr)) return [];
    // Newest-first by publish time so the freshest real headlines lead.
    return arr.slice().sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
  } catch { return []; }
}
function writeAll(arts: WireArticle[]) {
  try { localStorage.setItem(KEY, JSON.stringify(arts.slice(0, 80))); } catch { /* ignore */ }
}

export function getWireArticles(): WireArticle[] {
  return readAll();
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
  "Pieces are 2-3 tight sentences each. Every piece MUST be in the assigned " +
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

export async function runWireOnce(count = 3): Promise<{ ok: boolean; added: WireArticle[]; error?: string }> {
  const topics = DEFAULT_TOPICS;
  // Feed live context to the wire so Dex's Origin Realms coverage tracks the
  // server's actual right-now state instead of being purely imagined.
  const pulse = getOriginPulse();
  const liveCtx = pulse
    ? `\nLIVE CONTEXT (real-time, use this in any Origin Realms item — especially Dex's): play.originrealms.com is ${pulse.online ? `online with ${pulse.players}/${pulse.max} players` : "offline"}; MOTD: "${pulse.motd}"; version: ${pulse.version}.`
    : "";
  // Sample a few rotating formats + shuffle the topic weighting so each batch
  // reads differently from the last. Recent headlines are passed back so the
  // model actively avoids repeating itself.
  const formats = [...STORY_FORMATS].sort(() => Math.random() - 0.5).slice(0, Math.min(count, 4));
  const weighted = [...topics].sort(() => Math.random() - 0.5);
  const recentTitles = readAll().slice(0, 12).map((a) => a.title);
  const avoidBlock = recentTitles.length
    ? `\nDo NOT repeat or lightly reword any of these recently-filed headlines:\n- ${recentTitles.join("\n- ")}`
    : "";
  // Pick one or two recurring storylines to advance this batch — so coverage
  // feels continuous, not memoryless.
  const pickedStorylines = [...STORYLINES].sort(() => Math.random() - 0.5).slice(0, 2);
  const res = await window.hub.llm.chat(
    SYSTEM,
    `Earth topics to weight (real, current-world), most important first: ${weighted.join(", ")}.${liveCtx}` +
    `\nNova Terris storylines to ADVANCE or REFERENCE in at least one item: ${pickedStorylines.map((s) => `\n- ${s}`).join("")}` +
    `\nUse a DIFFERENT story format for each item, drawn from: ${formats.join("; ")}.` +
    avoidBlock +
    `\nWrite ${count} fresh NT5 wire items now as JSON only.`,
    { temperature: 0.95 }
  );
  if (!res.ok) return { ok: false, added: [], error: res.error };
  const items = parseItems(res.text || "");
  const existing = readAll();
  const existingTitles = new Set(existing.map((a) => a.title.toLowerCase()));
  const now = new Date();
  const added: WireArticle[] = items.filter((i) => !existingTitles.has(i.title.toLowerCase())).map((i, k) => {
    const id = `wire-${Date.now()}-${k}`;
    return {
      id,
      slug: slugify(i.title) || id,
      title: i.title,
      body: i.body,
      category: i.category,
      anchor_id: i.anchor_id in ANCHORS ? i.anchor_id : "voss",
      author_display: ANCHORS[i.anchor_id] || ANCHORS.voss,
      published_at: now.toISOString(),
      created_at: now.toISOString(),
      voice_audio_url: null,
      is_broadcast: false,
      broadcast_segment: null,
      source_urls: [],
      topics: [],
    } as WireArticle;
  });
  if (added.length) {
    const merged = [...added, ...existing].slice(0, 80);
    writeAll(merged);
    subs.forEach((fn) => fn(merged));
    // Push fresh items into any open NT5 iframes so the bundled site stays alive.
    document.querySelectorAll("iframe").forEach((f) => {
      try { f.contentWindow?.postMessage({ type: "nt5-add-articles", articles: added }, "*"); } catch { /* ignore */ }
    });
  }
  return { ok: true, added };
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
  // Real, realtime news on the user's topics is the MAIN event — pull it
  // every tick regardless of whether the house model is ready (the snippet
  // itself is real; the model only re-voices it when available).
  await runRealWorldOnce(3).catch(() => undefined);
  // A little in-universe Nova Terris flavor on top, only when the model's up.
  try {
    const s = await window.hub.llm.status();
    if (s.ready) await runWireOnce(1).catch(() => undefined);
  } catch { /* ignore — wire stays quiet */ }
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

// Take a real headline + snippet and re-voice it into a tight 2-sentence
// brief in the topic's anchor. Falls back to the cleaned snippet if the model
// isn't ready so the item still lands as a real reference with its source.
async function fileRealItem(topic: Topic, hit: TopicHit): Promise<WireArticle | null> {
  const anchor = topic.anchor;
  let body = (hit.description || "").slice(0, 360);
  try {
    const s = await window.hub.llm.status();
    if (s.ready) {
      const a = LORE_ANCHORS[anchor] ?? LORE_ANCHORS.voss;
      const sys =
        `You are NT5 anchor ${a.name} (${a.role}). Voice: ${a.voice}\n` +
        `Re-voice a REAL current headline + snippet into a tight 2-sentence brief ` +
        `in your voice. Use ONLY facts present in the snippet — invent nothing. ` +
        `Keep it accurate; this is real news. No preamble, no markdown.`;
      const u = `TOPIC: ${topic.label}\nHEADLINE: ${hit.title}\nSNIPPET: ${hit.description || "(headline only)"}\nWrite the brief now.`;
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
