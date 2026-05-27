import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Boot } from "./boot/Boot";
import { Login } from "./auth/Login";
import { isAuthed, signOut, clearGuest } from "./auth/supabase";
import { Browser } from "./shell/Browser";
import { ControlPanel } from "./views/ControlPanel";
import { TerminalView } from "./views/Terminal";
import { ExtensionsView } from "./views/Extensions";
import { GroupChat } from "./views/GroupChat";
import { Library } from "./views/Library";
import { Settings } from "./views/Settings";
import { Ticker } from "./shell/Ticker";
import { MusicPlayer } from "./shell/MusicPlayer";
import { Notifications } from "./shell/Notifications";
import { TutorialTom } from "./shell/TutorialTom";
import { useFeed } from "./useFeed";
import { SITE_APPS } from "./apps";
import { EMBEDDED } from "./embedded";
import { EXTENSIONS, loadEnabled, saveEnabled } from "./extensions";
import { ICON } from "./icons";
import { applyAccent, loadAccent } from "./theme-accent";
import logoUrl from "./assets/logo.png";

type Nav =
  | { kind: "browser"; url?: string }
  | { kind: "control" }
  | { kind: "terminal" }
  | { kind: "ai" }
  | { kind: "extensions" }
  | { kind: "library" }
  | { kind: "settings" }
  | { kind: "app"; id: string };

export function App() {
  const [booted, setBooted] = useState(false);
  const [authed, setAuthed] = useState(() => isAuthed());
  const [nav, setNav] = useState<Nav>({ kind: "browser" }); // Browser is the default canvas
  const [railOpen, setRailOpen] = useState(true);
  const [enabledExt, setEnabledExt] = useState<Set<string>>(() => loadEnabled());
  const { items, toasts, dismiss } = useFeed();

  useEffect(() => {
    applyAccent(loadAccent());
  }, []);

  const injectables = useMemo(
    () => EXTENSIONS.filter((e) => enabledExt.has(e.id)).map((e) => ({ id: e.id, code: e.code })),
    [enabledExt]
  );
  function toggleExt(id: string) {
    setEnabledExt((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      saveEnabled(next);
      return next;
    });
  }
  function logout() {
    signOut();
    clearGuest();
    setAuthed(false);
  }

  if (!booted) return <Boot onDone={() => setBooted(true)} />;
  if (!authed) return <Login onDone={() => setAuthed(true)} />;

  return (
    <div className="shell">
      <div className="app" style={{ flex: 1, minHeight: 0, height: "auto", gridTemplateColumns: railOpen ? "64px 1fr" : "1fr" }}>
        {railOpen && (
          <nav className="rail">
            <img className="rail-logo" src={logoUrl} alt="NetworkChuck Hub" title="NetworkChuck Hub" />
            <RailBtn icon={ICON.browser} label="Browser" active={nav.kind === "browser" && !nav.url} onClick={() => setNav({ kind: "browser" })} />
            <RailBtn icon={ICON.control} label="Control Panel" active={nav.kind === "control"} onClick={() => setNav({ kind: "control" })} />
            <RailBtn icon={ICON.terminal} label="Terminal" active={nav.kind === "terminal"} onClick={() => setNav({ kind: "terminal" })} />
            <RailBtn icon={ICON.ai} label="AI Group Chat" active={nav.kind === "ai"} onClick={() => setNav({ kind: "ai" })} />
            <RailBtn icon={ICON.extensions} label="Extensions" active={nav.kind === "extensions"} onClick={() => setNav({ kind: "extensions" })} />
            <RailBtn icon={ICON.library} label="Library" active={nav.kind === "library"} onClick={() => setNav({ kind: "library" })} />
            <div className="rail-sep" />
            {SITE_APPS.map((a) => (
              <RailBtn
                key={a.id}
                icon={ICON[a.id] ?? a.label.slice(0, 2).toUpperCase()}
                label={a.label}
                active={EMBEDDED[a.id] ? nav.kind === "app" && nav.id === a.id : nav.kind === "browser" && nav.url === a.url}
                onClick={() => (EMBEDDED[a.id] ? setNav({ kind: "app", id: a.id }) : a.url ? setNav({ kind: "browser", url: a.url }) : setNav({ kind: "browser" }))}
              />
            ))}
            <div style={{ marginTop: "auto" }} />
            <RailBtn icon={ICON.settings} label="Settings" active={nav.kind === "settings"} onClick={() => setNav({ kind: "settings" })} />
            <RailBtn glyph="⊟" label="Fullscreen (hide sidebar)" active={false} onClick={() => setRailOpen(false)} />
            <RailBtn glyph="⏻" label="Sign out" active={false} onClick={logout} />
          </nav>
        )}

        {nav.kind === "browser" && <Browser key={nav.url || "home"} initialUrl={nav.url} injectables={injectables} />}
        {nav.kind === "control" && <ControlPanel />}
        {nav.kind === "terminal" && <TerminalView />}
        {nav.kind === "ai" && <GroupChat />}
        {nav.kind === "library" && <Library />}
        {nav.kind === "settings" && <Settings onSignOut={logout} />}
        {nav.kind === "extensions" && <ExtensionsView enabled={enabledExt} onToggle={toggleExt} />}
        {nav.kind === "app" && renderEmbedded(nav.id)}
      </div>

      {!railOpen && (
        <button
          onClick={() => setRailOpen(true)}
          title="Show sidebar"
          style={{ position: "fixed", left: 10, top: 10, zIndex: 10001, width: 34, height: 34, borderRadius: 8, border: "1px solid rgba(255,87,119,0.6)", background: "#111114", color: "var(--pink)", cursor: "pointer", boxShadow: "0 0 14px var(--glow)" }}
        >
          ⊞
        </button>
      )}

      <Ticker items={items} left={<MusicPlayer />} />
      <Notifications toasts={toasts} onDismiss={dismiss} />
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
}: {
  icon?: ReactNode;
  glyph?: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button className={"rail-btn mono" + (active ? " active" : "")} title={label} onClick={onClick} style={{ fontSize: 16 }}>
      {icon ?? glyph}
    </button>
  );
}
