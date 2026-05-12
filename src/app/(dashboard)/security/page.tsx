import { PageHeader } from "@/components/PageHeader";
import { Panel, Stat } from "@/components/Panel";
import { ShieldAlert, Skull, Bug, Eye, AlertTriangle } from "lucide-react";

export default function Security() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="// security lab"
        title="Security Lab"
        description="Kali instances, Robin's dark web scrape jobs, alerting & audits. Educational use only — handle with gloves."
        actions={
          <button className="chuck-btn">
            <Skull className="h-4 w-4 text-chuck-pink" />
            New Scan
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Alerts (24h)" value="3" hint="1 critical" glow />
        <Stat label="Scans running" value="2" />
        <Stat label="CVEs tracked" value="48" hint="6 affecting stack" glow />
        <Stat label="Honeypot hits" value="1,204" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Robin — Dark Web Scraper" subtitle="educational · sandboxed" hot status="live">
          <p className="font-mono text-xs text-chuck-mute">
            Robin runs scheduled crawls against curated onion lists for credential
            leaks tied to your domains. Findings are encrypted at rest and rotated.
          </p>
          <ul className="mt-3 space-y-1.5 font-mono text-xs">
            <li className="flex items-center justify-between rounded-sm border border-chuck-line/60 bg-black/30 px-3 py-2">
              <span className="flex items-center gap-2"><Eye className="h-3.5 w-3.5 text-chuck-pink" />Job: networkchuck.dev leak watch</span>
              <span className="chuck-chip-live">running</span>
            </li>
            <li className="flex items-center justify-between rounded-sm border border-chuck-line/60 bg-black/30 px-3 py-2">
              <span className="flex items-center gap-2"><Eye className="h-3.5 w-3.5 text-chuck-pink" />Job: academy email watch</span>
              <span className="chuck-chip">idle · next 04:00</span>
            </li>
          </ul>
        </Panel>

        <Panel title="Kali Lab" subtitle="ssh: chuck@kali-lab" status="idle" href="#" cta="Connect">
          <div className="rounded-sm border border-chuck-line bg-black p-3 font-mono text-[12px]">
            <div className="text-chuck-pink">$ uname -a</div>
            <div className="text-chuck-ink/80">Linux kali-lab 6.6 #1 SMP Kali GNU/Linux Rolling</div>
            <div className="mt-2 text-chuck-pink">$ tools installed:</div>
            <div className="text-chuck-mute">
              nmap, metasploit, burp, sqlmap, gobuster, wireshark,
              hydra, john, hashcat, aircrack-ng …
            </div>
          </div>
        </Panel>

        <Panel title="Recent Alerts" subtitle="aggregated" status="warn" className="lg:col-span-2">
          <ul className="space-y-2 font-mono text-xs">
            {[
              { sev: "crit", src: "frigate", msg: "Unknown person at front-door · 03:14", icon: AlertTriangle },
              { sev: "warn", src: "pi-hole", msg: "Anomalous DNS volume from 10.0.0.42 · +320%", icon: ShieldAlert },
              { sev: "warn", src: "robin", msg: "Email 'chuck@…' appeared in fresh paste · verify", icon: Bug },
              { sev: "info", src: "cloudflare", msg: "Rate-limit triggered on /api/login (24/min)", icon: ShieldAlert },
            ].map((a, i) => {
              const Icon = a.icon;
              const color =
                a.sev === "crit"
                  ? "text-chuck-red border-chuck-red/40 animate-pulseGlow"
                  : a.sev === "warn"
                    ? "text-amber-300 border-amber-400/40"
                    : "text-chuck-mute border-chuck-line";
              return (
                <li key={i} className={`flex items-center gap-3 rounded-sm border bg-black/30 px-3 py-2 ${color}`}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="font-mono text-[10px] uppercase tracking-widest">{a.src}</span>
                  <span className="flex-1 text-chuck-ink">{a.msg}</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest opacity-70">{a.sev}</span>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
