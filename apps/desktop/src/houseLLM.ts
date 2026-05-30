import { ownerProfileContext } from "./uiPrefs";

// The "house" AI — a local open-source model (node-llama-cpp) that runs with
// no API key, downloaded once on first use. Powers Tutorial Tom, NT5's wire,
// BroBot's chat, and SignalFinder drafts. The operator's profile is prepended
// to every system prompt so the model knows who it's talking to.
export async function houseChat(system: string, prompt: string) {
  const profile = ownerProfileContext();
  const fullSystem = profile ? `${profile}\n\n${system}` : system;
  return window.hub.llm.chat(fullSystem, prompt);
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
