import { useEffect, useMemo, useRef, useState } from "react";
import { AGENTS, type AgentDef, agentAvailable, effectiveTransport } from "../ai/agents";
import { appUnlocked, subscribeCodes } from "../featureGate";
import { loadConfig, saveConfig, type ConfigMap, type AgentConfig } from "../ai/store";
import { ProjectsView } from "./groupchat/Projects";

type Msg = {
  id: string;
  agentId: string;
  name: string;
  content: string;
  kind: "user" | "agent" | "system";
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
  const scroller = useRef<HTMLDivElement>(null);

  // Persist on every change so the conversation survives tab switches and restarts.
  useEffect(() => { saveMsgs(msgs); }, [msgs]);

  // Always auto-scroll to bottom on new messages or busy state.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, busy]);

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
  const gatedAgents = useMemo(() => AGENTS.filter((a) => appUnlocked(a.id)), [/* re-derived on tick */ houseReady]);
  const available = useMemo(() => gatedAgents.filter((a) => agentAvailable(a, cfg[a.id], houseReady)), [cfg, houseReady, gatedAgents]);
  const unavailable = useMemo(() => gatedAgents.filter((a) => !agentAvailable(a, cfg[a.id], houseReady)), [cfg, houseReady, gatedAgents]);

  function push(m: Omit<Msg, "id">) {
    setMsgs((prev) => [...prev, { ...m, id: String(mid++) }]);
  }
  function clearChat() {
    setMsgs([]);
    saveMsgs([]);
  }

  async function callAgent(a: AgentDef, task: string, history: Msg[]): Promise<void> {
    const system =
      a.system +
      `\nParticipants: ${available.map((x) => x.name).join(", ")}, Meteor (boss).` +
      `\nRespond only as ${a.name}. Be brief. Do not prefix your reply with your name.`;
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

  async function send() {
    const task = input.trim();
    if (!task || busy) return;
    setInput("");
    push({ agentId: "meteor", name: "Meteor", kind: "user", content: task });

    const targets = resolveTargets(task);

    if (targets.length === 0) {
      push({ agentId: "system", name: "Hub", kind: "system", content: "No matching agent. Mention one by name (Voss, Zip, Dex, Lena, Orion, and BroBot only respond when called out directly), or @Everyone to ping the outside crew. (Connect more agents in Configure.)" });
      return;
    }

    try {
      await runTurn(targets, task);
      // AI-to-AI chaining: scan the last few agent messages for @mentions of
      // OTHER available agents (anchors / BroBot count here too — direct
      // mention is exactly what they wait for). Cap chain depth so the
      // crew can't accidentally talk forever.
      for (let depth = 0; depth < 3; depth++) {
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
        {/* Roster — only agents that can actually answer right now. */}
        <div style={{ width: 220, borderRight: "1px solid var(--line)", padding: 10, overflow: "auto" }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--mute)", letterSpacing: 1, marginBottom: 8 }}>
            ON CALL ({available.length})
          </div>
          {available.length === 0 && (
            <div style={{ fontSize: 12, color: "var(--mute)" }}>Nobody's wired yet. Open Configure to connect agents.</div>
          )}
          {available.map((a) => (
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
        </div>

        {view === "config" ? (
          <ConfigPanel cfg={cfg} houseReady={houseReady} onChange={(next) => { setCfg(next); saveConfig(next); }} />
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
              {msgs.map((m) => (
                <div key={m.id} style={{ marginBottom: 14, opacity: m.kind === "system" ? 0.7 : 1 }}>
                  <div className="mono" style={{ fontSize: 11, color: m.kind === "user" ? "var(--orange)" : "var(--pink)" }}>{m.name}</div>
                  <div style={{ fontSize: 14, marginTop: 2, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{m.content}</div>
                </div>
              ))}
              {busy && <div className="mono" style={{ fontSize: 12, color: "var(--mute)" }}>{busy} is working…</div>}
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
  onChange,
}: {
  cfg: ConfigMap;
  houseReady: boolean;
  onChange: (next: ConfigMap) => void;
}) {
  function update(id: string, patch: Partial<AgentConfig>) {
    const def = AGENTS.find((a) => a.id === id)!;
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
      {AGENTS.filter((a) => appUnlocked(a.id)).map((a) => {
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
