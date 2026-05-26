// BroBot embedded — local-first gallery store. Images live on this device
// (localStorage). Its AI is the on-call group-chat bot; here we cover BroBot's
// core tools: key-free image search + save/curate the gallery.

export type Reaction = "like" | "dislike" | null;
export type GalleryItem = {
  id: string;
  url: string;
  title: string;
  tags: string[];
  reaction: Reaction;
  ts: number;
};

const KEY = "nchub.brobot.v1";

export function loadGallery(): GalleryItem[] {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(s) ? s : [];
  } catch {
    return [];
  }
}
export function saveGallery(items: GalleryItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, 500)));
  } catch {
    /* ignore */
  }
}

export function brobotTickerItems(): { id: string; source: string; text: string; kind: "system" }[] {
  return loadGallery()
    .slice(0, 6)
    .map((i) => ({ id: `brobot:${i.id}`, source: "BroBot", text: `saved “${i.title || "image"}” to the gallery`, kind: "system" as const }));
}

// Key-free image search via Openverse (CC-licensed media, no API key).
export async function searchImages(q: string): Promise<{ url: string; thumb: string; title: string }[]> {
  if (!q.trim()) return [];
  const r = await window.hub.net({
    method: "GET",
    url: `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=30`,
    headers: { Accept: "application/json" },
  });
  if (!r.ok || !r.data) return [];
  const results = (r.data as { results?: { url?: string; thumbnail?: string; title?: string }[] }).results || [];
  return results
    .filter((x) => x.url)
    .map((x) => ({ url: x.url as string, thumb: x.thumbnail || (x.url as string), title: x.title || "untitled" }));
}
