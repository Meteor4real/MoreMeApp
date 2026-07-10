// AI master switch — renderer-side cache of the main process's ai-bridge
// prefs. "builtin": the bundled local model runs NT5 generation. "external":
// every built-in generation path is disabled and the localhost bridge lets
// an outside agent (Hermes) take the role instead.
//
// initAiMode() pulls once at boot; setAiMode() flips the switch (which also
// starts/stops the bridge server in the main process). getAiMode() is the
// synchronous read every generation path checks before touching the model.

export type AiMode = "builtin" | "external";
export type AiBridgeInfo = { mode: AiMode; port: number; token: string; listening: boolean };

let mode: AiMode = "builtin";
let info: AiBridgeInfo | null = null;
const subs = new Set<(m: AiMode) => void>();

export function getAiMode(): AiMode { return mode; }
export function getBridgeInfo(): AiBridgeInfo | null { return info; }

export async function initAiMode(): Promise<void> {
  try {
    const r = await window.hub.ai.get();
    info = r;
    mode = r.mode;
    subs.forEach((fn) => fn(mode));
  } catch { /* main not ready / dev — stay builtin */ }
}

export async function setAiMode(next: AiMode): Promise<AiBridgeInfo | null> {
  try {
    const r = await window.hub.ai.set(next);
    info = r;
    mode = r.mode;
    subs.forEach((fn) => fn(mode));
    return r;
  } catch { return null; }
}

export async function regenBridgeToken(): Promise<AiBridgeInfo | null> {
  try {
    const r = await window.hub.ai.regenToken();
    info = r;
    return r;
  } catch { return null; }
}

export function subscribeAiMode(fn: (m: AiMode) => void): () => void {
  subs.add(fn);
  return () => subs.delete(fn);
}
