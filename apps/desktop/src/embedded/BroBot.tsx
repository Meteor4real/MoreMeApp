import { useState } from "react";
import { loadGallery, saveGallery, searchImages, type GalleryItem, type Reaction } from "./brobotStore";

const GOLD = "#d4af37";
const BURG = "#7d2330";

export function BroBot() {
  const [tab, setTab] = useState<"gallery" | "search">("gallery");
  const [items, setItems] = useState<GalleryItem[]>(loadGallery);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ url: string; thumb: string; title: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  function commit(next: GalleryItem[]) {
    setItems(next);
    saveGallery(next);
  }
  function add(url: string, title: string) {
    if (!url) return;
    if (items.some((i) => i.url === url)) return;
    commit([{ id: String(Date.now()) + Math.random().toString(36).slice(2, 6), url, title, tags: [], reaction: null, ts: Date.now() }, ...items]);
  }
  function react(id: string, reaction: Reaction) {
    commit(items.map((i) => (i.id === id ? { ...i, reaction: i.reaction === reaction ? null : reaction } : i)));
  }
  function remove(id: string) {
    commit(items.filter((i) => i.id !== id));
  }
  async function doSearch() {
    if (!q.trim() || busy) return;
    setBusy(true);
    setResults(await searchImages(q));
    setBusy(false);
    setTab("search");
  }

  return (
    <div className="stage">
      <div className="mono" style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "var(--mute)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>BroBot <span style={{ color: GOLD, textShadow: `0 0 8px ${GOLD}66` }}>· the gallery</span></span>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn" style={tab === "gallery" ? { color: GOLD, borderColor: `${GOLD}99` } : undefined} onClick={() => setTab("gallery")}>Gallery ({items.length})</button>
          <button className="btn" style={tab === "search" ? { color: GOLD, borderColor: `${GOLD}99` } : undefined} onClick={() => setTab("search")}>Find</button>
        </div>
      </div>

      <div style={{ padding: 12, borderBottom: "1px solid var(--line)", display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void doSearch()}
          placeholder="search open images (Openverse, no key)…" style={{ ...inp, flex: 1, minWidth: 200 }} />
        <button className="btn" onClick={() => void doSearch()} disabled={busy}>{busy ? "…" : "Search"}</button>
        <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="…or paste an image URL" style={{ ...inp, flex: 1, minWidth: 200 }} />
        <button className="btn" onClick={() => { add(urlInput.trim(), "saved by URL"); setUrlInput(""); }}>Save URL</button>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 14 }}>
        {tab === "search" ? (
          results.length === 0 ? (
            <div className="placeholder"><div style={{ fontSize: 13 }}>Search to find images, then save the ones you like.</div></div>
          ) : (
            <Grid>
              {results.map((r, i) => (
                <figure key={i} className="panel" style={{ margin: 0, padding: 6 }}>
                  <img src={r.thumb} alt={r.title} style={img} loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.2")} />
                  <button className="btn" style={{ width: "100%", justifyContent: "center", marginTop: 6 }} onClick={() => add(r.url, r.title)}>Save</button>
                </figure>
              ))}
            </Grid>
          )
        ) : items.length === 0 ? (
          <div className="placeholder"><div style={{ fontSize: 13 }}>Gallery's empty. Find images or paste a URL to bring something home.</div></div>
        ) : (
          <Grid>
            {items.map((it) => (
              <figure key={it.id} className="panel" style={{ margin: 0, padding: 6, border: `1px solid ${it.reaction === "like" ? GOLD : it.reaction === "dislike" ? BURG : "var(--line)"}` }}>
                <img src={it.url} alt={it.title} style={img} loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.2")} />
                <figcaption className="mono" style={{ fontSize: 10, color: "var(--mute)", margin: "6px 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.title}</figcaption>
                <div style={{ display: "flex", gap: 4 }}>
                  <button className="btn" style={{ flex: 1, justifyContent: "center", color: it.reaction === "like" ? GOLD : undefined }} onClick={() => react(it.id, "like")}>♥</button>
                  <button className="btn" style={{ flex: 1, justifyContent: "center", color: it.reaction === "dislike" ? BURG : undefined }} onClick={() => react(it.id, "dislike")}>✕</button>
                  <button className="btn" style={{ flex: 1, justifyContent: "center" }} onClick={() => remove(it.id)}>del</button>
                </div>
              </figure>
            ))}
          </Grid>
        )}
      </div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>{children}</div>;
}
const img: React.CSSProperties = { width: "100%", height: 120, objectFit: "cover", borderRadius: 4, background: "#000", display: "block" };
const inp: React.CSSProperties = {
  background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink)",
  padding: "7px 12px", fontSize: 12, fontFamily: "ui-monospace, monospace", outline: "none",
};
