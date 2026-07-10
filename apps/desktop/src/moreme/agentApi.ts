// MoreMe agent API — `window.moremeAgent`.
//
// Everything an external agent (or the dev console) needs to mutate the UI
// at runtime without source edits. Pure async-friendly helpers over the
// existing store. Persists, syncs, survives restarts.
//
// Example, in the renderer dev console:
//   moremeAgent.tabs.add({ label: "Workouts", icon: "◆" });  // geometric marks only — NO emojis in the UI
//   moremeAgent.widgets.add("today", { kind: "counter", title: "Pushups", value: 0, step: 1 });
//   moremeAgent.theme.set("sports");

import {
  addCustomAchievement, addDynamicTab, addQuote, addWidget, blankWidget,
  claimCustomAchievement, clearCustomTheme, loadState, moveDynamicTab,
  moveWidget, removeCustomAchievement, removeDynamicTab, removeQuote, removeWidget,
  resetAllRanks, setCustomTheme, setRank, setTabLabel, setUseCustomTheme,
  subscribeState, toggleTabHidden, unclaimCustomAchievement,
  updateCustomAchievement, updateDynamicTab, updateWidget,
} from "./store";
import { setTheme, refreshTheme, type ThemeName } from "./styles";
import {
  clearWireArticles, fileExternalArticle, getWireArticles, runRealWorldOnce,
  type ExternalArticleInput, type WireArticle,
} from "../services/nt5Wire";
import { loadTopics } from "../services/nt5Topics";
import type { CustomAchievement, CustomTheme, State, Widget } from "./types";

function uid(p: string): string { return p + Math.random().toString(36).slice(2, 9); }

export const moremeAgent = {
  /** Read the entire state at this moment. */
  state(): State { return loadState(); },

  /** Subscribe to every state change. Returns an unsubscribe fn. */
  subscribe(fn: (s: State) => void): () => void { return subscribeState(fn); },

  tabs: {
    /** Rename a built-in or dynamic tab. */
    rename(tabId: string, label: string) { setTabLabel(tabId, label); },
    /** Toggle a built-in tab's visibility. */
    toggleHidden(tabId: string) { toggleTabHidden(tabId); },
    /** Add a new dynamic tab. Returns the new tab's id. */
    add(opts: { label: string; icon?: string; notes?: string }): string {
      return addDynamicTab(opts.label, opts.icon, opts.notes).id;
    },
    /** Edit a dynamic tab's metadata. */
    update(tabId: string, patch: Partial<{ label: string; icon: string; notes: string }>) {
      updateDynamicTab(tabId, patch);
    },
    /** Remove a dynamic tab (and its widgets). */
    remove(tabId: string) { removeDynamicTab(tabId); },
    /** Move a dynamic tab one slot left/right. */
    move(tabId: string, dir: -1 | 1) { moveDynamicTab(tabId, dir); },
  },

  widgets: {
    /** Append a widget to a tab. `kind` and shape per Widget type. */
    add(tabId: string, w: Omit<Widget, "id"> & { id?: string }): string {
      const safe: Widget = { id: w.id ?? uid("w-"), ...(w as object) } as Widget;
      addWidget(tabId, safe);
      return safe.id;
    },
    /** Build a typed blank widget of the given kind. */
    blank(kind: Widget["kind"]): Widget { return blankWidget(kind); },
    /** Patch a widget. Type-safe per its kind. */
    update(tabId: string, widgetId: string, patch: Partial<Widget>) {
      updateWidget(tabId, widgetId, patch);
    },
    /** Remove a widget. */
    remove(tabId: string, widgetId: string) { removeWidget(tabId, widgetId); },
    /** Move a widget within its tab. */
    move(tabId: string, widgetId: string, dir: -1 | 1) { moveWidget(tabId, widgetId, dir); },
  },

  ranks: {
    set(level: number, name: string) { setRank(level, name); },
    resetAll() { resetAllRanks(); },
  },

  achievements: {
    /** Add a custom (user-defined) achievement. Returns its id. */
    add(a: Omit<CustomAchievement, "id" | "claimedAt"> & { id?: string }): string {
      const id = a.id ?? uid("ach-");
      addCustomAchievement({ id, title: a.title, desc: a.desc, xp: a.xp });
      return id;
    },
    update(id: string, patch: Partial<CustomAchievement>) { updateCustomAchievement(id, patch); },
    claim(id: string) { claimCustomAchievement(id); },
    unclaim(id: string) { unclaimCustomAchievement(id); },
    remove(id: string) { removeCustomAchievement(id); },
  },

  theme: {
    /** Switch to a preset or custom theme. */
    set(name: ThemeName) { setTheme(name); },
    /** Save a custom palette and switch to it. */
    setCustom(palette: CustomTheme) { setCustomTheme(palette); refreshTheme(); },
    /** Clear the saved custom palette and revert to the default. */
    clearCustom() { clearCustomTheme(); refreshTheme(); },
    useCustom(on: boolean) { setUseCustomTheme(on); refreshTheme(); },
  },

  quotes: {
    add(text: string, by: string) { addQuote(text, by); },
    remove(id: string) { removeQuote(id); },
  },

  // NT5 wire — how an external agent RUNS the news network when the AI
  // master switch is "external": read the desk, pull real headlines, and
  // file anchor-written articles of any shape.
  wire: {
    /** Current wire articles, newest first. */
    articles(): WireArticle[] { return getWireArticles(); },
    /** The user's topic desk (what they've asked to be covered). */
    topics() { return loadTopics(); },
    /** Pull fresh real headlines for every enabled topic (no model involved in external mode — files honest snippets). */
    pullReal() { return runRealWorldOnce(3); },
    /** File one article. kind: brief|article|broadcast|blog|social|ticker. */
    file(a: ExternalArticleInput) { return fileExternalArticle(a); },
    /** Wipe the wire. */
    clear() { clearWireArticles(); },
  },
};

declare global {
  interface Window { moremeAgent: typeof moremeAgent }
}

// ── bridge dispatcher ──────────────────────────────────────────────────
// The localhost bridge (electron/bridge.ts) forwards {path, args} calls
// here. Only these roots are callable from outside — anything else is
// refused. `subscribe` is deliberately absent (no callbacks over HTTP).
const BRIDGE_ROOTS = new Set(["state", "tabs", "widgets", "ranks", "achievements", "theme", "quotes", "wire"]);

function dispatchBridgeCall(pathStr: string, args: unknown[]): unknown {
  const parts = pathStr.split(".").filter(Boolean);
  if (!parts.length || !BRIDGE_ROOTS.has(parts[0])) {
    throw new Error(`path not allowed: ${pathStr}`);
  }
  let node: unknown = moremeAgent;
  for (let i = 0; i < parts.length; i++) {
    node = (node as Record<string, unknown>)[parts[i]];
    if (node === undefined) throw new Error(`unknown path: ${pathStr}`);
  }
  if (typeof node !== "function") throw new Error(`not callable: ${pathStr}`);
  // Rebind to the parent namespace so `this` inside the API keeps working.
  let parent: unknown = moremeAgent;
  for (let i = 0; i < parts.length - 1; i++) parent = (parent as Record<string, unknown>)[parts[i]];
  return (node as (...a: unknown[]) => unknown).apply(parent, args);
}

/** Install the agent API on `window` so external scripts can find it, and
 * wire up the bridge dispatcher so an external process can call it too. */
export function installAgentApi() {
  if (typeof window === "undefined") return;
  window.moremeAgent = moremeAgent;
  try {
    window.hub.bridge?.onInvoke(async ({ id, path, args }) => {
      try {
        const result = await Promise.resolve(dispatchBridgeCall(path, args));
        window.hub.bridge.result({ id, ok: true, result });
      } catch (e) {
        window.hub.bridge.result({ id, ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    });
  } catch { /* bridge not available (web build) */ }
}
