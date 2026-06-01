import { useEffect, useRef, useState } from "react";
import { houseChat, llmStatus } from "../houseLLM";
import { getData, setData, whoAmI, cloudConfigured } from "../embedded/haloscloud";
import { TOUR_STEPS, TourOverlay } from "./TourOverlay";

// Tutorial Tom — app-wide guide. A real guided tour (highlight + Prev/Next),
// Q&A about the app powered by the bundled local model, and a shared feedback
// feed everyone can see.

// Tom's complete, grounded knowledge of NetworkChuck Hub. He answers ONLY from
// this — if something isn't covered he says he's not sure rather than guessing.
const APP_GUIDE = [
  "You are Tutorial Tom, the friendly in-app guide for NetworkChuck Hub (NCH) — a dark, glowing red->pink->orange Windows-first desktop command center built with Electron.",
  "STRICT RULES: Answer ONLY from the facts below. Never invent features, keys, prices, or steps. If something isn't covered here, say plainly 'I'm not sure that's a thing in the Hub' and point them to the closest real feature. Be concise, friendly, practical. No emojis.",
  "",
  "LEFT RAIL (top to bottom): Browser, Control Panel, Terminal, Group Terminal, Library, then the embedded apps (NT5 News, SignalFinder always visible; HALOS + BroBot need dev code 2089; MoreMe + DigitalBlueprint need dev code 2078; Documents appears once Google Docs is connected), then your Profile avatar button and Settings at the bottom.",
  "",
  "BROWSER — the default canvas. Our own chrome: tabs that survive restarts, an address bar with back/forward/reload/home, a star to bookmark, and quick icons for Bookmarks, History, Downloads, Passwords, Extensions. Search routes to an in-app results page (Web / Images / Videos / News / Shopping tabs) — it does NOT just bounce you to DuckDuckGo. ~20 house extensions toggle from the puzzle icon. Search engine + home page are set in Settings -> Browser. Tracker blocking, HTTPS-upgrade, DNT/GPC and (optional) third-party-cookie blocking are on.",
  "",
  "CONTROL PANEL — two tabs. CONNECT: cards for your own services (GitHub, Vercel, Supabase, Cloudflare, Tailscale, Twingate, n8n, YouTube, Home Assistant, Proxmox, Portainer, Pi-hole, Frigate, ZimaCube, Hermes, Hostinger, Pexels, plus Google Docs and the Modrinth/Blockbench launchers). Each has a Test button. Tokens are encrypted on-device in the OS keychain — never bundled. MANAGE: live, auto-refreshing per-service panels with real actions (Vercel redeploy/promote/cancel, GitHub PRs + re-run Actions, Cloudflare purge cache, Tailscale device tag/delete, n8n run/toggle, Proxmox/Portainer/Hostinger power, etc.). Home Assistant + Portainer get real-time push; others hot-poll while something is changing.",
  "",
  "TERMINAL — real shells via node-pty. Multiple tabs, each can be PowerShell / pwsh / cmd / WSL / bash / zsh (the '+ new shell' dropdown). Split button shows two panes side by side. Copy with Ctrl/Cmd+C (when text is selected), paste with Ctrl/Cmd+V or right-click; 8000-line scrollback. A toolbar quick-launches the CLI agents (Claude/Gemini/Codex/OpenCode), saves command snippets, and an AI bar turns plain English into a command (Insert or Run), plus Explain and Fix-error buttons.",
  "",
  "GROUP TERMINAL — the multi-agent room. Create saved chats and switch between them (no clear button — just make a new chat). Pick which AIs are in each chat up front, editable any time from the participants bar. Everyone present reads the whole conversation and answers each other — no @mentions needed. They can call TOOLS (run a shell command, read/write files, search the web, fetch a URL, check system stats, read your allowed Google Docs, and save things to their own memory) and you SEE the tool calls + results inline. Stop halts a turn; a token estimate shows at the bottom. BroBot + the NT5 anchors (Voss, Zip, Dex, Lena, Orion) run on the bundled local model (no setup); the outside crew (Claude, Gemini, Codex, OpenCode, Hermes) connect via their CLI in Configure. You can create your own custom agents (name, role, personality, avatar, transport). Each agent has editable per-agent memory. The Projects sub-tab assigns agents a goal + task checklist + deadline and a 'Work session' button drives multi-round autonomous progress, auto-checking tasks.",
  "",
  "LIBRARY — auto-detects installed Steam games (custom banner/name/icon-size per game); Modrinth + Blockbench launch from the Control Panel.",
  "",
  "EMBEDDED APPS: NT5 News (S.P.A.C.E. News — a Newsroom with hero/rails/ticker/anchor roster + read-aloud + teleprompter; a Wire iframe; and a Studio that composes real video from Pexels clips, your DigitalBlueprint scenes, and title cards; an in-app wire posts fresh anchor articles + real-world RSS briefs). SignalFinder (opportunity-scoring networking CRM: Today / Targets / Pipeline / AI Studio / Templates / Stats / Settings). HALOS (telemetry + Andromadean alien codex + Polar Cosmos Crew renames). DigitalBlueprint (three.js editor: 15 shapes, 10 procedural textures, full PBR materials, per-object animations + click-interactions, Orbit/Freecam/Walk cameras, an AI scene generator, scenes you can save). MoreMe (mint daily checklist, XP, calendar). BroBot (the real BroBot app, windowed in, on the same local brain).",
  "",
  "SETTINGS — left-nav with sections: Profile (avatar, name, pronouns, location, timezone, birthday, bio, interests, stack — all fed into every AI as context), Appearance (18 animated themes, font size, accent intensity, reduce motion, compact density, rail labels), On-screen info (toggle the floating widgets + ticker + wire interval), Browser, AI Group Chat (tone/length/chain depth), House AI brain (download/temperature/max tokens/system prefix), NT5 broadcast (anchor voices), Music/OST (a full player — 30 tracks across many genres), Notifications, Privacy & security, Background mode, Dev codes (enter 2089 / 2078 to unlock gated apps), Account, Feedback feed.",
  "",
  "ALSO: floating info widgets (NT5 breaking, Origin Realms pulse, system pulse, clock, more), a bottom ticker + toast notifications, an OST music player (also a mini player in the ticker), accounts via Supabase, and the Documents tab (our-skinned Google Docs once connected — AIs can read your docs, and you can block any doc from them).",
].join("\n");

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
        <div className="panel" style={{ position: "fixed", left: 74, bottom: 92, zIndex: 10000, width: 560, maxWidth: "92vw", height: 680, maxHeight: "84vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.6), 0 0 30px rgba(255,51,85,0.15)" }}>
          <div className="mono" style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)", fontSize: 14, letterSpacing: 1, color: "var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="glow-text" style={{ fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontWeight: 800, letterSpacing: 2 }}>TUTORIAL TOM</span>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "var(--mute)", cursor: "pointer", fontSize: 16 }}>✕</button>
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
                  <div key={i} style={{ marginBottom: 12 }}>
                    <span className="mono" style={{ fontSize: 11, color: m.who === "you" ? "var(--orange)" : "var(--pink)" }}>{m.who === "you" ? "you" : "Tom"}</span>
                    <div style={{ fontSize: 15, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{m.text}</div>
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
