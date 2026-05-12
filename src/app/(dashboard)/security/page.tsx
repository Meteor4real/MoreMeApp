import { PageHeader } from "@/components/PageHeader";
import { Panel, Stat } from "@/components/Panel";
import { listAlerts } from "@/lib/alerts";
import { requireAccount } from "@/lib/auth";
import { AlertTriangle, ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Security() {
  await requireAccount();
  const alerts = await listAlerts(50);
  const crit = alerts.filter((a) => a.severity === "crit").length;
  const warn = alerts.filter((a) => a.severity === "warn").length;
  const info = alerts.filter((a) => a.severity === "info").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="// security"
        title="Security & Alerts"
        description="Anything posted to POST /api/alerts is aggregated here. Wire Frigate, Pi-hole, Cloudflare, or n8n to send events."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Total alerts" value={alerts.length} hint="all time" glow />
        <Stat label="Critical" value={crit} hint="severity = crit" />
        <Stat label="Warn" value={warn} hint="severity = warn" />
        <Stat label="Info" value={info} hint="severity = info" />
      </div>

      <Panel
        title="Alert feed"
        subtitle={`${alerts.length} ingested`}
        status={crit > 0 ? "warn" : "ok"}
        hot={crit > 0}
      >
        {alerts.length === 0 ? (
          <div className="rounded-sm border border-dashed border-chuck-line bg-black/30 p-4 font-mono text-xs text-chuck-mute">
            No alerts ingested yet.
            <pre className="mt-3 overflow-x-auto rounded-sm border border-chuck-line bg-black p-3 text-[11px] text-chuck-ink">{`curl -X POST $URL/api/alerts \\
  -H 'authorization: Bearer $CHUCKHUB_SECRET' \\
  -H 'content-type: application/json' \\
  -d '{"source":"frigate","severity":"warn","message":"motion @ front-door"}'`}</pre>
          </div>
        ) : (
          <ul className="space-y-2 font-mono text-xs">
            {alerts.map((a) => {
              const color =
                a.severity === "crit"
                  ? "text-chuck-red border-chuck-red/40 animate-pulseGlow"
                  : a.severity === "warn"
                  ? "text-amber-300 border-amber-400/40"
                  : "text-chuck-mute border-chuck-line";
              const Icon = a.severity === "crit" ? AlertTriangle : ShieldAlert;
              return (
                <li
                  key={a.id}
                  className={`flex items-center gap-3 rounded-sm border bg-black/30 px-3 py-2 ${color}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="font-mono text-[10px] uppercase tracking-widest">
                    {a.source}
                  </span>
                  <span className="flex-1 text-chuck-ink">{a.message}</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest opacity-70">
                    {a.severity}
                  </span>
                  <span className="font-mono text-[10px] text-chuck-mute">
                    {new Date(a.created_at).toLocaleString()}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
