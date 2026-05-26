import { useEffect } from "react";
import type { FeedItem } from "../feeds";

export function Notifications({
  toasts,
  onDismiss,
}: {
  toasts: FeedItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <Toast key={t.id} item={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function Toast({ item, onDismiss }: { item: FeedItem; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const x = setTimeout(() => onDismiss(item.id), 7000);
    return () => clearTimeout(x);
  }, [item.id, onDismiss]);

  return (
    <div className="toast panel">
      <div className="toast-src mono glow-text">{item.source}</div>
      <div className="toast-text">{item.text}</div>
      <button className="toast-x" onClick={() => onDismiss(item.id)}>
        ✕
      </button>
    </div>
  );
}
