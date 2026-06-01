import { useEffect, useMemo, useRef, useState } from "react";
import logoUrl from "../assets/logo.png";
import {
  START_URL, type Tab, addBookmark, addTab, closeTab, getTabsState, isBookmarked,
  navigateTab, recordHistory, removeBookmark, setActiveTab, setTabGroup, setTabTitle,
  subscribeBookmarks, subscribeTabs, bookmarksSorted, getGroups, pinTab, addGroup, saveGroups,
  getZoom, setZoom, hostOf, getPasswordsForHost, getPasswordSecret, setPassword,
  type Group, type Password,
} from "../browser/store";
import { BookmarksPanel, DownloadsPanel, ExtensionsPanel, GroupsPanel, HistoryPanel, isPanel, PANEL_NAMES, panelBase, panelQuery, PasswordsPanel, SearchPanel } from "../browser/panels";
import { loadPrefs, subscribePrefs } from "../uiPrefs";
import { EXTENSIONS, UNLOAD_TPL, loadEnabled, saveEnabled, subscribeEnabled } from "../extensions";

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
  const [bookmarks, setBookmarks] = useState(bookmarksSorted);
  const [prefs, setPrefs] = useState(loadPrefs);
  const [omni, setOmni] = useState("");
  const [menuOpen, setMenuOpen] = useState<null | "ext" | "menu" | "pw">(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);
  const [savePrompt, setSavePrompt] = useState<{ host: string; user: string; pass: string } | null>(null);
  const viewRefs = useRef<Map<string, WebviewEl>>(new Map());
  const injectRef = useRef(injectables);
  injectRef.current = injectables;
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeTabs(setTabsState), []);
  useEffect(() => subscribeBookmarks(() => setBookmarks(bookmarksSorted())), []);
  useEffect(() => subscribePrefs(setPrefs), []);

  const tabs = tabsState.tabs;
  const activeId = tabsState.activeId;

  // Whenever the user toggles extensions on/off, re-inject into the active
  // webview immediately so they don't have to reload to see the change.
  // Disabled extensions get an unload script that strips their DOM/CSS so the
  // effect disappears live (not just on next navigation).
  const lastInjectedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const view = viewRefs.current.get(activeId);
    if (!view) return;
    const nowEnabled = new Set(injectables.map((e) => e.id));
    // Disabled since last tick: unload those.
    for (const id of lastInjectedRef.current) {
      if (!nowEnabled.has(id)) view.executeJavaScript(UNLOAD_TPL(id)).catch(() => undefined);
    }
    // Newly enabled / still enabled: (re-)inject — IIFE guard makes re-inject a no-op.
    for (const ext of injectables) view.executeJavaScript(ext.code).catch(() => undefined);
    lastInjectedRef.current = nowEnabled;
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

  const currentHost = activeTab ? hostOf(activeTab.url) : "";
  const pwForHost = useMemo(() => currentHost ? getPasswordsForHost(currentHost) : [], [currentHost, savePrompt]);

  async function autofillCredential(p: Password) {
    const view = viewRefs.current.get(activeId);
    if (!view) return;
    const secret = await getPasswordSecret(p.id);
    if (!secret) return;
    // Find the first visible password input + the most-likely username input
    // (preceding email/text input with autocomplete=username, or just the
    // first text/email input above the password). Fire native input events
    // so React/Vue/etc. forms register the change.
    const code = `(function(){try{
      function vis(el){var r=el.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden';}
      function set(el,v){var p=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),'value');p&&p.set?p.set.call(el,v):(el.value=v);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
      var pw=null;document.querySelectorAll('input[type=password]').forEach(function(i){if(!pw&&vis(i))pw=i;});
      if(!pw)return 'no_password_field';
      var u=null;var inputs=Array.from(document.querySelectorAll('input'));var pi=inputs.indexOf(pw);
      for(var i=pi-1;i>=0;i--){var t=(inputs[i].type||'').toLowerCase();if((t==='text'||t==='email'||t==='tel'||!t)&&vis(inputs[i])){u=inputs[i];break;}}
      if(u)set(u,${JSON.stringify(p.username)});set(pw,${JSON.stringify(secret)});return 'ok';
    }catch(e){return 'err:'+e.message;}})();`;
    try { await view.executeJavaScript(code); } catch { /* ignore */ }
    setMenuOpen(null);
  }

  // On dom-ready, inject a small form-submit listener that logs a magic
  // message we can intercept via the console-message event. The host sees the
  // username/password from the submit and offers to save if it's new.
  const PW_BRIDGE = `(function(){if(window.__nchub_pwbridge)return;window.__nchub_pwbridge=1;
    document.addEventListener('submit',function(e){try{
      var f=e.target;if(!f||!f.querySelector)return;
      var pw=f.querySelector('input[type=password]');if(!pw||!pw.value)return;
      var u='';var ins=Array.from(f.querySelectorAll('input'));var pi=ins.indexOf(pw);
      for(var i=pi-1;i>=0;i--){var t=(ins[i].type||'').toLowerCase();if((t==='text'||t==='email'||t==='tel'||!t)&&ins[i].value){u=ins[i].value;break;}}
      console.log('__NCHUB_PW__'+JSON.stringify({host:location.hostname,user:u,pass:pw.value}));
    }catch(_){}},true);
  })();`;

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
    if (!v || !activeTab) return;
    try {
      const next = Math.max(-3, Math.min(4, (v.getZoomLevel?.() || 0) + delta));
      v.setZoomLevel(next);
      setZoom(hostOf(activeTab.url), next);
    } catch { /* ignore */ }
  }
  function zoomReset() {
    try {
      viewRefs.current.get(activeId)?.setZoomLevel(0);
      if (activeTab) setZoom(hostOf(activeTab.url), 0);
    } catch { /* ignore */ }
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
      {/* tab strip — groups render as a colored chip then their tabs underneath the chip */}
      <div className="tabbar">
        {renderTabStrip(tabs, groups, activeId, setActiveTab, onTabContext, closeTab, titleOf)}
        <button className="btn" title="New tab" onClick={() => newTab()}>+</button>
      </div>

      {/* address row */}
      <div className="tabbar" style={{ borderBottom: "1px solid var(--line)", position: "relative" }}>
        <div className="omnibox">
          <button className="btn" title="Back" onClick={back}>‹</button>
          <button className="btn" title="Forward" onClick={forward}>›</button>
          <button className="btn" title="Reload" onClick={refresh}>⟳</button>
          <button className="btn" title="Home" onClick={home}>⌂</button>
          <input value={omni} data-tour="browser-omni"
            onChange={(e) => setOmni(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") go((e.target as HTMLInputElement).value); }}
            placeholder="Search the web or enter a URL"
            spellCheck={false} />
          <button className="btn" title={starred ? "Remove bookmark" : "Add bookmark"} onClick={toggleBookmark} style={starred ? { color: "var(--orange)", borderColor: "rgba(255,122,45,0.6)" } : undefined}>★</button>
          <button className="btn" title="Bookmarks" onClick={() => newTab("about:bookmarks")}>◇</button>
          <button className="btn" title="History" onClick={() => newTab("about:history")}>↺</button>
          <button className="btn" title="Downloads" onClick={() => newTab("about:downloads")}>▼</button>
          <button className="btn" title="Saved passwords for this site" onClick={() => setMenuOpen((m) => m === "pw" ? null : "pw")} style={pwForHost.length > 0 ? { color: "var(--orange)", borderColor: "rgba(255,122,45,0.5)" } : undefined}>◈</button>
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
            {menuOpen === "pw" && (
              <PasswordsQuickPanel
                host={currentHost}
                items={pwForHost}
                onFill={(p) => void autofillCredential(p)}
                onManage={() => { newTab("about:passwords"); setMenuOpen(null); }}
                onSaveNew={() => { const u = prompt("Username for " + currentHost); if (!u) return; const p = prompt("Password"); if (!p) return; void setPassword(currentHost, u, p); setMenuOpen(null); }}
              />
            )}
          </div>
        )}
      </div>

      {/* "Save this password?" banner, shown after a form submit */}
      {savePrompt && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderBottom: "1px solid var(--line)", background: "rgba(255,122,45,0.08)" }}>
          <span style={{ fontSize: 12, color: "var(--ink)" }}>
            Save the password for <b style={{ color: "var(--orange)" }}>{savePrompt.user || "(no username)"}</b> on <b>{savePrompt.host}</b>?
          </span>
          <span style={{ flex: 1 }} />
          <button className="btn" onClick={async () => { await setPassword(savePrompt.host, savePrompt.user || "(no username)", savePrompt.pass); setSavePrompt(null); }} style={{ color: "var(--pink)", borderColor: "rgba(255,87,119,0.5)" }}>Save</button>
          <button className="btn" onClick={() => setSavePrompt(null)}>Never for this site</button>
          <button className="btn" onClick={() => setSavePrompt(null)}>Not now</button>
        </div>
      )}

      {/* bookmarks bar */}
      {prefs.showBookmarksBar && bookmarks.length > 0 && (
        <div style={{ display: "flex", gap: 6, padding: "4px 8px", borderBottom: "1px solid var(--line)", overflowX: "auto", background: "rgba(0,0,0,0.35)" }}>
          {bookmarks.slice(0, 24).map((b) => (
            <button key={b.id} className="btn" title={b.url}
              onContextMenu={(e) => { e.preventDefault(); newTab("about:bookmarks"); }}
              style={{ fontSize: 11, padding: "3px 8px", whiteSpace: "nowrap", color: b.color || undefined, borderColor: b.color ? `${b.color}66` : undefined, boxShadow: b.color ? `inset 3px 0 0 ${b.color}` : undefined }}
              onClick={() => go(b.url)}>
              {b.title.length > 22 ? b.title.slice(0, 22) + "…" : b.title}
            </button>
          ))}
          <button className="btn" style={{ fontSize: 11, padding: "3px 8px", color: "var(--mute)" }} onClick={() => newTab("about:bookmarks")}>Manage…</button>
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
                    // Always install the password bridge first so the user
                    // gets a save prompt even with no extensions enabled.
                    view.executeJavaScript(PW_BRIDGE).catch(() => undefined);
                    for (const ext of injectRef.current) view.executeJavaScript(ext.code).catch(() => undefined);
                  }
                  el.addEventListener("console-message", (ev) => {
                    const msg = (ev as unknown as { message: string }).message || "";
                    if (!msg.startsWith("__NCHUB_PW__")) return;
                    try {
                      const data = JSON.parse(msg.slice("__NCHUB_PW__".length)) as { host: string; user: string; pass: string };
                      if (!data.pass) return;
                      // Skip if we already have this user/pass saved.
                      const existing = getPasswordsForHost(data.host).find((p) => p.username === data.user);
                      if (existing) { void getPasswordSecret(existing.id).then((s) => { if (s !== data.pass) setSavePrompt(data); }); }
                      else setSavePrompt(data);
                    } catch { /* ignore */ }
                  });
                  el.addEventListener("page-title-updated", (ev) => {
                    const title = (ev as unknown as { title: string }).title;
                    setTabTitle(t.id, title);
                    recordHistory(title, t.url);
                  });
                  // Apply persisted per-host zoom each time the page settles.
                  function applyZoom() {
                    try {
                      const current = viewRefs.current.get(t.id);
                      const url = current?.getURL?.() || t.url;
                      const lvl = getZoom(hostOf(url));
                      if (lvl !== 0) view.setZoomLevel(lvl);
                    } catch { /* ignore */ }
                  }
                  // Inject early (DOM exists) AND after the page settles AND
                  // on every SPA navigation. The IIFE guard inside each ext
                  // keeps re-injects idempotent per page load.
                  el.addEventListener("dom-ready", () => { applyZoom(); inject(); });
                  el.addEventListener("did-finish-load", inject);
                  el.addEventListener("did-navigate", () => { applyZoom(); inject(); });
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
          <TabContextMenu
            t={t}
            x={ctxMenu.x}
            y={ctxMenu.y}
            groups={groups}
            onActivate={() => { setActiveTab(t.id); setCtxMenu(null); }}
            onPin={() => { pinTab(t.id, !t.pinned); setCtxMenu(null); }}
            onSetGroup={(gid) => { setTabGroup(t.id, gid); setCtxMenu(null); }}
            onRenameGroup={(gid, name) => { saveGroups(getGroups().map((g) => g.id === gid ? { ...g, name } : g)); }}
            onRecolorGroup={(gid, color) => { saveGroups(getGroups().map((g) => g.id === gid ? { ...g, color } : g)); }}
            onCreateGroup={(name, color) => { const g = addGroup(name, color); setTabGroup(t.id, g.id); setCtxMenu(null); }}
            onManage={() => { newTab("about:groups"); setCtxMenu(null); }}
            onClose={() => { closeTab(t.id); setCtxMenu(null); }}
          />
        );
      })()}
    </div>
  );
}

// Group contiguous tabs by groupId so each run renders as a colored chip
// (header) followed by its tabs — like Edge/Chrome.
function renderTabStrip(
  tabs: Tab[], groups: Group[], activeId: string,
  setActive: (id: string) => void,
  onCtx: (e: React.MouseEvent, id: string) => void,
  closeT: (id: string) => void,
  titleOf: (t: Tab) => string,
): React.ReactNode {
  const out: React.ReactNode[] = [];
  let i = 0;
  while (i < tabs.length) {
    const t = tabs[i];
    if (t.groupId) {
      const grp = groups.find((g) => g.id === t.groupId);
      const run: Tab[] = [];
      while (i < tabs.length && tabs[i].groupId === t.groupId) { run.push(tabs[i]); i++; }
      out.push(
        <div key={`g-${t.groupId}-${run[0].id}`} style={{ display: "inline-flex", alignItems: "center", border: `1px solid ${grp?.color || "var(--line)"}55`, borderRadius: 8, padding: "0 4px 0 6px", background: `${grp?.color || "#333"}10`, gap: 4, marginRight: 4 }}>
          {grp && <span className="mono" title={grp.name} style={{ fontSize: 10, color: grp.color, letterSpacing: 1, padding: "2px 4px", maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textShadow: `0 0 6px ${grp.color}88` }}>{grp.name}</span>}
          {run.map((rt) => (
            <TabPill key={rt.id} t={rt} active={rt.id === activeId} onActivate={() => setActive(rt.id)} onCtx={onCtx} onClose={() => closeT(rt.id)} title={titleOf(rt)} />
          ))}
        </div>
      );
    } else {
      out.push(<TabPill key={t.id} t={t} active={t.id === activeId} onActivate={() => setActive(t.id)} onCtx={onCtx} onClose={() => closeT(t.id)} title={titleOf(t)} />);
      i++;
    }
  }
  return out;
}

function TabPill({ t, active, onActivate, onCtx, onClose, title }: { t: Tab; active: boolean; onActivate: () => void; onCtx: (e: React.MouseEvent, id: string) => void; onClose: () => void; title: string }) {
  return (
    <div className={"tab" + (active ? " active" : "")} onClick={onActivate} onContextMenu={(e) => onCtx(e, t.id)} title={title}>
      {t.pinned && <span className="mono" style={{ fontSize: 9, color: "var(--orange)" }}>●</span>}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
      {!t.pinned && (<span className="x" onClick={(e) => { e.stopPropagation(); onClose(); }}>✕</span>)}
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

const GROUP_COLORS = ["#ff5577", "#ff7a2d", "#fbbf24", "#22c55e", "#22d3ee", "#3b82f6", "#a78bfa", "#ec4899"];

function TabContextMenu({
  t, x, y, groups,
  onActivate, onPin, onSetGroup, onRenameGroup, onRecolorGroup, onCreateGroup, onManage, onClose,
}: {
  t: Tab; x: number; y: number; groups: Group[];
  onActivate: () => void; onPin: () => void;
  onSetGroup: (gid: string | undefined) => void;
  onRenameGroup: (gid: string, name: string) => void;
  onRecolorGroup: (gid: string, color: string) => void;
  onCreateGroup: (name: string, color: string) => void;
  onManage: () => void; onClose: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(GROUP_COLORS[0]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");

  return (
    <div onMouseDown={(e) => e.stopPropagation()} style={{ position: "fixed", left: x, top: y, zIndex: 100, background: "#0e0e14", border: "1px solid var(--line)", borderRadius: 10, padding: 6, minWidth: 240, boxShadow: "0 12px 28px rgba(0,0,0,0.6)" }}>
      <MenuItem onClick={onActivate}>Activate</MenuItem>
      <MenuItem onClick={onPin}>{t.pinned ? "Unpin" : "Pin"}</MenuItem>
      <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />
      <div className="mono" style={{ fontSize: 10, color: "var(--mute)", padding: "4px 10px", letterSpacing: 1 }}>Group</div>
      {!creating ? (
        <>
          <MenuItem onClick={() => onSetGroup(undefined)}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--mute)", display: "inline-block", marginRight: 8 }} />
            (none)
          </MenuItem>
          {groups.map((g) => {
            const isInGroup = t.groupId === g.id;
            if (renamingId === g.id) {
              return (
                <div key={g.id} style={{ display: "flex", gap: 4, padding: "4px 10px", alignItems: "center" }}>
                  <input type="color" value={g.color} onChange={(e) => onRecolorGroup(g.id, e.target.value)} style={{ width: 22, height: 22, padding: 0, border: "1px solid var(--line)", borderRadius: 4, background: "transparent" }} />
                  <input autoFocus value={renameVal} onChange={(e) => setRenameVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { onRenameGroup(g.id, renameVal.trim() || g.name); setRenamingId(null); } if (e.key === "Escape") setRenamingId(null); }} style={{ flex: 1, background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 6, color: "var(--ink)", padding: "4px 6px", fontSize: 12, outline: "none" }} />
                  <button className="btn" style={{ padding: "2px 6px", fontSize: 10 }} onClick={() => { onRenameGroup(g.id, renameVal.trim() || g.name); setRenamingId(null); }}>✓</button>
                </div>
              );
            }
            return (
              <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 4px 0 0" }}>
                <div onClick={() => onSetGroup(g.id)} style={{ padding: "8px 10px", cursor: "pointer", fontSize: 13, color: isInGroup ? "var(--pink)" : "var(--ink)", borderRadius: 6, flex: 1, display: "flex", alignItems: "center" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,87,119,0.1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: g.color, display: "inline-block", marginRight: 8, boxShadow: `0 0 6px ${g.color}88` }} />
                  {g.name}{isInGroup ? " ●" : ""}
                </div>
                <span title="rename" onClick={() => { setRenamingId(g.id); setRenameVal(g.name); }} style={{ color: "var(--mute)", fontSize: 11, cursor: "pointer", padding: "2px 6px" }}>✎</span>
              </div>
            );
          })}
          <MenuItem onClick={() => { setCreating(true); setName(""); }}>
            <span style={{ color: "var(--pink)", marginRight: 6 }}>+</span> New group from this tab
          </MenuItem>
          <MenuItem onClick={onManage}>Manage groups…</MenuItem>
        </>
      ) : (
        <div style={{ padding: "6px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="group name" onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) onCreateGroup(name.trim(), color); if (e.key === "Escape") setCreating(false); }} style={{ background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 6, color: "var(--ink)", padding: "6px 8px", fontSize: 12, outline: "none" }} />
          <div style={{ display: "flex", gap: 4 }}>
            {GROUP_COLORS.map((c) => (
              <span key={c} onClick={() => setColor(c)} style={{ width: 18, height: 18, borderRadius: 4, background: c, cursor: "pointer", border: color === c ? "2px solid #fff" : "2px solid transparent", boxShadow: `0 0 6px ${c}66` }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="btn" style={{ flex: 1, padding: "4px 8px", fontSize: 11 }} disabled={!name.trim()} onClick={() => onCreateGroup(name.trim(), color)}>Create</button>
            <button className="btn" style={{ flex: 1, padding: "4px 8px", fontSize: 11 }} onClick={() => setCreating(false)}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />
      <MenuItem onClick={onClose}>Close tab</MenuItem>
    </div>
  );
}

function PasswordsQuickPanel({ host, items, onFill, onManage, onSaveNew }: { host: string; items: Password[]; onFill: (p: Password) => void; onManage: () => void; onSaveNew: () => void }) {
  return (
    <div style={{ maxHeight: 360, overflow: "auto" }}>
      <div className="mono" style={{ fontSize: 10, color: "var(--mute)", letterSpacing: 1, padding: "4px 10px", textTransform: "uppercase" }}>
        {host ? `Saved for ${host}` : "Passwords"}
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--mute)", padding: "8px 10px" }}>No saved credentials for this site.</div>
      ) : (
        items.map((p) => (
          <div key={p.id} onClick={() => onFill(p)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", cursor: "pointer", borderRadius: 6 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,87,119,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--orange)", boxShadow: "0 0 6px var(--orange)" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.username}</div>
              <div style={{ fontSize: 10, color: "var(--mute)" }}>{p.host} · saved {new Date(p.ts).toLocaleDateString()}</div>
            </div>
            <span className="mono" style={{ fontSize: 10, color: "var(--pink)" }}>fill ›</span>
          </div>
        ))
      )}
      <div style={{ borderTop: "1px solid var(--line)", padding: "6px 10px", display: "flex", gap: 6 }}>
        <button className="btn" style={{ flex: 1, fontSize: 11 }} onClick={onSaveNew}>+ Save new</button>
        <button className="btn" style={{ flex: 1, fontSize: 11 }} onClick={onManage}>Manage all</button>
      </div>
    </div>
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
