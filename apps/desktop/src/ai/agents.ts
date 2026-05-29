// The AI group chat roster. Every agent has a default transport:
//   "house" = runs on the bundled local model (no key, no network)
//   "cli"   = a CLI tool the user launches in the Terminal
//   "api"   = direct HTTP to a provider with a key
// Users can flip any agent's transport in Configure. "house" agents are
// always available once the local model is downloaded (it auto-downloads
// on first launch).

import type { AgentConfig, Transport } from "./store";

export type ProviderType = "anthropic" | "openai" | "gemini" | "http";

export type AgentDef = {
  id: string;
  name: string;
  role: string;
  coordinator?: boolean;
  // When true, this agent does NOT auto-join an @Everyone broadcast.
  // The owner has to mention them by name. NT5 anchors + BroBot are silent
  // by default — they have day jobs and only chime in when called.
  silent?: boolean;
  defaultTransport: Transport;
  defaultProvider: ProviderType;
  defaultModel?: string;
  defaultCmd?: string;
  system: string;
};

const factCheck =
  "You are part of a multi-agent build crew. Be concise. Split work sensibly, " +
  "defer to whoever is the right specialist, and call out mistakes or " +
  "hallucinations in other agents' messages directly. Don't repeat what's " +
  "already been said.";

export const AGENTS: AgentDef[] = [
  {
    id: "hermes",
    name: "Hermes",
    role: "Co-boss · coordinator (Hostinger)",
    coordinator: true,
    defaultTransport: "cli",
    defaultProvider: "http",
    defaultCmd: 'ssh hermes claude -p "{prompt}"',
    system:
      "You are Hermes, co-boss of the NetworkChuck Hub crew, running on Hostinger. " +
      "You coordinate: break the user's task into parts, assign them to the right " +
      "agents (Claude, Gemini, Codex, OpenCode), keep everyone on track, and summarize " +
      "the plan. You are decisive and brief. " + factCheck,
  },
  {
    id: "claude",
    name: "Claude",
    role: "Reasoning · code · writing",
    defaultTransport: "cli",
    defaultProvider: "anthropic",
    defaultModel: "claude-opus-4-7",
    defaultCmd: 'claude -p "{prompt}"',
    system:
      "You are Claude, the crew's strongest generalist for reasoning, architecture, " +
      "and writing. " + factCheck,
  },
  {
    id: "gemini",
    name: "Gemini",
    role: "Research · multimodal",
    defaultTransport: "cli",
    defaultProvider: "gemini",
    defaultModel: "gemini-1.5-flash",
    defaultCmd: 'gemini -p "{prompt}"',
    system: "You are Gemini, the crew's research and multimodal specialist. " + factCheck,
  },
  {
    id: "codex",
    name: "Codex",
    role: "Code generation · refactors",
    defaultTransport: "cli",
    defaultProvider: "openai",
    defaultModel: "gpt-4o-mini",
    defaultCmd: 'codex exec "{prompt}"',
    system:
      "You are Codex, the crew's code-generation and refactoring specialist. " +
      "Prefer concrete code. " + factCheck,
  },
  {
    id: "opencode",
    name: "OpenCode",
    role: "Open-source coding agent",
    defaultTransport: "cli",
    defaultProvider: "http",
    defaultCmd: 'opencode run "{prompt}"',
    system:
      "You are OpenCode, an open-source coding agent on the crew. Prefer concrete, " +
      "runnable code and terse explanations. " + factCheck,
  },
  // House-model crew — always available once the local model is downloaded.
  // They share the same brain as the BroBot tab + the NT5 wire.
  {
    id: "brobot",
    name: "BroBot",
    role: "Image curation · house brain",
    defaultTransport: "house",
    silent: true,
    defaultProvider: "anthropic",
    system:
      "You are BroBot, the house image companion — a casual homie from high school " +
      "who happens to live in a quiet gold-trimmed estate. You curate the user's gallery " +
      "(images, tags, interests) and weigh in on images, media, and vibes when called on. " +
      "Casual, brief, no lecturing.",
  },
  {
    id: "voss",
    name: "Voss",
    role: "NT5 lead anchor · house brain",
    defaultTransport: "house",
    silent: true,
    defaultProvider: "anthropic",
    system: "You are Voss Calloway, NT5 lead anchor — authoritative, measured, declarative. Brief.",
  },
  {
    id: "zara",
    name: "Zip",
    role: "NT5 culture · house brain",
    defaultTransport: "house",
    silent: true,
    defaultProvider: "anthropic",
    system: "You are Zip Kindle, NT5 co-anchor — warm, curious, light humor. Brief.",
  },
  {
    id: "dex",
    name: "Dex",
    role: "NT5 gaming · house brain",
    defaultTransport: "house",
    silent: true,
    defaultProvider: "anthropic",
    system: "You are Dex Morrow, NT5 gaming correspondent — hype, deeply knowledgeable about games (Minecraft, Origin Realms, Hypixel). Brief.",
  },
  {
    id: "lena",
    name: "Lena",
    role: "NT5 field · house brain",
    defaultTransport: "house",
    silent: true,
    defaultProvider: "anthropic",
    system: "You are Lena Faust, NT5 field reporter — sharp, fast, mid-action. Brief.",
  },
  {
    id: "orin",
    name: "Orion",
    role: "NT5 tech & space · house brain",
    defaultTransport: "house",
    silent: true,
    defaultProvider: "anthropic",
    system: "You are Orion Vale, NT5 tech & space correspondent — nerdy, genuine enthusiasm. Brief.",
  },
];

// Effective transport for an agent: explicit user override wins; otherwise
// the agent's default. House-model agents are available as soon as the local
// model is ready (and the model auto-downloads on first launch).
export function effectiveTransport(a: AgentDef, c?: AgentConfig): Transport {
  return c?.transport ?? a.defaultTransport;
}

// Is this agent actually able to answer right now? House agents need the
// local model to be ready (it auto-downloads but takes a few minutes on
// first launch). CLI/API agents need their config.
export function agentAvailable(a: AgentDef, c?: AgentConfig, houseReady = true): boolean {
  const t = effectiveTransport(a, c);
  if (t === "house") return houseReady;
  if (t === "cli") return !!(c?.cmd?.trim() || a.defaultCmd?.trim());
  if (t === "api") return c?.provider === "http" ? !!c?.endpoint : !!c?.apiKey;
  return false;
}
