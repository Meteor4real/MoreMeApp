import type { ProviderType } from "./agents";

// Per-agent provider config. Stored locally for now; a later slice moves the
// keys into the encrypted Control Panel token vault (Supabase-backed).
// "cli" = the agent is a command-line tool launched in the Terminal (Claude
// Code, Gemini CLI, Codex, OpenCode, or an ssh to Hermes on Hostinger); the
// app runs it non-interactively and shows the output in chat. "api" = direct
// HTTP to a provider with a key.
export type Transport = "cli" | "api";

export type AgentConfig = {
  enabled: boolean;
  transport?: Transport; // default "cli" for external agents
  cmd?: string;          // CLI command; {prompt} is substituted, else appended
  provider: ProviderType;
  endpoint?: string;
  apiKey?: string;
  model?: string;
};

const KEY = "nchub.ai.config.v1";

export type ConfigMap = Record<string, AgentConfig>;

export function loadConfig(): ConfigMap {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") as ConfigMap;
  } catch {
    return {};
  }
}

export function saveConfig(cfg: ConfigMap): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg));
  } catch {
    /* ignore */
  }
}

export function isWired(c?: AgentConfig): boolean {
  if (!c || !c.enabled) return false;
  if (c.transport === "cli") return !!(c.cmd && c.cmd.trim());
  if (c.provider === "http") return !!c.endpoint;
  return !!c.apiKey;
}
