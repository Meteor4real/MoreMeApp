import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Login } from "./auth/Login";
import { isAuthed, signOut, clearGuest } from "./auth/supabase";
import { Browser } from "./shell/Browser";
import { ControlPanel } from "./views/ControlPanel";
import { TerminalView } from "./views/Terminal";
import { GroupChat } from "./views/GroupChat";
import { Library } from "./views/Library";
import { Settings } from "./views/Settings";
import { Ticker } from "./shell/Ticker";
import { MusicPlayer } from "./shell/MusicPlayer";
import { Notifications } from "./shell/Notifications";
import { TutorialTom } from "./shell/TutorialTom";
import { FloatingInfo } from "./shell/FloatingInfo";
import { useFeed } from "./useFeed";
import { SITE_APPS } from "./apps";
import { EMBEDDED } from "./embedded";
import { EXTENSIONS, loadEnabled, subscribeEnabled } from "./extensions";
import { ICON } from "./icons";
import { applyAccent, loadAccent } from "./theme-accent";
import { startWireScheduler } from "./services/nt5Wire";
import { startOriginPolling } from "./services/originRealms";
import { registerNavSetter } from "./navBridge";
import { loadPrefs, subscribePrefs } from "./uiPrefs";
import logoUrl from "./assets/logo.png";

type Nav =
  | { kind: "browser"; url?: string }
  | { kind: "control" }
  | { kind: "terminal" }
  | { kind: "ai" }
  | { kind: "library" }
  | { kind: "settings" }
  | { kind: "app"; id: string };

export function App() {
  const [authed, setAuthed] = useState(() => isAuthed());
  const [nav, setNav] = useState<Nav>({ kind: "browser" }); // Browser is the default canvas
  const [railOpen, setRailOpen] = useState(true);
  const [enabledExt, setEnabledExt] = useState<Set<string>>(() => loadEnabled());
  const [prefs, setPrefs] = useState(loadPrefs);
  const { items, toasts, dismiss } = useFeed();

  useEffect(() => {
    applyAccent(loadAccent());
    // Auto-ensure the bundled local model on startup so the house AIs
    // (BroBot, NT5 anchors, Tutorial Tom) are ready when the user reaches them.
    void window.hub.llm.ensure().catch(() => undefined);
    // Start the in-app NT5 wire scheduler — generates fresh articles every
    // N minutes as long as the app is open, drives floating info + the ticker.
    startWireScheduler();
    // Origin Realms server pulse — feeds the floating info widget and the
    // NT5 wire so Dex's coverage tracks the actual server state right now.
    startOriginPolling();
    const offP = subscribePrefs(setPrefs);
    const offE = subscribeEnabled((s) => setEnabledExt(new Set(s)));
    // Register Hub nav with the tour bridge so Tutorial Tom can drive the
    // canvas while it's walking the user around.
    const offN = registerNavSetter((n) => setNav(n));
    return () => { offP(); offE(); offN(); };
  }, []);

  const injectables = useMemo(
    () => EXTENSIONS.filter((e) => enabledExt.has(e.id)).map((e) => ({ id: e.id, code: e.code })),
    [enabledExt]
  );
  function logout() {
    signOut();
    clearGuest();
    setAuthed(false);
  }

  if (!authed) return <Login onDone={() => setAuthed(true)} />;

  return (
    <div className="shell">
      <div className="app" style={{ flex: 1, minHeight: 0, height: "auto", gridTemplateColumns: railOpen ? "64px 1fr" : "1fr" }}>
        {railOpen && (
          <nav className="rail">
            <img className="rail-logo" src={logoUrl} alt="NetworkChuck Hub" title="NetworkChuck Hub" />
            <RailBtn tour="rail-browser" icon={ICON.browser} label="Browser" active={nav.kind === "browser" && !nav.url} onClick={() => setNav({ kind: "browser" })} />
            <RailBtn tour="rail-control" icon={ICON.control} label="Control Panel" active={nav.kind === "control"} onClick={() => setNav({ kind: "control" })} />
            <RailBtn tour="rail-terminal" icon={ICON.terminal} label="Terminal" active={nav.kind === "terminal"} onClick={() => setNav({ kind: "terminal" })} />
            <RailBtn tour="rail-ai" icon={ICON.ai} label="AI Group Chat" active={nav.kind === "ai"} onClick={() => setNav({ kind: "ai" })} />
            <RailBtn tour="rail-library" icon={ICON.library} label="Library" active={nav.kind === "library"} onClick={() => setNav({ kind: "library" })} />
            <div className="rail-sep" />
            {SITE_APPS.map((a) => (
              <RailBtn
                key={a.id}
                tour={`rail-app-${a.id}`}
                icon={ICON[a.id] ?? a.label.slice(0, 2).toUpperCase()}
                label={a.label}
                active={EMBEDDED[a.id] ? nav.kind === "app" && nav.id === a.id : nav.kind === "browser" && nav.url === a.url}
                onClick={() => (EMBEDDED[a.id] ? setNav({ kind: "app", id: a.id }) : a.url ? setNav({ kind: "browser", url: a.url }) : setNav({ kind: "browser" }))}
              />
            ))}
            <div style={{ marginTop: "auto" }} />
            <RailBtn tour="rail-settings" icon={ICON.settings} label="Settings" active={nav.kind === "settings"} onClick={() => setNav({ kind: "settings" })} />
            <RailBtn glyph="⊟" label="Fullscreen (hide sidebar)" active={false} onClick={() => setRailOpen(false)} />
            <RailBtn glyph="⏻" label="Sign out" active={false} onClick={logout} />
          </nav>
        )}

        {nav.kind === "browser" && <Browser initialUrl={nav.url} injectables={injectables} />}
        {nav.kind === "control" && <ControlPanel />}
        {nav.kind === "terminal" && <TerminalView />}
        {nav.kind === "ai" && <GroupChat />}
        {nav.kind === "library" && <Library />}
        {nav.kind === "settings" && <Settings onSignOut={logout} />}
        {nav.kind === "app" && renderEmbedded(nav.id)}
      </div>

      {!railOpen && (
        <button
          onClick={() => setRailOpen(true)}
          title="Show sidebar"
          style={{ position: "fixed", left: 10, bottom: 90, zIndex: 10001, width: 34, height: 34, borderRadius: 8, border: "1px solid rgba(255,87,119,0.6)", background: "#111114", color: "var(--pink)", cursor: "pointer", boxShadow: "0 0 14px var(--glow)" }}
        >
          ⊞
        </button>
      )}

      {prefs.tickerEnabled && <Ticker items={items} left={<MusicPlayer />} />}
      <Notifications toasts={toasts} onDismiss={dismiss} />
      <FloatingInfo />
      <TutorialTom />
    </div>
  );
}

function renderEmbedded(id: string) {
  const C = EMBEDDED[id];
  return C ? <C /> : null;
}

function RailBtn({
  icon,
  glyph,
  label,
  active,
  onClick,
  tour,
}: {
  icon?: ReactNode;
  glyph?: string;
  label: string;
  active: boolean;
  onClick: () => void;
  tour?: string;
}) {
  return (
    <button className={"rail-btn mono" + (active ? " active" : "")} title={label} onClick={onClick} style={{ fontSize: 16 }} data-tour={tour}>
      {icon ?? glyph}
    </button>
  );
}
