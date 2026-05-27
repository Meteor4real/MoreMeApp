// NT5 embedded newsroom store + wire generator. Real always-on reporting:
// the wire generates fresh items in the anchor desk's voices, weighted by the
// user's topics, using the local house model (node-llama-cpp) — no API key.
// Persisted locally; also surfaced in the unified ticker.
export type Anchor = { id: string; name: string; role: string; cats: string[] };
export const ANCHORS: Anchor[] = [
  { id: "voss", name: "Voss Calloway", role: "Lead anchor", cats: ["breaking", "latest", "cc_lore"] },
  { id: "zara", name: "Zara Kindle", role: "Co-anchor", cats: ["earth_trending", "culture"] },
  { id: "dex", name: "Dex Morrow", role: "Gaming", cats: ["gaming"] },
  { id: "lena", name: "Lena Faust", role: "Field / breaking", cats: ["breaking"] },
  { id: "orin", name: "Orin Vale", role: "Tech & space", cats: ["space", "tech"] },
];

export type Article = {
  id: string;
  category: string;
  anchor: string;
  title: string;
  body: string;
  ts: number;
};

export type NT5State = { topics: string[]; articles: Article[] };

const KEY = "nchub.nt5.v1";
const DEFAULT_TOPICS = ["Origin Realms", "Minecraft updates", "space & NASA", "AI", "gaming", "viral creators"];

export function loadNT5(): NT5State {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "");
    if (s && Array.isArray(s.articles)) return { topics: s.topics?.length ? s.topics : DEFAULT_TOPICS, articles: s.articles };
  } catch {
    /* ignore */
  }
  return { topics: DEFAULT_TOPICS, articles: [] };
}
export function saveNT5(s: NT5State) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...s, articles: s.articles.slice(0, 60) }));
  } catch {
    /* ignore */
  }
}

// The wire runs on the local house model — always available (downloads on
// first use). Kept for the UI; the model readiness is surfaced via status.
export function nt5Wired(): boolean {
  return true;
}

const SYSTEM =
  "You are the NT5 (Nova Terris 5) wire desk for S.P.A.C.E. News — slick, " +
  "professional sci-fi news, real (CNN in space). Write items about REAL " +
  "current-world topics in the assigned anchor's voice. Anchors: Voss " +
  "(lead/breaking), Zara (culture/earth_trending), Dex (gaming — Minecraft, " +
  "Origin Realms, Hypixel), Lena (field/breaking), Orin (space/tech). " +
  "Categories: breaking, latest, earth_trending, gaming, space, tech, culture. " +
  "Return ONLY a JSON array, no prose: " +
  '[{"category","anchor","title","body"}]. Body = 2-3 tight sentences. ' +
  "Do not invent specific unverifiable breaking claims; keep it plausible and " +
  "grounded in what's generally known.";

function parseItems(text: string): Omit<Article, "id" | "ts">[] {
  let t = text.trim().replace(/^```(json)?/i, "").replace(/```$/,"").trim();
  const a = t.indexOf("[");
  const b = t.lastIndexOf("]");
  if (a >= 0 && b > a) t = t.slice(a, b + 1);
  try {
    const arr = JSON.parse(t);
    if (Array.isArray(arr)) {
      return arr
        .filter((x) => x && x.title && x.body)
        .map((x) => ({
          category: String(x.category || "latest"),
          anchor: String(x.anchor || "Voss Calloway"),
          title: String(x.title),
          body: String(x.body),
        }));
    }
  } catch {
    /* ignore */
  }
  return [];
}

// Runs one wire scan. Returns the new articles added (deduped by title).
export async function runWire(count = 3): Promise<{ ok: boolean; added: Article[]; error?: string }> {
  const state = loadNT5();
  const res = await window.hub.llm.chat(
    SYSTEM,
    `Topics to weight, most important first: ${state.topics.join(", ")}. Write ${count} fresh NT5 wire items now as JSON only.`
  );
  if (!res.ok) return { ok: false, added: [], error: res.error };
  const items = parseItems(res.text || "");
  const existing = new Set(state.articles.map((a) => a.title.toLowerCase()));
  const added: Article[] = items
    .filter((i) => !existing.has(i.title.toLowerCase()))
    .map((i, k) => ({ ...i, id: `${Date.now()}-${k}`, ts: Date.now() }));
  if (added.length) saveNT5({ topics: state.topics, articles: [...added, ...state.articles] });
  return { ok: true, added };
}

// For the unified ticker.
export function nt5TickerItems(): { id: string; source: string; text: string; kind: "news" }[] {
  return loadNT5()
    .articles.slice(0, 10)
    .map((a) => ({
      id: `nt5local:${a.id}`,
      source: "NT5",
      text: `[${a.category.toUpperCase()}] ${a.title}`,
      kind: "news" as const,
    }));
}
