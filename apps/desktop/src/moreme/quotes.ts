// Quote-of-the-day picker over the user's own quote bank
// (state: customization.quotes, managed in Customize → Quotes). Nothing is
// seeded — the banner and quote widget stay hidden until the user adds one.

export type Quote = { text: string; by: string };

// Stable per-day pick: hashes the YYYY-MM-DD into an index. Same quote all
// day, fresh one tomorrow. Returns null when the list is empty so callers
// render nothing instead of crashing.
export function quoteOfDay(dateISO: string, list: Quote[]): Quote | null {
  if (!list.length) return null;
  let h = 0;
  for (let i = 0; i < dateISO.length; i++) h = ((h << 5) - h + dateISO.charCodeAt(i)) | 0;
  return list[Math.abs(h) % list.length];
}
