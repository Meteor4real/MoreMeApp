import type { ProviderType } from "./agents";

// Per-agent transport. "house" = the bundled local model (no key, downloaded
// on first launch) — used by BroBot, the NT5 anchors, and any other in-app
// persona. "cli" = a command-line tool you launch in the Terminal (Claude
// Code, Gemini CLI, Codex, OpenCode, an ssh to Hermes on Hostinger…). "api" =
// direct HTTP to a provider with a key. Agents default to whichever transport
// makes sense for them; users can flip any of them to a different one.
export type Transport = "house" | "cli" | "api";

export type AgentConfig = {
  enabled: boolean;
  transport?: Transport;
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
  // No config object yet: the agent's default transport is consulted by the
  // caller (see effectiveTransport in agents.ts). We treat "no entry" as
  // wired-if-house-default, handled by the caller.
  if (!c) return false;
  if (c.enabled === false) return false;
  if (c.transport === "house") return true;
  if (c.transport === "cli") return !!(c.cmd && c.cmd.trim());
  if (c.transport === "api") return c.provider === "http" ? !!c.endpoint : !!c.apiKey;
  // legacy entries with no transport set: fall back to api-style checks
  if (c.provider === "http") return !!c.endpoint;
  return !!c.apiKey;
}
