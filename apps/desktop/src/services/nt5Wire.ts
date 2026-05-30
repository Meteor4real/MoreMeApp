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

export type WireArticle = {
  id: string;
  slug: string;
  title: string;
  body: string;
  category: string;        // "breaking" | "latest" | "earth_trending" | "gaming" | "space" | "cc_lore" | "culture" | "tech"
  anchor_id: string;       // "voss" | "zara" | "dex" | "lena" | "orin"
  author_display: string;
  published_at: string;    // ISO
  created_at: string;
  voice_audio_url: null;
  is_broadcast: false;
  broadcast_segment: null;
  source_urls: [];
  topics: string[];
};

const ANCHORS: Record<string, string> = {
  voss: "Voss Calloway", zara: "Zip Kindle", dex: "Dex Morrow", lena: "Lena Faust", orin: "Orion Vale",
};
const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);

const KEY = "nt5wire.articles";
const DEFAULT_TOPICS = ["Origin Realms", "Minecraft updates", "space + NASA", "AI", "viral creators", "gaming", "Antrosa Belt", "Azulbright telemetry"];

const subs = new Set<(arts: WireArticle[]) => void>();

function readAll(): WireArticle[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as WireArticle[];
    return Array.isArray(arr) ? arr : [];
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

const SYSTEM =
  "You are the NT5 (Nova Terris 5) wire desk for S.P.A.C.E. News — slick, " +
  "professional sci-fi news, real (CNN in space). Write items about REAL " +
  "current-world topics in the assigned anchor's voice. Anchors: voss " +
  "(lead/breaking), zara (culture/earth_trending), dex (gaming — Minecraft, " +
  "Origin Realms, Hypixel), lena (field/breaking), orin (space/tech). " +
  "Categories: breaking, latest, earth_trending, gaming, space, tech, culture, cc_lore. " +
  "Return ONLY a JSON array, no prose: " +
  '[{"category","anchor_id","title","body"}]. Body = 2-3 tight sentences. ' +
  "Do not invent specific unverifiable breaking claims; keep it plausible.";

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
  const res = await window.hub.llm.chat(
    SYSTEM,
    `Topics to weight, most important first: ${topics.join(", ")}.${liveCtx}\nWrite ${count} fresh NT5 wire items now as JSON only.`
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
  try {
    const s = await window.hub.llm.status();
    if (!s.ready) return;
    await runWireOnce(3);
    // After every house-model run, also pull real-world headlines from a
    // few public RSS feeds and convert them into anchor-voiced items.
    // This is the "accurate reporting" path — the items reference real
    // current events, just filed in the NT5 anchor's voice.
    await runRealWorldOnce(2).catch(() => undefined);
  } catch { /* ignore — wire stays quiet */ }
}

// ---------------------------------------------------------------------------
// Real-world news source. Pulls a handful of public RSS feeds (Hacker News,
// NASA, BBC tech, Ars), parses them, picks fresh headlines, and rewrites
// each into a 2-sentence NT5-anchor brief. Items get filed with a sourceUrl
// pointing back to the original article so they're verifiably real.
// ---------------------------------------------------------------------------

const REAL_FEEDS: { url: string; topic: string; anchor: string; category: string }[] = [
  { url: "https://hnrss.org/frontpage?count=8",          topic: "tech / startups", anchor: "orin", category: "tech" },
  { url: "https://www.nasa.gov/feed/",                   topic: "space",           anchor: "lena", category: "space" },
  { url: "https://feeds.bbci.co.uk/news/technology/rss.xml", topic: "technology",  anchor: "orin", category: "tech" },
  { url: "https://feeds.arstechnica.com/arstechnica/index/", topic: "deep tech",   anchor: "orin", category: "tech" },
];

type RealHit = { title: string; link: string; pubDate?: string; description?: string };

function parseRss(xml: string): RealHit[] {
  const out: RealHit[] = [];
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
    const title = pick("title");
    const link = pick("link");
    if (!title || !link) continue;
    out.push({ title, link, pubDate: pick("pubDate"), description: pick("description") });
    if (out.length >= 6) break;
  }
  return out;
}

async function fetchFeed(url: string): Promise<RealHit[]> {
  const r = await window.hub.net({ method: "GET", url, headers: { "User-Agent": "Mozilla/5.0 NetworkChuckHub" } });
  if (!r.ok || typeof r.data !== "string") return [];
  return parseRss(r.data);
}

export async function runRealWorldOnce(perFeed = 2): Promise<{ ok: boolean; added: WireArticle[]; error?: string }> {
  const existing = readAll();
  const existingTitles = new Set(existing.map((a) => a.title.toLowerCase()));
  const added: WireArticle[] = [];
  for (const feed of REAL_FEEDS) {
    let hits: RealHit[] = [];
    try { hits = await fetchFeed(feed.url); } catch { continue; }
    const fresh = hits.filter((h) => !existingTitles.has(h.title.toLowerCase())).slice(0, perFeed);
    for (const h of fresh) {
      const filed = await fileRealItem(feed.anchor, feed.category, h);
      if (filed) {
        added.push(filed);
        existingTitles.add(filed.title.toLowerCase());
      }
    }
  }
  if (added.length) {
    const merged = [...added, ...existing].slice(0, 80);
    writeAll(merged);
    subs.forEach((fn) => fn(merged));
    document.querySelectorAll("iframe").forEach((f) => {
      try { f.contentWindow?.postMessage({ type: "nt5-add-articles", articles: added }, "*"); } catch { /* ignore */ }
    });
  }
  return { ok: true, added };
}

// Take a real headline + snippet and rewrite it into a 2-sentence anchor
// brief. Falls back to the original snippet if the model isn't available so
// the item still lands as a real-world reference with its source link.
async function fileRealItem(anchor: string, category: string, hit: RealHit): Promise<WireArticle | null> {
  let body = (hit.description || "").slice(0, 320);
  try {
    const s = await window.hub.llm.status();
    if (s.ready) {
      const sys = `You are NT5 anchor ${ANCHORS[anchor] || "Voss Calloway"}. Rewrite a real headline + snippet as a tight 2-sentence brief in your voice. No invented details — only what's in the snippet. End neutrally.`;
      const u = `HEADLINE: ${hit.title}\nSNIPPET: ${hit.description || ""}\nWrite the brief now (2 sentences, no preamble, no markdown).`;
      const r = await window.hub.llm.chat(sys, u);
      if (r.ok && r.text) body = r.text.trim().replace(/^["']|["']$/g, "");
    }
  } catch { /* keep snippet */ }
  if (!body) return null;
  const now = new Date(hit.pubDate ? Date.parse(hit.pubDate) : Date.now());
  const id = `real-${now.getTime()}-${slugify(hit.title).slice(0, 12)}`;
  return {
    id,
    slug: slugify(hit.title) || id,
    title: hit.title,
    body,
    category,
    anchor_id: anchor in ANCHORS ? anchor : "voss",
    author_display: ANCHORS[anchor] || ANCHORS.voss,
    published_at: now.toISOString(),
    created_at: now.toISOString(),
    voice_audio_url: null,
    is_broadcast: false,
    broadcast_segment: null,
    source_urls: [hit.link] as unknown as [],
    topics: [],
  };
}
