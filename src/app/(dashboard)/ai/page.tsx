import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/Panel";
import { NotConfigured } from "@/components/EmptyState";
import { requireAccount } from "@/lib/auth";
import { hasServiceToken } from "@/lib/tokens";
import { Bot, Cpu, ExternalLink, Sparkles, Terminal } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Agent = {
  name: string;
  description: string;
  envKey: string;
  hostEnv: string;
  icon: typeof Sparkles;
};

const AGENTS: Agent[] = [
  {
    name: "Claude Code",
    description:
      "Anthropic's terminal coding agent. Configure an SSH host so the in-browser terminal can connect.",
    envKey: "CLAUDE_SSH_HOST",
    hostEnv: "CLAUDE_SSH_HOST",
    icon: Sparkles,
  },
  {
    name: "Gemini CLI",
    description: "Google's terminal Gemini client. Runs over SSH to wherever you've installed it.",
    envKey: "CLAUDE_SSH_HOST",
    hostEnv: "CLAUDE_SSH_HOST",
    icon: Bot,
  },
  {
    name: "OpenAI Codex",
    description: "Codex CLI for shell-driven pair programming over SSH.",
    envKey: "CLAUDE_SSH_HOST",
    hostEnv: "CLAUDE_SSH_HOST",
    icon: Cpu,
  },
  {
    name: "opencode",
    description: "Open-source terminal AI IDE. Bring your own host.",
    envKey: "CLAUDE_SSH_HOST",
    hostEnv: "CLAUDE_SSH_HOST",
    icon: Terminal,
  },
];

export default async function AI() {
  const account = await requireAccount();
  const host = process.env.CLAUDE_SSH_HOST ?? null;
  const tokenSaved = await hasServiceToken(account.id, "CLAUDE_SSH_HOST");
  const ready = !!host || tokenSaved;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="// ai terminal"
        title="AI Agents"
        description="An in-browser terminal launcher for CLI agents over SSH. Wire an SSH bridge to enable real sessions."
      />

      {!ready && (
        <Panel title="SSH bridge required" subtitle="not configured" status="idle" hot>
          <NotConfigured
            service="SSH bridge"
            envKey="CLAUDE_SSH_HOST"
            description="Add a host (e.g. ssh-bridge.example.com) reachable over the public internet or via Tailscale Funnel. The terminal launcher needs a websocket-to-SSH relay running there."
          />
          <p className="mt-3 font-mono text-xs text-chuck-mute">
            Until the bridge is up, this page won&apos;t pretend a session is
            live. No fake terminals.
          </p>
        </Panel>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {AGENTS.map((a) => {
          const Icon = a.icon;
          return (
            <Panel
              key={a.name}
              title={a.name}
              subtitle={ready ? host ?? "saved in vault" : "not connected"}
              status={ready ? "ok" : "idle"}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-chuck-red/40 bg-black shadow-glowSoft">
                  <Icon className="h-6 w-6 text-chuck-pink" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs text-chuck-mute">
                    {a.description}
                  </p>
                  {ready ? (
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        disabled
                        className="chuck-btn opacity-60"
                        title="Terminal relay not yet implemented"
                      >
                        <Terminal className="h-3.5 w-3.5 text-chuck-pink" />
                        Connect (coming soon)
                      </button>
                      <a
                        href={`https://${host}`}
                        target="_blank"
                        rel="noreferrer"
                        className="chuck-btn"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-chuck-pink" />
                        Open host
                      </a>
                    </div>
                  ) : (
                    <Link href="/settings" className="mt-3 inline-flex chuck-btn">
                      Save SSH host
                    </Link>
                  )}
                </div>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
