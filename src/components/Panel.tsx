import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

type Props = {
  title: string;
  subtitle?: string;
  hot?: boolean;
  href?: string;
  cta?: string;
  status?: "live" | "ok" | "warn" | "down" | "idle";
  children: ReactNode;
  className?: string;
};

const STATUS_COLOR: Record<NonNullable<Props["status"]>, string> = {
  live: "bg-chuck-red shadow-glow",
  ok: "bg-emerald-400",
  warn: "bg-amber-400",
  down: "bg-rose-600",
  idle: "bg-chuck-mute",
};

export function Panel({
  title,
  subtitle,
  hot,
  href,
  cta,
  status,
  children,
  className = "",
}: Props) {
  return (
    <section className={[hot ? "chuck-panel-hot" : "chuck-panel", "overflow-hidden", className].join(" ")}>
      <header className="flex items-center justify-between border-b border-chuck-line/70 bg-black/30 px-4 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          {status && (
            <span
              className={[
                "h-2 w-2 shrink-0 rounded-full",
                STATUS_COLOR[status],
                status === "live" ? "animate-pulseGlow" : "",
              ].join(" ")}
            />
          )}
          <h3 className="chuck-title text-xs">{title}</h3>
          {subtitle && (
            <span className="hidden truncate font-mono text-[10px] uppercase tracking-widest text-chuck-mute sm:inline">
              · {subtitle}
            </span>
          )}
        </div>
        {href && (
          <Link
            href={href}
            className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-chuck-mute hover:text-chuck-pink"
          >
            {cta ?? "Open"}
            <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </header>
      <span className="chuck-strip-thin" />
      <div className="relative p-4">{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  glow,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  glow?: boolean;
}) {
  return (
    <div className="rounded-sm border border-chuck-line/70 bg-black/30 p-3">
      <div className="font-mono text-[10px] uppercase tracking-widest text-chuck-mute">
        {label}
      </div>
      <div
        className={[
          "mt-1 font-display text-2xl font-semibold",
          glow ? "chuck-glow-text" : "text-chuck-ink",
        ].join(" ")}
      >
        {value}
      </div>
      {hint && (
        <div className="mt-0.5 font-mono text-[10px] text-chuck-mute">{hint}</div>
      )}
    </div>
  );
}
