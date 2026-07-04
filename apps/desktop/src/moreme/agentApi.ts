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
  addCustomAchievement, addDynamicTab, addWidget, blankWidget,
  claimCustomAchievement, clearCustomTheme, loadState, moveDynamicTab,
  moveWidget, removeCustomAchievement, removeDynamicTab, removeWidget,
  resetAllRanks, setCustomTheme, setRank, setTabLabel, setUseCustomTheme,
  subscribeState, toggleTabHidden, unclaimCustomAchievement,
  updateCustomAchievement, updateDynamicTab, updateWidget,
} from "./store";
import { setTheme, refreshTheme, type ThemeName } from "./styles";
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
    /** Clear the saved custom palette and revert to DP. */
    clearCustom() { clearCustomTheme(); refreshTheme(); },
    useCustom(on: boolean) { setUseCustomTheme(on); refreshTheme(); },
  },
};

declare global {
  interface Window { moremeAgent: typeof moremeAgent }
}

/** Install the agent API on `window` so external scripts can find it. */
export function installAgentApi() {
  if (typeof window !== "undefined") window.moremeAgent = moremeAgent;
}
