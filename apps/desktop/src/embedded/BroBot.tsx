import { useEffect, useRef } from "react";

// Embedded BroBot — the real BroBot desktop app (its actual renderer, built
// from source and bundled under public/embedded/brobot), run locally in an
// iframe as a true carbon copy. The renderer expects an Electron preload
// (window.brobot); a bundled shim provides it, routing the gallery to
// localStorage, search to Openverse, and chat/LLM here via postMessage so it
// runs on the Hub's local house model.
export function BroBot() {
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    function reply(src: Window, id: string, extra: Record<string, unknown>) {
      src.postMessage({ type: "brobot-host-reply", id, ...extra }, "*");
    }
    async function onMessage(e: MessageEvent) {
      const m = e.data || {};
      if (m.type !== "brobot-host") return;
      const src = e.source as Window | null;
      if (!src) return;
      if (m.action === "chat") {
        const res = await window.hub.llm.chat(m.system || "", m.prompt || "");
        reply(src, m.id, { ok: res.ok, text: res.text, error: res.error });
      } else if (m.action === "status") {
        const s = await window.hub.llm.status();
        reply(src, m.id, { ready: s.ready, downloading: s.downloading, progress: s.progress, modelName: "house model" });
      } else if (m.action === "ensure") {
        const off = window.hub.llm.onProgress((p) => src.postMessage({ type: "brobot-host-progress", progress: p }, "*"));
        const res = await window.hub.llm.ensure();
        off();
        reply(src, m.id, { ok: res.ok, error: res.error });
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div className="stage" style={{ background: "#0c0a08", padding: 0, display: "flex", flexDirection: "column" }}>
      <iframe
        ref={ref}
        title="BroBot"
        src="embedded/brobot/index.html"
        style={{ flex: 1, width: "100%", height: "100%", border: "none", display: "block" }}
        allow="clipboard-write"
      />
    </div>
  );
}
