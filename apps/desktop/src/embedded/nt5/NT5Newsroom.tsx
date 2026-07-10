import { useEffect, useMemo, useRef, useState } from "react";
import { subscribeWire, runRealWorldOnce, getWireArticles, type WireArticle, type ArticleKind } from "../../services/nt5Wire";
import { enabledTopics } from "../../services/nt5Topics";
import { NT5Segments, BreakingBumper } from "./NT5Segments";
import { pickAnchorVoice, cancelSpeak } from "./nt5tts";
import { NT, NT_CAT, NT_KIND, glowRed, textPlateStyle } from "./nt5theme";

// NT5 Front Page — a designed news front page, not a control room.
// One lead story with its real image, sectioned coverage below, a Latest
// rail with live data segments beside it, ticker on the floor. Operator
// actions (pull, file, reset, cadences) live in Topics — readers read.

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

export function NT5Newsroom() {
  const [arts, setArts] = useState<WireArticle[]>([]);
  const [open, setOpen] = useState<WireArticle | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [kind, setKind] = useState<"all" | ArticleKind>("all");
  const [source, setSource] = useState<"all" | "real" | "lore">("all");
  const [savedOnly, setSavedOnly] = useState(false);
  const [bookmarks, setBookmarks] = useState<Set<string>>(loadBookmarks);
  const [lastVisit] = useState<number>(loadLastVisit);
  useEffect(() => { return () => { bumpLastVisit(); }; }, []);

  useEffect(() => subscribeWire(setArts), []);

  // First-load: an empty wire on a configured desk pulls real headlines
  // immediately (no model needed). An empty DESK gets an empty state that
  // points at Topics — pulling nothing isn't a button worth pressing.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    if (getWireArticles().length === 0 && enabledTopics().length > 0) {
      void runRealWorldOnce(3).catch(() => undefined);
    }
  }, []);

  function toggleBookmark(id: string) {
    setBookmarks((b) => { const n = new Set(b); n.has(id) ? n.delete(id) : n.add(id); saveBookmarks(n); return n; });
  }

  // Tickers never take page space — crawl only.
  const feed = useMemo(() => arts.filter((a) => a.kind !== "ticker"), [arts]);

  const filtering = q.trim() !== "" || cat !== "all" || kind !== "all" || source !== "all" || savedOnly;
  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    const base = kind === "ticker" ? arts : feed;
    return base.filter((a) => {
      if (cat !== "all" && a.category !== cat) return false;
      if (kind !== "all" && a.kind !== kind) return false;
      const isReal = (a.source_urls || []).length > 0;
      if (source === "real" && !isReal) return false;
      if (source === "lore" && isReal) return false;
      if (savedOnly && !bookmarks.has(a.id)) return false;
      if (text && !(a.title.toLowerCase().includes(text) || a.body.toLowerCase().includes(text) || a.author_display.toLowerCase().includes(text))) return false;
      return true;
    });
  }, [arts, feed, q, cat, kind, source, savedOnly, bookmarks]);

  // Lead story: freshest bulletin, else freshest breaking-category, else
  // the freshest story WITH an image, else just the freshest.
  const lead = useMemo(() => {
    return feed.find((a) => a.kind === "broadcast")
      ?? feed.find((a) => a.category === "breaking")
      ?? feed.find((a) => !!a.image_url)
      ?? feed[0]
      ?? null;
  }, [feed]);

  const sections = useMemo(() => {
    const m: Record<string, WireArticle[]> = {};
    for (const a of feed) {
      if (lead && a.id === lead.id) continue;
      (m[a.category] ||= []).push(a);
    }
    return Object.entries(m).sort((x, y) => y[1].length - x[1].length);
  }, [feed, lead]);

  const latest = useMemo(() => feed.slice(0, 10), [feed]);

  const freshBreaking = useMemo(() => {
    const b = arts.find((a) => (a.category === "breaking" || a.kind === "broadcast") && Date.parse(a.published_at) > lastVisit);
    return b || null;
  }, [arts, lastVisit]);
  const [bumperDismissed, setBumperDismissed] = useState<string | null>(null);

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: NT.bg }}>
      {/* ── masthead row: date · search · filters ────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderBottom: `1px solid ${NT.border}`, flexWrap: "wrap" }}>
        <span style={{ fontFamily: NT.fontM, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: NT.ink2 }}>{today}</span>
        <span style={{ flex: 1 }} />
        <input className="nt5-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the wire…" style={{ width: 220 }} />
        <select className="nt5-input" value={cat} onChange={(e) => setCat(e.target.value)} title="Desk">
          <option value="all">All desks</option>
          {Object.entries(NT_CAT).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
        </select>
        <select className="nt5-input" value={kind} onChange={(e) => setKind(e.target.value as "all" | ArticleKind)} title="Shape">
          <option value="all">All shapes</option>
          {Object.entries(NT_KIND).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
        </select>
        <select className="nt5-input" value={source} onChange={(e) => setSource(e.target.value as "all" | "real" | "lore")} title="Source">
          <option value="all">Real + lore</option>
          <option value="real">Real only</option>
          <option value="lore">Lore only</option>
        </select>
        <button className={"nt5-btn" + (savedOnly ? " hot" : "")} onClick={() => setSavedOnly((v) => !v)}>★ {bookmarks.size}</button>
      </div>

      {/* ── page ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
        {feed.length === 0 ? (
          <EmptyWire />
        ) : filtering ? (
          <div style={{ maxWidth: 1060, margin: "0 auto", padding: 20 }}>
            <div className="nt5-kicker" style={{ color: NT.ink2, marginBottom: 12 }}>{filtered.length} {filtered.length === 1 ? "story" : "stories"}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map((a) => <StoryRow key={a.id} a={a} onOpen={() => setOpen(a)} bookmarked={bookmarks.has(a.id)} onBookmark={() => toggleBookmark(a.id)} isNew={Date.parse(a.published_at) > lastVisit} />)}
              {filtered.length === 0 && <div style={{ color: NT.ink2, fontSize: 13, padding: 20 }}>Nothing matches.</div>}
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 1060, margin: "0 auto", padding: 20 }}>
            {lead && <Lead a={lead} onOpen={() => setOpen(lead)} />}

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(240px, 1fr)", gap: 24, marginTop: 24 }}>
              {/* main column — sections */}
              <div style={{ minWidth: 0 }}>
                {sections.map(([catKey, items]) => (
                  <Section key={catKey} catKey={catKey} items={items.slice(0, 5)} onOpen={setOpen} bookmarks={bookmarks} onBookmark={toggleBookmark} lastVisit={lastVisit} />
                ))}
              </div>

              {/* side column — latest + live data */}
              <div style={{ minWidth: 0 }}>
                <SideHead>Latest</SideHead>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {latest.map((a) => (
                    <button key={a.id} onClick={() => setOpen(a)} style={{ textAlign: "left", background: "transparent", border: "none", borderBottom: `1px solid ${NT.border}`, padding: "9px 2px", cursor: "pointer" }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                        <span style={{ fontFamily: NT.fontM, fontSize: 9.5, color: NT.ink3, flex: "none" }}>{rel(Date.parse(a.published_at))}</span>
                        {Date.parse(a.published_at) > lastVisit && <span style={{ width: 5, height: 5, borderRadius: "50%", background: NT.live, flex: "none", position: "relative", top: -1 }} />}
                      </div>
                      <div style={{ fontFamily: NT.fontB, fontSize: 12.5, lineHeight: 1.35, color: NT.ink, marginTop: 2 }}>{a.title}</div>
                    </button>
                  ))}
                </div>
                <div style={{ height: 20 }} />
                <SideHead>Live data</SideHead>
                <NT5Segments compact />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── ticker floor ─────────────────────────────────────────── */}
      {arts.length > 0 && <TickerFloor arts={arts} />}

      {freshBreaking && bumperDismissed !== freshBreaking.id && (
        <BreakingBumper
          key={freshBreaking.id}
          title={freshBreaking.title}
          anchor={freshBreaking.author_display}
          onClick={() => { setOpen(freshBreaking); setBumperDismissed(freshBreaking.id); }}
        />
      )}

      {open && <DetailModal article={open} onClose={() => setOpen(null)} bookmarked={bookmarks.has(open.id)} onToggleBookmark={() => toggleBookmark(open.id)} />}
    </div>
  );
}

// ── lead story ───────────────────────────────────────────────────────────
function Lead({ a, onOpen }: { a: WireArticle; onOpen: () => void }) {
  const cat = NT_CAT[a.category] ?? NT_CAT.latest;
  const urgent = a.kind === "broadcast" || a.category === "breaking";
  return (
    <div className="nt5-card clickable" onClick={onOpen} style={{ display: "grid", gridTemplateColumns: "minmax(0, 7fr) minmax(0, 5fr)", overflow: "hidden", borderColor: urgent ? "rgba(255,59,92,0.45)" : undefined }}>
      <StoryImage a={a} height={280} />
      <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {urgent && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: NT.fontD, fontWeight: 800, fontSize: 10, letterSpacing: "0.22em", color: NT.live, textShadow: glowRed }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: NT.live, animation: "nt5pulse 1.4s ease-in-out infinite" }} />
              BREAKING
            </span>
          )}
          <span className="nt5-kicker" style={{ color: cat.color }}>{cat.label}</span>
          <span style={{ fontFamily: NT.fontM, fontSize: 9.5, color: NT.ink3 }}>{NT_KIND[a.kind]?.tone}</span>
        </div>
        <h1 style={{ margin: "10px 0 0", fontFamily: NT.fontD, fontWeight: 800, fontSize: 26, lineHeight: 1.18, color: NT.ink, textTransform: urgent ? "uppercase" : "none" }}>{a.title}</h1>
        <p style={{ margin: "10px 0 0", fontFamily: NT.fontB, fontSize: 14, lineHeight: 1.55, color: NT.ink2, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as const }}>
          {a.body}
        </p>
        <div style={{ flex: 1 }} />
        <Byline a={a} style={{ marginTop: 14 }} />
      </div>
    </div>
  );
}

// ── section block ────────────────────────────────────────────────────────
function Section({ catKey, items, onOpen, bookmarks, onBookmark, lastVisit }: {
  catKey: string; items: WireArticle[]; onOpen: (a: WireArticle) => void;
  bookmarks: Set<string>; onBookmark: (id: string) => void; lastVisit: number;
}) {
  const cat = NT_CAT[catKey] ?? { label: catKey, color: NT.purple };
  const [first, ...rest] = items;
  if (!first) return null;
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span className="nt5-kicker" style={{ color: cat.color }}>{cat.label}</span>
        <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${cat.color}55, transparent)` }} />
      </div>

      {/* section lead — thumbnail + text */}
      <div className="nt5-card clickable" onClick={() => onOpen(first)} style={{ display: "grid", gridTemplateColumns: "168px minmax(0,1fr)", overflow: "hidden" }}>
        <StoryImage a={first} height={104} />
        <div style={{ padding: "12px 14px", minWidth: 0 }}>
          <div style={{ fontFamily: NT.fontB, fontWeight: 700, fontSize: 15, lineHeight: 1.3, color: NT.ink }}>{first.title}</div>
          <div style={{ fontFamily: NT.fontB, fontSize: 12, lineHeight: 1.5, color: NT.ink2, marginTop: 4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>{first.body}</div>
          <Byline a={first} style={{ marginTop: 8 }} />
        </div>
      </div>

      {/* headline rows */}
      {rest.map((a) => (
        <StoryRow key={a.id} a={a} onOpen={() => onOpen(a)} bookmarked={bookmarks.has(a.id)} onBookmark={() => onBookmark(a.id)} isNew={Date.parse(a.published_at) > lastVisit} slim />
      ))}
    </div>
  );
}

function StoryRow({ a, onOpen, bookmarked, onBookmark, isNew, slim = false }: {
  a: WireArticle; onOpen: () => void; bookmarked: boolean; onBookmark: () => void; isNew: boolean; slim?: boolean;
}) {
  const cat = NT_CAT[a.category] ?? { label: a.category, color: NT.purple };
  return (
    <div onClick={onOpen} style={{ display: "flex", alignItems: "center", gap: 10, padding: slim ? "9px 4px" : "11px 6px", borderBottom: `1px solid ${NT.border}`, cursor: "pointer" }}>
      <span style={{ width: 3, alignSelf: "stretch", background: `${cat.color}66`, borderRadius: 2, flex: "none" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: NT.fontB, fontWeight: 600, fontSize: 13.5, lineHeight: 1.3, color: NT.ink }}>
          {isNew && <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: NT.live, marginRight: 6, position: "relative", top: -2 }} />}
          {a.title}
        </div>
        <div style={{ fontFamily: NT.fontM, fontSize: 9.5, color: NT.ink3, marginTop: 3 }}>
          {NT_KIND[a.kind]?.label ?? a.kind} · {a.author_display} · {rel(Date.parse(a.published_at))}{a.source_name ? ` · ${a.source_name}` : ""}
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onBookmark(); }}
        title={bookmarked ? "Remove bookmark" : "Save"}
        style={{ background: "transparent", border: "none", cursor: "pointer", color: bookmarked ? NT.warn : NT.ink3, fontSize: 13, padding: 0, lineHeight: 1, flex: "none" }}
      >★</button>
    </div>
  );
}

// ── story image / text plate ─────────────────────────────────────────────
function StoryImage({ a, height }: { a: WireArticle; height: number }) {
  const cat = NT_CAT[a.category] ?? { label: a.category, color: NT.purple };
  const [broken, setBroken] = useState(false);
  if (a.image_url && !broken) {
    return (
      <div style={{ position: "relative", minHeight: height, overflow: "hidden" }}>
        <img
          src={a.image_url} alt="" loading="lazy"
          onError={() => setBroken(true)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, transparent 55%, ${NT.bg}cc 100%)` }} />
      </div>
    );
  }
  // Designed typographic plate — lore items + imageless sources.
  return (
    <div style={{ ...textPlateStyle(cat.color), minHeight: height }}>
      <div style={{ textAlign: "center", padding: 12 }}>
        <div style={{ fontFamily: NT.fontD, fontWeight: 800, fontSize: 30, letterSpacing: "0.16em", color: `${cat.color}44` }}>NT5</div>
        <div className="nt5-kicker" style={{ color: cat.color, marginTop: 2 }}>{cat.label}</div>
      </div>
    </div>
  );
}

function Byline({ a, style }: { a: WireArticle; style?: React.CSSProperties }) {
  return (
    <div style={{ fontFamily: NT.fontM, fontSize: 10, letterSpacing: "0.06em", color: NT.ink2, ...style }}>
      {a.author_display} · {rel(Date.parse(a.published_at))}
      {a.source_name ? <> · <span style={{ color: NT.cyan }}>{a.source_name}</span></> : (a.source_urls || []).length === 0 ? <> · <span style={{ color: NT.purple }}>Nova Terris</span></> : null}
    </div>
  );
}

function SideHead({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
      <span className="nt5-kicker" style={{ color: NT.ink2 }}>{children}</span>
      <span style={{ flex: 1, height: 1, background: NT.border }} />
    </div>
  );
}

// ── empty state ──────────────────────────────────────────────────────────
function EmptyWire() {
  const noDesk = enabledTopics().length === 0;
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: 320, textAlign: "center" }}>
      <div style={{ maxWidth: 440, padding: 20 }}>
        <div style={{ fontFamily: NT.fontD, fontWeight: 800, fontSize: 18, letterSpacing: "0.1em", color: NT.ink, marginBottom: 10 }}>
          {noDesk ? "SET YOUR DESK" : "THE WIRE IS QUIET"}
        </div>
        <p style={{ fontFamily: NT.fontB, fontSize: 13, color: NT.ink2, lineHeight: 1.65 }}>
          {noDesk
            ? "NT5 covers what you tell it to — nothing is pre-loaded. Open Topics in the sidebar and add anything: a team, a game, world news, a subreddit. Anchors start filing for it immediately."
            : "Your desk is set; the anchors haven't filed yet. Stories land on the next pull — or open Topics and force a sweep."}
        </p>
      </div>
    </div>
  );
}

// ── ticker floor ─────────────────────────────────────────────────────────
function TickerFloor({ arts }: { arts: WireArticle[] }) {
  const items = arts.slice(0, 18);
  const train = [...items, ...items];
  return (
    <div style={{ borderTop: `1px solid ${NT.border}`, background: NT.bg2, display: "flex", alignItems: "center", overflow: "hidden", flex: "none" }}>
      <span style={{ fontFamily: NT.fontD, fontWeight: 800, fontSize: 9, letterSpacing: "0.2em", color: NT.live, padding: "7px 12px", borderRight: `1px solid ${NT.border}`, flex: "none" }}>WIRE</span>
      <div style={{ flex: 1, overflow: "hidden", whiteSpace: "nowrap" }}>
        <div style={{ display: "inline-block", animation: "nt5crawl 80s linear infinite", fontFamily: NT.fontM, fontSize: 11, color: NT.ink2, padding: "6px 0" }}>
          {train.map((a, i) => (
            <span key={a.id + "-" + i} style={{ marginRight: 36 }}>
              <span style={{ color: (NT_CAT[a.category] ?? NT_CAT.latest).color, marginRight: 8 }}>◆</span>
              <span style={{ color: NT.ink }}>{a.title}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── detail ───────────────────────────────────────────────────────────────
function DetailModal({ article, onClose, bookmarked, onToggleBookmark }: {
  article: WireArticle; onClose: () => void; bookmarked: boolean; onToggleBookmark: () => void;
}) {
  const cat = NT_CAT[article.category] ?? { label: article.category, color: NT.purple };
  const urgent = article.kind === "broadcast";
  const [reading, setReading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function readAloud() {
    if (reading) {
      try { audioRef.current?.pause(); } catch { /* ignore */ }
      cancelSpeak();
      setReading(false); return;
    }
    setReading(true);
    const text = `${article.author_display} for NT5. ${article.title}. ${article.body}`;
    try {
      const r = await window.hub.media.tts({ voiceId: article.anchor_id || "voss", text });
      if (r.ok) {
        const a = new Audio(`data:${r.mime};base64,${r.base64}`); audioRef.current = a;
        a.onended = () => setReading(false); a.onerror = () => setReading(false);
        await a.play();
        return;
      }
    } catch { /* fall through */ }
    if (!window.speechSynthesis) { setReading(false); return; }
    cancelSpeak();
    const { voice, rate, pitch } = pickAnchorVoice(article.anchor_id);
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.rate = rate; u.pitch = pitch;
    u.onend = () => setReading(false); u.onerror = () => setReading(false);
    try { window.speechSynthesis.speak(u); } catch { setReading(false); }
  }

  const paragraphs = (article.body || "").split(/\n{2,}/).filter((p) => p.trim());
  const longform = article.kind === "article" || article.kind === "blog";

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(3,2,8,0.78)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 28 }}>
      <div onClick={(e) => e.stopPropagation()} className="nt5-shell" style={{ maxWidth: 780, width: "100%", maxHeight: "90vh", background: NT.bg2, border: `1px solid ${urgent ? "rgba(255,59,92,0.5)" : NT.border2}`, borderRadius: NT.radius, overflow: "hidden", display: "flex", flexDirection: "column", animation: "nt5in .2s ease-out" }}>
        {/* header bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${NT.border}` }}>
          <span className="nt5-kicker" style={{ color: urgent ? NT.live : cat.color, textShadow: urgent ? glowRed : undefined }}>
            {urgent ? "BREAKING" : cat.label}
          </span>
          <span style={{ fontFamily: NT.fontM, fontSize: 9.5, color: NT.ink3 }}>{NT_KIND[article.kind]?.tone}</span>
          <span style={{ flex: 1 }} />
          <button className="nt5-btn" onClick={onToggleBookmark} style={bookmarked ? { color: NT.warn, borderColor: "rgba(255,184,0,0.5)" } : undefined}>★ {bookmarked ? "Saved" : "Save"}</button>
          <button className="nt5-btn" onClick={() => navigator.clipboard.writeText(`${article.title}\n\n${article.body}${(article.source_urls || []).length ? "\n\nSource: " + (article.source_urls as string[])[0] : ""}`)}>Copy</button>
          <button className={"nt5-btn" + (reading ? " hot" : "")} onClick={() => void readAloud()}>{reading ? "■ Stop" : "▶ Read"}</button>
          <button className="nt5-btn" onClick={onClose}>Close</button>
        </div>

        <div style={{ overflow: "auto", minHeight: 0 }}>
          {article.image_url && (
            <div style={{ position: "relative", maxHeight: 300, overflow: "hidden" }}>
              <img src={article.image_url} alt="" style={{ width: "100%", display: "block", objectFit: "cover", maxHeight: 300 }}
                onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = "none"; }} />
              <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, transparent 60%, ${NT.bg2} 100%)` }} />
            </div>
          )}
          <div style={{ padding: "20px 26px 26px" }}>
            {article.kind === "social" ? (
              <div className="nt5-card" style={{ padding: 16 }}>
                <div style={{ fontFamily: NT.fontM, fontSize: 11, color: cat.color, marginBottom: 8 }}>@{article.anchor_id} · {article.author_display}</div>
                <div style={{ fontFamily: NT.fontB, fontSize: 16, lineHeight: 1.5, color: NT.ink }}>{article.body}</div>
              </div>
            ) : (
              <>
                <h2 style={{ margin: 0, fontFamily: NT.fontD, fontWeight: 800, fontSize: urgent ? 26 : 22, lineHeight: 1.2, color: NT.ink, textTransform: urgent ? "uppercase" : "none" }}>{article.title}</h2>
                {article.kind === "blog" && <div className="nt5-kicker" style={{ color: cat.color, marginTop: 6 }}>Opinion · {article.author_display}</div>}
                {longform && paragraphs.length > 1
                  ? paragraphs.map((p, i) => <p key={i} style={{ margin: "14px 0 0", fontFamily: NT.fontB, fontSize: 14.5, lineHeight: 1.7, color: NT.ink }}>{p}</p>)
                  : <p style={{ margin: "12px 0 0", fontFamily: NT.fontB, fontSize: urgent ? 17 : 14.5, lineHeight: 1.65, color: NT.ink, whiteSpace: "pre-wrap" }}>{article.body}</p>}
              </>
            )}
            <div style={{ marginTop: 18, paddingTop: 12, borderTop: `1px solid ${NT.border}` }}>
              <Byline a={article} />
              {(article.source_urls || []).length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {(article.source_urls as string[]).map((u, i) => (
                    <a key={i} href={u} target="_blank" rel="noreferrer" style={{ display: "block", color: NT.cyan, fontSize: 11, fontFamily: NT.fontM, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u}</a>
                  ))}
                </div>
              )}
            </div>
          </div>
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
