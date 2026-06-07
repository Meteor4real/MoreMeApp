import { useEffect, useState } from "react";
import { Login } from "./auth/Login";
import { isAuthed, signOut, clearGuest } from "./auth/supabase";
import { MoreMe } from "./embedded/MoreMe";
import { NT5 } from "./embedded/NT5";
import { applyAccent, loadAccent } from "./theme-accent";
import { applyUiPrefs, loadPrefs } from "./uiPrefs";
import { startWireScheduler } from "./services/nt5Wire";
import { startOriginPolling } from "./services/originRealms";

// The Hub is now exactly two things: MoreMe (the product) and NT5 News (the
// bonus wire). No rail, no browser, no terminal, no AI crew — a focused
// two-tab shell behind the accounts gate.
type Tab = "moreme" | "news";

export function App() {
  const [authed, setAuthed] = useState(() => isAuthed());
  const [tab, setTab] = useState<Tab>("moreme");

  useEffect(() => {
    applyAccent(loadAccent());
    applyUiPrefs(loadPrefs());
    // NT5 wire keeps generating fresh anchor articles while the app is open;
    // Origin Realms pulse feeds the gaming desk. Both are self-contained.
    startWireScheduler();
    startOriginPolling();
    // The bundled local model powers the NT5 anchors — ensure it in the
    // background so the wire has a brain when it fires.
    void window.hub?.llm?.ensure?.().catch(() => undefined);
  }, []);

  function logout() {
    signOut();
    clearGuest();
    setAuthed(false);
  }

  if (!authed) return <Login onDone={() => setAuthed(true)} />;

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
