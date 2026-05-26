// The Control Panel is the NetworkChuck Hub dashboard (apps/control-panel),
// front-and-center. For now it loads the deployed Control Panel in a hardened
// webview; a later slice ports it to talk to Supabase directly from the app
// (accounts, token vault, the live + "coming soon" integrations) so it no
// longer depends on the website being up.
const CONTROL_PANEL_URL =
  "https://chuck-hub.vercel.app"; // deployed Control Panel (NetworkChuck Hub dashboard)

export function ControlPanel() {
  return (
    <div className="stage">
      <div
        className="mono"
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--line)",
          fontSize: 12,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: "var(--mute)",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>
          The Control Panel <span className="glow-text">· personal-ops</span>
        </span>
      </div>
      <div className="webwrap">
        <webview src={CONTROL_PANEL_URL} partition="persist:hub" allowpopups={true} />
      </div>
    </div>
  );
}
