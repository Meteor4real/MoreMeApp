import { ownerProfileContext, loadPrefs } from "./uiPrefs";

// The "house" AI — a local open-source model (node-llama-cpp) that runs with
// no API key, downloaded once on first use. Powers Tutorial Tom, NT5's wire,
// BroBot's chat, and SignalFinder drafts. Every system prompt is prefixed
// with (1) the operator's profile and (2) their custom system-prompt prefix
// from Settings, and the call uses the temperature / max-tokens they set.
export async function houseChat(system: string, prompt: string) {
  const p = loadPrefs();
  const profile = ownerProfileContext(p);
  const parts = [p.llmSystemPrefix.trim(), profile, system].filter(Boolean);
  const fullSystem = parts.join("\n\n");
  return window.hub.llm.chat(fullSystem, prompt, { temperature: p.llmTemperature, maxTokens: p.llmMaxTokens });
}
export function llmStatus() {
  return window.hub.llm.status();
}
export function ensureLLM() {
  return window.hub.llm.ensure();
}
export function onLLMProgress(cb: (p: number) => void) {
  return window.hub.llm.onProgress(cb);
}
