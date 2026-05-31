// User-defined custom agents for the AI Group Chat. These merge into the
// built-in AGENTS roster. Each is a full AgentDef plus presentation extras
// (avatar color, optional emoji-free monogram override). Persisted to
// localStorage; the chat treats them exactly like built-ins.

import type { AgentDef } from "./agents";
import type { Transport } from "./store";

export type CustomAgent = AgentDef & {
  custom: true;
  color?: string;        // avatar tint
  avatar?: string;       // data URL, optional
};

const KEY = "nchub.ai.customAgents.v1";
const subs = new Set<(a: CustomAgent[]) => void>();

export function loadCustomAgents(): CustomAgent[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as CustomAgent[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
export function saveCustomAgents(list: CustomAgent[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ }
  subs.forEach((fn) => fn(list));
}
export function subscribeCustomAgents(fn: (a: CustomAgent[]) => void): () => void {
  subs.add(fn); fn(loadCustomAgents());
  return () => subs.delete(fn);
}

export function makeCustomAgent(input: {
  name: string; role: string; personality: string;
  transport: Transport; model?: string; cmd?: string; color?: string; avatar?: string; silent?: boolean;
}): CustomAgent {
  const id = "custom-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return {
    id,
    name: input.name.trim() || "Agent",
    role: input.role.trim() || "custom agent",
    silent: !!input.silent,
    defaultTransport: input.transport,
    defaultProvider: "anthropic",
    defaultModel: input.model?.trim() || undefined,
    defaultCmd: input.cmd?.trim() || undefined,
    system: input.personality.trim() || "You are a helpful member of the crew. Be concise.",
    custom: true,
    color: input.color || "#22d3ee",
    avatar: input.avatar || "",
  };
}

// Stable color for an agent avatar — explicit custom color wins, else hashed
// from the id so built-ins get consistent distinct tints.
const PALETTE = ["#ff5577", "#22d3ee", "#22c55e", "#f59e0b", "#a78bfa", "#ec4899", "#84cc16", "#fb923c", "#38bdf8", "#d946ef"];
export function agentColor(a: { id: string; color?: string }): string {
  if (a.color) return a.color;
  let h = 0;
  for (let i = 0; i < a.id.length; i++) h = (h * 31 + a.id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
