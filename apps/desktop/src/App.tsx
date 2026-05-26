import { useMemo, useState } from "react";
import { Boot } from "./boot/Boot";
import { Browser } from "./shell/Browser";
import { ControlPanel } from "./views/ControlPanel";
import { TerminalView } from "./views/Terminal";
import { ExtensionsView } from "./views/Extensions";
import { GroupChat } from "./views/GroupChat";
import { Library } from "./views/Library";
import { Ticker } from "./shell/Ticker";
import { MusicPlayer } from "./shell/MusicPlayer";
import { Notifications } from "./shell/Notifications";
import { useFeed } from "./useFeed";
import { SITE_APPS } from "./apps";
import { EXTENSIONS, loadEnabled, saveEnabled } from "./extensions";

type Nav =
  | { kind: "control" }
  | { kind: "terminal" }
  | { kind: "browser"; url?: string }
  | { kind: "extensions" }
  | { kind: "ai" }
  | { kind: "library" };

export function App() {
  const [booted, setBooted] = useState(false);
  const [nav, setNav] = useState<Nav>({ kind: "control" });
  const [enabledExt, setEnabledExt] = useState<Set<string>>(() => loadEnabled());
  const { items, toasts, dismiss } = useFeed();

  const injectables = useMemo(
    () =>
      EXTENSIONS.filter((e) => enabledExt.has(e.id)).map((e) => ({
        id: e.id,
        code: e.code,
      })),
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

  if (!booted) return <Boot onDone={() => setBooted(true)} />;

  return (
    <div className="shell">
      <div className="app" style={{ flex: 1, minHeight: 0, height: "auto" }}>
      <nav className="rail">
        <RailBtn
          glyph="C"
          label="Control Panel"
          active={nav.kind === "control"}
          onClick={() => setNav({ kind: "control" })}
        />
        <RailBtn
          glyph="›_"
          label="Terminal"
          active={nav.kind === "terminal"}
          onClick={() => setNav({ kind: "terminal" })}
        />
        <RailBtn
          glyph="AI"
          label="AI Group Chat"
          active={nav.kind === "ai"}
          onClick={() => setNav({ kind: "ai" })}
        />
        <RailBtn
          glyph="◆"
          label="Browser"
          active={nav.kind === "browser" && !nav.url}
          onClick={() => setNav({ kind: "browser" })}
        />
        <RailBtn
          glyph="EXT"
          label="Extensions"
          active={nav.kind === "extensions"}
          onClick={() => setNav({ kind: "extensions" })}
        />
        <RailBtn
          glyph="LIB"
          label="Library"
          active={nav.kind === "library"}
          onClick={() => setNav({ kind: "library" })}
        />
        <div className="rail-sep" />
        {SITE_APPS.map((a) => (
          <RailBtn
            key={a.id}
            glyph={a.label.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase()}
            label={a.label}
            active={nav.kind === "browser" && nav.url === a.url}
            onClick={() =>
              a.url
                ? setNav({ kind: "browser", url: a.url })
                : alert(`${a.label}: ${a.note}`)
            }
          />
        ))}
      </nav>

      {nav.kind === "control" && <ControlPanel />}
      {nav.kind === "terminal" && <TerminalView />}
      {nav.kind === "ai" && <GroupChat />}
      {nav.kind === "library" && <Library />}
      {nav.kind === "browser" && (
        <Browser key={nav.url || "blank"} initialUrl={nav.url} injectables={injectables} />
      )}
      {nav.kind === "extensions" && (
        <ExtensionsView enabled={enabledExt} onToggle={toggleExt} />
      )}
      </div>
      <Ticker items={items} left={<MusicPlayer />} />
      <Notifications toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

function RailBtn({
  glyph,
  label,
  active,
  onClick,
}: {
  glyph: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={"rail-btn mono" + (active ? " active" : "")}
      title={label}
      onClick={onClick}
      style={{ fontSize: glyph.length > 1 ? 13 : 18 }}
    >
      {glyph}
    </button>
  );
}
