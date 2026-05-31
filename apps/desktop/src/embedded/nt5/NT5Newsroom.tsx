import { useEffect, useMemo, useRef, useState } from "react";
import { subscribeWire, runWireOnce, runRealWorldOnce, type WireArticle } from "../../services/nt5Wire";

// NT5 Newsroom — native, glowing 24/7 control surface for the in-app wire.
// Renders the real WireArticle store (house-model generated + real-world RSS
// briefs) as a hero/rails/ticker layout, with per-anchor stats, a teleprompter
// "go live" reader, and read-aloud through the bundled voice service.

const C = {
  bg: "#05050d", panel: "#0a0820", line: "rgba(217,70,239,0.35)",
  magenta: "#d946ef", violet: "#7c3aed", cyan: "#22d3ee", red: "#ef4444",
  ink: "#f3dcff", muted: "#9b8fb0",
};

const CAT_META: Record<string, { label: string; color: string }> = {
  breaking:        { label: "BREAKING",       color: "#ef4444" },
  latest:          { label: "LATEST FILED",   color: "#d946ef" },
  space:           { label: "SPACE",          color: "#22d3ee" },
  gaming:          { label: "GAMING",         color: "#22c55e" },
  tech:            { label: "TECH",           color: "#7c3aed" },
  earth_trending:  { label: "EARTH TRENDING", color: "#f59e0b" },
  culture:         { label: "CULTURE",        color: "#ec4899" },
  cc_lore:         { label: "NETWORK",        color: "#a78bfa" },
};

const ANCHORS = [
  { id: "voss",  name: "Voss Calloway", beat: "Lead anchor / Breaking",            color: "#ef4444" },
  { id: "lena",  name: "Lena Faust",    beat: "Field correspondent / Riftline",    color: "#f59e0b" },
  { id: "orin",  name: "Orion Vale",    beat: "Space + Tech / Solaris",            color: "#22d3ee" },
  { id: "dex",   name: "Dex Morrow",    beat: "Gaming + Origin Realms",            color: "#22c55e" },
  { id: "zara",  name: "Zip Kindle",    beat: "Earth Trending / Culture",          color: "#ec4899" },
];

const LAST_VISIT_KEY = "nchub.nt5.lastVisit.v1";
function loadLastVisit(): number {
  try { const r = localStorage.getItem(LAST_VISIT_KEY); if (r) return Number(r); } catch { /* ignore */ }
  return 0;
}
function bumpLastVisit() { try { localStorage.setItem(LAST_VISIT_KEY, String(Date.now())); } catch { /* ignore */ } }

const BMK_KEY = "nchub.nt5.bookmarks.v1";
function loadBookmarks(): Set<string> {
  try { const r = localStorage.getItem(BMK_KEY); if (r) return new Set(JSON.parse(r) as string[]); }
  catch { /* ignore */ }
  return new Set();
}
function saveBookmarks(s: Set<string>) { try { localStorage.setItem(BMK_KEY, JSON.stringify([...s])); } catch { /* ignore */ } }

type TimeRange = "all" | "24h" | "week" | "month";

export function NT5Newsroom() {
  const [arts, setArts] = useState<WireArticle[]>([]);
  const [open, setOpen] = useState<WireArticle | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [anchorFilter, setAnchorFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<TimeRange>("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "real" | "lore">("all");
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<"wire" | "real" | null>(null);
  const [teleprompter, setTeleprompter] = useState(false);
  const [bookmarks, setBookmarks] = useState<Set<string>>(loadBookmarks);
  const [readingId, setReadingId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  // Remember the previous-visit timestamp so we can highlight what landed
  // since then; bump the saved value when the user leaves the view.
  const [lastVisit] = useState<number>(loadLastVisit);
  useEffect(() => { return () => { bumpLastVisit(); }; }, []);
  const unreadCount = useMemo(() => arts.filter((a) => Date.parse(a.published_at) > lastVisit).length, [arts, lastVisit]);

  function toggleBookmark(id: string) {
    setBookmarks((b) => { const n = new Set(b); n.has(id) ? n.delete(id) : n.add(id); saveBookmarks(n); return n; });
  }
  function clearWire() {
    try { localStorage.removeItem("nt5wire.articles"); } catch { /* ignore */ }
    setArts([]); setConfirmClear(false);
  }

  useEffect(() => subscribeWire(setArts), []);

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    const horizons: Record<TimeRange, number> = { all: 0, "24h": 86400e3, week: 7 * 86400e3, month: 30 * 86400e3 };
    const cutoff = timeFilter === "all" ? 0 : Date.now() - horizons[timeFilter];
    return arts.filter((a) => {
      if (filter !== "all" && a.category !== filter) return false;
      if (anchorFilter !== "all" && a.anchor_id !== anchorFilter) return false;
      const isReal = (a.source_urls || []).length > 0;
      if (sourceFilter === "real" && !isReal) return false;
      if (sourceFilter === "lore" && isReal) return false;
      if (cutoff > 0 && Date.parse(a.published_at) < cutoff) return false;
      if (showBookmarksOnly && !bookmarks.has(a.id)) return false;
      if (text && !(a.title.toLowerCase().includes(text) || a.body.toLowerCase().includes(text) || a.author_display.toLowerCase().includes(text))) return false;
      return true;
    });
  }, [arts, filter, anchorFilter, timeFilter, sourceFilter, showBookmarksOnly, bookmarks, q]);
  const isFiltering = filter !== "all" || anchorFilter !== "all" || timeFilter !== "all" || sourceFilter !== "all" || showBookmarksOnly || q.trim() !== "";

  const breaking = arts.find((a) => a.category === "breaking") || arts[0] || null;
  const todayCount = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return arts.filter((a) => Date.parse(a.published_at) >= today.getTime()).length;
  }, [arts]);
  const realCount = arts.filter((a) => (a.source_urls || []).length > 0).length;
  const lastFiledRel = arts[0] ? rel(Date.parse(arts[0].published_at)) : "—";

  async function fireWire() { setBusy("wire"); try { await runWireOnce(3); } finally { setBusy(null); } }
  async function fireReal() { setBusy("real"); try { await runRealWorldOnce(3); } finally { setBusy(null); } }

  const byCat = useMemo(() => {
    const m: Record<string, WireArticle[]> = {};
    for (const a of arts) (m[a.category] ||= []).push(a);
    return m;
  }, [arts]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, overflow: "hidden", minHeight: 0 }}>
      {/* control strip */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: `1px solid ${C.line}`, background: "linear-gradient(90deg, #06061a, #0a0820)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: C.red, fontFamily: "ui-monospace,monospace", fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.red, boxShadow: `0 0 10px ${C.red}`, animation: "nt5pulse 1.6s ease-in-out infinite" }} />
          ON AIR
        </span>
        <span style={{ flex: 1 }} />
        {unreadCount > 0 && <Stat label="new since last visit" value={unreadCount} color="#ffd166" />}
        <Stat label="filed today" value={todayCount} color={C.magenta} />
        <Stat label="real-world" value={realCount} color={C.cyan} />
        <Stat label="last filed" value={lastFiledRel} color={C.ink} />
        <button className="btn" disabled={busy !== null} onClick={() => void fireWire()} style={btnStyle(busy === "wire")}>{busy === "wire" ? "filing…" : "File new stories"}</button>
        <button className="btn" disabled={busy !== null} onClick={() => void fireReal()} style={btnStyle(busy === "real")}>{busy === "real" ? "pulling…" : "Pull real headlines"}</button>
        <button className="btn" onClick={() => setTeleprompter((t) => !t)} style={btnStyle(teleprompter)}>{teleprompter ? "Exit teleprompter" : "Go live"}</button>
        <button className="btn" onClick={() => setConfirmClear(true)} style={{ ...btnStyle(false), color: C.red, borderColor: `${C.red}66` }} title="Wipe every article from the wire">Reset wire</button>
      </div>

      {/* main area */}
      <div style={{ flex: 1, overflow: "auto", padding: 18, minHeight: 0 }}>
        {teleprompter && breaking ? (
          <Teleprompter article={breaking} onExit={() => setTeleprompter(false)} />
        ) : (
          <>
            {breaking && <Hero article={breaking} onOpen={() => setOpen(breaking)} />}

            {/* search + filter row */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "18px 0 6px", flexWrap: "wrap" }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search the wire — title, body, anchor…"
                style={{ flex: 1, minWidth: 220, padding: "10px 12px", background: "rgba(0,0,0,0.55)", border: `1px solid ${C.line}`, borderRadius: 8, color: C.ink, fontSize: 13, fontFamily: "ui-monospace,monospace", outline: "none" }} />
              <FilterBtn active={filter === "all"} onClick={() => setFilter("all")}>All</FilterBtn>
              {Object.entries(CAT_META).map(([k, m]) => (
                <FilterBtn key={k} active={filter === k} onClick={() => setFilter(k)} color={m.color}>{m.label}</FilterBtn>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 9, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginRight: 4 }}>anchor</span>
              <FilterBtn active={anchorFilter === "all"} onClick={() => setAnchorFilter("all")}>any</FilterBtn>
              {ANCHORS.map((a) => <FilterBtn key={a.id} active={anchorFilter === a.id} onClick={() => setAnchorFilter(a.id)} color={a.color}>{a.name.split(" ")[0]}</FilterBtn>)}
              <span style={{ width: 1, height: 16, background: C.line, margin: "0 6px" }} />
              <span style={{ fontSize: 9, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginRight: 4 }}>time</span>
              {(["all", "24h", "week", "month"] as TimeRange[]).map((tr) => <FilterBtn key={tr} active={timeFilter === tr} onClick={() => setTimeFilter(tr)}>{tr === "all" ? "any" : tr === "24h" ? "24h" : tr === "week" ? "1w" : "1mo"}</FilterBtn>)}
              <span style={{ width: 1, height: 16, background: C.line, margin: "0 6px" }} />
              <span style={{ fontSize: 9, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginRight: 4 }}>source</span>
              {(["all", "real", "lore"] as const).map((sf) => <FilterBtn key={sf} active={sourceFilter === sf} onClick={() => setSourceFilter(sf)} color={sf === "real" ? C.cyan : sf === "lore" ? C.magenta : undefined}>{sf}</FilterBtn>)}
              <span style={{ width: 1, height: 16, background: C.line, margin: "0 6px" }} />
              <FilterBtn active={showBookmarksOnly} onClick={() => setShowBookmarksOnly((v) => !v)} color="#ffd166">★ saved ({bookmarks.size})</FilterBtn>
            </div>

            {isFiltering ? (
              <CardGrid articles={filtered} onOpen={setOpen} bookmarks={bookmarks} onToggleBookmark={toggleBookmark} readingId={readingId} lastVisit={lastVisit} />
            ) : (
              <div style={{ marginTop: 12 }}>
                {Object.entries(CAT_META).map(([cat, meta]) => {
                  const items = (byCat[cat] || []).slice(0, 12);
                  if (items.length === 0) return null;
                  return <Rail key={cat} cat={cat} meta={meta} items={items} onOpen={setOpen} bookmarks={bookmarks} onToggleBookmark={toggleBookmark} readingId={readingId} lastVisit={lastVisit} />;
                })}
              </div>
            )}

            {/* anchor roster */}
            <div style={{ marginTop: 24 }}>
              <SectionHead>Anchor roster</SectionHead>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                {ANCHORS.map((a) => {
                  const count = arts.filter((x) => x.anchor_id === a.id).length;
                  const latest = arts.find((x) => x.anchor_id === a.id);
                  return (
                    <div key={a.id} style={{ padding: 12, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 8, borderLeft: `4px solid ${a.color}` }}>
                      <div style={{ fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontWeight: 800, fontSize: 14, color: a.color, letterSpacing: 1 }}>{a.name}</div>
                      <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>{a.beat}</div>
                      <div style={{ fontSize: 11, color: C.ink, marginTop: 8 }}><b style={{ color: a.color }}>{count}</b> filed · last: {latest ? rel(Date.parse(latest.published_at)) : "—"}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ticker crawl */}
      {arts.length > 0 && (
        <div style={{ borderTop: `1px solid ${C.line}`, background: "#06061a", overflow: "hidden", padding: "6px 0", whiteSpace: "nowrap" }}>
          <div style={{ display: "inline-block", animation: "nt5crawl 80s linear infinite", paddingLeft: "100%", fontFamily: "ui-monospace,monospace", fontSize: 12, color: C.ink, letterSpacing: 1 }}>
            {arts.slice(0, 18).map((a, i) => (
              <span key={a.id} style={{ marginRight: 40 }}>
                <span style={{ color: CAT_META[a.category]?.color || C.cyan, marginRight: 8 }}>● {CAT_META[a.category]?.label || a.category}</span>
                {a.title}
                {i < 17 && <span style={{ color: C.muted, marginLeft: 40 }}>·</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {open && <DetailModal article={open} onClose={() => setOpen(null)} bookmarked={bookmarks.has(open.id)} onToggleBookmark={() => toggleBookmark(open.id)} onReadingChange={(reading) => setReadingId(reading ? open.id : null)} />}
      {confirmClear && (
        <div onClick={() => setConfirmClear(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ padding: 20, background: C.panel, border: `1px solid ${C.red}66`, borderRadius: 10, maxWidth: 400 }}>
            <div style={{ fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontWeight: 800, fontSize: 14, color: C.red, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Reset wire?</div>
            <p style={{ fontSize: 13, color: C.ink, lineHeight: 1.5 }}>This deletes every article currently on the wire. The next scheduler tick (or a manual File / Pull) will re-fill it.</p>
            <div style={{ display: "flex", gap: 6, marginTop: 14, justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => setConfirmClear(false)}>Cancel</button>
              <button className="btn" onClick={clearWire} style={{ color: C.red, borderColor: `${C.red}88` }}>Yes, reset</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes nt5pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } } @keyframes nt5crawl { from { transform: translate3d(0,0,0); } to { transform: translate3d(-100%,0,0); } } @keyframes nt5shimmer { from { background-position: 0 0; } to { background-position: 200% 0; } }`}</style>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={{ textAlign: "right", marginRight: 14 }}>
      <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 16, color, lineHeight: 1, textShadow: `0 0 12px ${color}` }}>{value}</div>
      <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 2 }}>{label}</div>
    </div>
  );
}
function btnStyle(active: boolean): React.CSSProperties {
  return { padding: "6px 14px", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: active ? C.cyan : undefined, borderColor: active ? "rgba(34,211,238,0.55)" : undefined };
}
function FilterBtn({ active, onClick, color, children }: { active: boolean; onClick: () => void; color?: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="btn" style={{ padding: "5px 11px", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase",
      color: active ? (color || C.cyan) : undefined, borderColor: active ? `${color || C.cyan}88` : undefined,
      background: active ? `${(color || C.cyan)}10` : undefined }}>{children}</button>
  );
}
function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "10px 0 10px" }}>
      <span style={{ fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontWeight: 800, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", color: C.cyan, textShadow: `0 0 10px ${C.cyan}` }}>{children}</span>
      <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${C.cyan}, transparent)` }} />
    </div>
  );
}

function Hero({ article, onOpen }: { article: WireArticle; onOpen: () => void }) {
  const meta = CAT_META[article.category];
  const color = meta?.color || C.magenta;
  return (
    <div onClick={onOpen} style={{
      position: "relative", padding: 22, background: `linear-gradient(135deg, ${C.panel} 0%, #0a0820 60%, #06061a 100%)`,
      border: `1px solid ${color}55`, borderRadius: 12, cursor: "pointer", overflow: "hidden",
      boxShadow: `0 0 24px ${color}22, inset 0 0 60px rgba(0,0,0,0.4)`,
    }}>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(120deg, transparent 30%, ${color}11 50%, transparent 70%)`, backgroundSize: "200% 100%", animation: "nt5shimmer 8s linear infinite", pointerEvents: "none" }} />
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", background: color, color: "#0a0820", fontFamily: "ui-monospace,monospace", fontSize: 10, fontWeight: 800, letterSpacing: 2 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0a0820", animation: "nt5pulse 1.6s ease-in-out infinite" }} />
          {(meta?.label || article.category).toUpperCase()}
        </span>
        <span style={{ color: C.muted, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase" }}>{article.author_display} · {rel(Date.parse(article.published_at))}</span>
      </div>
      <h1 style={{ position: "relative", margin: 0, fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontWeight: 800, fontSize: 30, lineHeight: 1.1, color: C.ink, textShadow: `0 2px 16px ${color}55` }}>{article.title}</h1>
      <p style={{ position: "relative", marginTop: 10, color: "#cfb6e0", fontSize: 14, lineHeight: 1.55, maxWidth: 880 }}>{article.body.slice(0, 280)}{article.body.length > 280 ? "…" : ""}</p>
    </div>
  );
}

function Rail({ cat, meta, items, onOpen, bookmarks, onToggleBookmark, readingId, lastVisit }: { cat: string; meta: { label: string; color: string }; items: WireArticle[]; onOpen: (a: WireArticle) => void; bookmarks: Set<string>; onToggleBookmark: (id: string) => void; readingId: string | null; lastVisit: number }) {
  void cat;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontWeight: 800, fontSize: 12, letterSpacing: 3, color: meta.color, textShadow: `0 0 10px ${meta.color}` }}>{meta.label}</span>
        <span style={{ fontSize: 10, color: C.muted }}>{items.length}</span>
        <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${meta.color}, transparent)`, opacity: 0.5 }} />
      </div>
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
        {items.map((a) => <RailCard key={a.id} article={a} color={meta.color} onClick={() => onOpen(a)} bookmarked={bookmarks.has(a.id)} onBookmark={() => onToggleBookmark(a.id)} reading={readingId === a.id} isNew={Date.parse(a.published_at) > lastVisit} />)}
      </div>
    </div>
  );
}
function RailCard({ article, color, onClick, bookmarked, onBookmark, reading, isNew }: { article: WireArticle; color: string; onClick: () => void; bookmarked?: boolean; onBookmark?: () => void; reading?: boolean; isNew?: boolean }) {
  const isReal = (article.source_urls || []).length > 0;
  return (
    <div onClick={onClick} style={{ flex: "0 0 280px", padding: 12, background: C.panel, border: `1px solid ${color}33`, borderRadius: 8, cursor: "pointer",
      transition: "border-color .15s, box-shadow .15s, transform .08s" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${color}aa`; e.currentTarget.style.boxShadow = `0 0 18px ${color}33`; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = `${color}33`; e.currentTarget.style.boxShadow = "none"; }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 9, color: color, letterSpacing: 1.5, textTransform: "uppercase" }}>{article.author_display}</span>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {isNew && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#ffd166", boxShadow: "0 0 8px #ffd166", marginRight: 2 }} title="New since your last visit" />}
          {reading && <span style={{ fontSize: 8, padding: "1px 5px", background: "#ef4444", color: "#fff", borderRadius: 3, letterSpacing: 1, textTransform: "uppercase", animation: "nt5pulse 1.6s ease-in-out infinite" }}>READING</span>}
          {isReal && <span style={{ fontSize: 8, color: C.cyan, letterSpacing: 1, textTransform: "uppercase", padding: "1px 5px", border: `1px solid ${C.cyan}55`, borderRadius: 3 }}>REAL</span>}
          {onBookmark && (
            <button onClick={(e) => { e.stopPropagation(); onBookmark(); }} title={bookmarked ? "Remove bookmark" : "Save"} style={{ background: "transparent", border: "none", cursor: "pointer", color: bookmarked ? "#ffd166" : C.muted, fontSize: 14, padding: 0, lineHeight: 1 }}>★</button>
          )}
        </div>
      </div>
      <div style={{ fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, color: C.ink, lineHeight: 1.25, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>{article.title}</div>
      <div style={{ marginTop: 6, fontSize: 10, color: C.muted }}>{rel(Date.parse(article.published_at))}</div>
    </div>
  );
}

function CardGrid({ articles, onOpen, bookmarks, onToggleBookmark, readingId, lastVisit }: { articles: WireArticle[]; onOpen: (a: WireArticle) => void; bookmarks: Set<string>; onToggleBookmark: (id: string) => void; readingId: string | null; lastVisit: number }) {
  if (articles.length === 0) return <div style={{ color: C.muted, fontSize: 13, padding: 20 }}>No stories match.</div>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10, marginTop: 10 }}>
      {articles.map((a) => {
        const color = CAT_META[a.category]?.color || C.magenta;
        return <RailCard key={a.id} article={a} color={color} onClick={() => onOpen(a)} bookmarked={bookmarks.has(a.id)} onBookmark={() => onToggleBookmark(a.id)} reading={readingId === a.id} isNew={Date.parse(a.published_at) > lastVisit} />;
      })}
    </div>
  );
}

function DetailModal({ article, onClose, bookmarked, onToggleBookmark, onReadingChange }: { article: WireArticle; onClose: () => void; bookmarked: boolean; onToggleBookmark: () => void; onReadingChange?: (reading: boolean) => void }) {
  const color = CAT_META[article.category]?.color || C.magenta;
  const [reading, setReading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => { onReadingChange?.(reading); }, [reading, onReadingChange]);

  async function readAloud() {
    if (reading) {
      try { audioRef.current?.pause(); } catch { /* ignore */ }
      try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
      setReading(false); return;
    }
    setReading(true);
    const text = `${article.author_display} for NT5. ${article.title}. ${article.body}`;
    const anchorVoice: Record<string, string> = { voss: "voss", lena: "lena", orin: "orin", dex: "dex", zara: "zara" };
    try {
      const r = await window.hub.media.tts({ voiceId: anchorVoice[article.anchor_id] || "voss", text });
      if (r.ok) {
        const a = new Audio(`data:${r.mime};base64,${r.base64}`); audioRef.current = a;
        a.onended = () => setReading(false); a.onerror = () => setReading(false);
        await a.play();
        return;
      }
    } catch { /* fall through */ }
    // Web Speech fallback
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.onend = () => setReading(false); u.onerror = () => setReading(false);
      window.speechSynthesis.speak(u);
    } catch { setReading(false); }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 30 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 820, width: "100%", maxHeight: "90vh", background: C.panel, border: `1px solid ${color}55`, borderRadius: 12, boxShadow: `0 0 40px ${color}33`, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 18, borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ padding: "3px 9px", background: color, color: "#0a0820", fontFamily: "ui-monospace,monospace", fontSize: 10, fontWeight: 800, letterSpacing: 2 }}>{(CAT_META[article.category]?.label || article.category).toUpperCase()}</span>
          <span style={{ color: C.muted, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" }}>{article.author_display} · {rel(Date.parse(article.published_at))}</span>
          <span style={{ flex: 1 }} />
          <button className="btn" onClick={onToggleBookmark} title={bookmarked ? "Remove bookmark" : "Save"} style={{ padding: "6px 12px", fontSize: 13, color: bookmarked ? "#ffd166" : undefined, borderColor: bookmarked ? "rgba(255,209,102,0.6)" : undefined }}>★ {bookmarked ? "Saved" : "Save"}</button>
          <button className="btn" onClick={() => navigator.clipboard.writeText(`${article.title}\n\n${article.body}${(article.source_urls || []).length ? "\n\nSource: " + (article.source_urls as unknown as string[])[0] : ""}`)} style={{ padding: "6px 12px", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" }}>Copy</button>
          <button className="btn" onClick={() => void readAloud()} style={{ color: reading ? C.red : C.cyan, borderColor: reading ? `${C.red}88` : `${C.cyan}66`, padding: "6px 14px", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" }}>
            {reading ? "■ Stop" : "▶ Read aloud"}
          </button>
          <button className="btn" onClick={onClose} style={{ padding: "6px 12px" }}>Close</button>
        </div>
        <div style={{ padding: 22, overflow: "auto" }}>
          <h2 style={{ margin: 0, fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontWeight: 800, fontSize: 24, lineHeight: 1.15, color: C.ink, textShadow: `0 2px 14px ${color}55` }}>{article.title}</h2>
          <p style={{ marginTop: 14, color: C.ink, fontSize: 15, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{article.body}</p>
          {(article.source_urls || []).length > 0 && (
            <div style={{ marginTop: 18, padding: 12, background: "rgba(34,211,238,0.05)", border: `1px solid ${C.cyan}33`, borderRadius: 6 }}>
              <div style={{ fontSize: 10, color: C.cyan, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>Source</div>
              {(article.source_urls as unknown as string[]).map((u, i) => (
                <a key={i} href={u} target="_blank" rel="noreferrer" style={{ display: "block", color: C.cyan, fontSize: 12, fontFamily: "ui-monospace,monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u}</a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Teleprompter({ article, onExit }: { article: WireArticle; onExit: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let raf = 0; let y = 0;
    const step = () => { y += 0.5; el.scrollTop = y; if (y < el.scrollHeight) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div style={{ position: "relative", margin: "0 auto", maxWidth: 900, padding: 30, background: "rgba(0,0,0,0.65)", border: `1px solid ${C.line}`, borderRadius: 10 }}>
      <div style={{ position: "absolute", right: 14, top: 14 }}>
        <button className="btn" onClick={onExit}>Exit</button>
      </div>
      <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 10, color: C.red, letterSpacing: 3, textTransform: "uppercase", marginBottom: 14 }}>GO LIVE · {article.author_display} · {(CAT_META[article.category]?.label || article.category)}</div>
      <div ref={ref} style={{ height: 360, overflow: "hidden", fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontSize: 32, lineHeight: 1.5, color: C.ink, textAlign: "center", textShadow: `0 0 14px ${C.magenta}55`, scrollBehavior: "smooth" }}>
        <div style={{ paddingTop: 180, paddingBottom: 360 }}>
          {article.title}
          {"\n\n"}
          <span style={{ fontSize: 22, lineHeight: 1.5, color: "#d3baea" }}>{article.body}</span>
        </div>
      </div>
    </div>
  );
}

function rel(ms: number): string {
  if (!ms) return "—";
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
