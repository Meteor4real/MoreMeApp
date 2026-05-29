import { useEffect, useState } from "react";

type Game = { appid: string; name: string };

const PATHS_KEY = "nchub.launch.paths.v1";
function loadPaths(): { modrinth?: string; blockbench?: string } {
  try {
    return JSON.parse(localStorage.getItem(PATHS_KEY) || "{}");
  } catch {
    return {};
  }
}

export function Library() {
  const [games, setGames] = useState<Game[]>([]);
  const [scanErr, setScanErr] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const [manual, setManual] = useState("");
  const [paths, setPaths] = useState(loadPaths);

  useEffect(() => {
    window.hub
      .steamList()
      .then((r) => {
        setGames(r.games || []);
        if (!r.ok) setScanErr(r.error || "Could not scan Steam.");
      })
      .finally(() => setScanning(false));
  }, []);

  function savePaths(next: { modrinth?: string; blockbench?: string }) {
    setPaths(next);
    localStorage.setItem(PATHS_KEY, JSON.stringify(next));
  }

  return (
    <div className="stage">
      <div
        className="mono"
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--line)",
          fontSize: 12,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: "var(--mute)",
        }}
      >
        Library
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {/* Steam */}
        <Section title="Steam">
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <button className="btn" onClick={() => window.hub.launchSteam()}>
              Open Steam
            </button>
            <input
              className="lib-input"
              placeholder="AppID (e.g. 730)"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              style={inputStyle}
            />
            <button className="btn" disabled={!manual} onClick={() => window.hub.launchSteam(manual.trim())}>
              Launch AppID
            </button>
          </div>

          {scanning && <div style={{ color: "var(--mute)", fontSize: 13 }}>Scanning Steam library…</div>}
          {scanErr && (
            <div style={{ color: "var(--mute)", fontSize: 13 }}>
              {scanErr} You can still launch by AppID or open Steam above.
            </div>
          )}
          {!scanning && games.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))",
                gap: 10,
              }}
            >
              {games.map((g) => (
                <button
                  key={g.appid}
                  className="panel"
                  onClick={() => window.hub.launchSteam(g.appid)}
                  title={`Launch ${g.name}`}
                  style={{ textAlign: "left", padding: 10, cursor: "pointer", color: "var(--ink)" }}
                >
                  <img
                    src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/capsule_231x87.jpg`}
                    alt=""
                    style={{ width: "100%", borderRadius: 4, display: "block", background: "#000" }}
                    onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                  />
                  <div className="mono" style={{ fontSize: 12, marginTop: 6 }}>{g.name}</div>
                </button>
              ))}
            </div>
          )}
        </Section>

        {/* Modrinth */}
        <Section title="Modrinth">
          <ExeLauncher
            label="Modrinth App"
            value={paths.modrinth || ""}
            placeholder="C:\\Users\\you\\AppData\\Local\\Modrinth App\\Modrinth App.exe"
            onChange={(v) => savePaths({ ...paths, modrinth: v })}
            onWebsite={() => window.hub.launchUri("https://modrinth.com")}
          />
        </Section>

        {/* Blockbench */}
        <Section title="Blockbench">
          <ExeLauncher
            label="Blockbench"
            value={paths.blockbench || ""}
            placeholder="C:\\Program Files\\Blockbench\\Blockbench.exe"
            onChange={(v) => savePaths({ ...paths, blockbench: v })}
            onWebsite={() => window.hub.launchUri("https://web.blockbench.net")}
          />
        </Section>
      </div>
    </div>
  );
}

function ExeLauncher({
  label,
  value,
  placeholder,
  onChange,
  onWebsite,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  onWebsite: () => void;
}) {
  const [err, setErr] = useState<string | null>(null);
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, flex: 1, minWidth: 260 }}
      />
      <button
        className="btn"
        disabled={!value}
        onClick={async () => {
          const r = await window.hub.launchPath(value);
          setErr(r.ok ? null : r.error || "Could not launch.");
        }}
      >
        Launch {label}
      </button>
      <button className="btn" onClick={onWebsite}>
        Open web
      </button>
      {err && <span style={{ color: "var(--red)", fontSize: 12 }}>{err}</span>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span className="mono" style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "var(--ink)" }}>
          {title}
        </span>
        <div className="strip-thin-h" style={{ flex: 1, height: 1, background: "var(--line)" }} />
      </div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.5)",
  border: "1px solid var(--line)",
  borderRadius: 8,
  color: "var(--ink)",
  padding: "7px 12px",
  fontSize: 12,
  fontFamily: "ui-monospace, monospace",
  outline: "none",
};
