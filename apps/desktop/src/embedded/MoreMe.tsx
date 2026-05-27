// Embedded More Me — the real More Me site, bundled into the app and run
// locally (offline). The actual index.html / app.js / style.css ship under
// public/embedded/moreme with a shim that persists the site's /api/auth +
// /api/data calls to on-device localStorage instead of a server.
export function MoreMe() {
  return (
    <div className="stage" style={{ background: "#0F1318", padding: 0, display: "flex", flexDirection: "column" }}>
      <iframe
        title="More Me"
        src="embedded/moreme/index.html"
        style={{ flex: 1, width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </div>
  );
}
