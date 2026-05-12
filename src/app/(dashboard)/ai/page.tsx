import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/Panel";
import { Terminal, Sparkles, Bot, Cpu } from "lucide-react";

const AGENTS = [
  {
    name: "Claude Code",
    desc: "Anthropic terminal agent. SSH bridge to vps-01.chuck.dev.",
    icon: Sparkles,
    badge: "running",
    host: "ssh chuck@vps-01.chuck.dev",
  },
  {
    name: "Gemini CLI",
    desc: "Google Gemini terminal client. Local install on studio-mac.",
    icon: Bot,
    badge: "idle",
    host: "studio-mac.local",
  },
  {
    name: "OpenAI Codex",
    desc: "Codex CLI on the burner VPS. Pair-prog buddy.",
    icon: Cpu,
    badge: "idle",
    host: "ssh chuck@vps-02.chuck.dev",
  },
  {
    name: "opencode",
    desc: "Open-source terminal AI IDE. Self-hosted.",
    icon: Terminal,
    badge: "running",
    host: "studio-mac.local",
  },
];

export default function AI() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="// ai terminal"
        title="AI Agents"
        description="Every CLI agent in one place. Pick one, hit connect, ship. Powered by SSH + xterm.js."
        actions={
          <button className="chuck-btn">
            <Terminal className="h-4 w-4 text-chuck-pink" />
            New Session
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {AGENTS.map((a) => {
          const Icon = a.icon;
          return (
            <Panel
              key={a.name}
              title={a.name}
              subtitle={a.host}
              status={a.badge === "running" ? "live" : "idle"}
              hot={a.badge === "running"}
              cta="Connect"
              href="#"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-chuck-red/40 bg-black shadow-glowSoft">
                  <Icon className="h-6 w-6 text-chuck-pink animate-pulseGlow" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs text-chuck-mute">{a.desc}</p>
                  <div className="mt-3 rounded-sm border border-chuck-line bg-black/60 p-2 font-mono text-[11px] text-chuck-ink">
                    <span className="text-chuck-pink">$</span> {a.host}
                  </div>
                </div>
              </div>
            </Panel>
          );
        })}
      </div>

      {/* Mock embedded terminal */}
      <Panel title="Live Session" subtitle="claude-code @ vps-01" status="live" hot>
        <div className="rounded-sm border border-chuck-line bg-black p-4 font-mono text-[12px] leading-relaxed">
          <pre className="text-chuck-ink/90 whitespace-pre-wrap">
{`chuck@vps-01:~$ claude
✻ Welcome to Claude Code, Chuck.
✻ Project: ~/homelab-iac
✻ Branch: main · clean

> deploy the new traefik config to node-02

I'll check the current state and roll out the change.
  • Read traefik/dynamic.yml
  • SSH into node-02
  • Reload traefik gracefully

`}<span className="chuck-glow-text">▮</span>
          </pre>
        </div>
      </Panel>
    </div>
  );
}
