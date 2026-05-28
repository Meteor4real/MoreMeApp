import { useEffect, useMemo, useRef, useState } from "react";
import logoUrl from "../assets/logo.png";
import {
  START_URL, type Tab, addBookmark, addTab, closeTab, getTabsState, isBookmarked,
  navigateTab, recordHistory, removeBookmark, setActiveTab, setTabGroup, setTabTitle,
  subscribeBookmarks, subscribeTabs, getBookmarks, getGroups, pinTab,
} from "../browser/store";
import { BookmarksPanel, DownloadsPanel, ExtensionsPanel, GroupsPanel, HistoryPanel, isPanel, PasswordsPanel, PANEL_NAMES } from "../browser/panels";
import { loadPrefs, SEARCH_ENGINES, subscribePrefs } from "../uiPrefs";
import { EXTENSIONS, loadEnabled, saveEnabled, subscribeEnabled } from "../extensions";

function normalize(input: string): string {
  const v = input.trim();
  if (!v) return START_URL;
  if (v.startsWith("about:")) return v;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v)) return "https://" + v;
  const engine = SEARCH_ENGINES[loadPrefs().searchEngine];
  return engine.url(v);
}

function StartPage({ onGo }: { onGo: (v: string) => void }) {
  const [q, setQ] = useState("");
  const links: [string, string][] = [
    ["GitHub", "https://github.com"],
    ["YouTube", "https://youtube.com"],
    ["Origin Realms", "https://originrealms.com"],
    ["Modrinth", "https://modrinth.com"],
    ["Supabase", "https://supabase.com/dashboard"],
    ["Hostinger", "https://hpanel.hostinger.com"],
  ];
  return (
    <div className="startpage">
      <img className="sp-logo" src={logoUrl} alt="NetworkChuck Hub" />
      <div className="mono" style={{ letterSpacing: 6, fontSize: 13, textTransform: "uppercase", color: "var(--mute)" }}>
        NetworkChuck <span className="glow-text">Hub</span>
      </div>
      <div className="sp-search">
        <input autoFocus value={q} placeholder="Search the web or type a URL" spellCheck={false}
          onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onGo(q)} />
        <button className="btn" onClick={() => onGo(q)}>Go</button>
      </div>
      <div className="sp-links">
        {links.map(([n, u]) => (
          <span key={u} className="sp-link" onClick={() => onGo(u)}>{n}</span>
        ))}
      </div>
    </div>
  );
}

export function Browser({
  initialUrl,
  injectables = [],
}: {
  initialUrl?: string;
  injectables?: { id: string; code: string }[];
}) {
  const [tabsState, setTabsState] = useState(getTabsState);
  const [bookmarks, setBookmarks] = useState(getBookmarks);
  const [prefs, setPrefs] = useState(loadPrefs);
  const [omni, setOmni] = useState("");
  const [menuOpen, setMenuOpen] = useState<null | "ext" | "menu">(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);
  const viewRefs = useRef<Map<string, WebviewEl>>(new Map());
  const injectRef = useRef(injectables);
  injectRef.current = injectables;
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeTabs(setTabsState), []);
  useEffect(() => subscribeBookmarks(setBookmarks), []);
  useEffect(() => subscribePrefs(setPrefs), []);

  // Reflect external "open this URL" requests (rail clicks on site apps).
  useEffect(() => {
    if (!initialUrl) return;
    const existing = getTabsState().tabs.find((t) => t.url === initialUrl);
    if (existing) setActiveTab(existing.id);
    else addTab(initialUrl);
  }, [initialUrl]);

  // Close popups on outside click.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(null);
      setCtxMenu(null);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const tabs = tabsState.tabs;
  const activeId = tabsState.activeId;
  const activeTab = tabs.find((t) => t.id === activeId) || tabs[0];
  useEffect(() => { setOmni(activeTab?.url && !isPanel(activeTab.url) ? activeTab.url : ""); }, [activeTab?.url, activeTab?.id]);

  const groups = useMemo(() => getGroups(), [tabsState]);

  function go(value: string) {
    if (!activeTab) return;
    const url = normalize(value);
    navigateTab(activeTab.id, url);
    setOmni(isPanel(url) ? "" : url);
  }
  function newTab(url?: string) {
    addTab(url || (prefs.homePage || START_URL));
  }
  function refresh() { viewRefs.current.get(activeId)?.reload(); }
  function back() { viewRefs.current.get(activeId)?.goBack(); }
  function forward() { viewRefs.current.get(activeId)?.goForward(); }
  function home() { go(prefs.homePage || ""); }
  function toggleBookmark() {
    if (!activeTab) return;
    const existing = bookmarks.find((b) => b.url === activeTab.url);
    if (existing) removeBookmark(existing.id);
    else addBookmark(activeTab.title || activeTab.url, activeTab.url);
  }
  const starred = activeTab ? isBookmarked(activeTab.url) : false;

  function onTabContext(e: React.MouseEvent, tabId: string) {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, tabId });
  }

  return (
    <div className="stage">
      {/* tab strip */}
      <div className="tabbar">
        {tabs.map((t) => {
          const grp = t.groupId ? groups.find((g) => g.id === t.groupId) : undefined;
          return (
            <div key={t.id}
              className={"tab" + (t.id === activeId ? " active" : "")}
              onClick={() => setActiveTab(t.id)}
              onContextMenu={(e) => onTabContext(e, t.id)}
              title={t.title}>
              {grp && <span style={{ width: 3, height: 16, background: grp.color, borderRadius: 2, marginRight: 4 }} />}
              {t.pinned && <span className="mono" style={{ fontSize: 9, color: "var(--orange)" }}>●</span>}
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{titleOf(t)}</span>
              {!t.pinned && (
                <span className="x" onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}>✕</span>
              )}
            </div>
          );
        })}
        <button className="btn" title="New tab" onClick={() => newTab()}>+</button>
      </div>

      {/* address row */}
      <div className="tabbar" style={{ borderBottom: "1px solid var(--line)", position: "relative" }}>
        <div className="omnibox">
          <button className="btn" title="Back" onClick={back}>‹</button>
          <button className="btn" title="Forward" onClick={forward}>›</button>
          <button className="btn" title="Reload" onClick={refresh}>⟳</button>
          <button className="btn" title="Home" onClick={home}>⌂</button>
          <input value={omni}
            onChange={(e) => setOmni(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") go((e.target as HTMLInputElement).value); }}
            placeholder="Search the web or enter a URL"
            spellCheck={false} />
          <button className="btn" title={starred ? "Remove bookmark" : "Add bookmark"} onClick={toggleBookmark} style={starred ? { color: "var(--orange)", borderColor: "rgba(255,122,45,0.6)" } : undefined}>★</button>
          <button className="btn" title="Extensions" onClick={() => setMenuOpen((m) => m === "ext" ? null : "ext")}>⊞</button>
          <button className="btn" title="More" onClick={() => setMenuOpen((m) => m === "menu" ? null : "menu")}>⋮</button>
        </div>

        {menuOpen && (
          <div ref={menuRef} style={{ position: "absolute", right: 12, top: 44, zIndex: 50, minWidth: 220, background: "#0e0e14", border: "1px solid var(--line)", borderRadius: 10, padding: 8, boxShadow: "0 12px 28px rgba(0,0,0,0.55)" }}>
            {menuOpen === "menu" && (
              <>
                <MenuItem onClick={() => { newTab("about:bookmarks"); setMenuOpen(null); }}>Bookmarks</MenuItem>
                <MenuItem onClick={() => { newTab("about:history"); setMenuOpen(null); }}>History</MenuItem>
                <MenuItem onClick={() => { newTab("about:downloads"); setMenuOpen(null); }}>Downloads</MenuItem>
                <MenuItem onClick={() => { newTab("about:passwords"); setMenuOpen(null); }}>Passwords</MenuItem>
                <MenuItem onClick={() => { newTab("about:groups"); setMenuOpen(null); }}>Tab Groups</MenuItem>
                <MenuItem onClick={() => { newTab("about:extensions"); setMenuOpen(null); }}>Manage Extensions</MenuItem>
              </>
            )}
            {menuOpen === "ext" && (
              <ExtQuickPanel onDone={() => setMenuOpen(null)} />
            )}
          </div>
        )}
      </div>

      {/* bookmarks bar */}
      {prefs.showBookmarksBar && bookmarks.length > 0 && (
        <div style={{ display: "flex", gap: 6, padding: "4px 8px", borderBottom: "1px solid var(--line)", overflowX: "auto", background: "rgba(0,0,0,0.35)" }}>
          {bookmarks.slice(0, 24).map((b) => (
            <button key={b.id} className="btn" title={b.url} style={{ fontSize: 11, padding: "3px 8px", whiteSpace: "nowrap" }} onClick={() => go(b.url)}>
              {b.title.length > 22 ? b.title.slice(0, 22) + "…" : b.title}
            </button>
          ))}
        </div>
      )}

      {/* web area */}
      <div className="webwrap">
        {tabs.map((t) => {
          const show = t.id === activeId;
          if (isPanel(t.url)) {
            return (
              <div key={t.id} style={{ position: "absolute", inset: 0, display: show ? "flex" : "none", flexDirection: "column", overflow: "auto" }}>
                {t.url === "about:start" && <StartPage onGo={go} />}
                {t.url === "about:bookmarks" && <BookmarksPanel onGo={go} />}
                {t.url === "about:history" && <HistoryPanel onGo={go} />}
                {t.url === "about:downloads" && <DownloadsPanel />}
                {t.url === "about:passwords" && <PasswordsPanel />}
                {t.url === "about:groups" && <GroupsPanel />}
                {t.url === "about:extensions" && <ExtensionsPanel />}
              </div>
            );
          }
          return (
            <webview
              key={t.id}
              ref={(el: HTMLElement | null) => {
                if (el) {
                  const view = el as unknown as WebviewEl;
                  viewRefs.current.set(t.id, view);
                  el.addEventListener("page-title-updated", (ev) => {
                    const title = (ev as unknown as { title: string }).title;
                    setTabTitle(t.id, title);
                    recordHistory(title, t.url);
                  });
                  el.addEventListener("dom-ready", () => {
                    for (const ext of injectRef.current) view.executeJavaScript(ext.code).catch(() => undefined);
                  });
                } else {
                  viewRefs.current.delete(t.id);
                }
              }}
              src={t.url}
              partition="persist:hub"
              allowpopups={true}
              style={{ display: show ? "block" : "none" }}
            />
          );
        })}
      </div>

      {/* tab context menu */}
      {ctxMenu && (() => {
        const t = tabs.find((x) => x.id === ctxMenu.tabId);
        if (!t) return null;
        return (
          <div onMouseDown={(e) => e.stopPropagation()} style={{ position: "fixed", left: ctxMenu.x, top: ctxMenu.y, zIndex: 100, background: "#0e0e14", border: "1px solid var(--line)", borderRadius: 10, padding: 6, minWidth: 200, boxShadow: "0 12px 28px rgba(0,0,0,0.6)" }}>
            <MenuItem onClick={() => { setActiveTab(t.id); setCtxMenu(null); }}>Activate</MenuItem>
            <MenuItem onClick={() => { pinTab(t.id, !t.pinned); setCtxMenu(null); }}>{t.pinned ? "Unpin" : "Pin"}</MenuItem>
            <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />
            <div className="mono" style={{ fontSize: 10, color: "var(--mute)", padding: "4px 10px", letterSpacing: 1 }}>Group</div>
            <MenuItem onClick={() => { setTabGroup(t.id, undefined); setCtxMenu(null); }}>(none)</MenuItem>
            {groups.map((g) => (
              <MenuItem key={g.id} onClick={() => { setTabGroup(t.id, g.id); setCtxMenu(null); }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: g.color, display: "inline-block", marginRight: 8 }} />
                {g.name}
              </MenuItem>
            ))}
            <MenuItem onClick={() => { newTab("about:groups"); setCtxMenu(null); }}>Manage groups…</MenuItem>
            <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />
            <MenuItem onClick={() => { closeTab(t.id); setCtxMenu(null); }}>Close tab</MenuItem>
          </div>
        );
      })()}
    </div>
  );
}

function titleOf(t: Tab): string {
  if (isPanel(t.url)) return PANEL_NAMES[t.url as keyof typeof PANEL_NAMES];
  return t.title || "Loading…";
}

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ padding: "8px 10px", cursor: "pointer", fontSize: 13, color: "var(--ink)", borderRadius: 6 }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,87,119,0.1)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >{children}</div>
  );
}

function ExtQuickPanel({ onDone }: { onDone: () => void }) {
  // Quick-toggles for the existing house extensions. Mirrors the manager panel
  // but in a compact dropdown rooted to the address bar.
  const [enabled, setEnabled] = useState<Set<string>>(loadEnabled);
  useEffect(() => subscribeEnabled(setEnabled), []);
  function toggle(id: string) {
    const next = new Set(enabled);
    next.has(id) ? next.delete(id) : next.add(id);
    saveEnabled(next);
  }
  return (
    <div style={{ maxHeight: 360, overflow: "auto" }}>
      <div className="mono" style={{ fontSize: 10, color: "var(--mute)", letterSpacing: 1, padding: "4px 10px", textTransform: "uppercase" }}>Extensions</div>
      {EXTENSIONS.map((e) => (
        <div key={e.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 10px" }}>
          <input type="checkbox" checked={enabled.has(e.id)} onChange={() => toggle(e.id)} />
          <span style={{ fontSize: 12, flex: 1 }}>{e.name}</span>
        </div>
      ))}
      <div style={{ borderTop: "1px solid var(--line)", padding: "6px 10px" }}>
        <button className="btn" onClick={onDone}>Done</button>
      </div>
    </div>
  );
}
