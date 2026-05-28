// Embedded NT5 / S.P.A.C.E. News — the real Next.js site, statically exported
// and bundled into the app under public/embedded/nt5, run locally (offline) in
// an iframe. A shim serves the wire (/api/articles, /api/ticker, /api/stats,
// /api/broadcast) from an on-device store seeded with a starter set, since the
// server-side cron/DB don't exist in-app.
export function NT5() {
  return (
    <div className="stage" style={{ background: "#05050d", padding: 0, display: "flex", flexDirection: "column" }}>
      <iframe
        title="NT5 — S.P.A.C.E. News"
        src="embedded/nt5/index.html"
        style={{ flex: 1, width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </div>
  );
}
