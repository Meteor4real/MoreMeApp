// Lightweight subscription bridge so the Tutorial Tom tour can drive the
// Hub's top-level nav. App registers its setter on mount; the tour calls
// goto({ kind: "settings" }) etc. to navigate during a step.

export type NavRequest =
  | { kind: "browser"; url?: string }
  | { kind: "control" }
  | { kind: "terminal" }
  | { kind: "ai" }
  | { kind: "library" }
  | { kind: "settings" }
  | { kind: "hermes" }
  | { kind: "app"; id: string };

let setter: ((n: NavRequest) => void) | null = null;

export function registerNavSetter(fn: (n: NavRequest) => void) {
  setter = fn;
  return () => { if (setter === fn) setter = null; };
}
export function goto(n: NavRequest) { setter?.(n); }
