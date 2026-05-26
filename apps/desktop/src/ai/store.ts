import type { ProviderType } from "./agents";

// Per-agent provider config. Stored locally for now; a later slice moves the
// keys into the encrypted Control Panel token vault (Supabase-backed).
export type AgentConfig = {
  enabled: boolean;
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
  if (c.provider === "http") return !!c.endpoint;
  return !!c.apiKey;
}
