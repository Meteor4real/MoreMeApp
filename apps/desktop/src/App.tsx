import { useEffect, useState } from "react";
import { Login } from "./auth/Login";
import { isAuthed, signOut, clearGuest } from "./auth/supabase";
import { MoreMe } from "./embedded/MoreMe";
import { NT5 } from "./embedded/NT5";
import { applyAccent, loadAccent } from "./theme-accent";
import { applyUiPrefs, loadPrefs } from "./uiPrefs";
import { initTheme } from "./moreme/styles";
import { startWireScheduler } from "./services/nt5Wire";
import { startDesk } from "./services/nt5Desk";
import { startOriginPolling } from "./services/originRealms";
import { startSync, stopSync } from "./moreme/sync";
import { initTrackingSiren } from "./moreme/tracking";
import { installAgentApi } from "./moreme/agentApi";
import { NT5AmbientTicker } from "./shell/NT5AmbientTicker";

// Two surfaces behind the accounts gate: MoreMe (the product) and NT5 News
// (the bonus wire). The HALOS embed shipped briefly as a third tab but read
// as inert in real use — pulled until/unless it earns its keep.
type Tab = "moreme" | "news";

export function App() {
  const [authed, setAuthed] = useState(() => isAuthed());
  const [tab, setTab] = useState<Tab>("moreme");

  useEffect(() => {
    applyAccent(loadAccent());
    applyUiPrefs(loadPrefs());
    initTheme();
    startDesk();
    startWireScheduler();
    startOriginPolling();
    void window.hub?.llm?.ensure?.().catch(() => undefined);
    startSync();
    initTrackingSiren();
    installAgentApi();
  }, []);

  function logout() {
    stopSync();
    signOut();
    clearGuest();
    setAuthed(false);
  }

  if (!authed) return <Login onDone={() => { setAuthed(true); startSync(); }} />;

  return (
    <div className="shell" style={{ display: "flex", flexDirection: "column", height: "100vh", minHeight: 0 }}>
      <header className="hub-topbar">
        <div className="hub-brand mono">MoreMe</div>
        <nav className="hub-tabs">
          <button
            className={"hub-tab mono" + (tab === "moreme" ? " active" : "")}
            onClick={() => setTab("moreme")}
          >
            MoreMe
          </button>
          <button
            className={"hub-tab mono" + (tab === "news" ? " active" : "")}
            onClick={() => setTab("news")}
          >
            News
          </button>
        </nav>
        <div style={{ flex: 1 }} />
        <button className="hub-tab mono" onClick={logout} title="Sign out">
          Sign out
        </button>
      </header>

      {/* Ambient layer: NT5 ticker visible across both tabs so news lives at
          the edge of attention. Click to jump to the Broadcast tab. */}
      <NT5AmbientTicker onOpen={() => setTab("news")} />

      <main style={{ flex: 1, minHeight: 0, display: "flex" }}>
        {/* Both surfaces stay mounted so NT5's wire state and MoreMe's
            in-progress edits survive tab switches; we just toggle display. */}
        <div style={{ flex: 1, minWidth: 0, display: tab === "moreme" ? "flex" : "none" }}>
          <MoreMe />
        </div>
        <div style={{ flex: 1, minWidth: 0, display: tab === "news" ? "flex" : "none" }}>
          <NT5 />
        </div>
      </main>
    </div>
  );
}
