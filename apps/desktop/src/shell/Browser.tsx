import { useEffect, useMemo, useRef, useState } from "react";
import logoUrl from "../assets/logo.png";
import {
  START_URL, type Tab, addBookmark, addTab, closeTab, getTabsState, isBookmarked,
  navigateTab, recordHistory, removeBookmark, setActiveTab, setTabGroup, setTabTitle,
  subscribeBookmarks, subscribeTabs, getBookmarks, getGroups, pinTab,
} from "../browser/store";
import { BookmarksPanel, DownloadsPanel, ExtensionsPanel, GroupsPanel, HistoryPanel, isPanel, PANEL_NAMES, panelBase, panelQuery, PasswordsPanel, SearchPanel } from "../browser/panels";
import { loadPrefs, subscribePrefs } from "../uiPrefs";
import { EXTENSIONS, loadEnabled, saveEnabled, subscribeEnabled } from "../extensions";

function normalize(input: string): string {
  const v = input.trim();
  if (!v) return START_URL;
  if (v.startsWith("about:")) return v;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v)) return "https://" + v;
  // Anything else is a query — route through our own search-results page
  // (about:search) instead of redirecting to the engine's site. The chrome
  // stays ours; the results come from the configured engine over their
  // HTML endpoint.
  return "about:search?q=" + encodeURIComponent(v);
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

  const tabs = tabsState.tabs;
  const activeId = tabsState.activeId;

  // Whenever the user toggles extensions on/off, re-inject into the active
  // webview immediately so they don't have to reload to see the change.
  useEffect(() => {
    const view = viewRefs.current.get(activeId);
    if (!view) return;
    for (const ext of injectables) view.executeJavaScript(ext.code).catch(() => undefined);
  }, [injectables, activeId]);

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
    if (url) { addTab(url); return; }
    // Honor Settings → Browser → Default new tab page.
    const dest = prefs.defaultNewTabPage === "homepage" ? (prefs.homePage || START_URL)
      : prefs.defaultNewTabPage === "blank" ? "about:blank"
      : START_URL;
    addTab(dest);
  }
  function refresh() { viewRefs.current.get(activeId)?.reload(); }
  function back() { viewRefs.current.get(activeId)?.goBack(); }
  function forward() { viewRefs.current.get(activeId)?.goForward(); }
  function home() { go(prefs.homePage || ""); }
  function zoom(delta: number) {
    const v = viewRefs.current.get(activeId);
    if (!v) return;
    try { v.setZoomLevel(Math.max(-3, Math.min(4, (v.getZoomLevel?.() || 0) + delta))); } catch { /* ignore */ }
  }
  function zoomReset() {
    try { viewRefs.current.get(activeId)?.setZoomLevel(0); } catch { /* ignore */ }
  }
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
          <button className="btn" title="Bookmarks" onClick={() => newTab("about:bookmarks")}>◇</button>
          <button className="btn" title="History" onClick={() => newTab("about:history")}>↺</button>
          <button className="btn" title="Downloads" onClick={() => newTab("about:downloads")}>▼</button>
          <button className="btn" title="Passwords" onClick={() => newTab("about:passwords")}>◈</button>
          <button className="btn" title="Extensions" onClick={() => setMenuOpen((m) => m === "ext" ? null : "ext")}>⊞</button>
          <button className="btn" title="More" onClick={() => setMenuOpen((m) => m === "menu" ? null : "menu")}>⋮</button>
        </div>

        {menuOpen && (
          <div ref={menuRef} style={{ position: "absolute", right: 12, top: 44, zIndex: 50, minWidth: 220, background: "#0e0e14", border: "1px solid var(--line)", borderRadius: 10, padding: 8, boxShadow: "0 12px 28px rgba(0,0,0,0.55)" }}>
            {menuOpen === "menu" && (
              <>
                <div style={{ display: "flex", gap: 6, padding: "6px 10px", borderBottom: "1px solid var(--line)" }}>
                  <button className="btn" style={{ flex: 1 }} onClick={() => zoom(-0.5)}>−</button>
                  <button className="btn" style={{ flex: 1 }} onClick={zoomReset}>100%</button>
                  <button className="btn" style={{ flex: 1 }} onClick={() => zoom(0.5)}>+</button>
                </div>
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
            const key = panelBase(t.url);
            return (
              <div key={t.id} style={{ position: "absolute", inset: 0, display: show ? "flex" : "none", flexDirection: "column", overflow: "auto" }}>
                {key === "about:start" && <StartPage onGo={go} />}
                {key === "about:bookmarks" && <BookmarksPanel onGo={go} />}
                {key === "about:history" && <HistoryPanel onGo={go} />}
                {key === "about:downloads" && <DownloadsPanel />}
                {key === "about:passwords" && <PasswordsPanel />}
                {key === "about:groups" && <GroupsPanel />}
                {key === "about:extensions" && <ExtensionsPanel />}
                {key === "about:search" && <SearchPanel query={panelQuery(t.url, "q")} onGo={go} />}
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
                  function inject() {
                    for (const ext of injectRef.current) view.executeJavaScript(ext.code).catch(() => undefined);
                  }
                  el.addEventListener("page-title-updated", (ev) => {
                    const title = (ev as unknown as { title: string }).title;
                    setTabTitle(t.id, title);
                    recordHistory(title, t.url);
                  });
                  // Inject early (DOM exists) AND after the page settles AND
                  // on every SPA navigation. The IIFE guard inside each ext
                  // keeps re-injects idempotent per page load.
                  el.addEventListener("dom-ready", inject);
                  el.addEventListener("did-finish-load", inject);
                  el.addEventListener("did-navigate", inject);
                  el.addEventListener("did-navigate-in-page", inject);
                } else {
                  viewRefs.current.delete(t.id);
                }
              }}
              src={t.url}
              partition="persist:hub"
              {...(prefs.blockPopups ? {} : { allowpopups: true })}
              webpreferences={prefs.blockAutoplay ? "autoplayPolicy=document-user-activation-required" : "autoplayPolicy=no-user-gesture-required"}
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
  if (isPanel(t.url)) {
    const key = panelBase(t.url);
    if (key === "about:search") {
      const q = panelQuery(t.url, "q");
      return q ? `Search · ${q}` : "Search";
    }
    return key ? PANEL_NAMES[key] : "New Tab";
  }
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
