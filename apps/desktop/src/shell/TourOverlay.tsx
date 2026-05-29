import { useEffect, useLayoutEffect, useState } from "react";
import { goto, type NavRequest } from "../navBridge";

// A guided tour with element highlighting. Each step targets a CSS selector;
// we compute its bounding rect, dim everything else, ring the target, and
// place a tooltip beside it with Prev/Next/Skip. Resize/scroll-safe.
// Steps can also drive the Hub's nav so Tom actually takes you to the
// surface he's explaining.

export type TourStep = {
  selector?: string;            // omit for a centered welcome/end card
  side?: "right" | "left" | "below" | "above";
  title: string;
  body: string;
  nav?: NavRequest;             // navigate the Hub before measuring the target
};

export const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to NetworkChuck Hub",
    body: "I'll actually walk you around the app — not just point at icons. Hit Next and I'll take you to each surface. Skip bails any time. Press the arrow keys to step.",
  },
  {
    nav: { kind: "browser" },
    selector: '[data-tour="rail-browser"]',
    side: "right",
    title: "Browser — the default canvas",
    body: "Our own chrome: persistent tabs, address bar with bookmarks, extensions dropdown, more-menu for history / downloads / passwords / tab groups. Typing a search runs through about:search instead of redirecting to the engine's site — chrome stays ours.",
  },
  {
    nav: { kind: "control" },
    selector: '[data-tour="rail-control"]',
    side: "right",
    title: "Control Panel · Connect + Manage",
    body: "Two subtabs. Connect plugs in your tokens (encrypted via the OS keychain — never bundled, never sent anywhere except to that service). Manage pulls live stats across everything you've connected: repos, deployments, zones, devices, workflows.",
  },
  {
    nav: { kind: "terminal" },
    selector: '[data-tour="rail-terminal"]',
    side: "right",
    title: "Terminal · multi-shell",
    body: "Real PowerShell sessions over node-pty. Tab strip at the top — open as many shells as you want, switch between them, they survive Hub tab switches and keep accumulating output.",
  },
  {
    nav: { kind: "ai" },
    selector: '[data-tour="rail-ai"]',
    side: "right",
    title: "AI Group Chat + Projects",
    body: "BroBot and the NT5 anchors (Voss, Zip, Dex, Lena, Orion) are house-model agents and only chime in when you @mention them. @Everyone routes to the outside crew (Claude, Gemini, Codex, OpenCode, Hermes) you wire via CLI. Agents @mention each other to coordinate. The Projects tab lets you assign a goal + tasks + deadline to a specific subset of the crew.",
  },
  {
    nav: { kind: "library" },
    selector: '[data-tour="rail-library"]',
    side: "right",
    title: "Library",
    body: "Your Steam games auto-detected. Hover any game to customize its name, banner art, icon size, pin, or hide it. Modrinth and Blockbench moved to the Control Panel.",
  },
  {
    nav: { kind: "app", id: "nt5" },
    selector: '[data-tour="rail-app-nt5"]',
    side: "right",
    title: "NT5 · S.P.A.C.E. News",
    body: "The actual NT5 site bundled offline. The Hub runs a background wire that generates fresh anchor articles via the local brain — Dex's gaming coverage tracks the live Origin Realms server pulse. Tap ⛶ on the broadcast bar to open the full studio view.",
  },
  {
    nav: { kind: "app", id: "halos" },
    selector: '[data-tour="rail-app-halos"]',
    side: "right",
    title: "HALOS Interface",
    body: "The real HALOS app ported in — telemetry, codex, stocks, roster. OpenClaw retired, Polar Cosmos Crew renamed (Roetem, Tsudrats, Yruf, Avonorepus, Aluben, ...).",
  },
  {
    nav: { kind: "app", id: "moreme" },
    selector: '[data-tour="rail-app-moreme"]',
    side: "right",
    title: "More Me",
    body: "Time-blocked daily checklist driven by a yearly calendar. Modes auto-resolve from events (Semester / Vacation / Exam / Travel). Battlepass, 28 achievements, XP tiers from Initiate to Dude Perfect.",
  },
  {
    nav: { kind: "app", id: "blueprint" },
    selector: '[data-tour="rail-app-blueprint"]',
    side: "right",
    title: "Digital Blueprint",
    body: "three.js editor with full PBR materials, an LLM scene generator, per-object annotations that float over the model in 3D space, and a real-time atmosphere panel (sun azimuth + elevation, ambient, sky).",
  },
  {
    nav: { kind: "app", id: "brobot" },
    selector: '[data-tour="rail-app-brobot"]',
    side: "right",
    title: "BroBot",
    body: "The real BroBot app bundled in. Salon (chat) / Gallery / Estate (settings). Chat and LLM bridge via postMessage to the Hub's local brain — same mind as group-chat BroBot.",
  },
  {
    nav: { kind: "app", id: "signalfinder" },
    selector: '[data-tour="rail-app-signalfinder"]',
    side: "right",
    title: "SignalFinder",
    body: "Strategic-networking CRM. Pick your active goals (creator collabs / career / startup / community / mentorship / recruitment) and the scoring + LLM drafts weight everything toward what you're actually pursuing.",
  },
  {
    nav: { kind: "settings" },
    selector: '[data-tour="rail-settings"]',
    side: "right",
    title: "Settings",
    body: "Account, theme accents, the house-AI brain (status + redownload), background mode (Tray + run-on-startup for true 24/7), info widget toggles, search engine, home page. Most of the Hub's behavior lives here.",
  },
  {
    nav: { kind: "browser" },
    selector: '[data-tour="floating-info"]',
    side: "left",
    title: "Floating info",
    body: "On-screen cards: NT5 breaking, the anchor desk's latest, Origin Realms server pulse. Right-click any card to dismiss it; toggle per-type in Settings.",
  },
  {
    title: "That's the tour",
    body: "Hit me up in the ? menu (bottom-left) for questions — I run on the same local brain. Drop feedback in Settings; Davis reads it. Have fun.",
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

  // Drive the Hub's nav when a step requests it. We delay measuring the
  // target by a frame to give the new surface time to mount.
  useEffect(() => {
    if (step?.nav) goto(step.nav);
  }, [stepIndex, step?.nav]);

  useLayoutEffect(() => {
    function find() {
      if (!step?.selector) { setRect(null); return; }
      const el = document.querySelector(step.selector) as HTMLElement | null;
      setRect(el ? el.getBoundingClientRect() : null);
    }
    // small delay so post-nav DOM has settled
    const t = setTimeout(find, step?.nav ? 80 : 0);
    const obs = new ResizeObserver(find);
    obs.observe(document.body);
    window.addEventListener("scroll", find, true);
    window.addEventListener("resize", find);
    return () => {
      clearTimeout(t);
      obs.disconnect();
      window.removeEventListener("scroll", find, true);
      window.removeEventListener("resize", find);
    };
  }, [step?.selector, step?.nav, stepIndex]);

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
