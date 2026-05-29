import { useEffect, useRef, useState } from "react";
import { houseChat, llmStatus } from "../houseLLM";
import { getData, setData, whoAmI, cloudConfigured } from "../embedded/haloscloud";
import { TOUR_STEPS, TourOverlay } from "./TourOverlay";

// Tutorial Tom — app-wide guide. A real guided tour (highlight + Prev/Next),
// Q&A about the app powered by the bundled local model, and a shared feedback
// feed everyone can see.

const APP_GUIDE =
  "You are Tutorial Tom, the friendly in-app guide for NetworkChuck Hub — a dark, " +
  "glowing-red desktop command center. Answer questions about the app concisely and " +
  "help users find things. What the app contains: " +
  "LEFT RAIL — Browser (the default canvas; tabs that survive restarts, address bar " +
  "with bookmarks, extensions dropdown, more-menu for History/Downloads/Passwords/" +
  "TabGroups; configurable search engine + home page). Control Panel (connect your " +
  "own services: GitHub, Vercel, Supabase, Cloudflare, Tailscale, Twingate, n8n, " +
  "YouTube, Home Assistant, Proxmox, Portainer, Pi-hole, Frigate, ZimaCube, Hermes, " +
  "Hostinger; tokens encrypted on-device via OS keychain). Terminal (real Windows " +
  "PowerShell via node-pty). AI Group Chat (BroBot + NT5 anchors run on the bundled " +
  "local model and are always on call; outside crew — Claude, Gemini, Codex, " +
  "OpenCode, Hermes — connect via their CLI tools in Configure). Library (Steam " +
  "auto-detect + Modrinth + Blockbench). " +
  "EMBEDDED APPS (all real, bundled offline): MoreMe (DP-mint daily checklist + " +
  "calendar), SignalFinder (opportunity-scoring CRM), NT5 (S.P.A.C.E. News carbon " +
  "copy with an in-app wire scheduler that posts fresh anchor articles into the " +
  "bundled site every few minutes), HALOS (telemetry + alien codex + stocks + " +
  "roster, Polar Cosmos Crew renamed), DigitalBlueprint (three.js editor + PBR " +
  "materials + house-model scene generator), BroBot (the real BroBot app, " +
  "windowed in, running on the same local brain BroBot uses in the group chat). " +
  "Plus floating info widgets (NT5 breaking, Origin Realms server pulse), a " +
  "bottom ticker + notifications, OST player, accounts via Supabase, and feedback " +
  "in Tom's Feedback tab. Keep answers short and practical.";

type FeedbackItem = { id: string; author: string; text: string; ts: number };
const FKEY = "hub:feedback";

export function TutorialTom() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"tour" | "ask" | "feedback">("tour");
  const [q, setQ] = useState("");
  const [thread, setThread] = useState<{ who: "you" | "tom"; text: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [fbText, setFbText] = useState("");
  const [tourStep, setTourStep] = useState<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && tab === "feedback" && cloudConfigured()) {
      void getData<FeedbackItem[]>(FKEY, []).then(setFeedback);
    }
  }, [open, tab]);

  async function ask() {
    const text = q.trim();
    if (!text || busy) return;
    setQ("");
    setThread((t) => [...t, { who: "you", text }]);
    setBusy(true);
    const st = await llmStatus();
    if (!st.ready) {
      setThread((t) => [...t, { who: "tom", text: "One sec — setting up my brain (a local model, ~2 GB) the first time. I'll answer as soon as it's ready, then it's instant and offline forever." }]);
    }
    const res = await houseChat(APP_GUIDE, text);
    setBusy(false);
    setThread((t) => [...t, { who: "tom", text: res.ok ? res.text || "(no answer)" : `[model error] ${res.error}` }]);
    queueMicrotask(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight }));
  }

  async function submitFeedback() {
    const text = fbText.trim();
    if (!text) return;
    setFbText("");
    if (!cloudConfigured()) return;
    const next = [{ id: String(Date.now()), author: whoAmI(), text, ts: Date.now() }, ...feedback].slice(0, 200);
    setFeedback(next);
    await setData(FKEY, next);
  }

  function startTour() { setOpen(false); setTourStep(0); }
  function endTour() { setTourStep(null); }
  function nextStep() {
    setTourStep((n) => {
      if (n == null) return null;
      if (n >= TOUR_STEPS.length - 1) return null;
      return n + 1;
    });
  }
  function prevStep() { setTourStep((n) => (n == null ? null : Math.max(0, n - 1))); }

  return (
    <>
      <button
        data-tour="tom-button"
        onClick={() => setOpen((o) => !o)}
        title="Tutorial Tom"
        style={{ position: "fixed", left: 74, bottom: 38, zIndex: 10000, width: 44, height: 44, borderRadius: "50%", border: "1px solid rgba(255,87,119,0.6)", background: "#111114", color: "var(--pink)", cursor: "pointer", boxShadow: "0 0 16px rgba(255,51,85,0.4)", fontFamily: "ui-monospace, monospace", fontWeight: 900 }}
      >
        ?
      </button>

      {open && (
        <div className="panel" style={{ position: "fixed", left: 74, bottom: 92, zIndex: 10000, width: 380, maxWidth: "85vw", height: 460, maxHeight: "75vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div className="mono" style={{ padding: "10px 12px", borderBottom: "1px solid var(--line)", fontSize: 12, letterSpacing: 1, color: "var(--mute)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Tutorial Tom</span>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "var(--mute)", cursor: "pointer" }}>✕</button>
          </div>
          <div style={{ display: "flex", gap: 6, padding: 8, borderBottom: "1px solid var(--line)" }}>
            {(["tour", "ask", "feedback"] as const).map((t) => (
              <button key={t} className="btn" style={{ flex: 1, justifyContent: "center", padding: "4px 6px", color: tab === t ? "var(--pink)" : undefined, borderColor: tab === t ? "rgba(255,87,119,0.6)" : undefined }} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>

          {tab === "tour" && (
            <div style={{ flex: 1, overflow: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontSize: 13, color: "var(--ink)", marginTop: 0, lineHeight: 1.5 }}>
                Hi — I&apos;m Tom. I&apos;ll walk you around the app: one step at a time,
                highlighting whatever I&apos;m talking about, with <em>Next</em> / <em>Back</em>
                to control the pace.
              </p>
              <button className="btn" style={{ color: "var(--pink)", borderColor: "rgba(255,87,119,0.6)" }} onClick={startTour}>
                Start the guided tour →
              </button>
              <div style={{ fontSize: 11, color: "var(--mute)", marginTop: 6 }}>
                {TOUR_STEPS.length} steps. Press → / Enter for next, ← for back, Esc to stop.
              </div>
            </div>
          )}

          {tab === "ask" && (
            <>
              <div ref={scroller} style={{ flex: 1, overflow: "auto", padding: 12 }}>
                {thread.length === 0 && <div style={{ fontSize: 12, color: "var(--mute)" }}>Ask me anything about the app.</div>}
                {thread.map((m, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <span className="mono" style={{ fontSize: 10, color: m.who === "you" ? "var(--orange)" : "var(--pink)" }}>{m.who === "you" ? "you" : "Tom"}</span>
                    <div style={{ fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.45 }}>{m.text}</div>
                  </div>
                ))}
                {busy && <div style={{ fontSize: 12, color: "var(--mute)" }}>Tom is thinking…</div>}
              </div>
              <div style={{ display: "flex", gap: 6, padding: 8, borderTop: "1px solid var(--line)" }}>
                <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void ask()} placeholder="ask about the app…" style={fld} />
                <button className="btn" onClick={() => void ask()}>Ask</button>
              </div>
            </>
          )}

          {tab === "feedback" && (
            <>
              <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
                <div style={{ fontSize: 12, color: "var(--mute)", marginBottom: 8 }}>Suggestions everyone can see — Davis reviews these for the app.</div>
                {feedback.length === 0 && <div style={{ fontSize: 12, color: "var(--mute)" }}>No feedback yet. Be the first.</div>}
                {feedback.map((f) => (
                  <div key={f.id} className="panel" style={{ padding: 8, marginBottom: 8 }}>
                    <div className="mono glow-text" style={{ fontSize: 10 }}>{f.author}</div>
                    <div style={{ fontSize: 13 }}>{f.text}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, padding: 8, borderTop: "1px solid var(--line)" }}>
                <input value={fbText} onChange={(e) => setFbText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void submitFeedback()} placeholder="suggest an idea…" style={fld} />
                <button className="btn" onClick={() => void submitFeedback()}>Post</button>
              </div>
            </>
          )}
        </div>
      )}

      {tourStep !== null && (
        <TourOverlay stepIndex={tourStep} onPrev={prevStep} onNext={nextStep} onSkip={endTour} />
      )}
    </>
  );
}

const fld: React.CSSProperties = {
  flex: 1, background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink)",
  padding: "7px 10px", fontSize: 12, fontFamily: "ui-monospace, monospace", outline: "none",
};
