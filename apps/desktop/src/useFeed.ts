import { useEffect, useRef, useState } from "react";
import { fetchFeed, localReminders, type FeedItem } from "./feeds";
import { nt5TickerItems } from "./embedded/nt5store";
import { brobotTickerItems } from "./embedded/brobotStore";

const SEEN_KEY = "nchub.feed.seen.v1";
const POLL_MS = 4 * 60 * 1000;

function loadSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]") as string[]);
  } catch {
    return new Set();
  }
}

// Polls the unified feed; surfaces ticker items + toast notifications for
// items that appear AFTER the first load (so startup doesn't spam toasts).
export function useFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [toasts, setToasts] = useState<FeedItem[]>([]);
  const seen = useRef<Set<string>>(loadSeen());
  const first = useRef(true);

  useEffect(() => {
    let stop = false;

    async function tick() {
      const all = [...nt5TickerItems(), ...brobotTickerItems(), ...localReminders(), ...(await fetchFeed())];
      if (stop) return;
      setItems(all);

      const fresh = all.filter((i) => !seen.current.has(i.id));
      fresh.forEach((i) => seen.current.add(i.id));
      const arr = [...seen.current];
      if (arr.length > 500) seen.current = new Set(arr.slice(-300));
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify([...seen.current]));
      } catch {
        /* ignore */
      }

      if (!first.current && fresh.length) {
        setToasts((t) => [...t, ...fresh.slice(0, 4)]);
      }
      first.current = false;
    }

    tick();
    const iv = setInterval(tick, POLL_MS);
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, []);

  const dismiss = (id: string) => setToasts((t) => t.filter((x) => x.id !== id));
  return { items, toasts, dismiss };
}
