import { useEffect, useMemo, useState } from "react";

// Library — Steam-style with playtime, recent activity, and dev news. Local
// AppID scan stays (so games appear immediately even without the Web API
// connected); when Steam is connected in Control Panel (API key + SteamID64
// pasted into the base URL field) the Library decorates every card with
// real playtime, last-played, and dev news.

type Game = { appid: string; name: string };
type Override = { displayName?: string; banner?: string; size?: IconSize; hidden?: boolean; pinned?: boolean };
type IconSize = "s" | "m" | "l";
type Overrides = Record<string, Override>;

type SteamOwned = { appid: number; name: string; playtime_forever: number; playtime_2weeks?: number; rtime_last_played?: number; img_icon_url?: string };
type SteamNews = { gid: string; title: string; url: string; author?: string; contents?: string; feedlabel?: string; date: number; appid: number };
type SteamAch = { apiname: string; achieved: number; unlocktime: number };
type SchemaAch = { name: string; displayName: string; description?: string; icon?: string; icongray?: string; hidden?: number };
type AchSummary = { appid: number; gameName: string; unlocked: number; total: number; recent: { name: string; displayName: string; unlocktime: number; icon?: string; appid: number; gameName: string }[] };

const OVR_KEY = "nchub.library.overrides.v2";
const SIZE_PX: Record<IconSize, number> = { s: 130, m: 180, l: 260 };

function loadOverrides(): Overrides {
  try { return JSON.parse(localStorage.getItem(OVR_KEY) || "{}"); } catch { return {}; }
}
function saveOverrides(v: Overrides) {
  try { localStorage.setItem(OVR_KEY, JSON.stringify(v)); } catch { /* ignore */ }
}

const fmtHours = (mins: number) => mins >= 60 ? `${(mins / 60).toFixed(mins >= 6000 ? 0 : 1)}h` : `${mins}m`;
const fmtAgo = (sec: number) => {
  if (!sec) return "never";
  const d = (Date.now() / 1000 - sec);
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  if (d < 86400 * 30) return `${Math.floor(d / 86400)}d ago`;
  return `${Math.floor(d / 86400 / 30)}mo ago`;
};

export function Library() {
  const [games, setGames] = useState<Game[]>([]);
  const [scanErr, setScanErr] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const [manual, setManual] = useState("");
  const [ovr, setOvr] = useState<Overrides>(loadOverrides);
  const [editing, setEditing] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [q, setQ] = useState("");
  const [steam, setSteam] = useState<{ key: string; id: string }>({ key: "", id: "" });
  const [owned, setOwned] = useState<Map<string, SteamOwned>>(new Map());
  const [news, setNews] = useState<SteamNews[]>([]);
  const [steamErr, setSteamErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [achievements, setAchievements] = useState<Map<string, AchSummary>>(new Map());

  useEffect(() => {
    window.hub.steamList()
      .then((r) => { setGames(r.games || []); if (!r.ok) setScanErr(r.error || "Could not scan Steam."); })
      .finally(() => setScanning(false));
  }, []);

  // Pull Steam Web API data if the user has connected it.
  useEffect(() => { void refreshSteam(); }, []);
  async function refreshSteam() {
    setRefreshing(true); setSteamErr(null);
    try {
      const cred = await window.hub.vault.get("steam");
      const key = cred.token?.trim(); const id = cred.baseUrl?.trim();
      setSteam({ key: key || "", id: id || "" });
      if (!key || !id) { setOwned(new Map()); setNews([]); return; }
      // Owned games with playtime.
      const r = await window.hub.net({ method: "GET", url: `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${encodeURIComponent(key)}&steamid=${encodeURIComponent(id)}&include_appinfo=1&include_played_free_games=1` });
      const list = ((r.data as { response?: { games?: SteamOwned[] } })?.response?.games) || [];
      const m = new Map<string, SteamOwned>();
      for (const g of list) m.set(String(g.appid), g);
      setOwned(m);
      // Recent dev news across the 5 most-played games.
      const top = [...list].sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0)).slice(0, 5);
      const allNews: SteamNews[] = [];
      await Promise.all(top.map(async (g) => {
        try {
          const nr = await window.hub.net({ method: "GET", url: `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${g.appid}&count=3&maxlength=320&format=json` });
          const items = ((nr.data as { appnews?: { newsitems?: SteamNews[] } })?.appnews?.newsitems) || [];
          items.forEach((n) => allNews.push({ ...n, appid: g.appid }));
        } catch { /* ignore per-app */ }
      }));
      allNews.sort((a, b) => b.date - a.date);
      setNews(allNews.slice(0, 12));

      // Achievements — top 10 played games. Some games have no achievements;
      // Steam returns 403/400/empty in those cases. Swallow per-game errors.
      const playedTop = [...list].filter((g) => (g.playtime_forever || 0) > 0).sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0)).slice(0, 10);
      const achMap = new Map<string, AchSummary>();
      await Promise.all(playedTop.map(async (g) => {
        try {
          const [pa, sc] = await Promise.all([
            window.hub.net({ method: "GET", url: `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key=${encodeURIComponent(key)}&steamid=${encodeURIComponent(id)}&appid=${g.appid}` }),
            window.hub.net({ method: "GET", url: `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${encodeURIComponent(key)}&appid=${g.appid}` }),
          ]);
          const playerStats = ((pa.data as { playerstats?: { achievements?: SteamAch[]; success?: boolean; gameName?: string } })?.playerstats);
          if (!playerStats?.success || !Array.isArray(playerStats.achievements) || playerStats.achievements.length === 0) return;
          const schemaAchs = ((sc.data as { game?: { availableGameStats?: { achievements?: SchemaAch[] } } })?.game?.availableGameStats?.achievements) || [];
          const schemaByName = new Map(schemaAchs.map((s) => [s.name, s] as const));
          const total = playerStats.achievements.length;
          const unlocked = playerStats.achievements.filter((a) => a.achieved === 1).length;
          const recent = playerStats.achievements
            .filter((a) => a.achieved === 1 && a.unlocktime > 0)
            .sort((a, b) => b.unlocktime - a.unlocktime)
            .slice(0, 5)
            .map((a) => {
              const s = schemaByName.get(a.apiname);
              return { name: a.apiname, displayName: s?.displayName || a.apiname, unlocktime: a.unlocktime, icon: s?.icon, appid: g.appid, gameName: g.name };
            });
          achMap.set(String(g.appid), { appid: g.appid, gameName: playerStats.gameName || g.name, unlocked, total, recent });
        } catch { /* ignore per-app — many games have no achievements / private profile */ }
      }));
      setAchievements(achMap);
    } catch (e) { setSteamErr(String(e)); } finally { setRefreshing(false); }
  }

  function update(appid: string, patch: Override) {
    const next: Overrides = { ...ovr, [appid]: { ...(ovr[appid] || {}), ...patch } };
    setOvr(next); saveOverrides(next);
  }

  // Merge local scan with Steam Web API ownership — Web API may know games
  // the local scan doesn't (and gives playtime + last-played either way).
  const merged: Game[] = useMemo(() => {
    const out = new Map<string, Game>();
    for (const g of games) out.set(g.appid, g);
    for (const [appid, o] of owned) if (!out.has(appid)) out.set(appid, { appid, name: o.name });
    return [...out.values()];
  }, [games, owned]);

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    return merged.filter((g) => {
      if (!showHidden && ovr[g.appid]?.hidden) return false;
      if (text && !(ovr[g.appid]?.displayName || g.name).toLowerCase().includes(text)) return false;
      return true;
    });
  }, [merged, ovr, showHidden, q]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const pa = ovr[a.appid]?.pinned ? 0 : 1, pb = ovr[b.appid]?.pinned ? 0 : 1;
    if (pa !== pb) return pa - pb;
    // After pinned, sort by recent playtime (2-week → all-time) then alpha.
    const oa = owned.get(a.appid), ob = owned.get(b.appid);
    const ra = (oa?.playtime_2weeks ?? 0), rb = (ob?.playtime_2weeks ?? 0);
    if (ra !== rb) return rb - ra;
    const ta = (oa?.playtime_forever ?? 0), tb = (ob?.playtime_forever ?? 0);
    if (ta !== tb) return tb - ta;
    return (ovr[a.appid]?.displayName || a.name).localeCompare(ovr[b.appid]?.displayName || b.name);
  }), [filtered, ovr, owned]);

  // Hero pick: the most-recently-played, falling back to most-played, then any pinned, then first game.
  const hero: Game | null = useMemo(() => {
    if (owned.size > 0) {
      const ord = [...owned.values()].sort((a, b) => (b.rtime_last_played || 0) - (a.rtime_last_played || 0) || (b.playtime_forever || 0) - (a.playtime_forever || 0));
      const first = ord[0]; if (first) return { appid: String(first.appid), name: first.name };
    }
    return sorted.find((g) => ovr[g.appid]?.pinned) || sorted[0] || null;
  }, [owned, sorted, ovr]);

  const totalGames = merged.length;
  const totalHours = [...owned.values()].reduce((s, o) => s + (o.playtime_forever || 0), 0) / 60;
  const recentHours = [...owned.values()].reduce((s, o) => s + (o.playtime_2weeks || 0), 0) / 60;
  const playedCount = [...owned.values()].filter((o) => (o.playtime_forever || 0) > 0).length;
  const achUnlocked = [...achievements.values()].reduce((s, a) => s + a.unlocked, 0);
  const achTotal = [...achievements.values()].reduce((s, a) => s + a.total, 0);
  const perfectGames = [...achievements.values()].filter((a) => a.total > 0 && a.unlocked === a.total).length;
  const recentAch = useMemo(() => {
    const all = [...achievements.values()].flatMap((a) => a.recent);
    return all.sort((a, b) => b.unlocktime - a.unlocktime).slice(0, 8);
  }, [achievements]);

  return (
    <div className="stage" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Header strip */}
      <div className="mono" style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "var(--mute)", display: "flex", justifyContent: "space-between", alignItems: "center", flex: "none" }}>
        <span className="glow-text">Library</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search games" style={{ ...inputStyle, width: 200 }} />
          <button className="btn" onClick={() => void refreshSteam()} disabled={refreshing}>{refreshing ? "…" : "Refresh"}</button>
          <button className="btn" onClick={() => window.hub.launchSteam()}>Open Steam</button>
          <button className="btn" onClick={() => setShowHidden((v) => !v)}>{showHidden ? "Hide hidden" : "Show hidden"}</button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 16, minHeight: 0 }}>
        {/* Steam connection nudge */}
        {!steam.key || !steam.id ? (
          <div className="panel" style={{ padding: 12, marginBottom: 16, borderColor: "rgba(34,211,238,0.4)", background: "rgba(34,211,238,0.05)" }}>
            <div className="mono glow-text" style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Connect Steam for the full library</div>
            <div style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.6 }}>
              In <b>Control Panel → Games → Steam</b>, paste your <a href="https://steamcommunity.com/dev/apikey" target="_blank" rel="noreferrer" style={{ color: "#22d3ee" }}>Web API key</a> as the token and your SteamID64 (find it at <a href="https://steamid.io" target="_blank" rel="noreferrer" style={{ color: "#22d3ee" }}>steamid.io</a>) as the base URL. You'll get playtime per game, last-played, total hours, and dev news.
            </div>
          </div>
        ) : null}
        {steamErr && <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 12 }}>Steam: {steamErr}</div>}

        {/* Hero */}
        {hero && (() => {
          const o = ovr[hero.appid] || {};
          const op = owned.get(hero.appid);
          const banner = o.banner || `https://cdn.cloudflare.steamstatic.com/steam/apps/${hero.appid}/library_hero.jpg`;
          const fallback = `https://cdn.cloudflare.steamstatic.com/steam/apps/${hero.appid}/header.jpg`;
          const name = o.displayName || hero.name;
          return (
            <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", marginBottom: 18, border: "1px solid var(--line)", boxShadow: "0 0 28px rgba(255,87,119,0.18)" }}>
              <div style={{ aspectRatio: "21 / 7", background: "#000", position: "relative" }}>
                <img src={banner} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).src = fallback; }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.5) 60%, rgba(10,8,16,0.95) 100%)" }} />
              </div>
              <div style={{ position: "absolute", left: 22, right: 22, bottom: 18, display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div className="mono" style={{ fontSize: 11, color: "var(--pink)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>{op?.rtime_last_played ? "RECENTLY PLAYED" : "NOW IN YOUR LIBRARY"}</div>
                  <div style={{ fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontWeight: 800, fontSize: 28, color: "#fff", textShadow: "0 2px 18px rgba(255,87,119,0.55)" }}>{name}</div>
                  {op && (
                    <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 6, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                      <span><b style={{ color: "#fff" }}>{fmtHours(op.playtime_forever)}</b> total</span>
                      {op.playtime_2weeks ? <span><b style={{ color: "var(--orange)" }}>{fmtHours(op.playtime_2weeks)}</b> in the last 2 weeks</span> : null}
                      {op.rtime_last_played ? <span>last played {fmtAgo(op.rtime_last_played)}</span> : null}
                      {(() => { const a = achievements.get(hero.appid); if (!a || a.total === 0) return null;
                        const pct = Math.round((a.unlocked / a.total) * 100);
                        return (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <b style={{ color: "#fbbf24" }}>{a.unlocked}/{a.total}</b> achievements
                            <span style={{ width: 70, height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden", display: "inline-block" }}>
                              <span style={{ display: "block", height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#fbbf24,#f59e0b)", boxShadow: "0 0 8px #fbbf24aa" }} />
                            </span>
                            <span style={{ color: "#fbbf24" }}>{pct}%</span>
                          </span>
                        );
                      })()}
                    </div>
                  )}
                </div>
                <button className="btn" onClick={() => window.hub.launchSteam(hero.appid)} style={{ color: "var(--pink)", borderColor: "rgba(255,87,119,0.6)", padding: "10px 18px", fontSize: 14 }}>▶ Launch</button>
                <a className="btn" href={`https://store.steampowered.com/app/${hero.appid}`} target="_blank" rel="noreferrer" style={{ padding: "10px 14px" }}>Store</a>
              </div>
            </div>
          );
        })()}

        {/* Stat strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 18 }}>
          <Stat label="games" value={totalGames} color="var(--pink)" />
          <Stat label="played" value={playedCount || "—"} color="#22c55e" />
          <Stat label="total hours" value={totalHours > 0 ? totalHours.toFixed(1) + "h" : "—"} color="#22d3ee" />
          <Stat label="last 2 weeks" value={recentHours > 0 ? recentHours.toFixed(1) + "h" : "—"} color="var(--orange)" />
          <Stat label="achievements" value={achTotal > 0 ? `${achUnlocked}/${achTotal}` : "—"} color="#fbbf24" />
          <Stat label="perfect runs" value={perfectGames > 0 ? perfectGames : "—"} color="#a78bfa" />
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
          <input className="lib-input" placeholder="AppID (e.g. 730)" value={manual} onChange={(e) => setManual(e.target.value)} style={{ ...inputStyle, width: 160 }} />
          <button className="btn" disabled={!manual} onClick={() => window.hub.launchSteam(manual.trim())}>Launch by AppID</button>
          <span style={{ fontSize: 11, color: "var(--mute)" }}>Click a game to launch · Edit to customize · drag yourself a coffee while you decide</span>
        </div>

        {scanning && <div style={{ color: "var(--mute)", fontSize: 13 }}>Scanning Steam library…</div>}
        {scanErr && <div style={{ color: "var(--mute)", fontSize: 13 }}>{scanErr} You can still launch by AppID or open Steam above.</div>}

        {!scanning && sorted.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14 }}>
            {sorted.map((g) => {
              const o = ovr[g.appid] || {};
              const op = owned.get(g.appid);
              const size = o.size || "m";
              const pxW = SIZE_PX[size];
              const pxH = Math.round(pxW * 0.45);
              const banner = o.banner || `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/library_hero.jpg`;
              const fallback = `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/capsule_231x87.jpg`;
              const displayName = o.displayName || g.name;
              const recent = op?.playtime_2weeks || 0;
              return (
                <div key={g.appid} className="panel" style={{ padding: 0, overflow: "hidden", position: "relative", gridColumn: size === "l" ? "span 2" : undefined, opacity: o.hidden ? 0.55 : 1 }}>
                  <button onClick={() => window.hub.launchSteam(g.appid)} title={`Launch ${displayName}`} style={{ display: "block", width: "100%", padding: 0, background: "transparent", border: "none", cursor: "pointer", color: "var(--ink)" }}>
                    <div style={{ width: "100%", height: pxH, background: "#000", overflow: "hidden", position: "relative" }}>
                      <img src={banner} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        onError={(e) => { (e.target as HTMLImageElement).src = fallback; }} />
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.65))" }} />
                      {o.pinned && <span style={{ position: "absolute", top: 6, left: 6, fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(0,0,0,0.6)", color: "var(--pink)", letterSpacing: 1, textTransform: "uppercase" }}>Pinned</span>}
                      {recent > 0 && <span style={{ position: "absolute", top: 6, right: 6, fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(34,197,94,0.85)", color: "#06120a", letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>{fmtHours(recent)} · 2w</span>}
                      {(() => { const ach = achievements.get(g.appid); if (!ach || ach.total === 0) return null;
                        const pct = Math.round((ach.unlocked / ach.total) * 100);
                        const perfect = ach.unlocked === ach.total;
                        return (
                          <span title={`${ach.unlocked}/${ach.total} achievements`} style={{ position: "absolute", top: recent > 0 ? 34 : 6, right: 6, fontSize: 10, padding: "2px 6px", borderRadius: 4, background: perfect ? "rgba(168,85,247,0.85)" : "rgba(251,191,36,0.85)", color: perfect ? "#1a0a2e" : "#1a1402", letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 700 }}>
                            {perfect ? "★ 100%" : `★ ${pct}%`}
                          </span>
                        );
                      })()}
                      {op && <div style={{ position: "absolute", left: 8, right: 8, bottom: 6, display: "flex", justifyContent: "space-between", fontFamily: "ui-monospace,monospace", fontSize: 10, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
                        <span>{fmtHours(op.playtime_forever)} total</span>
                        <span>{op.rtime_last_played ? fmtAgo(op.rtime_last_played) : "unplayed"}</span>
                      </div>}
                    </div>
                    <div className="mono" style={{ fontSize: 12, padding: "8px 10px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</div>
                  </button>
                  <button className="btn" style={{ position: "absolute", top: 6, right: recent > 0 ? 88 : 6, padding: "2px 8px", fontSize: 10 }} onClick={() => setEditing(editing === g.appid ? null : g.appid)}>{editing === g.appid ? "Done" : "Edit"}</button>
                  {editing === g.appid && (
                    <div style={{ padding: 10, borderTop: "1px solid var(--line)", background: "rgba(0,0,0,0.35)" }}>
                      <Row l="name"><input style={inputStyle} value={o.displayName || ""} placeholder={g.name} onChange={(e) => update(g.appid, { displayName: e.target.value || undefined })} /></Row>
                      <Row l="banner URL"><input style={inputStyle} value={o.banner || ""} placeholder="https://… (leave blank for Steam default)" onChange={(e) => update(g.appid, { banner: e.target.value || undefined })} /></Row>
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

        {/* Recently unlocked achievements rail */}
        {recentAch.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <div className="mono glow-text" style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10, color: "#fbbf24", textShadow: "0 0 12px #fbbf2466" }}>★ Recently unlocked</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {recentAch.map((a) => (
                <div key={`${a.appid}-${a.name}`} className="panel" style={{ padding: 10, display: "flex", alignItems: "center", gap: 10, borderColor: "rgba(251,191,36,0.35)" }}>
                  {a.icon ? (
                    <img src={a.icon} alt="" style={{ width: 44, height: 44, borderRadius: 6, border: "1px solid rgba(251,191,36,0.4)", boxShadow: "0 0 10px rgba(251,191,36,0.3)" }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 6, background: "linear-gradient(135deg, #fbbf24, #f59e0b)", display: "grid", placeItems: "center", color: "#1a1402", fontWeight: 800, fontSize: 20 }}>★</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "#fff", fontWeight: 600, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.displayName}</div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--mute)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.gameName} · {fmtAgo(a.unlocktime)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dev news rail */}
        {news.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <div className="mono glow-text" style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Dev announcements</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
              {news.map((n) => {
                const g = owned.get(String(n.appid));
                return (
                  <a key={n.gid} href={n.url} target="_blank" rel="noreferrer" className="panel" style={{ padding: 12, textDecoration: "none", color: "var(--ink)", display: "flex", flexDirection: "column", gap: 4 }}>
                    <div className="mono" style={{ fontSize: 10, color: "var(--pink)", letterSpacing: 1.5, textTransform: "uppercase" }}>{g?.name || `App ${n.appid}`} · {n.feedlabel || "news"}</div>
                    <div style={{ fontSize: 13, color: "#fff", fontWeight: 600, lineHeight: 1.4 }}>{n.title}</div>
                    {n.contents && <div style={{ fontSize: 11, color: "var(--mute)", lineHeight: 1.5, maxHeight: 56, overflow: "hidden" }}>{n.contents.replace(/<[^>]+>/g, "").slice(0, 220)}</div>}
                    <div style={{ fontSize: 10, color: "var(--mute)", marginTop: 4 }}>{fmtAgo(n.date)}{n.author ? ` · ${n.author}` : ""}</div>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="panel" style={{ padding: 12 }}>
      <div className="mono" style={{ fontSize: 22, color, lineHeight: 1, textShadow: `0 0 12px ${color}` }}>{value}</div>
      <div style={{ fontSize: 10, color: "var(--mute)", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 4 }}>{label}</div>
    </div>
  );
}
function Row({ l, children }: { l: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", fontSize: 10, color: "var(--mute)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
      {l}<div style={{ marginTop: 3 }}>{children}</div>
    </label>
  );
}
const inputStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 8,
  color: "var(--ink)", padding: "6px 10px", fontSize: 12, fontFamily: "ui-monospace, monospace", outline: "none", width: "100%",
};
