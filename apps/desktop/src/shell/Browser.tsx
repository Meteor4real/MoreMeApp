import { useEffect, useRef, useState } from "react";

export type Tab = { id: number; title: string; url: string };

let seq = 1;
const HOME = "https://duckduckgo.com/";

function normalize(input: string): string {
  const v = input.trim();
  if (!v) return HOME;
  if (/^https?:\/\//i.test(v)) return v;
  // domain-looking → https, else DuckDuckGo search
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v)) return "https://" + v;
  return "https://duckduckgo.com/?q=" + encodeURIComponent(v);
}

export function Browser({
  initialUrl,
  injectables = [],
}: {
  initialUrl?: string;
  injectables?: { id: string; code: string }[];
}) {
  const [tabs, setTabs] = useState<Tab[]>([
    { id: seq, title: "New Tab", url: initialUrl || HOME },
  ]);
  const [active, setActive] = useState(seq);
  const [omni, setOmni] = useState(initialUrl || HOME);
  const viewRefs = useRef<Map<number, WebviewEl>>(new Map());

  // Keep the latest enabled house-extensions in a ref so the dom-ready
  // handler injects the current set without needing to rebind listeners.
  const injectRef = useRef(injectables);
  injectRef.current = injectables;

  // When asked to open a specific app URL, push it as a new tab.
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

  function addTab(url = HOME) {
    const id = ++seq;
    setTabs((p) => [...p, { id, title: "New Tab", url }]);
    setActive(id);
    setOmni(url === HOME ? "" : url);
  }

  function closeTab(id: number) {
    setTabs((p) => {
      const next = p.filter((t) => t.id !== id);
      if (id === active && next.length) setActive(next[next.length - 1]!.id);
      if (!next.length) {
        const nid = ++seq;
        setActive(nid);
        return [{ id: nid, title: "New Tab", url: HOME }];
      }
      return next;
    });
  }

  function go(value: string) {
    const url = normalize(value);
    setTabs((p) => p.map((t) => (t.id === active ? { ...t, url } : t)));
    setOmni(url);
  }

  function setTitle(id: number, title: string) {
    setTabs((p) => p.map((t) => (t.id === id ? { ...t, title } : t)));
  }

  return (
    <div className="stage">
      <div className="tabbar">
        {tabs.map((t) => (
          <div
            key={t.id}
            className={"tab" + (t.id === active ? " active" : "")}
            onClick={() => {
              setActive(t.id);
              setOmni(t.url === HOME ? "" : t.url);
            }}
            title={t.title}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              {t.title}
            </span>
            <span
              className="x"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(t.id);
              }}
            >
              ✕
            </span>
          </div>
        ))}
        <button className="btn" onClick={() => addTab()}>
          +
        </button>
      </div>

      <div className="tabbar" style={{ borderBottom: "1px solid var(--line)" }}>
        <div className="omnibox">
          <button
            className="btn"
            title="Back"
            onClick={() => viewRefs.current.get(active)?.goBack()}
          >
            ‹
          </button>
          <button
            className="btn"
            title="Reload"
            onClick={() => viewRefs.current.get(active)?.reload()}
          >
            ⟳
          </button>
          <input
            value={omni}
            onChange={(e) => setOmni(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") go((e.target as HTMLInputElement).value);
            }}
            placeholder="Search DuckDuckGo or enter a URL"
            spellCheck={false}
          />
        </div>
      </div>

      <div className="webwrap">
        {tabs.map((t) => (
          <webview
            key={t.id}
            ref={(el: HTMLElement | null) => {
              if (el) {
                const view = el as unknown as WebviewEl;
                viewRefs.current.set(t.id, view);
                el.addEventListener("page-title-updated", (ev) =>
                  setTitle(t.id, (ev as unknown as { title: string }).title)
                );
                // Inject enabled house extensions once the page is ready.
                el.addEventListener("dom-ready", () => {
                  for (const ext of injectRef.current) {
                    view.executeJavaScript(ext.code).catch(() => {});
                  }
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
        ))}
        {!activeTab && <div className="placeholder">No tab</div>}
      </div>
    </div>
  );
}
