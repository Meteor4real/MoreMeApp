import { useEffect, useRef, useState } from "react";
import { houseChat, llmStatus } from "../houseLLM";
import { getData, setData, whoAmI, cloudConfigured } from "../embedded/haloscloud";

// Tutorial Tom — app-wide guide. Brief tour of everything, Q&A about the app
// (via Claude, with full app knowledge baked in), and a shared feedback feed
// everyone can see.

const APP_GUIDE =
  "You are Tutorial Tom, the friendly in-app guide for NetworkChuck Hub — a dark, " +
  "glowing-red desktop command center. Answer questions about the app concisely and " +
  "help users find things. What the app contains: " +
  "LEFT RAIL — Control Panel (connect your own services: GitHub, Vercel, Supabase, " +
  "Cloudflare, Tailscale, Twingate, n8n, YouTube, Home Assistant, Proxmox, Portainer, " +
  "Pi-hole, Frigate, ZimaCube, Hermes, Hostinger; tokens are stored encrypted on-device; " +
  "GitHub/Vercel/Cloudflare/Tailscale/n8n show live data). Terminal (real Windows " +
  "PowerShell). AI Group Chat (Hermes the co-boss + Claude/Gemini/Codex; @mention an " +
  "agent like @Claude or @Everyone; NT5 anchors and BroBot are on-call bots you @mention " +
  "by name; configure keys under Configure). Browser (tabbed, sandboxed, tracker-blocking, " +
  "HTTPS-upgrade) with ~20 silly house Extensions. Library (launch your Steam games, " +
  "Modrinth, Blockbench). " +
  "EMBEDDED APPS — MoreMe (daily time-blocked checklist driven by a year Calendar of " +
  "weekends/vacation/exam/travel/events; XP/levels/tiers/streak). SignalFinder (opportunity " +
  "CRM that scores targets and drafts outreach). NT5 (always-on sci-fi news wire driven by " +
  "your topics). HALOS (Azulbright telemetry, alien Andromadean codex, Stocks, Roster, and " +
  "realtime Chat/Projects/Workspace/Meet). DigitalBlueprint (3D editor with Blender-grade " +
  "materials + an AI scene generator). BroBot (image gallery + search). " +
  "There's a bottom ticker + notifications, an OST player, accounts (sign in), and you can " +
  "leave feedback in Tom's Feedback tab. Keep answers short and practical.";

const TOUR: { area: string; text: string }[] = [
  { area: "Control Panel", text: "Front-and-center. Connect your own services — tokens are encrypted on your device. GitHub/Vercel/Cloudflare/Tailscale/n8n show live data with 'Load live'." },
  { area: "Terminal", text: "A real Windows PowerShell, right in the app." },
  { area: "AI Group Chat", text: "Talk to the crew. @mention who answers — @Claude, @Hermes, or @Everyone. NT5 anchors + BroBot are @mentioned by name. Add keys under Configure." },
  { area: "Browser + Extensions", text: "Tabs, any site, DuckDuckGo-grade privacy. Toggle ~20 deliberately-silly house extensions." },
  { area: "Library", text: "Launch your Steam games (auto-detected), Modrinth, and Blockbench." },
  { area: "Your apps (rail)", text: "MoreMe, SignalFinder, NT5, HALOS, DigitalBlueprint, BroBot — embedded right here, not just links." },
  { area: "Bottom bar", text: "An OST player + a live ticker of news/gallery/reminders. Toasts pop in for fresh items." },
];

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

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Tutorial Tom"
        style={{ position: "fixed", left: 74, bottom: 38, zIndex: 10000, width: 44, height: 44, borderRadius: "50%", border: "1px solid rgba(255,87,119,0.6)", background: "#111114", color: "var(--pink)", cursor: "pointer", boxShadow: "0 0 16px rgba(255,51,85,0.4)", fontFamily: "ui-monospace, monospace", fontWeight: 900 }}
      >
        ?
      </button>

      {open && (
        <div className="panel" style={{ position: "fixed", left: 74, bottom: 92, zIndex: 10000, width: 380, maxWidth: "85vw", height: 460, maxHeight: "75vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div className="mono" style={{ padding: "10px 12px", borderBottom: "1px solid var(--line)", fontSize: 12, letterSpacing: 1, color: "var(--mute)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Tutorial Tom <span className="glow-text">· your guide</span></span>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "var(--mute)", cursor: "pointer" }}>✕</button>
          </div>
          <div style={{ display: "flex", gap: 6, padding: 8, borderBottom: "1px solid var(--line)" }}>
            {(["tour", "ask", "feedback"] as const).map((t) => (
              <button key={t} className="btn" style={{ flex: 1, justifyContent: "center", padding: "4px 6px", color: tab === t ? "var(--pink)" : undefined, borderColor: tab === t ? "rgba(255,87,119,0.6)" : undefined }} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>

          {tab === "tour" && (
            <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
              <p style={{ fontSize: 12, color: "var(--mute)", marginTop: 0 }}>Hi — I&apos;m Tom. The quick tour:</p>
              {TOUR.map((s) => (
                <div key={s.area} style={{ marginBottom: 10 }}>
                  <div className="mono glow-text" style={{ fontSize: 12 }}>{s.area}</div>
                  <div style={{ fontSize: 12, color: "var(--mute)", lineHeight: 1.45 }}>{s.text}</div>
                </div>
              ))}
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
    </>
  );
}

const fld: React.CSSProperties = {
  flex: 1, background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink)",
  padding: "7px 10px", fontSize: 12, fontFamily: "ui-monospace, monospace", outline: "none",
};
