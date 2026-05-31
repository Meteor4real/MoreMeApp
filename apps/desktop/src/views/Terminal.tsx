import { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { houseChat } from "../houseLLM";

// Per-tab shell choices + saved command snippets + CLI-agent quick launchers.
type ShellKind = "default" | "powershell" | "pwsh" | "cmd" | "wsl" | "bash" | "zsh";
const SHELLS: { id: ShellKind; label: string }[] = [
  { id: "default", label: "Default" },
  { id: "powershell", label: "PowerShell" },
  { id: "pwsh", label: "pwsh 7" },
  { id: "cmd", label: "cmd" },
  { id: "wsl", label: "WSL" },
  { id: "bash", label: "bash" },
  { id: "zsh", label: "zsh" },
];

const AGENT_LAUNCHERS: { label: string; cmd: string }[] = [
  { label: "Claude", cmd: "claude" },
  { label: "Gemini", cmd: "gemini" },
  { label: "Codex", cmd: "codex" },
  { label: "OpenCode", cmd: "opencode" },
];

const SNIP_KEY = "nchub.terminal.snippets.v1";
function loadSnippets(): { id: string; label: string; cmd: string }[] {
  try { const r = localStorage.getItem(SNIP_KEY); if (r) return JSON.parse(r); } catch { /* ignore */ }
  return [
    { id: "s1", label: "list", cmd: process.platform === "win32" ? "dir" : "ls -la" },
    { id: "s2", label: "git status", cmd: "git status" },
    { id: "s3", label: "where am i", cmd: process.platform === "win32" ? "cd" : "pwd" },
  ];
}
function saveSnippets(s: { id: string; label: string; cmd: string }[]) {
  try { localStorage.setItem(SNIP_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

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

async function createSession(shell: ShellKind = "default"): Promise<string | null> {
  ensureGlobalListeners();
  const id = newSessionId();
  const r = await window.hub.terminal.start(id, 100, 30, shell === "default" ? undefined : shell);
  if (!r.ok) return null;
  const label = SHELLS.find((s) => s.id === shell)?.label || "shell";
  SESSIONS.set(id, { id, title: `${label} ${SESSIONS.size + 1}`, buffer: "", active: true });
  activeId = id;
  notify();
  return id;
}
// Type into the active PTY (used by snippets, agent launchers, AI bar). When
// run=true, append a newline so it executes.
function sendToActive(text: string, run: boolean) {
  if (!activeId) return;
  window.hub.terminal.input(activeId, run ? text + "\r" : text);
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
      scrollback: 8000,
      theme: { background: "#0a0a0c", foreground: "#e8e8ee", cursor: "#ff5577", selectionBackground: "#ff2d4a55" },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host.current);
    fit.fit();

    // Clipboard: Ctrl/Cmd+C copies the selection (when there is one),
    // Ctrl/Cmd+V (and Ctrl+Shift+V) pastes, right-click pastes. Returning
    // false from the handler stops xterm/the pty from also seeing the key.
    term.attachCustomKeyEventHandler((e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (e.type !== "keydown") return true;
      if (mod && e.key.toLowerCase() === "c" && term.hasSelection()) {
        navigator.clipboard.writeText(term.getSelection()).catch(() => undefined);
        return false;
      }
      if (mod && e.key.toLowerCase() === "v") {
        navigator.clipboard.readText().then((t) => { if (t && activeId) window.hub.terminal.input(activeId, t); }).catch(() => undefined);
        return false;
      }
      return true;
    });
    host.current.oncontextmenu = (ev) => {
      ev.preventDefault();
      navigator.clipboard.readText().then((t) => { if (t && activeId) window.hub.terminal.input(activeId, t); }).catch(() => undefined);
    };

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
            <span>{s.title}</span>
            <span onClick={(e) => { e.stopPropagation(); closeSession(s.id); }} style={{ opacity: 0.7, fontSize: 11 }}>✕</span>
          </div>
        ))}
        <NewShellButton onCreate={(k) => void createSession(k)} />
      </div>

      {/* Snippets + agent quick-launch + AI command bar */}
      {!err && SESSIONS.size > 0 && <TerminalToolbar />}
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

// "+ new shell" with a shell-kind dropdown.
function NewShellButton({ onCreate }: { onCreate: (k: ShellKind) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) { if (!ref.current?.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="btn" style={{ padding: "2px 10px", fontSize: 11 }} onClick={() => setOpen((o) => !o)}>+ new shell ▾</button>
      {open && (
        <div style={{ position: "absolute", top: 30, left: 0, zIndex: 60, background: "#0e0e14", border: "1px solid var(--line)", borderRadius: 8, padding: 4, minWidth: 140, boxShadow: "0 12px 28px rgba(0,0,0,0.6)" }}>
          {SHELLS.map((sh) => (
            <button key={sh.id} className="btn" style={{ display: "block", width: "100%", textAlign: "left", border: "none", padding: "6px 10px", fontSize: 12 }}
              onClick={() => { onCreate(sh.id); setOpen(false); }}>{sh.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function TerminalToolbar() {
  const [snips, setSnips] = useState(loadSnippets);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [cmd, setCmd] = useState("");
  const [ai, setAi] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  function addSnip() {
    if (!cmd.trim()) return;
    const next = [...snips, { id: "s" + Date.now(), label: label.trim() || cmd.trim().slice(0, 16), cmd: cmd.trim() }];
    setSnips(next); saveSnippets(next); setLabel(""); setCmd(""); setAdding(false);
  }
  function removeSnip(id: string) { const next = snips.filter((s) => s.id !== id); setSnips(next); saveSnippets(next); }

  async function askAi(run: boolean) {
    const q = ai.trim(); if (!q || aiBusy) return;
    setAiBusy(true);
    try {
      const plat = navigator.platform || "this machine";
      const sys = `You translate a plain-English request into a SINGLE shell command for ${plat}. Reply with ONLY the command on one line — no markdown, no backticks, no explanation. If it's destructive, still output it (the user reviews before running).`;
      const r = await houseChat(sys, q);
      const command = (r.ok ? (r.text || "") : "").trim().replace(/^```[a-z]*|```$/g, "").split("\n")[0].trim();
      if (command) { sendToActive(command, run); setAi(""); }
    } finally { setAiBusy(false); }
  }

  return (
    <div style={{ borderBottom: "1px solid var(--line)", background: "rgba(0,0,0,0.25)", padding: "6px 8px", display: "flex", flexDirection: "column", gap: 6, flex: "none" }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <span className="mono" style={{ fontSize: 9, color: "var(--mute)", letterSpacing: 1.5, textTransform: "uppercase" }}>launch</span>
        {AGENT_LAUNCHERS.map((a) => (
          <button key={a.cmd} className="btn" style={{ fontSize: 11, padding: "3px 9px" }} title={`Run "${a.cmd}" in the active shell`} onClick={() => sendToActive(a.cmd, true)}>{a.label}</button>
        ))}
        <span style={{ width: 1, height: 16, background: "var(--line)", margin: "0 4px" }} />
        <span className="mono" style={{ fontSize: 9, color: "var(--mute)", letterSpacing: 1.5, textTransform: "uppercase" }}>snippets</span>
        {snips.map((s) => (
          <span key={s.id} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <button className="btn" style={{ fontSize: 11, padding: "3px 9px" }} title={s.cmd} onClick={() => sendToActive(s.cmd, true)}>{s.label}</button>
            <span onClick={() => removeSnip(s.id)} title="remove" style={{ cursor: "pointer", color: "var(--mute)", fontSize: 11 }}>✕</span>
          </span>
        ))}
        {adding ? (
          <span style={{ display: "inline-flex", gap: 4 }}>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="label" style={tbInp} />
            <input value={cmd} onChange={(e) => setCmd(e.target.value)} placeholder="command" onKeyDown={(e) => e.key === "Enter" && addSnip()} style={{ ...tbInp, width: 180 }} />
            <button className="btn" style={{ fontSize: 11 }} onClick={addSnip}>save</button>
          </span>
        ) : (
          <button className="btn" style={{ fontSize: 11, padding: "3px 9px" }} onClick={() => setAdding(true)}>+ snippet</button>
        )}
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span className="mono" style={{ fontSize: 9, color: "var(--pink)", letterSpacing: 1.5, textTransform: "uppercase" }}>ai →</span>
        <input value={ai} onChange={(e) => setAi(e.target.value)} disabled={aiBusy}
          placeholder='describe a command — e.g. "find every .log over 10MB"'
          onKeyDown={(e) => { if (e.key === "Enter") void askAi(e.shiftKey); }}
          style={{ ...tbInp, flex: 1 }} />
        <button className="btn" style={{ fontSize: 11 }} disabled={aiBusy} onClick={() => void askAi(false)} title="Insert command (don't run)">{aiBusy ? "…" : "Insert"}</button>
        <button className="btn" style={{ fontSize: 11, color: "var(--pink)" }} disabled={aiBusy} onClick={() => void askAi(true)} title="Insert and run">Run</button>
      </div>
    </div>
  );
}
const tbInp: React.CSSProperties = {
  background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 6,
  color: "var(--ink)", padding: "4px 8px", fontSize: 12, fontFamily: "ui-monospace,monospace", outline: "none", width: 110,
};
