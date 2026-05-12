import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Panel, Stat } from "@/components/Panel";
import {
  Activity,
  Container,
  Cpu,
  Github,
  HardDrive,
  Rocket,
  ShieldCheck,
  Terminal,
  Workflow,
  Zap,
} from "lucide-react";

export default function Overview() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="// command center"
        title="Welcome back, Chuck"
        description="One sidebar, every service. All systems pulling power from the same outlet."
        actions={
          <>
            <button className="chuck-btn">
              <Terminal className="h-4 w-4 text-chuck-pink" />
              New session
            </button>
            <button className="chuck-btn">
              <Zap className="h-4 w-4 text-chuck-pink" />
              Run workflow
            </button>
          </>
        }
      />

      {/* Hero — NetworkChuck-flavored banner */}
      <section className="chuck-panel-hot relative overflow-hidden">
        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-chuck-pink">
              // status: caffeinated
            </div>
            <h2 className="mt-1 font-display text-2xl font-bold leading-tight">
              <span className="chuck-glow-text">Homelab online.</span>{" "}
              All 14 services reporting in.
            </h2>
            <p className="mt-2 max-w-xl font-mono text-xs text-chuck-mute">
              Proxmox cluster healthy · n8n running 23 active workflows · Cloudflare
              tunnels green · Twingate peers connected · Pi-hole blocked 12,430 queries
              today.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/ai" className="chuck-btn">
                <Terminal className="h-4 w-4 text-chuck-pink" />
                AI Terminal
              </Link>
              <Link href="/automation" className="chuck-btn">
                <Workflow className="h-4 w-4 text-chuck-pink" />
                Workflows
              </Link>
              <Link href="/homelab" className="chuck-btn">
                <Container className="h-4 w-4 text-chuck-pink" />
                Homelab
              </Link>
            </div>
          </div>
          <div className="relative hidden h-32 w-32 shrink-0 md:block">
            <div className="absolute inset-0 animate-pulseGlow rounded-full bg-chuck-red/20 blur-2xl" />
            <div className="relative h-full w-full overflow-hidden rounded-full border-2 border-chuck-red shadow-glow">
              <Image
                src="https://avatars.githubusercontent.com/u/14959748?v=4"
                alt="NetworkChuck"
                fill
                sizes="128px"
                className="object-cover"
                unoptimized
              />
            </div>
          </div>
        </div>
        <span className="chuck-strip absolute inset-x-0 bottom-0" />
      </section>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
        <Stat label="VMs Online" value="14" hint="2 clusters · Proxmox" glow />
        <Stat label="Containers" value="42" hint="38 running · 4 idle" />
        <Stat label="Workflows" value="23" hint="n8n · all green" glow />
        <Stat label="Tunnels" value="7" hint="Cloudflare · Twingate" />
        <Stat label="Ad-blocks" value="12.4k" hint="Pi-hole today" glow />
        <Stat label="PRs Open" value="6" hint="across 18 repos" />
      </div>

      {/* Module grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel
          title="AI Terminal"
          subtitle="Claude · Gemini · Codex · opencode"
          hot
          status="live"
          href="/ai"
          cta="Connect"
        >
          <div className="space-y-2">
            {[
              { name: "Claude Code", host: "vps-01.chuck.dev", load: "running" },
              { name: "Gemini CLI", host: "local", load: "idle" },
              { name: "Codex CLI", host: "vps-02.chuck.dev", load: "idle" },
              { name: "opencode", host: "studio.local", load: "running" },
            ].map((t) => (
              <div
                key={t.name}
                className="flex items-center justify-between rounded-sm border border-chuck-line/60 bg-black/30 px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Terminal className="h-3.5 w-3.5 text-chuck-pink" />
                  <span className="font-mono text-xs">{t.name}</span>
                  <span className="truncate font-mono text-[10px] text-chuck-mute">
                    {t.host}
                  </span>
                </div>
                <span
                  className={
                    t.load === "running" ? "chuck-chip-live" : "chuck-chip"
                  }
                >
                  {t.load}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Automation"
          subtitle="n8n self-hosted"
          status="ok"
          href="/automation"
          cta="Open n8n"
        >
          <div className="space-y-2">
            {[
              { name: "Terry — inbox triage", runs: 142, ok: true },
              { name: "Robin — dark web scan", runs: 38, ok: true },
              { name: "YT comment digest", runs: 76, ok: true },
              { name: "Homelab alerts → Discord", runs: 1240, ok: false },
            ].map((w) => (
              <div
                key={w.name}
                className="flex items-center justify-between rounded-sm border border-chuck-line/60 bg-black/30 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-xs">{w.name}</div>
                  <div className="font-mono text-[10px] text-chuck-mute">
                    {w.runs} runs · last 7d
                  </div>
                </div>
                <span
                  className={[
                    "h-2 w-2 rounded-full",
                    w.ok ? "bg-emerald-400" : "bg-chuck-red animate-pulseGlow",
                  ].join(" ")}
                />
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Homelab"
          subtitle="Proxmox · Docker · ZimaCube"
          status="ok"
          href="/homelab"
          cta="Inspect"
        >
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-sm border border-chuck-line/60 bg-black/30 p-2">
              <div className="flex items-center gap-1.5 text-chuck-mute">
                <Cpu className="h-3 w-3" />
                <span className="font-mono text-[10px] uppercase tracking-widest">
                  Proxmox CPU
                </span>
              </div>
              <div className="mt-1 chuck-glow-text font-mono text-lg">34%</div>
            </div>
            <div className="rounded-sm border border-chuck-line/60 bg-black/30 p-2">
              <div className="flex items-center gap-1.5 text-chuck-mute">
                <HardDrive className="h-3 w-3" />
                <span className="font-mono text-[10px] uppercase tracking-widest">
                  ZimaCube
                </span>
              </div>
              <div className="mt-1 font-mono text-lg">42 / 96 TB</div>
            </div>
            <div className="rounded-sm border border-chuck-line/60 bg-black/30 p-2">
              <div className="flex items-center gap-1.5 text-chuck-mute">
                <Container className="h-3 w-3" />
                <span className="font-mono text-[10px] uppercase tracking-widest">
                  Containers
                </span>
              </div>
              <div className="mt-1 font-mono text-lg">38 ↑</div>
            </div>
            <div className="rounded-sm border border-chuck-line/60 bg-black/30 p-2">
              <div className="flex items-center gap-1.5 text-chuck-mute">
                <Activity className="h-3 w-3" />
                <span className="font-mono text-[10px] uppercase tracking-widest">
                  Frigate
                </span>
              </div>
              <div className="mt-1 font-mono text-lg">6 cams</div>
            </div>
          </div>
        </Panel>

        <Panel
          title="Networking"
          subtitle="Twingate · Tailscale · Cloudflare"
          status="ok"
          href="/networking"
        >
          <ul className="space-y-1.5 font-mono text-xs">
            <li className="flex justify-between">
              <span>Twingate peers</span>
              <span className="chuck-glow-text">11 / 11</span>
            </li>
            <li className="flex justify-between">
              <span>Tailscale devices</span>
              <span>23 online</span>
            </li>
            <li className="flex justify-between">
              <span>Cloudflare tunnels</span>
              <span className="chuck-glow-text">7 healthy</span>
            </li>
            <li className="flex justify-between">
              <span>Traefik routers</span>
              <span>34 active</span>
            </li>
          </ul>
        </Panel>

        <Panel
          title="Dev & Deploy"
          subtitle="GitHub · Vercel · Supabase"
          status="ok"
          href="/dev"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-sm border border-chuck-line/60 bg-black/30 px-3 py-2">
              <div className="flex items-center gap-2">
                <Github className="h-3.5 w-3.5 text-chuck-pink" />
                <span className="font-mono text-xs">chuckhub</span>
              </div>
              <span className="chuck-chip">main · 2m ago</span>
            </div>
            <div className="flex items-center justify-between rounded-sm border border-chuck-line/60 bg-black/30 px-3 py-2">
              <div className="flex items-center gap-2">
                <Rocket className="h-3.5 w-3.5 text-chuck-pink" />
                <span className="font-mono text-xs">vercel · prod</span>
              </div>
              <span className="chuck-chip-live">Ready</span>
            </div>
            <div className="flex items-center justify-between rounded-sm border border-chuck-line/60 bg-black/30 px-3 py-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-chuck-pink" />
                <span className="font-mono text-xs">supabase · 12 tables</span>
              </div>
              <span className="chuck-chip">198 rows/min</span>
            </div>
          </div>
        </Panel>

        <Panel title="Recent Activity" subtitle="last 24h" status="idle">
          <ol className="space-y-2 font-mono text-[11px]">
            {[
              "[14:02] vercel: chuckhub deploy READY (prod)",
              "[13:48] n8n: Terry triaged 6 emails → labeled",
              "[12:11] proxmox: vm-204 migrated to node-02",
              "[11:55] frigate: motion @ front-door (person)",
              "[10:30] cloudflare: tunnel rotated successfully",
              "[09:14] pi-hole: blocklist refresh OK (138k entries)",
            ].map((line, i) => (
              <li
                key={i}
                className="border-l-2 border-chuck-red/60 pl-3 text-chuck-ink/80"
              >
                {line}
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  );
}
