import { useEffect, useMemo, useState } from "react";

type Game = { appid: string; name: string };

// Per-game personalization the owner can set: custom name, custom banner URL,
// custom icon size, hidden/pinned. Stored locally; survives restarts.
type Override = { displayName?: string; banner?: string; size?: IconSize; hidden?: boolean; pinned?: boolean };
type IconSize = "s" | "m" | "l";
type Overrides = Record<string, Override>;

const OVR_KEY = "nchub.library.overrides.v2";
const SIZE_PX: Record<IconSize, number> = { s: 130, m: 180, l: 260 };

function loadOverrides(): Overrides {
  try { return JSON.parse(localStorage.getItem(OVR_KEY) || "{}"); } catch { return {}; }
}
function saveOverrides(v: Overrides) {
  try { localStorage.setItem(OVR_KEY, JSON.stringify(v)); } catch { /* ignore */ }
}

export function Library() {
  const [games, setGames] = useState<Game[]>([]);
  const [scanErr, setScanErr] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const [manual, setManual] = useState("");
  const [ovr, setOvr] = useState<Overrides>(loadOverrides);
  const [editing, setEditing] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    window.hub.steamList()
      .then((r) => { setGames(r.games || []); if (!r.ok) setScanErr(r.error || "Could not scan Steam."); })
      .finally(() => setScanning(false));
  }, []);

  function update(appid: string, patch: Override) {
    const next: Overrides = { ...ovr, [appid]: { ...(ovr[appid] || {}), ...patch } };
    setOvr(next); saveOverrides(next);
  }

  const sorted = useMemo(() => {
    const visible = games.filter((g) => showHidden || !ovr[g.appid]?.hidden);
    return [...visible].sort((a, b) => {
      const pa = ovr[a.appid]?.pinned ? 0 : 1;
      const pb = ovr[b.appid]?.pinned ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return (ovr[a.appid]?.displayName || a.name).localeCompare(ovr[b.appid]?.displayName || b.name);
    });
  }, [games, ovr, showHidden]);

  return (
    <div className="stage">
      <div className="mono" style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "var(--mute)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Library</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn" onClick={() => window.hub.launchSteam()}>Open Steam</button>
          <button className="btn" onClick={() => setShowHidden((v) => !v)}>{showHidden ? "Hide hidden" : "Show hidden"}</button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
          <input className="lib-input" placeholder="AppID (e.g. 730)" value={manual} onChange={(e) => setManual(e.target.value)} style={inputStyle} />
          <button className="btn" disabled={!manual} onClick={() => window.hub.launchSteam(manual.trim())}>Launch by AppID</button>
          <span style={{ fontSize: 11, color: "var(--mute)" }}>Hover a game to customize it. Modrinth + Blockbench moved to the Control Panel.</span>
        </div>

        {scanning && <div style={{ color: "var(--mute)", fontSize: 13 }}>Scanning Steam library…</div>}
        {scanErr && <div style={{ color: "var(--mute)", fontSize: 13 }}>{scanErr} You can still launch by AppID or open Steam above.</div>}

        {!scanning && sorted.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14 }}>
            {sorted.map((g) => {
              const o = ovr[g.appid] || {};
              const size = o.size || "m";
              const pxW = SIZE_PX[size];
              const pxH = Math.round(pxW * 0.45);
              const banner = o.banner || `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/library_hero.jpg`;
              const fallback = `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/capsule_231x87.jpg`;
              const displayName = o.displayName || g.name;
              return (
                <div key={g.appid} className="panel" style={{ padding: 0, overflow: "hidden", position: "relative", gridColumn: size === "l" ? "span 2" : undefined, opacity: o.hidden ? 0.55 : 1 }}>
                  <button onClick={() => window.hub.launchSteam(g.appid)} title={`Launch ${displayName}`} style={{ display: "block", width: "100%", padding: 0, background: "transparent", border: "none", cursor: "pointer", color: "var(--ink)" }}>
                    <div style={{ width: "100%", height: pxH, background: "#000", overflow: "hidden", position: "relative" }}>
                      <img src={banner} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        onError={(e) => { (e.target as HTMLImageElement).src = fallback; }} />
                      {o.pinned && <span style={{ position: "absolute", top: 6, left: 6, fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(0,0,0,0.6)", color: "var(--pink)", letterSpacing: 1, textTransform: "uppercase" }}>Pinned</span>}
                    </div>
                    <div className="mono" style={{ fontSize: 12, padding: "8px 10px" }}>{displayName}</div>
                  </button>
                  <button className="btn" style={{ position: "absolute", top: 6, right: 6, padding: "2px 8px", fontSize: 10 }} onClick={() => setEditing(editing === g.appid ? null : g.appid)}>{editing === g.appid ? "Done" : "Edit"}</button>
                  {editing === g.appid && (
                    <div style={{ padding: 10, borderTop: "1px solid var(--line)", background: "rgba(0,0,0,0.35)" }}>
                      <Row l="name">
                        <input style={inputStyle} value={o.displayName || ""} placeholder={g.name} onChange={(e) => update(g.appid, { displayName: e.target.value || undefined })} />
                      </Row>
                      <Row l="banner URL">
                        <input style={inputStyle} value={o.banner || ""} placeholder="https://…  (leave blank for Steam default)" onChange={(e) => update(g.appid, { banner: e.target.value || undefined })} />
                      </Row>
                      <Row l="size">
                        <div style={{ display: "flex", gap: 4 }}>
                          {(["s", "m", "l"] as const).map((s) => (
                            <button key={s} className="btn" style={{ padding: "2px 8px", fontSize: 10, color: size === s ? "var(--pink)" : undefined }} onClick={() => update(g.appid, { size: s })}>{s.toUpperCase()}</button>
                          ))}
                        </div>
                      </Row>
                      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                        <button className="btn" onClick={() => update(g.appid, { pinned: !o.pinned })}>{o.pinned ? "Unpin" : "Pin"}</button>
                        <button className="btn" onClick={() => update(g.appid, { hidden: !o.hidden })}>{o.hidden ? "Unhide" : "Hide"}</button>
                        <button className="btn" onClick={() => update(g.appid, { displayName: undefined, banner: undefined, size: undefined })}>Reset</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ l, children }: { l: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", fontSize: 10, color: "var(--mute)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
      {l}
      <div style={{ marginTop: 3 }}>{children}</div>
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.5)",
  border: "1px solid var(--line)",
  borderRadius: 8,
  color: "var(--ink)",
  padding: "6px 10px",
  fontSize: 12,
  fontFamily: "ui-monospace, monospace",
  outline: "none",
  width: "100%",
};
