import { useEffect, useLayoutEffect, useState } from "react";

// A guided tour with element highlighting. Each step targets a CSS selector;
// we compute its bounding rect, dim everything else, ring the target, and
// place a tooltip beside it with Prev/Next/Skip. Resize/scroll-safe.

export type TourStep = {
  selector?: string;            // omit for a centered welcome/end card
  side?: "right" | "left" | "below" | "above";
  title: string;
  body: string;
};

export const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to NetworkChuck Hub",
    body: "I'll walk you around the place. Hit Next to start, Skip to bail at any time. Right-click any floating info card to dismiss it; the Settings page has more toggles.",
  },
  {
    selector: '[data-tour="rail-browser"]',
    side: "right",
    title: "The Browser",
    body: "The Hub opens here by default. Our own chrome — tabs that survive restarts, address bar with ★ bookmarks, extensions dropdown, and a more-menu for history, downloads, passwords, tab groups.",
  },
  {
    selector: '[data-tour="rail-control"]',
    side: "right",
    title: "Control Panel",
    body: "Connect your own services — GitHub, Vercel, Cloudflare, Tailscale, Home Assistant, Hostinger and more. Tokens are encrypted on this machine via the OS keychain; nothing is ever bundled or sent anywhere except to that service.",
  },
  {
    selector: '[data-tour="rail-terminal"]',
    side: "right",
    title: "Terminal",
    body: "A real PowerShell session (on Windows; your default shell elsewhere) wired through node-pty. The same place you launch the CLI agents that show up in the AI group chat.",
  },
  {
    selector: '[data-tour="rail-ai"]',
    side: "right",
    title: "AI Group Chat",
    body: "BroBot and the NT5 anchors run on the bundled local model — always on call, no setup. For the outside crew (Claude, Gemini, Codex, OpenCode, Hermes) you launch their CLI yourself in Configure. Chat history survives tab switches.",
  },
  {
    selector: '[data-tour="rail-library"]',
    side: "right",
    title: "Library",
    body: "Your Steam games (auto-detected), plus quick launches for Modrinth and Blockbench.",
  },
  {
    selector: '[data-tour="rail-app-nt5"]',
    side: "right",
    title: "NT5 — S.P.A.C.E. News",
    body: "The actual NT5 site, bundled and running offline. The Hub keeps a live wire scheduler going in the background — every few minutes it generates fresh anchor articles via the local brain and posts them into the bundled site.",
  },
  {
    selector: '[data-tour="rail-app-halos"]',
    side: "right",
    title: "HALOS Interface",
    body: "The real HALOS app, ported in. Andromedan codex, telemetry, stocks, roster — all of it, with OpenClaw retired and the Polar Cosmos Crew renamed (Roetem, Tsudrats, Yruf, Avonorepus, Aluben, …).",
  },
  {
    selector: '[data-tour="rail-app-moreme"]',
    side: "right",
    title: "More Me",
    body: "The Dude Perfect daily checklist + calendar. Strict time-blocked routine, modes for Semester/Vacation/Exam/Travel, XP tiers from Initiate to Dude Perfect.",
  },
  {
    selector: '[data-tour="rail-app-blueprint"]',
    side: "right",
    title: "Digital Blueprint",
    body: "Three.js editor with a full PBR material system (metals, glass, glow, sheen, clearcoat) and an LLM scene generator that builds out complex models on the bundled local brain.",
  },
  {
    selector: '[data-tour="rail-app-brobot"]',
    side: "right",
    title: "BroBot",
    body: "BroBot's actual app, bundled in. Gallery + Openverse search + the homie chat — all running on the same local brain BroBot uses in the group chat, so it's one mind across both surfaces.",
  },
  {
    selector: '[data-tour="rail-app-signalfinder"]',
    side: "right",
    title: "SignalFinder",
    body: "Built from scratch. A strategic-networking CRM that scores prospective creators on response-likelihood, collab-compatibility, momentum, timing, and relevance — then drafts personalized outreach.",
  },
  {
    selector: '[data-tour="rail-settings"]',
    side: "right",
    title: "Settings",
    body: "Account, theme accents, the house-AI brain (download/redownload), info-widget toggles, search engine, home page, bookmarks bar. Most of the Hub's behavior lives here.",
  },
  {
    selector: '[data-tour="floating-info"]',
    side: "left",
    title: "Floating info",
    body: "On-screen tidbits — NT5 breaking, the anchor desk's latest, Origin Realms server pulse. Right-click any card to dismiss it; toggle the whole thing from Settings.",
  },
  {
    title: "That's the tour",
    body: "Ask me anything in the ? menu (bottom-left), or drop feedback in Settings — Davis reads it. Have fun.",
  },
];

export function TourOverlay({ stepIndex, onPrev, onNext, onSkip }: {
  stepIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const step = TOUR_STEPS[stepIndex];
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    function find() {
      if (!step?.selector) { setRect(null); return; }
      const el = document.querySelector(step.selector) as HTMLElement | null;
      setRect(el ? el.getBoundingClientRect() : null);
    }
    find();
    const obs = new ResizeObserver(find);
    obs.observe(document.body);
    window.addEventListener("scroll", find, true);
    window.addEventListener("resize", find);
    return () => {
      obs.disconnect();
      window.removeEventListener("scroll", find, true);
      window.removeEventListener("resize", find);
    };
  }, [step?.selector, stepIndex]);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onSkip();
      if (e.key === "ArrowRight" || e.key === "Enter") onNext();
      if (e.key === "ArrowLeft") onPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNext, onPrev, onSkip]);

  if (!step) return null;

  const isLast = stepIndex >= TOUR_STEPS.length - 1;
  const isFirst = stepIndex <= 0;

  return (
    <>
      {/* dim overlay: full-screen dark; the target hole gets cut out below */}
      <div
        onClick={onSkip}
        style={{
          position: "fixed", inset: 0, zIndex: 10500, pointerEvents: "auto",
          background: rect ? "transparent" : "rgba(0,0,0,0.55)",
        }}
      />

      {/* target ring + cutout via box-shadow */}
      {rect && (
        <div
          style={{
            position: "fixed",
            left: rect.left - 8,
            top: rect.top - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            borderRadius: 12,
            zIndex: 10501,
            pointerEvents: "none",
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55), 0 0 0 2px rgba(255,87,119,0.9), 0 0 24px rgba(255,51,85,0.6)",
            transition: "all 240ms cubic-bezier(.2,.8,.2,1)",
          }}
        />
      )}

      {/* tooltip card */}
      <TourCard rect={rect} step={step} stepIndex={stepIndex} total={TOUR_STEPS.length} isFirst={isFirst} isLast={isLast} onPrev={onPrev} onNext={onNext} onSkip={onSkip} />
    </>
  );
}

function TourCard({
  rect, step, stepIndex, total, isFirst, isLast, onPrev, onNext, onSkip,
}: {
  rect: DOMRect | null;
  step: TourStep;
  stepIndex: number;
  total: number;
  isFirst: boolean;
  isLast: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const W = 320, H = 168, M = 18;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  let left: number; let top: number;
  if (!rect) {
    left = (vw - W) / 2; top = (vh - H) / 2;
  } else {
    const side = step.side || pickSide(rect, vw, vh, W, H);
    if (side === "right")      { left = rect.right + M; top = clamp(rect.top, 12, vh - H - 12); }
    else if (side === "left")  { left = rect.left - W - M; top = clamp(rect.top, 12, vh - H - 12); }
    else if (side === "above") { left = clamp(rect.left, 12, vw - W - 12); top = rect.top - H - M; }
    else                       { left = clamp(rect.left, 12, vw - W - 12); top = rect.bottom + M; }
    if (left < 12) left = 12;
    if (left + W > vw - 12) left = vw - W - 12;
    if (top < 12) top = 12;
    if (top + H > vh - 12) top = vh - H - 12;
  }
  return (
    <div
      style={{
        position: "fixed", left, top, width: W, minHeight: H, zIndex: 10502,
        background: "linear-gradient(160deg, rgba(20,8,12,0.97), rgba(8,8,14,0.97))",
        border: "1px solid rgba(255,87,119,0.6)",
        borderRadius: 12,
        boxShadow: "0 0 0 1px rgba(255,51,85,0.25), 0 18px 38px rgba(0,0,0,0.6), 0 0 28px rgba(255,51,85,0.18)",
        padding: 14,
        color: "var(--ink)",
        fontFamily: "ui-monospace, monospace",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span className="mono glow-text" style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" }}>
          Tom · {stepIndex + 1} / {total}
        </span>
        <button onClick={onSkip} title="Skip" style={{ background: "none", border: "none", color: "var(--mute)", cursor: "pointer", fontSize: 14 }}>✕</button>
      </div>
      <div style={{ fontSize: 14, color: "#fff", fontWeight: 600, marginBottom: 6 }}>{step.title}</div>
      <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.5 }}>{step.body}</div>
      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
        <button className="btn" onClick={onPrev} disabled={isFirst} style={{ opacity: isFirst ? 0.4 : 1 }}>← Back</button>
        <button className="btn" onClick={onSkip}>Skip</button>
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={onNext} style={{ color: "var(--pink)", borderColor: "rgba(255,87,119,0.6)" }}>{isLast ? "Done" : "Next →"}</button>
      </div>
    </div>
  );
}

function pickSide(rect: DOMRect, vw: number, vh: number, W: number, H: number): TourStep["side"] {
  if (rect.right + W + 40 <= vw) return "right";
  if (rect.left - W - 40 >= 0) return "left";
  if (rect.bottom + H + 40 <= vh) return "below";
  return "above";
}
function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }
