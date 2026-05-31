import { useEffect, useMemo, useRef, useState } from "react";
import { AGENTS, type AgentDef, agentAvailable, effectiveTransport } from "../ai/agents";
import { appUnlocked, subscribeCodes } from "../featureGate";
import { loadPrefs, subscribePrefs } from "../uiPrefs";
import { loadCustomAgents, saveCustomAgents, subscribeCustomAgents, makeCustomAgent, agentColor, type CustomAgent } from "../ai/customAgents";
import { loadConfig, saveConfig, type ConfigMap, type AgentConfig } from "../ai/store";
import { ProjectsView } from "./groupchat/Projects";

type Msg = {
  id: string;
  agentId: string;
  name: string;
  content: string;
  kind: "user" | "agent" | "system";
  ts?: number;
};

const mono = (n: string) => n.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase();
const CHAT_KEY = "nchub.chat.v2";
const PROVIDERS = ["anthropic", "openai", "gemini", "http"] as const;

let mid = 1;

function transcriptText(msgs: Msg[]): string {
  return msgs
    .filter((m) => m.kind !== "system")
    .map((m) => `${m.name}: ${m.content}`)
    .join("\n");
}

function loadMsgs(): Msg[] {
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Msg[];
    if (!Array.isArray(arr)) return [];
    // Reset the message id seed so new ids stay unique within the session.
    let max = 0;
    for (const m of arr) {
      const n = parseInt(m.id, 10);
      if (!isNaN(n) && n > max) max = n;
    }
    mid = max + 1;
    return arr;
  } catch {
    return [];
  }
}
function saveMsgs(arr: Msg[]) {
  try { localStorage.setItem(CHAT_KEY, JSON.stringify(arr.slice(-400))); } catch { /* ignore */ }
}

type View = "chat" | "config" | "projects";

export function GroupChat() {
  const [cfg, setCfg] = useState<ConfigMap>(() => loadConfig());
  const [msgs, setMsgs] = useState<Msg[]>(loadMsgs);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [view, setView] = useState<View>("chat");
  const [houseReady, setHouseReady] = useState(false);
  const [prefs, setPrefs] = useState(loadPrefs);
  const [customAgents, setCustomAgents] = useState<CustomAgent[]>(loadCustomAgents);
  useEffect(() => subscribePrefs(setPrefs), []);
  useEffect(() => subscribeCustomAgents(setCustomAgents), []);
  // Full roster = built-ins + user-defined custom agents.
  const ROSTER = useMemo<AgentDef[]>(() => [...AGENTS, ...customAgents], [customAgents]);
  const scroller = useRef<HTMLDivElement>(null);

  // Persist on every change so the conversation survives tab switches and restarts.
  useEffect(() => { saveMsgs(msgs); }, [msgs]);

  // Auto-scroll to bottom on new messages — gated by Settings → AI Group Chat.
  useEffect(() => {
    if (!prefs.chatAutoScroll) return;
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, busy, prefs.chatAutoScroll]);

  // The "online" dot has to mean something — house agents are only actually
  // available once the local model has finished downloading.
  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const s = await window.hub.llm.status();
        if (!cancelled) setHouseReady(!!s.ready);
      } catch { /* ignore */ }
    }
    void tick();
    const t = setInterval(tick, 4000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Subscribe to dev-code unlock changes so the roster updates live when
  // BroBot (gated under 2089) is unlocked / relocked.
  const [, setCodeTick] = useState(0);
  useEffect(() => subscribeCodes(() => setCodeTick((n) => n + 1)), []);
  const gatedAgents = useMemo(() => ROSTER.filter((a) => appUnlocked(a.id)), [ROSTER, /* re-derived on tick */ houseReady]);
  const available = useMemo(() => gatedAgents.filter((a) => agentAvailable(a, cfg[a.id], houseReady)), [cfg, houseReady, gatedAgents]);
  const unavailable = useMemo(() => gatedAgents.filter((a) => !agentAvailable(a, cfg[a.id], houseReady)), [cfg, houseReady, gatedAgents]);

  function push(m: Omit<Msg, "id">) {
    setMsgs((prev) => [...prev, { ...m, id: String(mid++), ts: m.ts ?? Date.now() }]);
  }
  function clearChat() {
    setMsgs([]);
    saveMsgs([]);
  }

  async function callAgent(a: AgentDef, task: string, history: Msg[]): Promise<void> {
    const toneHint = { casual: "Keep it casual and friendly.", professional: "Keep it professional and precise.", hype: "Be energetic and hype.", short: "Be extremely terse." }[prefs.chatDefaultTone];
    const lenHint = { short: "One to two sentences.", medium: "One short paragraph.", long: "A few paragraphs if it helps." }[prefs.chatResponseLength];
    const system =
      a.system +
      `\nParticipants: ${available.map((x) => x.name).join(", ")}, Meteor (boss).` +
      `\nRespond only as ${a.name}. ${toneHint} ${lenHint} Do not prefix your reply with your name.`;
    const convo = transcriptText(history);
    const userContent =
      (convo ? `Conversation so far:\n${convo}\n\n` : "") +
      `Task from Meteor: ${task}\n\nRespond as ${a.name}:`;

    const c = cfg[a.id];
    const t = effectiveTransport(a, c);

    let res: { ok: boolean; text?: string; error?: string };
    if (t === "house") {
      res = await window.hub.llm.chat(system, userContent);
    } else if (t === "cli") {
      res = await window.hub.agentRun(c?.cmd || a.defaultCmd || "", `${system}\n\n${userContent}`);
    } else {
      res = await window.hub.aiChat({
        provider: c?.provider ?? a.defaultProvider,
        endpoint: c?.endpoint,
        apiKey: c?.apiKey,
        model: c?.model || a.defaultModel,
        system,
        messages: [{ role: "user", content: userContent }],
      });
    }
    push({
      agentId: a.id,
      name: a.name,
      kind: "agent",
      content: res.ok ? res.text || "(no output)" : `[${a.name} couldn't reach their tool: ${res.error}]`,
    });
  }

  // Resolve who an @mention list targets — silent agents (NT5 anchors,
  // BroBot) only join when their name is explicitly in the list, never via
  // @Everyone or via the empty default.
  function resolveTargets(rawText: string): AgentDef[] {
    const mentions = (rawText.match(/@([A-Za-z]+)/g) || []).map((m) => m.slice(1).toLowerCase());
    const everyone = mentions.length === 0 || mentions.includes("everyone");
    const out: AgentDef[] = [];
    if (everyone) {
      for (const a of available) if (!a.silent) out.push(a);
    }
    for (const a of available) {
      if (mentions.includes(a.name.toLowerCase()) && !out.includes(a)) out.push(a);
    }
    return out;
  }

  // Slash commands handled locally before anything hits an agent.
  function handleSlash(raw: string): boolean {
    const [cmd, ...rest] = raw.slice(1).split(/\s+/);
    const arg = rest.join(" ");
    switch (cmd.toLowerCase()) {
      case "clear": clearChat(); return true;
      case "who": {
        const list = available.map((a) => a.name).join(", ") || "nobody connected";
        push({ agentId: "system", name: "Hub", kind: "system", content: `On call: ${list}` });
        return true;
      }
      case "help":
        push({ agentId: "system", name: "Hub", kind: "system", content: "Commands: /clear · /who · /help · /everyone <task>. Mention @Name to target one agent, @Everyone for the outside crew." });
        return true;
      case "everyone":
        if (arg.trim()) { setInput(""); void runFromText(`@Everyone ${arg}`); }
        return true;
      default:
        return false;
    }
  }

  async function runFromText(task: string) {
    push({ agentId: "meteor", name: "Meteor", kind: "user", content: task });
    const targets = resolveTargets(task);
    if (targets.length === 0) {
      push({ agentId: "system", name: "Hub", kind: "system", content: "No matching agent. Mention one by name, or @Everyone to ping the outside crew." });
      return;
    }
    await driveTurn(task, targets);
  }

  async function send() {
    const task = input.trim();
    if (!task || busy) return;
    if (task.startsWith("/")) { if (handleSlash(task)) { setInput(""); return; } }
    setInput("");
    push({ agentId: "meteor", name: "Meteor", kind: "user", content: task });

    const targets = resolveTargets(task);

    if (targets.length === 0) {
      push({ agentId: "system", name: "Hub", kind: "system", content: "No matching agent. Mention one by name (Voss, Zip, Dex, Lena, Orion, and BroBot only respond when called out directly), or @Everyone to ping the outside crew. (Connect more agents in Configure.)" });
      return;
    }
    await driveTurn(task, targets);
  }

  // Runs the coordinator->workers->review turn, then follows AI-to-AI
  // @mention chains up to the configured depth.
  async function driveTurn(task: string, targets: AgentDef[]) {
    try {
      await runTurn(targets, task);
      for (let depth = 0; depth < prefs.chatChainDepth; depth++) {
        const recent = snapshot().slice(-targets.length).filter((m) => m.kind === "agent");
        const chained = new Set<AgentDef>();
        for (const m of recent) {
          for (const a of available) {
            if (m.agentId === a.id) continue;
            const re = new RegExp(`@${a.name}\\b`, "i");
            if (re.test(m.content)) chained.add(a);
          }
        }
        if (chained.size === 0) break;
        await runTurn([...chained], `[AI-to-AI · address the prior messages directly]`);
      }
    } finally {
      setBusy(null);
    }
  }

  async function runTurn(targets: AgentDef[], task: string) {
    const single = targets.length === 1;
    const coordinator = targets.find((a) => a.coordinator);
    const others = targets.filter((a) => a !== coordinator);
    if (coordinator) {
      setBusy(coordinator.name);
      await callAgent(coordinator, task, snapshot());
    }
    // Split workers by transport. CLI + API agents fan out in parallel
    // (separate processes/endpoints). House-model agents share one local
    // model and have to run one at a time.
    const houseWorkers = others.filter((a) => effectiveTransport(a, cfg[a.id]) === "house");
    const remoteWorkers = others.filter((a) => effectiveTransport(a, cfg[a.id]) !== "house");
    if (remoteWorkers.length) {
      setBusy(remoteWorkers.map((a) => a.name).join(", "));
      await Promise.all(remoteWorkers.map((w) => callAgent(w, task, snapshot())));
    }
    for (const w of houseWorkers) {
      setBusy(w.name);
      await callAgent(w, task, snapshot());
    }
    if (!single) {
      const reviewer = coordinator || targets.find((a) => a.id === "claude") || targets[0];
      setBusy(`${reviewer.name} (review)`);
      await callAgent(reviewer, "Review the crew's responses above for errors or hallucinations, keep everyone on track, then give Meteor the consolidated result.", snapshot());
    }
  }

  const snapRef = useRef<Msg[]>([]);
  snapRef.current = msgs;
  function snapshot() { return snapRef.current; }

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
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span>AI Group Chat</span>
        <div style={{ display: "flex", gap: 6 }}>
          {(["chat", "projects"] as const).map((v) => (
            <button key={v} className="btn" style={{ padding: "2px 12px", color: view === v ? "var(--pink)" : undefined, borderColor: view === v ? "rgba(255,87,119,0.6)" : undefined }} onClick={() => setView(v)}>{v}</button>
          ))}
          {view === "chat" && <button className="btn" onClick={clearChat} title="Clear chat history">Clear</button>}
          <button className="btn" onClick={() => setView(view === "config" ? "chat" : "config")}>{view === "config" ? "Done" : "Configure"}</button>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Roster — only agents that can actually answer right now. Silent
            (mention-only) anchors are hidden when chatShowSilent is off. */}
        <div style={{ width: 220, borderRight: "1px solid var(--line)", padding: 10, overflow: "auto" }}>
          {(() => { const rosterList = available.filter((a) => prefs.chatShowSilent || !a.silent); return (<>
          <div className="mono" style={{ fontSize: 10, color: "var(--mute)", letterSpacing: 1, marginBottom: 8 }}>
            ON CALL ({rosterList.length})
          </div>
          {rosterList.length === 0 && (
            <div style={{ fontSize: 12, color: "var(--mute)" }}>Nobody's wired yet. Open Configure to connect agents.</div>
          )}
          {rosterList.map((a) => (
            <div key={a.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0" }}>
              <span className="mono glow-text" style={{ fontSize: 12, width: 22, textAlign: "center" }}>{mono(a.name)}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="mono" style={{ fontSize: 12 }}>
                  {a.name}{a.coordinator && <span className="glow-text"> · lead</span>}
                </div>
                <div style={{ fontSize: 10, color: "var(--mute)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.role}</div>
              </div>
              <span title={effectiveTransport(a, cfg[a.id])} style={{ fontSize: 9, color: "var(--pink)" }}>●</span>
            </div>
          ))}
          {unavailable.length > 0 && (
            <>
              <div className="mono" style={{ fontSize: 10, color: "var(--mute)", letterSpacing: 1, margin: "14px 0 6px" }}>NOT CONNECTED ({unavailable.length})</div>
              {unavailable.map((a) => (
                <div key={a.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0", opacity: 0.55 }}>
                  <span className="mono" style={{ fontSize: 12, width: 22, textAlign: "center", color: "var(--mute)" }}>{mono(a.name)}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="mono" style={{ fontSize: 12, color: "var(--mute)" }}>{a.name}</div>
                  </div>
                </div>
              ))}
              <button className="btn" style={{ marginTop: 10, width: "100%", justifyContent: "center" }} onClick={() => setView("config")}>Connect more</button>
            </>
          )}
          </>); })()}
        </div>

        {view === "config" ? (
          <ConfigPanel cfg={cfg} houseReady={houseReady} roster={ROSTER} customAgents={customAgents} onChange={(next) => { setCfg(next); saveConfig(next); }} />
        ) : view === "projects" ? (
          <ProjectsView availableIds={available.map((a) => a.id)} onBackToChat={() => setView("chat")} />
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
            <div ref={scroller} style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 16 }}>
              {msgs.length === 0 && (
                <div className="placeholder">
                  <div>
                    <div className="glow-text mono">Give the crew a task</div>
                    <p style={{ maxWidth: 460, fontSize: 13 }}>
                      e.g. “make a Pizza Tower mod that adds Pizzaface as a playable character.”
                      @Everyone routes to the outside crew (Claude, Gemini, Codex, OpenCode,
                      Hermes). Mention BroBot or an NT5 anchor (Voss, Zip, Dex, Lena, Orion)
                      directly — they only chime in when called out. Agents can @mention each
                      other to keep the conversation going.
                    </p>
                  </div>
                </div>
              )}
              {msgs.map((m) => <Bubble key={m.id} m={m} roster={ROSTER} />)}
              {busy && (
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
                  <Avatar agentId={busy} name={busy} roster={ROSTER} />
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "rgba(255,87,119,0.06)", border: "1px solid var(--line)", borderRadius: 10 }}>
                    <span className="mono" style={{ fontSize: 12, color: "var(--mute)" }}>{busy} is typing</span>
                    <TypingDots />
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid var(--line)" }}>
              <input
                className="omni-input"
                style={{ flex: 1, background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink)", padding: "9px 12px", fontSize: 13, outline: "none" }}
                placeholder="Type a task — @Everyone, or @Name to pick someone"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
                }}
                disabled={!!busy}
              />
              <button className="btn" onClick={() => void send()} disabled={!!busy}>Send</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ConfigPanel({
  cfg,
  houseReady,
  roster,
  customAgents,
  onChange,
}: {
  cfg: ConfigMap;
  houseReady: boolean;
  roster: AgentDef[];
  customAgents: CustomAgent[];
  onChange: (next: ConfigMap) => void;
}) {
  function update(id: string, patch: Partial<AgentConfig>) {
    const def = roster.find((a) => a.id === id)!;
    const base: AgentConfig = cfg[id] || {
      enabled: true,
      transport: def.defaultTransport,
      cmd: def.defaultCmd || "",
      provider: def.defaultProvider,
    };
    onChange({ ...cfg, [id]: { ...base, ...patch, enabled: true } });
  }

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
      <p style={{ color: "var(--mute)", fontSize: 13, marginTop: 0, maxWidth: 660 }}>
        BroBot and the NT5 anchors share the bundled house model — they're always on call,
        no setup. For the outside crew (Claude, Gemini, Codex, OpenCode, Hermes) you launch
        their CLI yourself; the Hub runs the command for each message and shows the reply
        here. <code>{"{prompt}"}</code> is replaced by the message (or appended if you omit
        it).
      </p>

      <CustomAgentCreator customAgents={customAgents} />

      {roster.filter((a) => appUnlocked(a.id)).map((a) => {
        const c = cfg[a.id];
        const transport = c?.transport ?? a.defaultTransport;
        return (
          <div key={a.id} className="panel" style={{ padding: 12, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="mono glow-text" style={{ fontSize: 12, width: 22, textAlign: "center" }}>{mono(a.name)}</span>
              <span className="mono" style={{ fontSize: 13 }}>{a.name}</span>
              <span style={{ fontSize: 11, color: "var(--mute)" }}>{a.role}</span>
              <span style={{ marginLeft: "auto", fontSize: 10, color: agentAvailable(a, c, houseReady) ? "var(--pink)" : "var(--mute)" }}>
                {agentAvailable(a, c, houseReady) ? "ON CALL" : a.silent || effectiveTransport(a, c) === "house" ? "MODEL LOADING" : "NEEDS SETUP"}
              </span>
              {(a as CustomAgent).custom && (
                <button className="btn" style={{ fontSize: 10, padding: "3px 8px" }}
                  onClick={() => saveCustomAgents(customAgents.filter((x) => x.id !== a.id))}>remove</button>
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
                <Field label="terminal command">
                  <input style={fieldStyle} value={c?.cmd ?? a.defaultCmd ?? ""} placeholder={a.defaultCmd || 'tool -p "{prompt}"'} onChange={(e) => update(a.id, { cmd: e.target.value })} />
                </Field>
              ) : transport === "api" ? (
                <>
                  <Field label="provider">
                    <select value={c?.provider ?? a.defaultProvider} onChange={(e) => update(a.id, { provider: e.target.value as AgentConfig["provider"] })} style={fieldStyle}>
                      {PROVIDERS.map((p) => (<option key={p} value={p}>{p}</option>))}
                    </select>
                  </Field>
                  {(c?.provider ?? a.defaultProvider) === "http" ? (
                    <Field label="endpoint">
                      <input style={fieldStyle} value={c?.endpoint || ""} placeholder="https://hermes.yourbox…" onChange={(e) => update(a.id, { endpoint: e.target.value })} />
                    </Field>
                  ) : (
                    <Field label="model">
                      <input style={fieldStyle} value={c?.model || ""} placeholder={a.defaultModel || ""} onChange={(e) => update(a.id, { model: e.target.value })} />
                    </Field>
                  )}
                  <Field label={(c?.provider ?? a.defaultProvider) === "http" ? "bearer (optional)" : "API key"}>
                    <input style={fieldStyle} type="password" value={c?.apiKey || ""} placeholder="•••••••" onChange={(e) => update(a.id, { apiKey: e.target.value })} />
                  </Field>
                </>
              ) : (
                <div style={{ fontSize: 12, color: "var(--mute)", alignSelf: "center" }}>No setup needed — runs on the bundled local model.</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.5)",
  border: "1px solid var(--line)",
  borderRadius: 6,
  color: "var(--ink)",
  padding: "6px 8px",
  fontSize: 12,
  width: "100%",
  fontFamily: "ui-monospace, monospace",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ fontSize: 10, color: "var(--mute)", textTransform: "uppercase", letterSpacing: 1 }}>
      {label}
      <div style={{ marginTop: 4 }}>{children}</div>
    </label>
  );
}

// ── Message bubble + avatar + typing indicator ──────────────────────────────
function Avatar({ agentId, name, roster }: { agentId: string; name: string; roster: AgentDef[] }) {
  const a = roster.find((x) => x.id === agentId) as (AgentDef & { color?: string; avatar?: string }) | undefined;
  const isUser = agentId === "meteor";
  const color = isUser ? "var(--orange)" : a ? agentColor(a) : "#9ca3af";
  const initials = (name || "?").replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "?";
  if (a?.avatar) {
    return <span style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, background: `center/cover no-repeat url("${a.avatar}")`, boxShadow: `0 0 8px ${color}66` }} />;
  }
  return (
    <span style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center",
      background: isUser ? "linear-gradient(135deg, var(--red), var(--orange))" : `linear-gradient(135deg, ${color}, #0a0820)`,
      color: "#fff", fontFamily: "ui-monospace,monospace", fontSize: 11, fontWeight: 700, boxShadow: `0 0 8px ${color}55` }}>
      {initials}
    </span>
  );
}

function TypingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 3 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--pink)", animation: `gcblink 1.2s ${i * 0.18}s infinite` }} />
      ))}
      <style>{`@keyframes gcblink { 0%,80%,100% { opacity: 0.25; } 40% { opacity: 1; } }`}</style>
    </span>
  );
}

function Bubble({ m, roster }: { m: Msg; roster: AgentDef[] }) {
  if (m.kind === "system") {
    return (
      <div style={{ textAlign: "center", margin: "10px 0" }}>
        <span className="mono" style={{ fontSize: 11, color: "var(--mute)", background: "rgba(255,255,255,0.04)", padding: "4px 12px", borderRadius: 20 }}>{m.content}</span>
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
        <div style={{
          background: isUser ? "rgba(255,122,45,0.10)" : "rgba(255,255,255,0.035)",
          border: `1px solid ${isUser ? "rgba(255,122,45,0.3)" : "var(--line)"}`,
          borderRadius: 12, padding: "9px 12px", fontSize: 14, lineHeight: 1.55,
        }}>
          <MessageBody text={m.content} />
        </div>
      </div>
    </div>
  );
}

// Lightweight renderer: fenced ```code``` blocks, `inline code`, and **bold**.
function MessageBody({ text }: { text: string }) {
  const blocks = text.split(/```/);
  return (
    <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
      {blocks.map((b, i) => {
        if (i % 2 === 1) {
          const body = b.replace(/^[a-zA-Z0-9]*\n/, "");
          return (
            <pre key={i} style={{ background: "rgba(0,0,0,0.55)", border: "1px solid var(--line)", borderRadius: 8, padding: 10, overflowX: "auto", fontFamily: "ui-monospace,monospace", fontSize: 12.5, margin: "6px 0" }}>
              <code>{body}</code>
            </pre>
          );
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

// ── Custom agent creator (Configure panel) ──────────────────────────────────
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
    const agent = makeCustomAgent({ name, role, personality, transport: transport ?? "house", model, cmd, color, silent });
    saveCustomAgents([...customAgents, agent]);
    setName(""); setRole(""); setPersonality(""); setModel(""); setCmd(""); setSilent(false); setOpen(false);
  }

  if (!open) {
    return (
      <button className="btn" style={{ marginBottom: 12 }} onClick={() => setOpen(true)}>+ Create custom agent</button>
    );
  }
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
          placeholder="Who is this agent? Voice, expertise, quirks. e.g. 'You are Sage, a calm lore-keeper who answers in concise, vivid prose.'" />
      </Field>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--ink)", margin: "6px 0" }}>
        <input type="checkbox" checked={silent} onChange={(e) => setSilent(e.target.checked)} />
        Mention-only (won't join @Everyone — only responds when named)
      </label>
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn" onClick={create}>Create</button>
        <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}
