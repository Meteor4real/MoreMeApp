// Unified feed: pulls real data from the deployed sites (CORS-free, via the
// main process) and turns it into ticker lines + notifications. Each site
// degrades to nothing if its endpoint is unreachable — no fake data.

export type FeedItem = {
  id: string;
  source: string; // "NT5", "MoreMe", ...
  text: string;
  kind: "news" | "ticker" | "reminder" | "system";
};

type Source = {
  source: string;
  url: string;
  map: (data: unknown) => FeedItem[];
};

const NT5 = "https://nt5-news.vercel.app";

const SOURCES: Source[] = [
  {
    source: "NT5",
    url: `${NT5}/api/ticker`,
    map: (data) => {
      const arr = Array.isArray(data) ? data : (data as { items?: unknown[] })?.items;
      if (!Array.isArray(arr)) return [];
      return arr
        .map((it, i) => {
          const t = (it as { text?: string }).text ?? String(it);
          const id = (it as { id?: string }).id ?? `nt5-tk-${i}-${t}`;
          return { id: `nt5:${id}`, source: "NT5", text: t, kind: "ticker" as const };
        })
        .filter((x) => x.text);
    },
  },
  {
    source: "NT5",
    url: `${NT5}/api/articles`,
    map: (data) => {
      const arr = Array.isArray(data) ? data : (data as { articles?: unknown[] })?.articles;
      if (!Array.isArray(arr)) return [];
      return arr.slice(0, 12).map((a, i) => {
        const title = (a as { title?: string }).title ?? "Untitled dispatch";
        const cat = (a as { category?: string }).category ?? "wire";
        const id = (a as { id?: string; slug?: string }).id ?? (a as { slug?: string }).slug ?? `art-${i}`;
        return {
          id: `nt5:art:${id}`,
          source: "NT5",
          text: `[${String(cat).toUpperCase()}] ${title}`,
          kind: "news" as const,
        };
      });
    },
  },
];

export async function fetchFeed(): Promise<FeedItem[]> {
  const results = await Promise.all(
    SOURCES.map(async (s) => {
      try {
        const r = await window.hub.fetchJson(s.url);
        if (!r.ok || r.data == null) return [];
        return s.map(r.data);
      } catch {
        return [];
      }
    })
  );
  return results.flat();
}

// Local, time-based reminders (e.g. MoreMe bedtime) — no network needed.
export function localReminders(now = new Date()): FeedItem[] {
  const items: FeedItem[] = [];
  const h = now.getHours();
  const dayKey = now.toISOString().slice(0, 10);
  if (h >= 22 || h < 4) {
    items.push({
      id: `moreme:bedtime:${dayKey}`,
      source: "MoreMe",
      text: "Lights out by 10:00 — wind down, set tomorrow's top 3, screens off.",
      kind: "reminder",
    });
  }
  return items;
}
