import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {eyebrow && (
            <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.3em] text-chuck-mute">
              {eyebrow}
            </div>
          )}
          <h1 className="font-display text-3xl font-bold tracking-tight">
            <span className="chuck-glow-text">{title.split(" ")[0]}</span>{" "}
            <span>{title.split(" ").slice(1).join(" ")}</span>
          </h1>
          {description && (
            <p className="mt-1 max-w-3xl font-mono text-xs text-chuck-mute">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <span className="chuck-strip-thin mt-4 block" />
    </div>
  );
}
