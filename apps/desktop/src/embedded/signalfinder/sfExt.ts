// Sidecar storage for the expanded SignalFinder features. Lives next to the
// existing v2 store ("nchub.signalfinder.v2") and is keyed by target id, so
// the original SignalFinder component keeps working untouched — the new
// Pipeline / Stats / Templates / Settings views layer on top.

export type Stage = "prospect" | "contacted" | "replied" | "talks" | "won" | "lost";
export const STAGES: Stage[] = ["prospect", "contacted", "replied", "talks", "won", "lost"];
export const STAGE_LABEL: Record<Stage, string> = {
  prospect: "Prospect", contacted: "Contacted", replied: "Replied",
  talks: "In Talks", won: "Won", lost: "Lost",
};
export const STAGE_COLOR: Record<Stage, string> = {
  prospect: "#9ca3af", contacted: "#f59e0b", replied: "#22d3ee",
  talks:    "#a78bfa", won: "#22c55e", lost: "#ef4444",
};

export type Channel = { kind: "email" | "x" | "discord" | "site" | "phone" | "github" | "youtube" | "other"; value: string };
export type Note = { ts: number; text: string };
export type Tag = { label: string; color: string };
export type Ext = {
  stage: Stage;
  tags: Tag[];
  notes: Note[];
  channels: Channel[];
  followup: string;   // ISO date — "" if none
};

const EXT_KEY = "nchub.signalfinder.ext.v1";
const WEIGHT_KEY = "nchub.signalfinder.weights.v1";
const TEMPLATE_KEY = "nchub.signalfinder.templates.v1";

export const DEFAULT_EXT: Ext = { stage: "prospect", tags: [], notes: [], channels: [], followup: "" };

export function loadAllExt(): Record<string, Ext> {
  try { const r = localStorage.getItem(EXT_KEY); if (r) return JSON.parse(r) as Record<string, Ext>; }
  catch { /* ignore */ }
  return {};
}
export function saveAllExt(m: Record<string, Ext>) {
  try { localStorage.setItem(EXT_KEY, JSON.stringify(m)); } catch { /* ignore */ }
}
export function getExt(map: Record<string, Ext>, id: string): Ext {
  return map[id] || DEFAULT_EXT;
}
export function patchExt(id: string, patch: Partial<Ext>): Record<string, Ext> {
  const map = loadAllExt();
  const cur = map[id] || DEFAULT_EXT;
  map[id] = { ...cur, ...patch };
  saveAllExt(map);
  return map;
}

// Per-axis weights for custom scoring. The base SignalFinder scoring stays
// the static one; the new Pipeline/Stats views also surface a weighted
// "priority" score on top, computed from these.
export type Weights = {
  response: number;
  collab: number;
  momentum: number;
  timing: number;
  relevance: number;
  warmth: number;
  followupOverdue: number;
};
export const DEFAULT_WEIGHTS: Weights = { response: 30, collab: 20, momentum: 20, timing: 15, relevance: 15, warmth: 10, followupOverdue: 10 };

export function loadWeights(): Weights {
  try { const r = localStorage.getItem(WEIGHT_KEY); if (r) return { ...DEFAULT_WEIGHTS, ...JSON.parse(r) }; }
  catch { /* ignore */ }
  return DEFAULT_WEIGHTS;
}
export function saveWeights(w: Weights) {
  try { localStorage.setItem(WEIGHT_KEY, JSON.stringify(w)); } catch { /* ignore */ }
}

export type Template = { id: string; name: string; tone: "casual" | "professional" | "hype" | "short"; body: string };
export const DEFAULT_TEMPLATES: Template[] = [
  { id: "intro-casual", name: "Casual intro", tone: "casual", body: "hey {name} — just saw your work in {niche}. {hook} would love to chat if you're up for it." },
  { id: "intro-pro",    name: "Professional intro", tone: "professional", body: "Hi {name}, I came across your {niche} work and thought there might be an interesting overlap with what I'm building. {hook} Open to a quick conversation?" },
  { id: "follow-1",     name: "Soft follow-up",    tone: "short",      body: "{name} — circling back on this. No pressure, just wanted to keep it on your radar." },
];
export function loadTemplates(): Template[] {
  try { const r = localStorage.getItem(TEMPLATE_KEY); if (r) { const a = JSON.parse(r); if (Array.isArray(a) && a.length) return a; } }
  catch { /* ignore */ }
  return DEFAULT_TEMPLATES;
}
export function saveTemplates(t: Template[]) {
  try { localStorage.setItem(TEMPLATE_KEY, JSON.stringify(t)); } catch { /* ignore */ }
}
export function fillTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}
