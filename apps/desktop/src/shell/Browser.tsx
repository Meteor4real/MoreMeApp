import { useEffect, useRef, useState } from "react";
import logoUrl from "../assets/logo.png";

export type Tab = { id: number; title: string; url: string };

let seq = 1;
const START = "about:start"; // our own start page

function normalize(input: string): string {
  const v = input.trim();
  if (!v) return START;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v)) return "https://" + v;
  // private search engine under the hood (DuckDuckGo), but the page is ours
  return "https://duckduckgo.com/?q=" + encodeURIComponent(v);
}

function StartPage({ onGo }: { onGo: (v: string) => void }) {
  const [q, setQ] = useState("");
  const links: [string, string][] = [
    ["GitHub", "https://github.com"],
    ["YouTube", "https://youtube.com"],
    ["Origin Realms", "https://originrealms.com"],
    ["Modrinth", "https://modrinth.com"],
    ["Supabase", "https://supabase.com/dashboard"],
    ["Hostinger", "https://hpanel.hostinger.com"],
  ];
  return (
    <div className="startpage">
      <img className="sp-logo" src={logoUrl} alt="NetworkChuck Hub" />
      <div className="mono" style={{ letterSpacing: 6, fontSize: 13, textTransform: "uppercase", color: "var(--mute)" }}>
        NetworkChuck <span className="glow-text">Hub</span>
      </div>
      <div className="sp-search">
        <input autoFocus value={q} placeholder="Search the web or type a URL" spellCheck={false}
          onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onGo(q)} />
        <button className="btn" onClick={() => onGo(q)}>Go</button>
      </div>
      <div className="sp-links">
        {links.map(([n, u]) => (
          <span key={u} className="sp-link" onClick={() => onGo(u)}>{n}</span>
        ))}
      </div>
    </div>
  );
}

export function Browser({
  initialUrl,
  injectables = [],
}: {
  initialUrl?: string;
  injectables?: { id: string; code: string }[];
}) {
  const [tabs, setTabs] = useState<Tab[]>([{ id: seq, title: "New Tab", url: initialUrl || START }]);
  const [active, setActive] = useState(seq);
  const [omni, setOmni] = useState(initialUrl && initialUrl !== START ? initialUrl : "");
  const viewRefs = useRef<Map<number, WebviewEl>>(new Map());
  const injectRef = useRef(injectables);
  injectRef.current = injectables;

  useEffect(() => {
    if (!initialUrl) return;
    setTabs((prev) => {
      const existing = prev.find((t) => t.url === initialUrl);
      if (existing) {
        setActive(existing.id);
        return prev;
      }
      const id = ++seq;
      setActive(id);
      setOmni(initialUrl);
      return [...prev, { id, title: "Loading…", url: initialUrl }];
    });
  }, [initialUrl]);

  const activeTab = tabs.find((t) => t.id === active);

  function addTab(url = START) {
    const id = ++seq;
    setTabs((p) => [...p, { id, title: "New Tab", url }]);
    setActive(id);
    setOmni(url === START ? "" : url);
  }
  function closeTab(id: number) {
    setTabs((p) => {
      const next = p.filter((t) => t.id !== id);
      if (id === active && next.length) setActive(next[next.length - 1]!.id);
      if (!next.length) {
        const nid = ++seq;
        setActive(nid);
        return [{ id: nid, title: "New Tab", url: START }];
      }
      return next;
    });
  }
  function go(value: string) {
    const url = normalize(value);
    setTabs((p) => p.map((t) => (t.id === active ? { ...t, url, title: url === START ? "New Tab" : t.title } : t)));
    setOmni(url === START ? "" : url);
  }
  function setTitle(id: number, title: string) {
    setTabs((p) => p.map((t) => (t.id === id ? { ...t, title } : t)));
  }

  return (
    <div className="stage">
      <div className="tabbar">
        {tabs.map((t) => (
          <div key={t.id} className={"tab" + (t.id === active ? " active" : "")}
            onClick={() => { setActive(t.id); setOmni(t.url === START ? "" : t.url); }} title={t.title}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</span>
            <span className="x" onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}>✕</span>
          </div>
        ))}
        <button className="btn" onClick={() => addTab()}>+</button>
      </div>

      <div className="tabbar" style={{ borderBottom: "1px solid var(--line)" }}>
        <div className="omnibox">
          <button className="btn" title="Back" onClick={() => viewRefs.current.get(active)?.goBack()}>‹</button>
          <button className="btn" title="Reload" onClick={() => viewRefs.current.get(active)?.reload()}>⟳</button>
          <button className="btn" title="Home" onClick={() => go("")}>⌂</button>
          <input value={omni} onChange={(e) => setOmni(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") go((e.target as HTMLInputElement).value); }}
            placeholder="Search the web or enter a URL" spellCheck={false} />
        </div>
      </div>

      <div className="webwrap">
        {tabs.map((t) =>
          t.url === START ? (
            <div key={t.id} style={{ position: "absolute", inset: 0, display: t.id === active ? "flex" : "none" }}>
              <StartPage onGo={go} />
            </div>
          ) : (
            <webview
              key={t.id}
              ref={(el: HTMLElement | null) => {
                if (el) {
                  const view = el as unknown as WebviewEl;
                  viewRefs.current.set(t.id, view);
                  el.addEventListener("page-title-updated", (ev) => setTitle(t.id, (ev as unknown as { title: string }).title));
                  el.addEventListener("dom-ready", () => {
                    for (const ext of injectRef.current) view.executeJavaScript(ext.code).catch(() => {});
                  });
                } else {
                  viewRefs.current.delete(t.id);
                }
              }}
              src={t.url}
              partition="persist:hub"
              allowpopups={true}
              style={{ display: t.id === active ? "block" : "none" }}
            />
          )
        )}
        {!activeTab && <div className="placeholder">No tab</div>}
      </div>
    </div>
  );
}
