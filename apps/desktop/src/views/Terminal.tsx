import { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";

export function TerminalView() {
  const host = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!host.current) return;
    const term = new XTerm({
      fontFamily: "ui-monospace, Menlo, monospace",
      fontSize: 13,
      cursorBlink: true,
      theme: {
        background: "#0a0a0c",
        foreground: "#e8e8ee",
        cursor: "#ff5577",
        selectionBackground: "#ff2d4a55",
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host.current);
    fit.fit();

    let disposed = false;
    const offData = window.hub.terminal.onData((d) => term.write(d));
    const offExit = window.hub.terminal.onExit(() =>
      term.write("\r\n\x1b[2m[process exited]\x1b[0m\r\n")
    );

    window.hub.terminal.start(term.cols, term.rows).then((r) => {
      if (disposed) return;
      if (!r.ok) {
        setErr(r.error || "Could not start the shell.");
        return;
      }
      term.onData((d) => window.hub.terminal.input(d));
      term.writeln("\x1b[38;5;210mNetworkChuck Hub · Terminal\x1b[0m");
    });

    const onResize = () => {
      fit.fit();
      window.hub.terminal.resize(term.cols, term.rows);
    };
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      offData();
      offExit();
      window.removeEventListener("resize", onResize);
      window.hub.terminal.kill();
      term.dispose();
    };
  }, []);

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
        }}
      >
        Terminal
      </div>
      {err && (
        <div className="placeholder">
          <div>
            <div className="glow-text mono">Terminal unavailable</div>
            <p style={{ maxWidth: 420, fontSize: 13 }}>{err}</p>
            <p style={{ fontSize: 12, color: "var(--mute)" }}>
              The PowerShell bridge needs node-pty built for this platform. On
              Windows the packaged build ships it; in dev run an{" "}
              <span className="mono">npm rebuild node-pty</span>.
            </p>
          </div>
        </div>
      )}
      <div
        ref={host}
        style={{ flex: 1, padding: 8, background: "#0a0a0c", display: err ? "none" : "block" }}
      />
    </div>
  );
}
