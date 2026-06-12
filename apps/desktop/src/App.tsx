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
import { NT5AmbientTicker } from "./shell/NT5AmbientTicker";

// Three surfaces behind the accounts gate: MoreMe (the product), NT5 News
// (the bonus wire), and HALOS (the S.P.A.C.E. collaboration console — the
// real HALOS Interface site, bundled and run offline via the hub-shim).
type Tab = "moreme" | "news" | "halos";

export function App() {
  const [authed, setAuthed] = useState(() => isAuthed());
  const [tab, setTab] = useState<Tab>("moreme");

  useEffect(() => {
    applyAccent(loadAccent());
    applyUiPrefs(loadPrefs());
    // MoreMe theme (DP / Papatui) is the user-visible chrome theme; it
    // overrides the legacy accent's CSS vars by writing root vars too.
    initTheme();
    // NT5: the per-anchor desk pulls real headlines for the user's topics on
    // each anchor's own cadence, 24/7. The wire scheduler adds occasional
    // in-universe Nova Terris flavor on top. Origin Realms pulse feeds the
    // gaming desk's context.
    startDesk();
    startWireScheduler();
    startOriginPolling();
    // The bundled local model powers the NT5 anchors — ensure it in the
    // background so the wire has a brain when it fires.
    void window.hub?.llm?.ensure?.().catch(() => undefined);
    // MoreMe state syncs to Supabase so it follows the user across devices.
    // Skips itself in guest mode.
    startSync();
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

      {/* Ambient layer: NT5 ticker visible across BOTH tabs so news lives at
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
