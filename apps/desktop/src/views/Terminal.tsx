import { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";

// Multi-shell terminal. Sessions live in main-process PTYs keyed by string
// IDs; the renderer keeps a module-level registry of recent output so each
// shell survives React tab switches inside the Hub. Closing a terminal tab
// in the UI is the only thing that kills its PTY.

type Session = { id: string; title: string; buffer: string; active: boolean };
const SESSIONS = new Map<string, Session>();
const subs = new Set<() => void>();
let activeId: string | null = null;
let subscribed = false;
let counter = 0;

function notify() { subs.forEach((fn) => fn()); }
function subscribe(fn: () => void) { subs.add(fn); return () => subs.delete(fn); }
function ensureGlobalListeners() {
  if (subscribed) return;
  subscribed = true;
  window.hub.terminal.onData((id, data) => {
    const s = SESSIONS.get(id);
    if (!s) return;
    s.buffer += data;
    if (s.buffer.length > 200_000) s.buffer = s.buffer.slice(-150_000);
    notify();
  });
  window.hub.terminal.onExit((id) => {
    const s = SESSIONS.get(id);
    if (s) { s.active = false; notify(); }
  });
}
function newSessionId() {
  counter++;
  return `t${Date.now().toString(36)}-${counter}`;
}

async function createSession(): Promise<string | null> {
  ensureGlobalListeners();
  const id = newSessionId();
  const r = await window.hub.terminal.start(id, 100, 30);
  if (!r.ok) return null;
  SESSIONS.set(id, { id, title: `shell ${SESSIONS.size + 1}`, buffer: "", active: true });
  activeId = id;
  notify();
  return id;
}
function closeSession(id: string) {
  window.hub.terminal.kill(id);
  SESSIONS.delete(id);
  if (activeId === id) {
    activeId = SESSIONS.size > 0 ? [...SESSIONS.keys()][SESSIONS.size - 1] : null;
  }
  notify();
}
function setActive(id: string) { if (SESSIONS.has(id)) { activeId = id; notify(); } }

export function TerminalView() {
  const [, setTick] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<{ term: XTerm; fit: FitAddon; id: string } | null>(null);

  // Pub/sub re-render trigger
  useEffect(() => {
    const off = subscribe(() => setTick((n) => n + 1));
    return () => { off(); };
  }, []);

  // Bootstrap: if no sessions, spawn one.
  useEffect(() => {
    void (async () => {
      if (SESSIONS.size === 0) {
        const id = await createSession();
        if (!id) setErr("Could not start the shell. node-pty unavailable.");
      }
    })();
  }, []);

  // Mount xterm for the active session; rebuild it on switch.
  useEffect(() => {
    if (!host.current || !activeId || !SESSIONS.get(activeId)) return;
    const id = activeId;
    if (xtermRef.current?.id === id) return; // already mounted

    // Tear down previous
    if (xtermRef.current) {
      try { xtermRef.current.term.dispose(); } catch { /* ignore */ }
      xtermRef.current = null;
    }
    while (host.current.firstChild) host.current.removeChild(host.current.firstChild);

    const term = new XTerm({
      fontFamily: "ui-monospace, Menlo, Consolas, monospace",
      fontSize: 13,
      cursorBlink: true,
      allowProposedApi: true,
      theme: { background: "#0a0a0c", foreground: "#e8e8ee", cursor: "#ff5577", selectionBackground: "#ff2d4a55" },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host.current);
    fit.fit();

    // Replay accumulated output so the user lands where they left off.
    const s = SESSIONS.get(id)!;
    if (s.buffer) term.write(s.buffer);
    term.onData((d) => window.hub.terminal.input(id, d));

    // Forward fresh PTY output for this session to the term.
    const off = subscribe(() => {
      if (activeId !== id) return;
      // We don't know which chars are new — but we have the up-to-date
      // buffer; the listener path already wrote new chars to the term via
      // the data subscription below, so no action here.
    });

    // Live updates: subscribe to incoming data and forward.
    const liveOff = window.hub.terminal.onData((sid, data) => {
      if (sid === id) term.write(data);
    });
    const exitOff = window.hub.terminal.onExit((sid) => {
      if (sid === id) term.write("\r\n\x1b[2m[shell exited]\x1b[0m\r\n");
    });
    const onResize = () => { try { fit.fit(); window.hub.terminal.resize(id, term.cols, term.rows); } catch { /* ignore */ } };
    window.addEventListener("resize", onResize);

    xtermRef.current = { term, fit, id };
    return () => {
      off();
      liveOff();
      exitOff();
      window.removeEventListener("resize", onResize);
    };
  });

  const sessions = [...SESSIONS.values()];

  return (
    <div className="stage">
      <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid var(--line)", padding: "6px 8px", gap: 4, overflowX: "auto", flex: "none" }}>
        <span className="mono" style={{ fontSize: 11, color: "var(--mute)", letterSpacing: 2, textTransform: "uppercase", marginRight: 8 }}>Terminal</span>
        {sessions.map((s, i) => (
          <div key={s.id}
            onClick={() => setActive(s.id)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "4px 10px",
              borderRadius: "6px 6px 0 0", border: "1px solid var(--line)",
              borderBottom: s.id === activeId ? "1px solid transparent" : "1px solid var(--line)",
              background: s.id === activeId ? "rgba(255, 87, 119, 0.08)" : "rgba(0, 0, 0, 0.3)",
              cursor: "pointer", fontSize: 12, color: s.id === activeId ? "var(--ink)" : "var(--mute)",
              fontFamily: "ui-monospace, monospace",
              opacity: s.active ? 1 : 0.55,
            }}
          >
            <span>shell {i + 1}</span>
            <span onClick={(e) => { e.stopPropagation(); closeSession(s.id); }} style={{ opacity: 0.7, fontSize: 11 }}>✕</span>
          </div>
        ))}
        <button className="btn" style={{ padding: "2px 10px", fontSize: 11 }} onClick={() => void createSession()}>+ new shell</button>
      </div>
      {err && (
        <div className="placeholder">
          <div>
            <div className="glow-text mono">Terminal unavailable</div>
            <p style={{ maxWidth: 420, fontSize: 13 }}>{err}</p>
            <p style={{ fontSize: 12, color: "var(--mute)" }}>
              The PowerShell bridge needs node-pty built for this platform. On Windows the
              packaged build ships it; in dev run an <span className="mono">npm rebuild node-pty</span>.
            </p>
          </div>
        </div>
      )}
      {!err && SESSIONS.size === 0 && (
        <div className="placeholder">
          <div>
            <div className="glow-text mono">No shells running</div>
            <button className="btn" onClick={() => void createSession()}>Open one</button>
          </div>
        </div>
      )}
      <div ref={host} style={{ flex: 1, padding: 8, background: "#0a0a0c", display: err || SESSIONS.size === 0 ? "none" : "block" }} />
    </div>
  );
}
