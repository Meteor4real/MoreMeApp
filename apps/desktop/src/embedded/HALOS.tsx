// Embedded HALOS — the S.P.A.C.E. collaboration console / alien glyph codex.
// The real HALOS Interface site lives under public/embedded/halos as a
// standalone static build (its own index.html / css / js); we iframe it.
// Hub-shim.js inside the bundle persists the site's /api/auth + /api/data
// calls to on-device localStorage, so it runs fully offline.
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
