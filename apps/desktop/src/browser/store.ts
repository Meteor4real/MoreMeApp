// Persistent browser state. Tabs, tab-groups, history, bookmarks, and passwords
// live here so they survive tab switches and app restarts. Passwords are
// encrypted via the OS keychain (safeStorage) through window.hub.vault.

export type Tab = {
  id: string;
  title: string;
  url: string;
  groupId?: string;
  pinned?: boolean;
};
export type Group = { id: string; name: string; color: string };
export type Bookmark = { id: string; title: string; url: string; folder?: string; ts: number };
export type HistoryEntry = { id: string; title: string; url: string; ts: number };
export type Password = { id: string; host: string; username: string; ts: number };
export type Download = { id: string; filename: string; path: string; url: string; bytes: number; state: "completed" | "interrupted" | "cancelled"; ts: number };

const TABS_KEY = "nchub.browser.tabs.v1";
const GROUPS_KEY = "nchub.browser.groups.v1";
const BOOKMARKS_KEY = "nchub.browser.bookmarks.v1";
const HISTORY_KEY = "nchub.browser.history.v1";
const PASSWORDS_KEY = "nchub.browser.passwords.v1"; // metadata only; secret in vault

export const START_URL = "about:start";

function safeLoad<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function safeSave<T>(key: string, val: T) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ }
}

// --- tabs -----------------------------------------------------------------
type TabsState = { tabs: Tab[]; activeId: string };
const tabsSubs = new Set<(s: TabsState) => void>();
let tabsState: TabsState | null = null;

// Settings → Browser → "Restore tabs on launch". When off, we ignore the
// persisted tab set on first read this session and open a single start tab.
let restoredThisSession = false;
function shouldRestore(): boolean {
  try {
    const raw = localStorage.getItem("nchub.uiprefs.v1");
    if (raw) { const p = JSON.parse(raw); if (p && p.restoreTabsOnLaunch === false) return false; }
  } catch { /* ignore */ }
  return true;
}

function ensureTabs(): TabsState {
  if (tabsState) return tabsState;
  const allowRestore = restoredThisSession || shouldRestore();
  restoredThisSession = true;
  const stored = allowRestore ? safeLoad<TabsState | null>(TABS_KEY, null) : null;
  if (stored && Array.isArray(stored.tabs) && stored.tabs.length) {
    tabsState = stored;
  } else {
    const t: Tab = { id: rid(), title: "New Tab", url: START_URL };
    tabsState = { tabs: [t], activeId: t.id };
  }
  return tabsState;
}
function rid() { return Math.random().toString(36).slice(2, 10); }
function notifyTabs() { tabsSubs.forEach((fn) => fn(tabsState!)); safeSave(TABS_KEY, tabsState); }

export function getTabsState(): TabsState { return ensureTabs(); }
export function subscribeTabs(fn: (s: TabsState) => void): () => void {
  ensureTabs();
  tabsSubs.add(fn);
  fn(tabsState!);
  return () => tabsSubs.delete(fn);
}
export function addTab(url = START_URL): Tab {
  ensureTabs();
  const t: Tab = { id: rid(), title: "New Tab", url };
  tabsState = { tabs: [...tabsState!.tabs, t], activeId: t.id };
  notifyTabs();
  return t;
}
export function closeTab(id: string) {
  ensureTabs();
  const tabs = tabsState!.tabs.filter((t) => t.id !== id);
  let activeId = tabsState!.activeId;
  if (id === activeId) activeId = (tabs[tabs.length - 1] || addBackupTab()).id;
  if (!tabs.length) {
    const t = addBackupTab();
    tabs.push(t);
    activeId = t.id;
  }
  tabsState = { tabs, activeId };
  notifyTabs();
}
function addBackupTab(): Tab { return { id: rid(), title: "New Tab", url: START_URL }; }
export function setActiveTab(id: string) {
  ensureTabs();
  if (!tabsState!.tabs.some((t) => t.id === id)) return;
  tabsState = { ...tabsState!, activeId: id };
  notifyTabs();
}
export function navigateTab(id: string, url: string) {
  ensureTabs();
  tabsState = { ...tabsState!, tabs: tabsState!.tabs.map((t) => (t.id === id ? { ...t, url, title: url === START_URL ? "New Tab" : t.title } : t)) };
  notifyTabs();
}
export function setTabTitle(id: string, title: string) {
  ensureTabs();
  let changed = false;
  const tabs = tabsState!.tabs.map((t) => {
    if (t.id === id && t.title !== title) { changed = true; return { ...t, title }; }
    return t;
  });
  if (changed) { tabsState = { ...tabsState!, tabs }; notifyTabs(); }
}
export function pinTab(id: string, pinned: boolean) {
  ensureTabs();
  tabsState = { ...tabsState!, tabs: tabsState!.tabs.map((t) => t.id === id ? { ...t, pinned } : t) };
  notifyTabs();
}
export function setTabGroup(id: string, groupId?: string) {
  ensureTabs();
  tabsState = { ...tabsState!, tabs: tabsState!.tabs.map((t) => t.id === id ? { ...t, groupId } : t) };
  notifyTabs();
}

// --- groups ----------------------------------------------------------------
export function getGroups(): Group[] { return safeLoad<Group[]>(GROUPS_KEY, []); }
export function saveGroups(g: Group[]) { safeSave(GROUPS_KEY, g); }
export function addGroup(name: string, color = "#ff5577"): Group {
  const g: Group = { id: rid(), name, color };
  saveGroups([...getGroups(), g]);
  return g;
}
export function removeGroup(id: string) {
  saveGroups(getGroups().filter((g) => g.id !== id));
  // detach tabs from this group
  ensureTabs();
  tabsState = { ...tabsState!, tabs: tabsState!.tabs.map((t) => t.groupId === id ? { ...t, groupId: undefined } : t) };
  notifyTabs();
}

// --- bookmarks -------------------------------------------------------------
const bmSubs = new Set<(b: Bookmark[]) => void>();
let bmCache: Bookmark[] | null = null;
function ensureBm(): Bookmark[] {
  if (!bmCache) bmCache = safeLoad<Bookmark[]>(BOOKMARKS_KEY, []);
  return bmCache!;
}
export function getBookmarks(): Bookmark[] { return ensureBm(); }
export function subscribeBookmarks(fn: (b: Bookmark[]) => void): () => void {
  ensureBm();
  bmSubs.add(fn);
  fn(bmCache!);
  return () => bmSubs.delete(fn);
}
export function addBookmark(title: string, url: string, folder?: string): Bookmark {
  ensureBm();
  const existing = bmCache!.find((b) => b.url === url);
  if (existing) return existing;
  const b: Bookmark = { id: rid(), title: title || url, url, folder, ts: Date.now() };
  bmCache = [b, ...bmCache!];
  safeSave(BOOKMARKS_KEY, bmCache);
  bmSubs.forEach((fn) => fn(bmCache!));
  return b;
}
export function removeBookmark(id: string) {
  ensureBm();
  bmCache = bmCache!.filter((b) => b.id !== id);
  safeSave(BOOKMARKS_KEY, bmCache);
  bmSubs.forEach((fn) => fn(bmCache!));
}
export function isBookmarked(url: string): boolean { return ensureBm().some((b) => b.url === url); }

// --- history ---------------------------------------------------------------
export function getHistory(): HistoryEntry[] { return safeLoad<HistoryEntry[]>(HISTORY_KEY, []); }
export function recordHistory(title: string, url: string) {
  if (!url || url.startsWith("about:") || url.startsWith("file:")) return;
  const arr = getHistory();
  const dedup = arr.filter((h) => h.url !== url);
  dedup.unshift({ id: rid(), title: title || url, url, ts: Date.now() });
  safeSave(HISTORY_KEY, dedup.slice(0, 2000));
}
export function clearHistory() { safeSave(HISTORY_KEY, []); }
export function removeHistoryEntry(id: string) { safeSave(HISTORY_KEY, getHistory().filter((h) => h.id !== id)); }

// --- passwords (metadata) — secret values live in the OS keychain vault ---
export function getPasswords(): Password[] { return safeLoad<Password[]>(PASSWORDS_KEY, []); }
export async function setPassword(host: string, username: string, password: string): Promise<Password> {
  const id = `pw:${host}:${username}`;
  await window.hub.vault.set(id, password, "");
  const arr = getPasswords().filter((p) => p.id !== id);
  const rec: Password = { id, host, username, ts: Date.now() };
  arr.unshift(rec);
  safeSave(PASSWORDS_KEY, arr);
  return rec;
}
export async function getPasswordSecret(id: string): Promise<string> {
  const r = await window.hub.vault.get(id);
  return r.token || "";
}
export async function removePassword(id: string) {
  await window.hub.vault.remove(id);
  safeSave(PASSWORDS_KEY, getPasswords().filter((p) => p.id !== id));
}
