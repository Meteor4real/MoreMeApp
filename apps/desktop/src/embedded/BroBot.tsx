import { useEffect, useRef } from "react";

// Embedded BroBot — the real BroBot desktop app (its actual renderer, built
// from source and bundled under public/embedded/brobot), run locally in an
// iframe as a true carbon copy. The renderer expects an Electron preload
// (window.brobot); a bundled shim provides it, routing the gallery to
// localStorage, search to Openverse, and chat/LLM here via postMessage so it
// runs on the Hub's local house model. A small Hub header above the iframe
// carries the rail-style onyx+gold mark so the tab identity matches the rail.
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
    <div className="stage" style={{ background: "#08070a", padding: 0, display: "flex", flexDirection: "column" }}>
      <BroBotHeader />
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

function BroBotHeader() {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "8px 16px",
      borderBottom: "1px solid #6a5424",
      background: "linear-gradient(90deg, #08070a 0%, #100c0a 100%)",
    }}>
      <svg width={28} height={28} viewBox="0 0 24 24" aria-label="BroBot">
        <defs>
          <linearGradient id="brohdrgold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f3dca0" />
            <stop offset="50%" stopColor="#c9a961" />
            <stop offset="100%" stopColor="#8c7339" />
          </linearGradient>
        </defs>
        <rect width="24" height="24" rx="5" fill="#08070a" />
        <rect x="1.5" y="1.5" width="21" height="21" rx="4" fill="none" stroke="url(#brohdrgold)" strokeWidth="0.9" />
        <text x="12" y="16.5" textAnchor="middle" fontFamily="'Cinzel','Cormorant Garamond',serif" fontWeight={700} fontSize="11" fill="url(#brohdrgold)" letterSpacing="0.5">B</text>
      </svg>
      <span style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: 18,
        letterSpacing: "0.04em",
        background: "linear-gradient(90deg, #f3dca0, #c9a961)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      }}>BroBot</span>
      <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: "#8c7339", letterSpacing: "0.25em", textTransform: "uppercase", marginLeft: 8 }}>
        Maison Privée · After Hours
      </span>
    </div>
  );
}
