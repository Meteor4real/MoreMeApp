import { Sparkles } from "lucide-react";

export function ComingSoon({
  title,
  preview,
}: {
  title: string;
  preview: string[];
}) {
  return (
    <div className="rounded-sm border border-dashed border-chuck-line bg-black/30 p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-chuck-pink" />
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-chuck-pink">
          // coming soon
        </span>
      </div>
      <h3 className="mt-2 font-display text-lg font-bold text-chuck-ink">
        {title}
      </h3>
      <p className="mt-2 font-mono text-xs text-chuck-mute">
        Manage UI for {title} is on the way. When it lands you&apos;ll be able to:
      </p>
      <ul className="mt-3 space-y-1 font-mono text-xs text-chuck-ink">
        {preview.map((p, i) => (
          <li key={i} className="flex gap-2">
            <span className="chuck-glow-text">›</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
