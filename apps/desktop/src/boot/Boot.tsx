import { useEffect, useRef, useState } from "react";

// Mirrors the HALOS Interface boot sequence: a JS-driven timeline of lines
// with a fill bar, then hands off to the app.
type Step = { t: string; p: number };

const BOOT_SEQ: Step[] = [
  { t: "NETWORKCHUCK HUB · cold start", p: 4 },
  { t: "mounting command bus . . . . . . . . . . . . ok", p: 14 },
  { t: "spinning up sandboxed browser engine . . . . ok", p: 28 },
  { t: "linking PowerShell bridge . . . . . . . . . . ok", p: 40 },
  { t: "loading house extensions [20] . . . . . . . . ok", p: 52 },
  { t: "negotiating AI group channel . . . . . . . . . ok", p: 64 },
  { t: "polling Control Panel integrations . . . . . . ok", p: 76 },
  { t: "warming notification feeds . . . . . . . . . . ok", p: 86 },
  { t: "calibrating glow . . . . . . . . . . . . . . . ok", p: 94 },
  { t: "HUB ONLINE", p: 100 },
];

export function Boot({ onDone }: { onDone: () => void }) {
  const [lines, setLines] = useState<string[]>([]);
  const [pct, setPct] = useState(0);
  const i = useRef(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      const s = BOOT_SEQ[i.current];
      if (!s) {
        timer = setTimeout(onDone, 420);
        return;
      }
      setLines((prev) => [...prev, s.t]);
      setPct(s.p);
      i.current += 1;
      timer = setTimeout(step, 180 + Math.random() * 110);
    };
    timer = setTimeout(step, 260);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 22,
        background:
          "radial-gradient(circle at 50% 35%, rgba(255,45,74,0.08), transparent 60%)",
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 34,
          fontWeight: 900,
          letterSpacing: 8,
          textTransform: "uppercase",
        }}
      >
        NetworkChuck <span className="glow-text">Hub</span>
      </div>
      <div className="strip" style={{ width: 360 }} />

      <div
        className="mono"
        style={{
          width: 460,
          maxWidth: "80vw",
          height: 220,
          fontSize: 12,
          color: "var(--mute)",
          overflow: "hidden",
        }}
      >
        {lines.map((l, idx) => (
          <div key={idx} style={{ opacity: idx === lines.length - 1 ? 1 : 0.7 }}>
            <span className="glow-text">›</span> {l}
          </div>
        ))}
      </div>

      <div
        style={{
          width: 460,
          maxWidth: "80vw",
          height: 6,
          borderRadius: 4,
          background: "#15151a",
          overflow: "hidden",
        }}
      >
        <div
          className="strip"
          style={{ height: "100%", width: `${pct}%`, transition: "width 0.18s" }}
        />
      </div>
    </div>
  );
}
