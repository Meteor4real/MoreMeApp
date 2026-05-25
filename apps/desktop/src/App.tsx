import { useState } from "react";
import { Boot } from "./boot/Boot";
import { Browser } from "./shell/Browser";
import { ControlPanel } from "./views/ControlPanel";
import { TerminalView } from "./views/Terminal";
import { SITE_APPS } from "./apps";

type Nav =
  | { kind: "control" }
  | { kind: "terminal" }
  | { kind: "browser"; url?: string };

export function App() {
  const [booted, setBooted] = useState(false);
  const [nav, setNav] = useState<Nav>({ kind: "control" });

  if (!booted) return <Boot onDone={() => setBooted(true)} />;

  return (
    <div className="app">
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
          glyph="◆"
          label="Browser"
          active={nav.kind === "browser" && !nav.url}
          onClick={() => setNav({ kind: "browser" })}
        />
        <div className="rail-sep" />
        {SITE_APPS.map((a) => (
          <RailBtn
            key={a.id}
            glyph={a.icon}
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
      {nav.kind === "browser" && <Browser key={nav.url || "blank"} initialUrl={nav.url} />}
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
