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
    body: "I'll walk you through the whole app — every surface, every shortcut, every gotcha. Arrow keys to step, Enter for next, Esc to skip. Hit Next when you're ready.",
  },
  // Browser — overview + chrome detail + search detail
  {
    nav: { kind: "browser" },
    selector: '[data-tour="rail-browser"]',
    side: "right",
    title: "Browser — the default canvas",
    body: "The Hub opens here. Our own chrome — tabs, address bar, bookmarks, extensions, history, downloads, passwords, tab groups. Nothing is loading inside someone else's UI.",
  },
  {
    nav: { kind: "browser" },
    title: "Persistent tabs + zoom",
    body: "Tabs survive Hub tab switches AND app restarts. Right-click any tab to pin it, assign it to a group, or close it. The more-menu (⋮) has per-tab zoom (−/100%/+) so you can resize a page without affecting the rest.",
  },
  {
    nav: { kind: "browser" },
    selector: '[data-tour="browser-omni"]',
    side: "below",
    title: "The address bar (in-tab)",
    body: "This is the omnibar — type a URL or a search. Search lands on our own results page with Web / Images / Videos / News / Shopping tabs; you never get bounced to someone else's site. The star bookmarks the page; the icons beside it open Bookmarks, History, Downloads, Passwords and the Extensions dropdown.",
  },
  {
    nav: { kind: "browser" },
    title: "Extensions in the address bar",
    body: "The ⊞ button is the extensions dropdown — quick on/off for every house extension. The full manager lives at about:extensions (more-menu → Manage Extensions). Toggles re-inject on every navigation, not just dom-ready.",
  },

  // Control Panel — overview + Connect detail + Manage detail
  {
    nav: { kind: "control" },
    selector: '[data-tour="rail-control"]',
    side: "right",
    title: "Control Panel",
    body: "Where you plug in your accounts. Two subtabs: Connect and Manage. Every token is encrypted with the OS keychain (Electron safeStorage) and only ever sent to that service — never bundled with the app, never relayed through us.",
  },
  {
    nav: { kind: "control" },
    title: "Connect — credentials + launchers",
    body: "Each service has a card: token field, optional base URL, deep-link to the provider's token page. ElevenLabs + Pexels live here for NT5 broadcasts. Modrinth and Blockbench are launcher cards — no auth, just a Launch button.",
  },
  {
    nav: { kind: "control" },
    selector: '[data-tour="cp-tabs"]',
    side: "below",
    title: "Connect / Manage (in-tab)",
    body: "These two tabs are the whole Control Panel. CONNECT is the cards — plug in a token, hit Test to verify it. MANAGE is the live board: it auto-refreshes and gives you real actions — redeploy a Vercel build, purge a Cloudflare zone, restart a VPS, toggle an n8n workflow, start/stop a VM or container. Home Assistant + Portainer stream real-time; the rest poll faster while something's mid-change.",
  },

  // Terminal — overview + multi-shell
  {
    nav: { kind: "terminal" },
    selector: '[data-tour="rail-terminal"]',
    side: "right",
    title: "Terminal",
    body: "Real PowerShell on Windows; your default shell elsewhere. Backed by node-pty so colors, control codes, and tab completion all work.",
  },
  {
    nav: { kind: "terminal" },
    title: "Multi-shell tabs",
    body: "+ new shell opens as many parallel sessions as you want. Each PTY is keyed by ID in the main process, so switching to another Hub tab does NOT kill it — the shell keeps running. Comes back with the same scrollback.",
  },

  // AI Group Chat — overview + chat + projects
  {
    nav: { kind: "ai" },
    selector: '[data-tour="rail-ai"]',
    side: "right",
    title: "Group Terminal",
    body: "Your multi-agent room. Create saved chats and switch between them; pick which AIs are in each chat up front (editable any time) — everyone present reads the conversation and answers each other, no @mentions needed. Stop a turn mid-flight, watch the token estimate, and wire the outside crew (Claude, Gemini, Codex, OpenCode, Hermes) in Configure.",
  },
  {
    nav: { kind: "ai" },
    selector: '[data-tour="gt-newchat"]',
    side: "right",
    title: "New chat (in-tab)",
    body: "Make as many saved chats as you want and switch between them on the left — there's no clear button. When you create one you pick which AIs are in it (editable any time). Everyone in the chat reads the conversation and answers each other; no @mentions needed.",
  },
  {
    nav: { kind: "ai" },
    title: "Tools + memory",
    body: "The crew can call tools — run a shell command, read/write files, search the web, fetch a URL, check system stats, read your allowed Google Docs, and save notes to their own memory — and you SEE every tool call and result inline. Stop halts a turn; a token estimate runs at the bottom. Each agent has editable memory in Configure, and you can build custom agents there too.",
  },
  {
    nav: { kind: "ai" },
    title: "Projects subtab",
    body: "Hit the projects pill at the top. + New project sets a title, end goal, assigned agents, task checklist, preferences, deadline. 'Work session' then drives multi-round autonomous work — agents use tools to push tasks forward and auto-check them off as they finish.",
  },

  // Library
  {
    nav: { kind: "library" },
    selector: '[data-tour="rail-library"]',
    side: "right",
    title: "Library",
    body: "Steam-only now (Modrinth + Blockbench moved to the Control Panel). Auto-detected from your Steam install. Edit any tile: rename it, swap the banner URL, change icon size (S / M / L), pin, hide.",
  },
  {
    nav: { kind: "app", id: "nt5" },
    selector: '[data-tour="rail-app-nt5"]',
    side: "right",
    title: "NT5 · S.P.A.C.E. News",
    body: "The actual NT5 site bundled offline. The Hub runs a background wire scheduler that calls the local model every N minutes (Settings → wire interval) and posts fresh anchor articles into the bundled site.",
  },
  {
    nav: { kind: "app", id: "nt5" },
    title: "Broadcast bar + full studio",
    body: "The bar above the iframe is the on-air feed. Tap ▶ to hear the lead story — if you've connected ElevenLabs and mapped a voice per anchor (Settings → NT5 broadcast), you get a real anchor voice. Otherwise the OS's Web Speech voices, heuristic-matched. ⛶ opens the full studio: caption rail synced to audio, lower-third chyron, live ticker, and optional Pexels B-roll or DigitalBlueprint 3D backdrop.",
  },
  {
    nav: { kind: "app", id: "nt5" },
    title: "Dex's Origin Realms beat",
    body: "Every wire run, we poll mcstatus.io for play.originrealms.com (current players / max / MOTD) and pipe it into the prompt before Dex files. His gaming articles actually reference what's happening on the server right now.",
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
    body: "three.js editor with full PBR materials (metals / glass / glow / sheen / clearcoat), an LLM scene generator, walk-mode (WASD + mouse-look), and a real-time atmosphere panel — sun azimuth + elevation, ambient, sky color.",
  },
  {
    nav: { kind: "app", id: "blueprint" },
    title: "Annotations + scene persistence",
    body: "Each object can carry a title + body in mesh.userData.annotation — they float in 3D space above the object via projected HTML labels. Toggle 'show all labels' or only-on-selection. The whole scene auto-saves to localStorage, so it shows up as a 3D backdrop on the NT5 broadcast if you enable that.",
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
    body: "Strategic-networking CRM. Add targets (creators, devs, communities, mentors…). Pick your active goals (creator collabs / career / startup / community / mentorship / recruitment) and the scoring + LLM drafts weight everything toward what you're actually pursuing.",
  },
  {
    nav: { kind: "app", id: "signalfinder" },
    title: "Research before drafting",
    body: "Hit Research on any target to pull a quick web snippet (DuckDuckGo HTML, no key) and pin it as visible context. The draft outreach prompt is required to reference ONE concrete thing from that research instead of inventing specifics. Style adapts per target — every responded outreach shifts the personalization engine.",
  },
  {
    nav: { kind: "settings" },
    selector: '[data-tour="rail-settings"]',
    side: "right",
    title: "Settings",
    body: "A left-nav of sections grouped into You / Look & Feel / Apps / System / Access. Almost everything the Hub does is configurable here.",
  },
  {
    nav: { kind: "settings" },
    selector: '[data-tour="settings-sec-profile"]',
    side: "right",
    title: "Profile (in-tab)",
    body: "This is YOU. Set your avatar, name, pronouns, location, timezone, birthday, a short bio, your interests and your stack. Every one of these is fed to the AIs as context — so BroBot, the NT5 wire, SignalFinder drafts and Tom all actually know who they're talking to.",
  },
  {
    nav: { kind: "settings" },
    selector: '[data-tour="settings-sec-appearance"]',
    side: "right",
    title: "Appearance (in-tab)",
    body: "18 themes, each with an animated vibe (ember, neon grid, starfield, matrix rain, vaporwave, aurora, gold shimmer…). Plus font size, accent intensity, reduce-motion, compact density, and rail labels.",
  },
  {
    nav: { kind: "settings" },
    selector: '[data-tour="settings-sec-music"]',
    side: "right",
    title: "Music / OST (in-tab)",
    body: "A full player — 30 procedurally-synthesized tracks across wildly different genres (lo-fi, drum & bass, trance, chiptune, funk, choral ambient, dub, western, vaporwave). Click any track, filter by genre, set the volume and your startup default. There's a mini player in the bottom ticker too.",
  },
  {
    nav: { kind: "settings" },
    selector: '[data-tour="settings-sec-dev-codes"]',
    side: "right",
    title: "Dev codes (in-tab)",
    body: "Some apps are hidden by default. Enter 2089 to unlock HALOS + BroBot, or 2078 for MoreMe + DigitalBlueprint. NT5 News and SignalFinder are always visible.",
  },
  {
    nav: { kind: "browser" },
    selector: '[data-tour="floating-info"]',
    side: "left",
    title: "Floating info",
    body: "Toggleable cards that rotate: NT5 Breaking + Filed, Origin Realms live pulse, system pulse, a live clock (in your timezone), More Me streak, GitHub PRs, Vercel deploys, crew chatter. Right-click to dismiss; turn each on/off in Settings → On-screen info.",
  },
  {
    title: "That's the tour",
    body: "Open me any time from the ? button (bottom-left) and ask anything — I run on the local brain and only answer from what's actually in the Hub. Drop ideas in the Feedback tab; Davis reads them. Have fun.",
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
  const W = 400, H = 210, M = 18;
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
      <div style={{ fontSize: 16, color: "#fff", fontWeight: 700, marginBottom: 7 }}>{step.title}</div>
      <div style={{ fontSize: 14, color: "#d7dde6", lineHeight: 1.6 }}>{step.body}</div>
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
