import { useEffect, useState } from "react";
import { clearHermes, ensureHermesHydrated, getHermesState, pingHermes, setHermesUrl, subscribeHermes, type HermesState } from "../ai/hermes";

// Dedicated top-level Hermes setup. Not in Accounts (the user was clear:
// "too off the beaten path"), not in Command Center, not buried in chat.
// It's the first thing a new install sees, and it stays reachable through
// the rail anytime the user wants to swap or re-test the URL.

export function HermesSetup({ onDone }: { onDone?: () => void }) {
  const [state, setState] = useState<HermesState>(getHermesState);
  const [draft, setDraft] = useState(state.url);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { void ensureHermesHydrated(); }, []);
  useEffect(() => subscribeHermes((s) => { setState(s); setDraft((d) => d || s.url); }), []);

  async function save() {
    const v = draft.trim().replace(/\/+$/, "");
    if (!v) { setMsg({ ok: false, text: "Enter a URL." }); return; }
    if (!/^https?:\/\//i.test(v)) { setMsg({ ok: false, text: "URL must start with http:// or https://" }); return; }
    setBusy(true); setMsg(null);
    try {
      await setHermesUrl(v);
      const r = await pingHermes();
      setMsg({ ok: r.ok, text: r.ok ? `Connected — Hermes responded over /chat.` : `Saved, but Hermes didn't answer cleanly (${r.detail}). The URL is stored; try Test again once Hermes is reachable.` });
    } finally { setBusy(false); }
  }
  async function test() {
    setBusy(true); setMsg(null);
    try { const r = await pingHermes(); setMsg({ ok: r.ok, text: r.ok ? "Hermes is reachable." : `Couldn't reach Hermes: ${r.detail}` }); }
    finally { setBusy(false); }
  }
  async function disconnect() {
    if (!confirm("Disconnect Hermes? The crew will fall back to the bundled local model.")) return;
    setBusy(true);
    try { await clearHermes(); setDraft(""); setMsg({ ok: true, text: "Disconnected." }); }
    finally { setBusy(false); }
  }

  return (
    <div className="stage" style={{ display: "flex", flexDirection: "column", minHeight: 0, overflow: "auto" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 28px", width: "100%" }}>
        <div className="mono glow-text" style={{ fontSize: 11, letterSpacing: 3, color: "var(--pink)", textTransform: "uppercase", marginBottom: 6 }}>◆ Spine</div>
        <h1 style={{ fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontWeight: 800, fontSize: 28, margin: "0 0 8px", color: "var(--ink)", textShadow: "0 0 18px rgba(255,87,119,0.45)" }}>Connect Hermes</h1>
        <p style={{ fontSize: 14, color: "var(--mute)", lineHeight: 1.6, margin: "0 0 24px" }}>
          Hermes is the spine of NCH — your default conversational partner and the curator of the crew's shared memory.
          Every agent's notes, every chat message, and every Command Center event get piped to Hermes so he can build
          one rich, deduplicated picture of how you operate. Without him, the crew falls back to the bundled local
          model — it works, but the long-term memory isn't curated.
        </p>

        <div className="panel" style={{ padding: 18, borderColor: state.configured ? "rgba(34,197,94,0.45)" : "rgba(255,87,119,0.35)" }}>
          <Label>Hermes URL</Label>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="https://hermes.your-box.tld"
              onKeyDown={(e) => { if (e.key === "Enter" && !busy) void save(); }}
              spellCheck={false} autoFocus
              style={{ flex: 1, background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink)", padding: "11px 12px", fontSize: 14, fontFamily: "ui-monospace,monospace", outline: "none" }} />
            <button className="btn" disabled={busy} onClick={() => void save()} style={{ padding: "0 22px", color: "var(--pink)", borderColor: "rgba(255,87,119,0.5)" }}>
              {busy ? "…" : state.url === draft.trim().replace(/\/+$/, "") && state.configured ? "Re-test" : "Save & test"}
            </button>
          </div>
          <p style={{ fontSize: 12, color: "var(--mute)", margin: "10px 0 0", lineHeight: 1.5 }}>
            Stored encrypted on this device in the OS keychain. Never sent anywhere except your Hermes box.
          </p>

          {/* Status row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, padding: "10px 0 0", borderTop: "1px solid var(--line)" }}>
            <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: state.configured ? "#22c55e" : state.url ? "#f59e0b" : "#666", boxShadow: state.configured ? "0 0 8px #22c55e" : state.url ? "0 0 8px #f59e0b" : undefined }} />
            <span className="mono" style={{ fontSize: 12, color: "var(--ink)", letterSpacing: 1.5, textTransform: "uppercase" }}>
              {state.configured ? "Connected" : state.url ? "Saved · not yet verified" : "Not connected"}
            </span>
            {state.lastOkAt && <span style={{ fontSize: 11, color: "var(--mute)" }}>· last ok {Math.round((Date.now() - state.lastOkAt) / 1000)}s ago</span>}
            <span style={{ flex: 1 }} />
            {state.url && <button className="btn" style={{ fontSize: 11, padding: "5px 12px" }} disabled={busy} onClick={() => void test()}>Test now</button>}
            {state.url && <button className="btn" style={{ fontSize: 11, padding: "5px 12px", color: "#ef4444", borderColor: "rgba(239,68,68,0.45)" }} disabled={busy} onClick={() => void disconnect()}>Disconnect</button>}
          </div>
          {msg && (
            <div style={{ marginTop: 12, padding: "8px 10px", borderRadius: 6, fontSize: 12, lineHeight: 1.5, color: msg.ok ? "#86efac" : "#fecaca", background: msg.ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${msg.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}` }}>
              {msg.text}
            </div>
          )}
          {state.lastError && !msg && (
            <div style={{ marginTop: 12, padding: "8px 10px", borderRadius: 6, fontSize: 12, color: "#fecaca", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)" }}>
              Last error: {state.lastError}
            </div>
          )}
        </div>

        {/* Wire contract — so the user knows what Hermes needs to expose */}
        <div style={{ marginTop: 22 }}>
          <Label>What Hermes needs to expose</Label>
          <div className="panel" style={{ padding: 14, marginTop: 6 }}>
            <Endpoint method="POST" path="/chat"
              req={`{ "system": "…", "messages": [ { "role": "user", "content": "…" } ] }`}
              res={`{ "text": "…" }`} />
            <div style={{ height: 1, background: "var(--line)", margin: "12px 0" }} />
            <Endpoint method="POST" path="/memory"
              req={`{ "entries": [ { "agent": "claude", "fact": "…", "source": "chat", "ts": 1700000000000 } ] }`}
              res={`{ "ok": true }`} />
            <p style={{ fontSize: 12, color: "var(--mute)", margin: "14px 0 0", lineHeight: 1.6 }}>
              Memory sources: <code style={code}>explicit</code> (an agent's `remember` tool),
              <code style={code}>chat</code> (user + agent messages),
              <code style={code}>control-panel</code> (live infra summaries),
              <code style={code}>event</code> (deploys, alerts, hot rows).
              NCH batches and posts these every 30s; queued offline, lossy is fine.
            </p>
          </div>
        </div>

        {onDone && (
          <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end" }}>
            <button className="btn" onClick={onDone} style={{ padding: "8px 18px", fontSize: 13 }}>Continue to NCH</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--mute)" }}>{children}</div>;
}
function Endpoint({ method, path, req, res }: { method: string; path: string; req: string; res: string }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span className="mono" style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "rgba(34,211,238,0.15)", color: "#22d3ee", border: "1px solid rgba(34,211,238,0.4)" }}>{method}</span>
        <span className="mono" style={{ fontSize: 13, color: "var(--ink)" }}>{path}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Snippet label="Request" body={req} />
        <Snippet label="Response" body={res} />
      </div>
    </div>
  );
}
function Snippet({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: "var(--mute)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
      <pre style={{ fontFamily: "ui-monospace,monospace", fontSize: 11, color: "#cfeedc", background: "rgba(0,0,0,0.45)", border: "1px solid var(--line)", borderRadius: 6, padding: "8px 10px", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{body}</pre>
    </div>
  );
}
const code: React.CSSProperties = { fontFamily: "ui-monospace,monospace", fontSize: 11, padding: "1px 6px", borderRadius: 3, background: "rgba(0,0,0,0.4)", color: "var(--orange)", margin: "0 2px" };
