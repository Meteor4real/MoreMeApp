import { PageHeader } from "@/components/PageHeader";
import { Panel, Stat } from "@/components/Panel";
import { Workflow, Zap, ExternalLink, AlertTriangle } from "lucide-react";

const WORKFLOWS = [
  { name: "Terry — Inbox Triage", trigger: "Gmail webhook", runs7d: 142, ok: true, last: "2m ago" },
  { name: "Robin — Dark Web Scan", trigger: "Cron · 6h", runs7d: 38, ok: true, last: "1h ago" },
  { name: "YouTube Comment Digest", trigger: "Cron · daily 09:00", runs7d: 7, ok: true, last: "3h ago" },
  { name: "Homelab Alerts → Discord", trigger: "Webhook", runs7d: 1240, ok: false, last: "12m ago" },
  { name: "Sponsor Tracker", trigger: "Stripe webhook", runs7d: 22, ok: true, last: "20m ago" },
  { name: "Claude Context Sync", trigger: "GitHub push", runs7d: 84, ok: true, last: "5m ago" },
];

export default function Automation() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="// n8n"
        title="Automation"
        description="Every workflow Terry and Robin are running, plus the rest of the n8n zoo."
        actions={
          <>
            <button className="chuck-btn">
              <Zap className="h-4 w-4 text-chuck-pink" />
              New Workflow
            </button>
            <a className="chuck-btn" href="#" target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4 text-chuck-pink" />
              Open n8n
            </a>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Active" value="23" glow />
        <Stat label="Runs (7d)" value="1,513" />
        <Stat label="Failures (7d)" value="2" hint="auto-retried" />
        <Stat label="Avg. duration" value="412ms" glow />
      </div>

      <Panel title="Workflows" subtitle="self-hosted · v1.74" status="ok">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-chuck-line/60 text-[10px] uppercase tracking-widest text-chuck-mute">
              <th className="py-2 font-mono font-normal">Name</th>
              <th className="py-2 font-mono font-normal">Trigger</th>
              <th className="py-2 font-mono font-normal">Runs (7d)</th>
              <th className="py-2 font-mono font-normal">Last</th>
              <th className="py-2 font-mono font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {WORKFLOWS.map((w) => (
              <tr
                key={w.name}
                className="border-b border-chuck-line/30 font-mono text-xs hover:bg-black/30"
              >
                <td className="py-2.5">
                  <div className="flex items-center gap-2">
                    <Workflow className="h-3.5 w-3.5 text-chuck-pink" />
                    {w.name}
                  </div>
                </td>
                <td className="py-2.5 text-chuck-mute">{w.trigger}</td>
                <td className="py-2.5">{w.runs7d.toLocaleString()}</td>
                <td className="py-2.5 text-chuck-mute">{w.last}</td>
                <td className="py-2.5">
                  {w.ok ? (
                    <span className="chuck-chip text-emerald-300 border-emerald-400/30">
                      OK
                    </span>
                  ) : (
                    <span className="chuck-chip-live flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Failing
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="n8n ↔ Claude SSH bridge" subtitle="live link" status="live" hot>
        <p className="font-mono text-xs text-chuck-mute">
          n8n forwards events to a Claude Code session over SSH for triage. When
          something fires that needs a human, Claude opens an issue and pings
          you. Currently connected to{" "}
          <span className="chuck-glow-text">vps-01.chuck.dev</span>.
        </p>
      </Panel>
    </div>
  );
}
