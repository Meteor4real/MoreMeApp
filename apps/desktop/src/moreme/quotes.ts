// User-supplied quote bank — quotes you decide to add live in customization
// and rotate deterministically per day so the same line stays on Today all
// day, fresh one tomorrow.
//
// First-launch is empty. The Today quote banner + the quote widget hide
// themselves when there's nothing to show. Add quotes in Customize → Quotes.

export type Quote = { text: string; by: string };

export const QUOTES: Quote[] = [];

// Stable per-day pick: hashes the YYYY-MM-DD into an index. Returns null
// when the list is empty so callers can render nothing instead of crashing.
export function quoteOfDay(dateISO: string, list: Quote[] = QUOTES): Quote | null {
  if (!list.length) return null;
  let h = 0;
  for (let i = 0; i < dateISO.length; i++) h = ((h << 5) - h + dateISO.charCodeAt(i)) | 0;
  return list[Math.abs(h) % list.length];
}
