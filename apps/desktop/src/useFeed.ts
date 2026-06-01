import { useEffect, useRef, useState } from "react";
import { fetchFeed, localReminders, type FeedItem } from "./feeds";
import { nt5TickerItems } from "./embedded/nt5store";
import { brobotTickerItems } from "./embedded/brobotStore";
import { cpFeedItems, subscribeCpEvents } from "./controlPanelFeed";
import { ambientFeedItems, subscribeAmbient } from "./services/ambientNotifier";

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
      const all = [...ambientFeedItems(), ...cpFeedItems(), ...nt5TickerItems(), ...brobotTickerItems(), ...localReminders(), ...(await fetchFeed())];
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
    // Control Panel events trigger an immediate re-tick so the ticker and
    // toast notifications surface them right away.
    const unsubCp = subscribeCpEvents(() => { void tick(); });
    const unsubAmb = subscribeAmbient(() => { void tick(); });
    return () => {
      stop = true;
      clearInterval(iv);
      unsubCp();
      unsubAmb();
    };
  }, []);

  const dismiss = (id: string) => setToasts((t) => t.filter((x) => x.id !== id));
  return { items, toasts, dismiss };
}
