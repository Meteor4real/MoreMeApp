import type { ReactNode } from "react";
import type { FeedItem } from "../feeds";

export function Ticker({ items, left }: { items: FeedItem[]; left?: ReactNode }) {
  const line =
    items.length > 0
      ? items.map((i) => `${i.source} · ${i.text}`)
      : ["NetworkChuck Hub online", "waiting for the wire…"];

  // Duplicate the content so the marquee loops seamlessly.
  const run = [...line, ...line];

  return (
    <div className="ticker-bar">
      {left}
      <span className="ticker-tag mono">WIRE</span>
      <div className="ticker-viewport">
        <div className="ticker-track">
          {run.map((t, i) => (
            <span className="ticker-item" key={i}>
              <span className="ticker-dot">◆</span>
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
