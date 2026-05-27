// Embedded HALOS — the real HALOS Interface site, bundled into the app and
// run locally (offline). The actual index.html / app.js / style.css ship under
// public/embedded/halos with the required Hub changes applied (OpenClaw →
// Hermes, Polar Cosmos Crew renames) and a shim that persists the site's
// /api/auth + /api/data calls to on-device localStorage instead of a server.
export function HALOS() {
  return (
    <div className="stage" style={{ background: "#07050f", padding: 0, display: "flex", flexDirection: "column" }}>
      <iframe
        title="HALOS Interface"
        src="embedded/halos/index.html"
        style={{ flex: 1, width: "100%", height: "100%", border: "none", display: "block" }}
        allow="microphone; camera; autoplay"
      />
    </div>
  );
}
