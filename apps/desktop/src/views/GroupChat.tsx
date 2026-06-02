import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AGENTS, type AgentDef, agentAvailable, effectiveTransport } from "../ai/agents";
import { appUnlocked, subscribeCodes } from "../featureGate";
import { loadPrefs, subscribePrefs } from "../uiPrefs";
import { loadCustomAgents, saveCustomAgents, subscribeCustomAgents, makeCustomAgent, agentColor, type CustomAgent } from "../ai/customAgents";
import { loadConfig, saveConfig, type ConfigMap, type AgentConfig } from "../ai/store";
import {
  loadChats, saveChats, subscribeChats, newChat, estimateTokens,
  type ChatSession, type ChatMsg,
} from "../ai/chatSessions";
import { toolsPromptBlock, parseToolCall, runTool, agentMemory, setAgentMemory } from "../ai/agentTools";
import { pushMemory, getHermesState, hermesChat, subscribeHermes } from "../ai/hermes";
import { goto as navTo } from "../navBridge";
import { ProjectsView } from "./groupchat/Projects";

// The Group Terminal — the Hub's multi-agent room. Multiple saved chats you
// switch between (no clear button), each with its own participant set picked
// up front and editable any time. The crew sees the full transcript and
// answers each other in a round-table; you can stop a turn mid-flight and
// watch the running token estimate.

const mono = (n: string) => n.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase();
const PROVIDERS = ["anthropic", "openai", "gemini", "http"] as const;
let mid = 1;
function nextId() { return String(mid++) + "-" + Math.random().toString(36).slice(2, 6); }

type View = "chat" | "config" | "projects";

export function GroupChat() {
  const [cfg, setCfg] = useState<ConfigMap>(() => loadConfig());
  const [chats, setChats] = useState<ChatSession[]>(loadChats);
  const [activeId, setActiveId] = useState<string | null>(() => loadChats()[0]?.id ?? null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [view, setView] = useState<View>("chat");
  const [houseReady, setHouseReady] = useState(false);
  const [hermesConfigured, setHermesConfigured] = useState(getHermesState().configured);
  const [, setHermesTick] = useState(0); // re-render when Hermes state changes
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => subscribeHermes((s) => { setHermesConfigured(s.configured); setHermesTick((n) => n + 1); }), []);
  const [prefs, setPrefs] = useState(loadPrefs);
  const [customAgents, setCustomAgents] = useState<CustomAgent[]>(loadCustomAgents);
  const [editingParticipants, setEditingParticipants] = useState(false);
  const [creating, setCreating] = useState(false);
  const [mode, setMode] = useState<"round" | "debate">("round");
  const stopRef = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => subscribePrefs(setPrefs), []);
  useEffect(() => subscribeCustomAgents(setCustomAgents), []);
  useEffect(() => subscribeChats(setChats), []);
  const [, setCodeTick] = useState(0);
  useEffect(() => subscribeCodes(() => setCodeTick((n) => n + 1)), []);

  const ROSTER = useMemo<AgentDef[]>(() => [...AGENTS, ...customAgents], [customAgents]);
  const gated = useMemo(() => ROSTER.filter((a) => appUnlocked(a.id)), [ROSTER]);

  // House-model availability gates the "ready" dot.
  useEffect(() => {
    let cancelled = false;
    async function tick() { try { const s = await window.hub.llm.status(); if (!cancelled) setHouseReady(!!s.ready); } catch { /* ignore */ } }
    void tick(); const t = setInterval(tick, 4000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const active = chats.find((c) => c.id === activeId) || null;

  useEffect(() => {
    if (!prefs.chatAutoScroll) return;
    const el = scroller.current; if (el) el.scrollTop = el.scrollHeight;
  }, [active?.msgs.length, busy, prefs.chatAutoScroll]);

  // ── chat persistence helpers ──────────────────────────────────────────────
  function persist(next: ChatSession[]) { setChats(next); saveChats(next); }
  function patchActive(patch: Partial<ChatSession>) {
    if (!active) return;
    persist(chats.map((c) => (c.id === active.id ? { ...c, ...patch, updatedAt: Date.now() } : c)));
  }
  function pushMsg(m: Omit<ChatMsg, "id" | "ts">) {
    if (!activeId) return;
    setChats((prev) => {
      const next = prev.map((c) => c.id === activeId
        ? { ...c, msgs: [...c.msgs, { ...m, id: nextId(), ts: Date.now(), tokens: estimateTokens(m.content) }], updatedAt: Date.now() }
        : c);
      saveChats(next);
      return next;
    });
    // Pipe user/agent messages into the shared memory pool. Tool calls and
    // system messages stay local — Hermes doesn't need the noise.
    if (m.kind === "user" || m.kind === "agent") {
      pushMemory({ agent: m.agentId || "unknown", fact: m.content, source: "chat" });
    }
  }
  function createChat(participantIds: string[]) {
    const c = newChat(participantIds, "Chat " + (chats.length + 1));
    persist([c, ...chats]);
    setActiveId(c.id);
    setCreating(false);
    setView("chat");
  }
  function deleteChat(id: string) {
    const next = chats.filter((c) => c.id !== id);
    persist(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
  }

  // Snapshot of the active chat's messages (for transcript building mid-turn).
  const snapRef = useRef<ChatMsg[]>([]);
  snapRef.current = active?.msgs ?? [];

  function transcript(): string {
    return snapRef.current.filter((m) => m.kind !== "system").map((m) => `${m.name}: ${m.content}`).join("\n");
  }
  const totalTokens = useMemo(() => (active?.msgs ?? []).reduce((s, m) => s + (m.tokens ?? 0), 0), [active?.msgs]);

  // Low-level model call for an agent (no tool handling, no push).
  async function runModel(a: AgentDef, system: string, userContent: string): Promise<string> {
    const c = cfg[a.id];
    const t = effectiveTransport(a, c);
    let res: { ok: boolean; text?: string; error?: string };
    // Hermes is the spine: always route through the user's Hermes URL when
    // configured, regardless of the agent's stored transport. Falls back to
    // the bundled local model so the crew degrades cleanly instead of dying.
    if (a.id === "hermes" && getHermesState().configured) {
      res = await hermesChat(system, [{ role: "user", content: userContent }]);
      if (!res.ok) res = await window.hub.llm.chat(system + "\n\n(Hermes was unreachable — answering from the bundled fallback.)", userContent, { temperature: prefs.llmTemperature, maxTokens: prefs.llmMaxTokens });
    } else if (t === "house") res = await window.hub.llm.chat(system, userContent, { temperature: prefs.llmTemperature, maxTokens: prefs.llmMaxTokens });
    else if (t === "cli") res = await window.hub.agentRun(c?.cmd || a.defaultCmd || "", `${system}\n\n${userContent}`);
    else res = await window.hub.aiChat({ provider: c?.provider ?? a.defaultProvider, endpoint: c?.endpoint, apiKey: c?.apiKey, model: c?.model || a.defaultModel, system, messages: [{ role: "user", content: userContent }] });
    return res.ok ? (res.text || "(no output)") : `[${a.name} couldn't reach their tool: ${res.error}]`;
  }

  function baseSystem(a: AgentDef): string {
    const participants = (active?.participantIds ?? []).map((id) => ROSTER.find((x) => x.id === id)?.name).filter(Boolean) as string[];
    const toneHint = { casual: "Casual, friendly.", professional: "Professional, precise.", hype: "Energetic.", short: "Extremely terse." }[prefs.chatDefaultTone];
    const lenHint = { short: "1-2 sentences.", medium: "One short paragraph.", long: "A few paragraphs if needed." }[prefs.chatResponseLength];
    const mem = agentMemory(a.id);
    const memBlock = mem.length ? `\n\nYour saved memory (things you chose to remember):\n${mem.map((m) => "- " + m).join("\n")}` : "";
    return (
      a.system +
      `\n\nYou are in the Group Terminal. The operator is ${prefs.ownerName || "Meteor"} (the boss). Other crew present: ${participants.filter((n) => n !== a.name).join(", ") || "none"}.` +
      `\nRead the whole conversation. You CAN and SHOULD respond to your colleagues directly, by name. Build on or push back — don't just repeat them.` +
      `\nGround every claim. If you do not actually know something, say so — never invent facts, numbers, URLs, names, or quotes. Use a tool to check instead of guessing.` +
      `\nRespond ONLY as ${a.name}. No name prefix, no other people's lines. ${toneHint} ${lenHint}` +
      memBlock +
      `\n\n${toolsPromptBlock()}`
    );
  }

  // ── one agent's turn, with a bounded tool-use loop ─────────────────────────
  async function callAgent(a: AgentDef, directive: string): Promise<string> {
    const system = baseSystem(a);
    let convo = transcript();
    let userContent = (convo ? `Conversation so far:\n${convo}\n\n` : "") + directive;
    let finalText = "";
    const MAX_TOOLS = 4;
    for (let step = 0; step <= MAX_TOOLS; step++) {
      if (stopRef.current) break;
      const out = await runModel(a, system, userContent);
      const call = step < MAX_TOOLS ? parseToolCall(out) : null;
      if (!call) { finalText = out; break; }
      // Show the tool call, run it, show the result, feed it back.
      pushMsg({ agentId: a.id, name: a.name, kind: "tool", content: `▸ ${call.tool}(${JSON.stringify(call.args)})` });
      setBusy(`${a.name} · ${call.tool}`);
      const result = await runTool(call.tool, call.args, { agentId: a.id });
      pushMsg({ agentId: "tool", name: call.tool, kind: "tool", content: (result.ok ? "" : "[error] ") + result.output.slice(0, 4000) });
      setBusy(a.name);
      convo = transcript();
      userContent = `Conversation so far:\n${convo}\n\nThe ${call.tool} tool returned the result shown above. Now give your actual reply to the crew as ${a.name} (or call another tool if you still need to).`;
    }
    if (finalText) pushMsg({ agentId: a.id, name: a.name, kind: "agent", content: finalText });
    return finalText;
  }

  // ── the round-table ───────────────────────────────────────────────────────
  async function send() {
    const task = input.trim();
    if (!task || busy || !active) return;
    if (task.startsWith("/") && handleSlash(task)) { setInput(""); return; }
    setInput("");
    stopRef.current = false;
    pushMsg({ agentId: "meteor", name: prefs.ownerName || "Meteor", kind: "user", content: task });

    // Resolve who's actually able to answer (participants ∩ available).
    const present = (active.participantIds.map((id) => gated.find((a) => a.id === id)).filter(Boolean) as AgentDef[])
      .filter((a) => agentAvailable(a, cfg[a.id], houseReady));
    if (present.length === 0) {
      pushMsg({ agentId: "system", name: "Group Terminal", kind: "system", content: "Nobody in this chat can answer right now. Add agents (the people icon) or connect them in Configure." });
      return;
    }

    try {
      if (mode === "debate") {
        await runDebate(present, task);
      } else {
        // Round 1 — coordinator (if present) leads, then everyone responds once,
        // each seeing the messages posted before them this turn.
        const coordinator = present.find((a) => a.coordinator);
        const order = coordinator ? [coordinator, ...present.filter((a) => a !== coordinator)] : present;
        for (const a of order) {
          if (stopRef.current) break;
          setBusy(a.name);
          await callAgent(a, `Meteor's message: ${task}\n\nRespond as ${a.name}.`);
        }
        // Cross-talk rounds — the crew reacts to each other. Each may PASS.
        const extraRounds = Math.max(0, prefs.chatChainDepth - 1);
        for (let r = 0; r < extraRounds && !stopRef.current; r++) {
          let anyone = false;
          for (const a of present) {
            if (stopRef.current) break;
            setBusy(a.name);
            const reply = await callAgentMaybePass(a);
            if (reply) anyone = true;
          }
          if (!anyone) break; // everyone passed — conversation has settled
        }
      }
    } finally {
      setBusy(null);
      stopRef.current = false;
    }
  }

  // ── debate mode ────────────────────────────────────────────────────────────
  // Structured: assigned sides → opening statements → two rebuttal rounds →
  // a neutral synthesis. The crew genuinely argues instead of agreeing.
  async function runDebate(present: AgentDef[], topic: string) {
    if (present.length < 2) {
      pushMsg({ agentId: "system", name: "Group Terminal", kind: "system", content: "Debate needs at least 2 participants. Add more with the people icon." });
      return;
    }
    // Split the room: alternating FOR / AGAINST. A coordinator (if present) is
    // held back to moderate + synthesize at the end.
    const moderator = present.find((a) => a.coordinator) || null;
    const debaters = present.filter((a) => a !== moderator);
    const sides = debaters.map((a, i) => ({ a, side: i % 2 === 0 ? "FOR" : "AGAINST" as "FOR" | "AGAINST" }));

    pushMsg({ agentId: "system", name: "Debate", kind: "system", content: `Debate on: "${topic}"  ·  ${sides.map((s) => `${s.a.name} (${s.side})`).join(" · ")}${moderator ? `  ·  ${moderator.name} moderating` : ""}` });

    async function speak(a: AgentDef, instruction: string) {
      if (stopRef.current) return;
      setBusy(`${a.name} · debating`);
      const sys = a.system + "\n\nYou are in a structured DEBATE. Argue your assigned position hard but honestly — strongest reasoning, concrete examples, no strawmen. Be punchy (3-5 sentences). No name prefix.";
      const convo = transcript();
      const res = await runRaw(a, sys, `${convo ? `Debate so far:\n${convo}\n\n` : ""}${instruction}`);
      const text = (res || "").trim();
      if (text) pushMsg({ agentId: a.id, name: a.name, kind: "agent", content: text });
    }

    // Opening statements.
    for (const { a, side } of sides) {
      if (stopRef.current) break;
      await speak(a, `Topic: "${topic}". Give your OPENING statement arguing ${side === "FOR" ? "in favor" : "against"}. Make your single strongest case.`);
    }
    // Two rebuttal rounds.
    for (let round = 1; round <= 2 && !stopRef.current; round++) {
      for (const { a, side } of sides) {
        if (stopRef.current) break;
        await speak(a, `Rebuttal round ${round}. Directly counter the strongest point the ${side === "FOR" ? "AGAINST" : "FOR"} side just made — name it and dismantle it. Then add one new argument for your ${side} position.`);
      }
    }
    // Synthesis.
    if (!stopRef.current) {
      const judge = moderator || sides[0].a;
      setBusy(`${judge.name} · synthesizing`);
      const sys = judge.system + "\n\nThe debate is over. As a NEUTRAL judge, synthesize: the strongest point each side made, where they actually agree, and your honest verdict + the key tradeoff the decision really hinges on. No name prefix.";
      const res = await runRaw(judge, sys, `Debate transcript:\n${transcript()}\n\nGive your synthesis and verdict on: "${topic}".`);
      if (res?.trim()) pushMsg({ agentId: judge.id, name: `${judge.name} · verdict`, kind: "agent", content: res.trim() });
    }
  }

  // Raw single-shot model call for an agent (no tool loop) — used by debate.
  async function runRaw(a: AgentDef, system: string, userContent: string): Promise<string> {
    const c = cfg[a.id];
    const t = effectiveTransport(a, c);
    let res: { ok: boolean; text?: string; error?: string };
    if (a.id === "hermes" && getHermesState().configured) {
      res = await hermesChat(system, [{ role: "user", content: userContent }]);
      if (!res.ok) res = await window.hub.llm.chat(system, userContent, { temperature: prefs.llmTemperature, maxTokens: prefs.llmMaxTokens });
    } else if (t === "house") res = await window.hub.llm.chat(system, userContent, { temperature: prefs.llmTemperature, maxTokens: prefs.llmMaxTokens });
    else if (t === "cli") res = await window.hub.agentRun(c?.cmd || a.defaultCmd || "", `${system}\n\n${userContent}`);
    else res = await window.hub.aiChat({ provider: c?.provider ?? a.defaultProvider, endpoint: c?.endpoint, apiKey: c?.apiKey, model: c?.model || a.defaultModel, system, messages: [{ role: "user", content: userContent }] });
    return res.ok ? (res.text || "") : `[model error] ${res.error}`;
  }

  // Cross-talk turn: the agent may decline with PASS, in which case we don't
  // post a message. Keeps the round-table from padding the log with filler.
  async function callAgentMaybePass(a: AgentDef): Promise<boolean> {
    const participants = (active?.participantIds ?? []).map((id) => ROSTER.find((x) => x.id === id)?.name).filter(Boolean) as string[];
    const system = a.system +
      `\n\nGroup Terminal cross-talk. Crew: ${participants.filter((n) => n !== a.name).join(", ")}. ` +
      `Read the latest messages. If a colleague addressed you or you have something genuinely new/important to add, respond directly to them by name. ` +
      `Otherwise reply with exactly: PASS. Never invent facts. Respond only as ${a.name}, no name prefix.`;
    const convo = transcript();
    const c = cfg[a.id];
    const t = effectiveTransport(a, c);
    let res: { ok: boolean; text?: string; error?: string };
    const userContent = `Conversation so far:\n${convo}\n\nYour move, ${a.name} (or PASS):`;
    if (a.id === "hermes" && getHermesState().configured) {
      res = await hermesChat(system, [{ role: "user", content: userContent }]);
      if (!res.ok) res = await window.hub.llm.chat(system, userContent, { temperature: prefs.llmTemperature, maxTokens: prefs.llmMaxTokens });
    } else if (t === "house") res = await window.hub.llm.chat(system, userContent, { temperature: prefs.llmTemperature, maxTokens: prefs.llmMaxTokens });
    else if (t === "cli") res = await window.hub.agentRun(c?.cmd || a.defaultCmd || "", `${system}\n\n${userContent}`);
    else res = await window.hub.aiChat({ provider: c?.provider ?? a.defaultProvider, endpoint: c?.endpoint, apiKey: c?.apiKey, model: c?.model || a.defaultModel, system, messages: [{ role: "user", content: userContent }] });
    const text = (res.ok ? (res.text || "") : "").trim();
    if (!text || /^pass\b/i.test(text)) return false;
    pushMsg({ agentId: a.id, name: a.name, kind: "agent", content: text });
    return true;
  }

  function handleSlash(raw: string): boolean {
    const [cmd] = raw.slice(1).split(/\s+/);
    switch (cmd.toLowerCase()) {
      case "who":
        pushMsg({ agentId: "system", name: "Group Terminal", kind: "system", content: "In this chat: " + (active?.participantIds.map((id) => ROSTER.find((a) => a.id === id)?.name).filter(Boolean).join(", ") || "nobody") });
        return true;
      case "help":
        pushMsg({ agentId: "system", name: "Group Terminal", kind: "system", content: "Pick who's in the chat with the participants bar at the top. Everyone present answers and talks to each other — no @mentions needed. /who lists them. Stop halts a turn." });
        return true;
      default: return false;
    }
  }

  // ── render ────────────────────────────────────────────────────────────────
  // Claude.ai-style layout: collapsible sidebar (recent chats) + a centered
  // conversation column. Same shape for Hermes-solo and crew chats — when
  // there's more than one agent we just expand the header strip.
  const hermesState = getHermesState();
  const hermesUnhealthy = !!hermesState.url && (!hermesState.configured || !!hermesState.lastError);
  const soloHermes = !!active && active.participantIds.length === 1 && active.participantIds[0] === "hermes";

  return (
    <div className="stage" style={{ display: "flex", flexDirection: "column", minHeight: 0, background: "#0a0a0c" }}>
      {/* Loud Hermes failure indicator — shown on top of everything when the
          URL is set but the last call failed. Click jumps to setup. */}
      {hermesUnhealthy && (
        <div onClick={() => navTo({ kind: "hermes" })}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", background: "linear-gradient(90deg, rgba(239,68,68,0.18), rgba(239,68,68,0.05))", borderBottom: "1px solid rgba(239,68,68,0.4)", cursor: "pointer", flex: "none" }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 8px #ef4444", animation: "nch-eq 1.2s ease-in-out infinite alternate" }} />
          <span className="mono" style={{ fontSize: 11, letterSpacing: 1.5, color: "#fecaca", textTransform: "uppercase" }}>Hermes unreachable</span>
          <span style={{ fontSize: 12, color: "#fecaca", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            Crew is on the bundled fallback brain. {hermesState.lastError || "Last call failed."}
          </span>
          <span style={{ fontSize: 11, color: "#fecaca", letterSpacing: 1, textTransform: "uppercase" }}>open setup ›</span>
        </div>
      )}

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Recent-chats sidebar (collapsible, Claude.ai style) */}
        {sidebarOpen && (
          <div style={{ width: 260, borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", minHeight: 0, background: "#0d0d11" }}>
            <div style={{ display: "flex", alignItems: "center", padding: 12, gap: 6 }}>
              <button data-tour="gt-newchat" onClick={() => setCreating(true)}
                style={{ flex: 1, padding: "9px 12px", background: "rgba(255,87,119,0.08)", border: "1px solid rgba(255,87,119,0.4)", borderRadius: 8, color: "var(--pink)", cursor: "pointer", fontFamily: "ui-monospace,monospace", fontSize: 12, letterSpacing: 1, textTransform: "uppercase", textAlign: "left" }}>
                <span style={{ marginRight: 6 }}>＋</span> New chat
              </button>
              <button onClick={() => setSidebarOpen(false)} title="Hide sidebar"
                style={{ width: 32, height: 32, background: "transparent", border: "1px solid var(--line)", borderRadius: 8, color: "var(--mute)", cursor: "pointer", fontSize: 14 }}>‹</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 8px" }}>
              {chats.length === 0 && (
                <div style={{ fontSize: 12, color: "var(--mute)", padding: "10px 8px", lineHeight: 1.5 }}>No chats yet. Start one — Hermes is the default voice.</div>
              )}
              {chats.map((c) => {
                const sub = c.participantIds.length === 1 && c.participantIds[0] === "hermes"
                  ? "Hermes"
                  : c.participantIds.map((id) => ROSTER.find((a) => a.id === id)?.name).filter(Boolean).join(", ") || "no agents";
                return (
                  <div key={c.id} onClick={() => { setActiveId(c.id); setView("chat"); }}
                    style={{ padding: "8px 10px", marginBottom: 2, cursor: "pointer", borderRadius: 8,
                      background: c.id === activeId ? "rgba(255,87,119,0.12)" : "transparent",
                      borderLeft: c.id === activeId ? "2px solid var(--pink)" : "2px solid transparent" }}
                    onMouseEnter={(e) => { if (c.id !== activeId) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                    onMouseLeave={(e) => { if (c.id !== activeId) e.currentTarget.style.background = "transparent"; }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input value={c.title} onClick={(e) => e.stopPropagation()}
                        onChange={(e) => persist(chats.map((x) => x.id === c.id ? { ...x, title: e.target.value } : x))}
                        style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", color: c.id === activeId ? "var(--ink)" : "var(--mute)", fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, outline: "none", padding: 0 }} />
                      <span onClick={(e) => { e.stopPropagation(); deleteChat(c.id); }} title="delete"
                        style={{ width: 18, height: 18, display: "grid", placeItems: "center", color: "var(--mute)", cursor: "pointer", opacity: c.id === activeId ? 0.6 : 0, borderRadius: 4, fontSize: 12 }}>✕</span>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--mute)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub} · {c.msgs.length}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ borderTop: "1px solid var(--line)", padding: 8, display: "flex", gap: 4 }}>
              <button className="btn" style={{ flex: 1, fontSize: 11, padding: "6px 10px" }} onClick={() => setView("projects")}>Projects</button>
              <button className="btn" style={{ flex: 1, fontSize: 11, padding: "6px 10px", color: view === "config" ? "var(--pink)" : undefined, borderColor: view === "config" ? "rgba(255,87,119,0.5)" : undefined }} onClick={() => setView(view === "config" ? "chat" : "config")}>{view === "config" ? "Close" : "Crew"}</button>
            </div>
          </div>
        )}

        {/* Main column */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {view === "config" ? (
            <ConfigPanel cfg={cfg} houseReady={houseReady} roster={ROSTER} customAgents={customAgents} onChange={(next) => { setCfg(next); saveConfig(next); }} />
          ) : view === "projects" ? (
            <ProjectsView availableIds={gated.map((a) => a.id)} onBackToChat={() => setView("chat")} />
          ) : creating ? (
            <ParticipantPicker gated={gated} cfg={cfg} houseReady={houseReady} title="Who's in this chat?"
              initial={hermesConfigured ? ["hermes"] : gated.filter((a) => !a.silent && agentAvailable(a, cfg[a.id], houseReady)).map((a) => a.id)}
              onCancel={() => setCreating(false)} onConfirm={createChat} confirmLabel="Create chat" />
          ) : editingParticipants && active ? (
            <ParticipantPicker gated={gated} cfg={cfg} houseReady={houseReady} title="Edit participants"
              initial={active.participantIds}
              onCancel={() => setEditingParticipants(false)}
              onConfirm={(ids) => { patchActive({ participantIds: ids }); setEditingParticipants(false); }} confirmLabel="Save" />
          ) : !active ? (
            <HomeScreen sidebarOpen={sidebarOpen} onOpenSidebar={() => setSidebarOpen(true)} onNewChat={() => setCreating(true)} hermesConfigured={hermesConfigured} onConnectHermes={() => navTo({ kind: "hermes" })} />
          ) : (
            <>
              {/* Slim chat header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderBottom: "1px solid var(--line)", flex: "none", background: "#0a0a0c" }}>
                {!sidebarOpen && (
                  <button onClick={() => setSidebarOpen(true)} title="Show recent chats"
                    style={{ width: 32, height: 32, background: "transparent", border: "1px solid var(--line)", borderRadius: 8, color: "var(--mute)", cursor: "pointer", fontSize: 14 }}>›</button>
                )}
                {soloHermes ? (
                  <>
                    <Avatar agentId="hermes" name="Hermes" roster={ROSTER} small />
                    <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 15, color: "var(--ink)" }}>Hermes</span>
                    <span className="mono" style={{ fontSize: 10, color: hermesConfigured ? "#22c55e" : "var(--mute)", letterSpacing: 1.5, textTransform: "uppercase" }}>{hermesConfigured ? "● live" : "○ fallback"}</span>
                    <span style={{ flex: 1 }} />
                    <button className="btn" style={{ fontSize: 11, padding: "5px 12px" }} onClick={() => setEditingParticipants(true)}>+ Add agent</button>
                  </>
                ) : (
                  <>
                    <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>{active.title || "Chat"}</span>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
                      {active.participantIds.map((id) => {
                        const a = ROSTER.find((x) => x.id === id); if (!a) return null;
                        const ready = agentAvailable(a, cfg[a.id], houseReady);
                        return (
                          <span key={id} title={ready ? "ready" : "not connected / model loading"} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px 2px 3px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)" }}>
                            <Avatar agentId={a.id} name={a.name} roster={ROSTER} small />
                            <span style={{ fontSize: 11, color: "var(--ink)" }}>{a.name}</span>
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: ready ? "#22c55e" : "#f59e0b" }} />
                          </span>
                        );
                      })}
                    </div>
                    <button className="btn" style={{ fontSize: 11, padding: "5px 12px" }} onClick={() => setEditingParticipants(true)}>Edit</button>
                  </>
                )}
              </div>

              {/* Centered conversation column */}
              <div ref={scroller} style={{ flex: 1, minHeight: 0, overflowY: "auto", background: "#0a0a0c" }}>
                <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px 80px" }}>
                  {active.msgs.length === 0 && (
                    <EmptyConversation soloHermes={soloHermes} ownerName={prefs.ownerName} onPrompt={(p) => { setInput(p); }} />
                  )}
                  {active.msgs.map((m) => <Bubble key={m.id} m={m} roster={ROSTER} />)}
                  {busy && (
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
                      <Avatar agentId={busy} name={busy} roster={ROSTER} />
                      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "rgba(255,87,119,0.06)", border: "1px solid var(--line)", borderRadius: 10 }}>
                        <span className="mono" style={{ fontSize: 12, color: "var(--mute)" }}>{busy} is thinking</span>
                        <TypingDots />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Composer (centered, Claude.ai-style pill) */}
              <div style={{ padding: "12px 24px 18px", borderTop: "1px solid var(--line)", background: "#0a0a0c", flex: "none" }}>
                <div style={{ maxWidth: 760, margin: "0 auto" }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 10, padding: "10px 12px", background: "#13131a", border: "1px solid var(--line)", borderRadius: 18, boxShadow: "0 0 24px rgba(255,87,119,0.08)" }}>
                    {!soloHermes && (
                      <div style={{ display: "flex", border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", flex: "none", alignSelf: "stretch" }} title="Round-table: everyone discusses. Debate: assigned sides argue, then a verdict.">
                        {(["round", "debate"] as const).map((m) => (
                          <button key={m} onClick={() => setMode(m)} disabled={!!busy}
                            style={{ padding: "0 12px", fontSize: 10, fontFamily: "ui-monospace,monospace", letterSpacing: 1, textTransform: "uppercase", border: "none", cursor: busy ? "default" : "pointer",
                              background: mode === m ? (m === "debate" ? "rgba(168,85,247,0.18)" : "rgba(255,87,119,0.14)") : "transparent",
                              color: mode === m ? (m === "debate" ? "#c084fc" : "var(--pink)") : "var(--mute)" }}>
                            {m}
                          </button>
                        ))}
                      </div>
                    )}
                    <textarea ref={composerRef} rows={1}
                      style={{ flex: 1, background: "transparent", border: "none", color: "var(--ink)", padding: "8px 4px", fontSize: 14, outline: "none", resize: "none", fontFamily: "'Space Grotesk', system-ui, sans-serif", lineHeight: 1.5, maxHeight: 220 }}
                      placeholder={soloHermes ? `Ask Hermes anything…${hermesConfigured ? "" : " (fallback brain until you connect Hermes)"}` : mode === "debate" ? "Pose a question or proposition for the crew to debate…" : "Message the crew — they all see it and answer each other"}
                      value={input}
                      onChange={(e) => { setInput(e.target.value); const ta = e.currentTarget; ta.style.height = "auto"; ta.style.height = Math.min(220, ta.scrollHeight) + "px"; }}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
                      disabled={!!busy} />
                    {busy
                      ? <button onClick={() => { stopRef.current = true; }} title="Stop"
                          style={{ width: 36, height: 36, borderRadius: 12, border: "none", background: "rgba(239,68,68,0.18)", color: "#ef4444", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>■</button>
                      : <button onClick={() => void send()} disabled={!input.trim()} title="Send"
                          style={{ width: 36, height: 36, borderRadius: 12, border: "none", background: input.trim() ? "linear-gradient(135deg, var(--red), var(--orange))" : "rgba(255,255,255,0.06)", color: "#fff", cursor: input.trim() ? "pointer" : "default", fontSize: 16, opacity: input.trim() ? 1 : 0.4 }}>↑</button>}
                  </div>
                  <div className="mono" style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 9, color: "var(--mute)", letterSpacing: 1 }}>
                    <span>Enter to send · Shift+Enter for newline</span>
                    <span>~{totalTokens.toLocaleString()} tokens · {active.participantIds.length} participant{active.participantIds.length === 1 ? "" : "s"}{busy ? " · working" : ""}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// A landing screen when no chat is active — Claude.ai-style centered hero.
function HomeScreen({ sidebarOpen, onOpenSidebar, onNewChat, hermesConfigured, onConnectHermes }: { sidebarOpen: boolean; onOpenSidebar: () => void; onNewChat: () => void; hermesConfigured: boolean; onConnectHermes: () => void }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: "#0a0a0c" }}>
      {!sidebarOpen && (
        <div style={{ padding: 10, flex: "none" }}>
          <button onClick={onOpenSidebar} style={{ width: 32, height: 32, background: "transparent", border: "1px solid var(--line)", borderRadius: 8, color: "var(--mute)", cursor: "pointer", fontSize: 14 }}>›</button>
        </div>
      )}
      <div style={{ flex: 1, display: "grid", placeItems: "center", padding: 40 }}>
        <div style={{ textAlign: "center", maxWidth: 520 }}>
          <div className="glow-text" style={{ fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: 2, marginBottom: 8 }}>AI Crew</div>
          <p style={{ fontSize: 14, color: "var(--mute)", lineHeight: 1.6, margin: "0 0 24px" }}>
            {hermesConfigured
              ? "Hermes is on call. Start a chat and talk to him directly, or add specialists when you need backup."
              : "Connect Hermes to make him the default voice and curate the crew's shared memory. The bundled fallback brain will fill in until you do."}
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button onClick={onNewChat} style={{ padding: "10px 22px", background: "linear-gradient(135deg, var(--red), var(--orange))", border: "none", borderRadius: 10, color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer", boxShadow: "0 0 18px rgba(255,87,119,0.35)" }}>＋ New chat</button>
            {!hermesConfigured && (
              <button onClick={onConnectHermes} className="btn" style={{ padding: "10px 18px", fontSize: 13 }}>Connect Hermes</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Empty conversation — quick suggested prompts, like Claude.ai's launch state.
function EmptyConversation({ soloHermes, ownerName, onPrompt }: { soloHermes: boolean; ownerName: string; onPrompt: (p: string) => void }) {
  const prompts = soloHermes
    ? [
        "Audit my Command Center — anything firing or unhealthy?",
        "Summarize what I've been working on this week from memory.",
        "Draft a quick runbook for the alert that fired last.",
        "What service should I connect next to get more out of NCH?",
      ]
    : [
        "Plan the next release of NCH end-to-end and split the work.",
        "Debate: should we self-host or pay for the managed version?",
        "Walk me through the failing deploy on Vercel and propose a fix.",
        "Review the last patch — call out anything risky.",
      ];
  return (
    <div style={{ textAlign: "center", padding: "20px 0 40px" }}>
      <div className="glow-text" style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 22, color: "var(--ink)", marginBottom: 6 }}>
        {soloHermes ? `Good to see you${ownerName ? `, ${ownerName.split(/\s+/)[0]}` : ""}.` : "What's the crew working on?"}
      </div>
      <div style={{ fontSize: 13, color: "var(--mute)", marginBottom: 22 }}>
        {soloHermes ? "Hermes has your context, your memory, and your services." : "Everyone in this chat reads the whole conversation."}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxWidth: 620, margin: "0 auto" }}>
        {prompts.map((p) => (
          <button key={p} onClick={() => onPrompt(p)}
            style={{ textAlign: "left", padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--line)", borderRadius: 12, color: "var(--ink)", fontSize: 12.5, lineHeight: 1.45, cursor: "pointer", fontFamily: "'Space Grotesk',sans-serif" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,87,119,0.06)"; e.currentTarget.style.borderColor = "rgba(255,87,119,0.4)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "var(--line)"; }}>
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Participant picker ────────────────────────────────────────────────────
function ParticipantPicker({ gated, cfg, houseReady, title, initial, onCancel, onConfirm, confirmLabel }: {
  gated: AgentDef[]; cfg: ConfigMap; houseReady: boolean; title: string;
  initial: string[]; onCancel: () => void; onConfirm: (ids: string[]) => void; confirmLabel: string;
}) {
  const [sel, setSel] = useState<Set<string>>(new Set(initial));
  function toggle(id: string) { setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  return (
    <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
      <div style={{ fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontWeight: 800, fontSize: 18, color: "var(--ink)", marginBottom: 4 }}>{title}</div>
      <p style={{ fontSize: 12, color: "var(--mute)", marginTop: 0 }}>Pick the AIs for this chat. You can change this any time. Everyone you add reads the conversation and responds to each other.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8, marginTop: 12 }}>
        {gated.map((a) => {
          const on = sel.has(a.id);
          const ready = agentAvailable(a, cfg[a.id], houseReady);
          return (
            <button key={a.id} onClick={() => toggle(a.id)} className={on ? "panel-hot panel" : "panel"}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, textAlign: "left", cursor: "pointer", borderColor: on ? "rgba(255,87,119,0.5)" : undefined, background: on ? "rgba(255,87,119,0.06)" : undefined }}>
              <Avatar agentId={a.id} name={a.name} roster={gated} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="mono" style={{ fontSize: 13, color: "var(--ink)" }}>{a.name}{a.coordinator && <span className="glow-text"> · lead</span>}</div>
                <div style={{ fontSize: 10, color: "var(--mute)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.role}</div>
              </div>
              <span style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${on ? "var(--pink)" : "var(--line)"}`, background: on ? "var(--pink)" : "transparent", display: "grid", placeItems: "center", fontSize: 11, color: "#fff" }}>{on ? "✓" : ""}</span>
              <span title={ready ? "ready" : "not connected"} style={{ width: 7, height: 7, borderRadius: "50%", background: ready ? "#22c55e" : "#f59e0b" }} />
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button className="btn" style={{ color: "var(--pink)", borderColor: "rgba(255,87,119,0.6)" }} onClick={() => onConfirm([...sel])} disabled={sel.size === 0}>{confirmLabel}</button>
        <button className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── Configure panel ─────────────────────────────────────────────────────────
function ConfigPanel({ cfg, houseReady, roster, customAgents, onChange }: {
  cfg: ConfigMap; houseReady: boolean; roster: AgentDef[]; customAgents: CustomAgent[]; onChange: (next: ConfigMap) => void;
}) {
  function update(id: string, patch: Partial<AgentConfig>) {
    const def = roster.find((a) => a.id === id)!;
    const base: AgentConfig = cfg[id] || { enabled: true, transport: def.defaultTransport, cmd: def.defaultCmd || "", provider: def.defaultProvider };
    onChange({ ...cfg, [id]: { ...base, ...patch, enabled: true } });
  }
  return (
    <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
      <p style={{ color: "var(--mute)", fontSize: 13, marginTop: 0, maxWidth: 660 }}>
        BroBot and the NT5 anchors share the bundled house model — always on call, no setup.
        For the outside crew (Claude, Gemini, Codex, OpenCode, Hermes) you launch their CLI;
        the Hub runs the command per message. <code>{"{prompt}"}</code> is replaced by the message.
      </p>
      <CustomAgentCreator customAgents={customAgents} />
      {roster.filter((a) => appUnlocked(a.id)).map((a) => {
        const c = cfg[a.id];
        const transport = c?.transport ?? a.defaultTransport;
        return (
          <div key={a.id} className="panel" style={{ padding: 12, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar agentId={a.id} name={a.name} roster={roster} small />
              <span className="mono" style={{ fontSize: 13 }}>{a.name}</span>
              <span style={{ fontSize: 11, color: "var(--mute)" }}>{a.role}</span>
              <span style={{ marginLeft: "auto", fontSize: 10, color: agentAvailable(a, c, houseReady) ? "var(--pink)" : "var(--mute)" }}>
                {agentAvailable(a, c, houseReady) ? "ON CALL" : a.silent || effectiveTransport(a, c) === "house" ? "MODEL LOADING" : "NEEDS SETUP"}
              </span>
              {(a as CustomAgent).custom && (
                <button className="btn" style={{ fontSize: 10, padding: "3px 8px" }} onClick={() => saveCustomAgents(customAgents.filter((x) => x.id !== a.id))}>remove</button>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, marginTop: 10 }}>
              <Field label="connect via">
                <select value={transport} onChange={(e) => update(a.id, { transport: e.target.value as AgentConfig["transport"] })} style={fieldStyle}>
                  <option value="house">House model (bundled)</option>
                  <option value="cli">Terminal (CLI)</option>
                  <option value="api">API (key)</option>
                </select>
              </Field>
              {transport === "cli" ? (
                <Field label="terminal command"><input style={fieldStyle} value={c?.cmd ?? a.defaultCmd ?? ""} placeholder={a.defaultCmd || 'tool -p "{prompt}"'} onChange={(e) => update(a.id, { cmd: e.target.value })} /></Field>
              ) : transport === "api" ? (
                <>
                  <Field label="provider">
                    <select value={c?.provider ?? a.defaultProvider} onChange={(e) => update(a.id, { provider: e.target.value as AgentConfig["provider"] })} style={fieldStyle}>
                      {PROVIDERS.map((p) => (<option key={p} value={p}>{p}</option>))}
                    </select>
                  </Field>
                  {(c?.provider ?? a.defaultProvider) === "http" ? (
                    <Field label="endpoint"><input style={fieldStyle} value={c?.endpoint || ""} placeholder="https://hermes.yourbox…" onChange={(e) => update(a.id, { endpoint: e.target.value })} /></Field>
                  ) : (
                    <Field label="model"><input style={fieldStyle} value={c?.model || ""} placeholder={a.defaultModel || ""} onChange={(e) => update(a.id, { model: e.target.value })} /></Field>
                  )}
                  <Field label={(c?.provider ?? a.defaultProvider) === "http" ? "bearer (optional)" : "API key"}>
                    <input style={fieldStyle} type="password" value={c?.apiKey || ""} placeholder="•••••••" onChange={(e) => update(a.id, { apiKey: e.target.value })} />
                  </Field>
                </>
              ) : (
                <div style={{ fontSize: 12, color: "var(--mute)", alignSelf: "center" }}>No setup needed — runs on the bundled local model.</div>
              )}
            </div>
            <MemoryEditor agentId={a.id} />
          </div>
        );
      })}
    </div>
  );
}

// Per-agent memory editor — the durable notes an agent keeps (and can append
// to via the `remember` tool). Injected into the agent's system prompt.
function MemoryEditor({ agentId }: { agentId: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => agentMemory(agentId).join("\n"));
  useEffect(() => { if (open) setText(agentMemory(agentId).join("\n")); }, [open, agentId]);
  const count = agentMemory(agentId).length;
  return (
    <div style={{ marginTop: 8 }}>
      <button className="btn" style={{ fontSize: 10, padding: "3px 8px" }} onClick={() => setOpen((o) => !o)}>
        {open ? "hide memory" : `memory (${count})`}
      </button>
      {open && (
        <div style={{ marginTop: 6 }}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="One fact per line. The agent reads these every turn and can add more with the remember tool."
            style={{ ...fieldStyle, minHeight: 70, resize: "vertical" }} />
          <button className="btn" style={{ fontSize: 11, marginTop: 4 }} onClick={() => { setAgentMemory(agentId, text.split("\n")); }}>Save memory</button>
        </div>
      )}
    </div>
  );
}

function CustomAgentCreator({ customAgents }: { customAgents: CustomAgent[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [personality, setPersonality] = useState("");
  const [transport, setTransport] = useState<AgentConfig["transport"]>("house");
  const [model, setModel] = useState("");
  const [cmd, setCmd] = useState("");
  const [color, setColor] = useState("#22d3ee");
  const [silent, setSilent] = useState(false);
  function create() {
    if (!name.trim()) return;
    saveCustomAgents([...customAgents, makeCustomAgent({ name, role, personality, transport: transport ?? "house", model, cmd, color, silent })]);
    setName(""); setRole(""); setPersonality(""); setModel(""); setCmd(""); setSilent(false); setOpen(false);
  }
  if (!open) return <button className="btn" style={{ marginBottom: 12 }} onClick={() => setOpen(true)}>+ Create custom agent</button>;
  return (
    <div className="panel" style={{ padding: 12, marginBottom: 12, border: "1px solid rgba(255,87,119,0.4)" }}>
      <div className="mono glow-text" style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>New custom agent</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
        <Field label="name"><input style={fieldStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sage" /></Field>
        <Field label="role / tagline"><input style={fieldStyle} value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Lore keeper" /></Field>
        <Field label="connect via">
          <select value={transport} onChange={(e) => setTransport(e.target.value as AgentConfig["transport"])} style={fieldStyle}>
            <option value="house">House model (bundled)</option>
            <option value="cli">Terminal (CLI)</option>
            <option value="api">API (key)</option>
          </select>
        </Field>
        {transport === "cli" && <Field label="terminal command"><input style={fieldStyle} value={cmd} onChange={(e) => setCmd(e.target.value)} placeholder='tool -p "{prompt}"' /></Field>}
        {transport === "api" && <Field label="model"><input style={fieldStyle} value={model} onChange={(e) => setModel(e.target.value)} placeholder="model id" /></Field>}
        <Field label="avatar color"><input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ ...fieldStyle, padding: 2, height: 32 }} /></Field>
      </div>
      <Field label="personality / system prompt">
        <textarea style={{ ...fieldStyle, minHeight: 70, resize: "vertical" }} value={personality} onChange={(e) => setPersonality(e.target.value)}
          placeholder="Who is this agent? Voice, expertise, quirks." />
      </Field>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--ink)", margin: "6px 0" }}>
        <input type="checkbox" checked={silent} onChange={(e) => setSilent(e.target.checked)} />
        Off by default in new chats (you can still add them per chat)
      </label>
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn" onClick={create}>Create</button>
        <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 6,
  color: "var(--ink)", padding: "6px 8px", fontSize: 12, width: "100%", fontFamily: "ui-monospace, monospace",
};
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label style={{ fontSize: 10, color: "var(--mute)", textTransform: "uppercase", letterSpacing: 1 }}>{label}<div style={{ marginTop: 4 }}>{children}</div></label>;
}

// ── Message bubble + avatar + typing ────────────────────────────────────────
function Avatar({ agentId, name, roster, small }: { agentId: string; name: string; roster: AgentDef[]; small?: boolean }) {
  const a = roster.find((x) => x.id === agentId) as (AgentDef & { color?: string; avatar?: string }) | undefined;
  const isUser = agentId === "meteor";
  const sz = small ? 22 : 30;
  const color = isUser ? "var(--orange)" : a ? agentColor(a) : "#9ca3af";
  const initials = (name || "?").replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "?";
  if (a?.avatar) return <span style={{ width: sz, height: sz, borderRadius: "50%", flexShrink: 0, background: `center/cover no-repeat url("${a.avatar}")`, boxShadow: `0 0 8px ${color}66` }} />;
  return (
    <span style={{ width: sz, height: sz, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center",
      background: isUser ? "linear-gradient(135deg, var(--red), var(--orange))" : `linear-gradient(135deg, ${color}, #0a0820)`,
      color: "#fff", fontFamily: "ui-monospace,monospace", fontSize: small ? 9 : 11, fontWeight: 700, boxShadow: `0 0 8px ${color}55` }}>{initials}</span>
  );
}
function TypingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 3 }}>
      {[0, 1, 2].map((i) => <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--pink)", animation: `gcblink 1.2s ${i * 0.18}s infinite` }} />)}
      <style>{`@keyframes gcblink { 0%,80%,100% { opacity: 0.25; } 40% { opacity: 1; } }`}</style>
    </span>
  );
}
function Bubble({ m, roster }: { m: ChatMsg; roster: AgentDef[] }) {
  if (m.kind === "system") {
    return <div style={{ textAlign: "center", margin: "10px 0" }}><span className="mono" style={{ fontSize: 11, color: "var(--mute)", background: "rgba(255,255,255,0.04)", padding: "4px 12px", borderRadius: 20 }}>{m.content}</span></div>;
  }
  if (m.kind === "tool") {
    const isCall = m.content.startsWith("▸");
    return (
      <div style={{ margin: "4px 0 8px 40px", maxWidth: "76%" }}>
        <div className="mono" style={{ fontSize: 10, color: "#22d3ee", letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>{isCall ? `${m.name} · tool call` : `${m.name} · result`}</div>
        <pre style={{ margin: 0, background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.25)", borderRadius: 8, padding: "8px 10px", fontFamily: "ui-monospace,monospace", fontSize: 12, color: "#bfe9f5", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 220, overflow: "auto" }}>{m.content.replace(/^▸ /, "")}</pre>
      </div>
    );
  }
  const isUser = m.kind === "user";
  const a = roster.find((x) => x.id === m.agentId) as (AgentDef & { color?: string }) | undefined;
  const color = isUser ? "var(--orange)" : a ? agentColor(a) : "var(--pink)";
  const time = m.ts ? new Date(m.ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "";
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 14, flexDirection: isUser ? "row-reverse" : "row" }}>
      <Avatar agentId={m.agentId} name={m.name} roster={roster} />
      <div style={{ maxWidth: "76%", minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 3 }}>
          <span className="mono" style={{ fontSize: 11, color }}>{m.name}{a?.role ? <span style={{ color: "var(--mute)" }}> · {a.role.split(" · ")[0]}</span> : null}</span>
          {time && <span style={{ fontSize: 9, color: "var(--mute)" }}>{time}</span>}
        </div>
        <div style={{ background: isUser ? "rgba(255,122,45,0.10)" : "rgba(255,255,255,0.035)", border: `1px solid ${isUser ? "rgba(255,122,45,0.3)" : "var(--line)"}`, borderRadius: 12, padding: "9px 12px", fontSize: 14, lineHeight: 1.55 }}>
          <MessageBody text={m.content} />
        </div>
      </div>
    </div>
  );
}
function MessageBody({ text }: { text: string }) {
  const blocks = text.split(/```/);
  return (
    <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
      {blocks.map((b, i) => {
        if (i % 2 === 1) {
          const body = b.replace(/^[a-zA-Z0-9]*\n/, "");
          return <pre key={i} style={{ background: "rgba(0,0,0,0.55)", border: "1px solid var(--line)", borderRadius: 8, padding: 10, overflowX: "auto", fontFamily: "ui-monospace,monospace", fontSize: 12.5, margin: "6px 0" }}><code>{body}</code></pre>;
        }
        return <span key={i}>{inlineFmt(b)}</span>;
      })}
    </div>
  );
}
function inlineFmt(s: string): (string | JSX.Element)[] {
  const out: (string | JSX.Element)[] = [];
  const re = /`([^`]+)`|\*\*([^*]+)\*\*/g;
  let last = 0; let m: RegExpExecArray | null; let k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    if (m[1] !== undefined) out.push(<code key={k++} style={{ background: "rgba(0,0,0,0.5)", padding: "1px 5px", borderRadius: 4, fontFamily: "ui-monospace,monospace", fontSize: 12.5 }}>{m[1]}</code>);
    else out.push(<b key={k++}>{m[2]}</b>);
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}
