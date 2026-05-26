import Link from "next/link";
import { KeyRound } from "lucide-react";

export function NotConfigured({
  service,
  envKey,
  description,
}: {
  service: string;
  envKey: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-sm border border-dashed border-chuck-line bg-black/30 px-4 py-6">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-chuck-mute" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-chuck-mute">
          {service} · not configured
        </span>
      </div>
      <p className="font-mono text-xs text-chuck-mute">
        {description || `Add a token for ${service} to see live data here.`}{" "}
        Required env key: <span className="text-chuck-ink">{envKey}</span>.
      </p>
      <Link href="/settings" className="chuck-btn">
        Add token
      </Link>
    </div>
  );
}

export function IntegrationError({
  service,
  error,
}: {
  service: string;
  error: string;
}) {
  return (
    <div className="rounded-sm border border-chuck-red/40 bg-chuck-red/5 px-4 py-3">
      <div className="font-mono text-[10px] uppercase tracking-widest text-chuck-pink">
        {service} · request failed
      </div>
      <p className="mt-1 font-mono text-xs text-chuck-mute">{error}</p>
    </div>
  );
}
