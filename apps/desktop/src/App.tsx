import { useEffect, useState } from "react";
import { Login } from "./auth/Login";
import { isAuthed, signOut, clearGuest } from "./auth/supabase";
import { MoreMe } from "./embedded/MoreMe";
import { NT5 } from "./embedded/NT5";
import { HALOS } from "./embedded/HALOS";
import { applyAccent, loadAccent } from "./theme-accent";
import { applyUiPrefs, loadPrefs } from "./uiPrefs";
import { initTheme } from "./moreme/styles";
import { startWireScheduler } from "./services/nt5Wire";
import { startDesk } from "./services/nt5Desk";
import { startOriginPolling } from "./services/originRealms";
import { startSync, stopSync } from "./moreme/sync";
import { initTrackingSiren } from "./moreme/tracking";
import { installAgentApi } from "./moreme/agentApi";
import { getAiMode, initAiMode } from "./services/aiMode";
import { NT5AmbientTicker } from "./shell/NT5AmbientTicker";

// Three surfaces behind the accounts gate: MoreMe (the product), NT5 News
// (the bonus wire), and HALOS (the S.P.A.C.E. collaboration console — the
// owner uses it with a collaborator; it stays. Removed once by mistake in
// #46 — don't do that again).
type Tab = "moreme" | "news" | "halos";

export function App() {
  const [authed, setAuthed] = useState(() => isAuthed());
  const [tab, setTab] = useState<Tab>("moreme");

  useEffect(() => {
    applyAccent(loadAccent());
    applyUiPrefs(loadPrefs());
    initTheme();
    // Resolve the AI master switch BEFORE anything model-driven starts:
    // in external mode the built-in generators stay quiet and the bundled
    // model isn't even downloaded — an outside agent runs the anchors.
    void initAiMode().then(() => {
      startDesk();
      startWireScheduler();
      startOriginPolling();
      if (getAiMode() === "builtin") {
        void window.hub?.llm?.ensure?.().catch(() => undefined);
      }
    });
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
          <button
            className={"hub-tab mono" + (tab === "halos" ? " active" : "")}
            onClick={() => setTab("halos")}
          >
            HALOS
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
        {/* All three surfaces stay mounted so NT5's wire state, MoreMe's
            in-progress edits, and HALOS's iframe session survive tab
            switches; we just toggle display. */}
        <div style={{ flex: 1, minWidth: 0, display: tab === "moreme" ? "flex" : "none" }}>
          <MoreMe />
        </div>
        <div style={{ flex: 1, minWidth: 0, display: tab === "news" ? "flex" : "none" }}>
          <NT5 />
        </div>
        <div style={{ flex: 1, minWidth: 0, display: tab === "halos" ? "flex" : "none" }}>
          <HALOS />
        </div>
      </main>
    </div>
  );
}
