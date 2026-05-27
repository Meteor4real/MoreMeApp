import { useRef, useState } from "react";
import { AGENTS, type AgentDef } from "../ai/agents";
import { loadConfig, saveConfig, isWired, type ConfigMap, type AgentConfig } from "../ai/store";

type Msg = {
  id: string;
  agentId: string;
  name: string;
  content: string;
  kind: "user" | "agent" | "system";
};

const mono = (n: string) => n.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase();

let mid = 1;
const PROVIDERS = ["anthropic", "openai", "gemini", "http"] as const;

function transcriptText(msgs: Msg[]): string {
  return msgs
    .filter((m) => m.kind !== "system")
    .map((m) => `${m.name}: ${m.content}`)
    .join("\n");
}

export function GroupChat() {
  const [cfg, setCfg] = useState<ConfigMap>(() => loadConfig());
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  // On-call bots (NT5 anchors, BroBot) run on the local house model — always
  // available (no key). External agents need their own key/endpoint.
  const wiredOf = (a: AgentDef) => (a.onCall ? true : isWired(cfg[a.id]));

  function push(m: Omit<Msg, "id">) {
    setMsgs((prev) => {
      const next = [...prev, { ...m, id: String(mid++) }];
      queueMicrotask(() =>
        scroller.current?.scrollTo({ top: scroller.current.scrollHeight })
      );
      return next;
    });
  }

  async function callAgent(a: AgentDef, task: string, history: Msg[]): Promise<void> {
    const system =
      a.system +
      `\nParticipants: ${AGENTS.filter(wiredOf).map((x) => x.name).join(", ")}, Meteor (boss).` +
      `\nRespond only as ${a.name}. Be brief. Do not prefix your reply with your name.`;
    const convo = transcriptText(history);
    const userContent =
      (convo ? `Conversation so far:\n${convo}\n\n` : "") +
      `Task from Meteor: ${task}\n\nRespond as ${a.name}:`;

    let res: { ok: boolean; text?: string; error?: string };
    const c = cfg[a.id];
    if (a.onCall && !(c && isWired(c))) {
      // local house model (no key) for on-call bots when not separately wired
      res = await window.hub.llm.chat(system, userContent);
    } else if (c && c.transport === "cli") {
      // launch the agent's CLI in the Terminal and capture its reply
      res = await window.hub.agentRun(c.cmd || a.defaultCmd || "", `${system}\n\n${userContent}`);
    } else if (c) {
      res = await window.hub.aiChat({
        provider: c.provider,
        endpoint: c.endpoint,
        apiKey: c.apiKey,
        model: c.model || a.defaultModel,
        system,
        messages: [{ role: "user", content: userContent }],
      });
    } else {
      res = { ok: false, error: "not configured" };
    }
    push({
      agentId: a.id,
      name: a.name,
      kind: "agent",
      content: res.ok ? res.text || "(no output)" : `[error] ${res.error}`,
    });
  }

  async function send() {
    const task = input.trim();
    if (!task || busy) return;
    setInput("");
    push({ agentId: "meteor", name: "Meteor", kind: "user", content: task });

    // @mention routing. @Everyone = all core agents (NOT on-call bots);
    // @Name targets that agent (incl. on-call NT5 anchors / BroBot).
    const mentions = (task.match(/@([A-Za-z]+)/g) || []).map((m) => m.slice(1).toLowerCase());
    if (mentions.length === 0) {
      push({ agentId: "system", name: "Hub", kind: "system", content: "Mention who should answer — e.g. @Claude, @Hermes, or @Everyone. On-call bots (Voss/Zara/Dex/Lena/Orin/BroBot) are @mentioned by name." });
      return;
    }
    const everyone = mentions.includes("everyone");
    let targets: AgentDef[] = everyone ? AGENTS.filter((a) => !a.onCall) : [];
    for (const a of AGENTS) if (mentions.includes(a.name.toLowerCase()) && !targets.includes(a)) targets.push(a);

    const unwired = targets.filter((a) => !wiredOf(a)).map((a) => a.name);
    targets = targets.filter(wiredOf);
    if (targets.length === 0) {
      push({ agentId: "system", name: "Hub", kind: "system", content: `No mentioned agent is wired${unwired.length ? ` (${unwired.join(", ")})` : ""}. Add a key in Configure.` });
      return;
    }

    setBusy(true);
    try {
      const single = targets.length === 1;
      const coordinator = targets.find((a) => a.coordinator);
      const others = targets.filter((a) => a !== coordinator);
      // coordinator (e.g. Hermes) plans/assigns first when it's a group
      if (coordinator) await callAgent(coordinator, task, snapshot());
      for (const w of others) await callAgent(w, task, snapshot());
      // fact-check / consolidation pass on group chats (skip for a single @mention)
      if (!single) {
        const reviewer = coordinator || targets.find((a) => a.id === "claude") || targets[0];
        await callAgent(reviewer, "Review the crew's responses above for errors or hallucinations, keep everyone on track, then give Meteor the consolidated result.", snapshot());
      }
    } finally {
      setBusy(false);
    }
  }

  // latest messages snapshot (state updates are async)
  const snapRef = useRef<Msg[]>([]);
  snapRef.current = msgs;
  function snapshot() {
    return snapRef.current;
  }

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
        }}
      >
        <span>
          AI Group Chat <span className="glow-text">· the crew</span>
        </span>
        <button className="btn" onClick={() => setShowConfig((s) => !s)}>
          Configure
        </button>
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Roster */}
        <div style={{ width: 220, borderRight: "1px solid var(--line)", padding: 10, overflow: "auto" }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--mute)", letterSpacing: 1, marginBottom: 8 }}>
            ROSTER
          </div>
          {AGENTS.map((a) => (
            <div key={a.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0" }}>
              <span className="mono glow-text" style={{ fontSize: 12, width: 22, textAlign: "center" }}>
                {mono(a.name)}
              </span>
              <div style={{ minWidth: 0 }}>
                <div className="mono" style={{ fontSize: 12 }}>
                  {a.name}
                  {a.coordinator && <span className="glow-text"> · lead</span>}
                </div>
                <div style={{ fontSize: 10, color: "var(--mute)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {a.role}
                </div>
              </div>
              <span style={{ marginLeft: "auto", fontSize: 9, color: wiredOf(a) ? "var(--pink)" : "var(--mute)" }}>
                {wiredOf(a) ? "●" : "○"}
              </span>
            </div>
          ))}
        </div>

        {/* Transcript or config */}
        {showConfig ? (
          <ConfigPanel
            cfg={cfg}
            onChange={(next) => {
              setCfg(next);
              saveConfig(next);
            }}
          />
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            <div ref={scroller} style={{ flex: 1, overflow: "auto", padding: 16 }}>
              {msgs.length === 0 && (
                <div className="placeholder">
                  <div>
                    <div className="glow-text mono">Give the crew a task</div>
                    <p style={{ maxWidth: 460, fontSize: 13 }}>
                      e.g. “make a Pizza Tower mod that adds Pizzaface as a playable
                      character.” Hermes splits the work, the specialists respond, and
                      they fact-check each other before you see the result.
                    </p>
                  </div>
                </div>
              )}
              {msgs.map((m) => (
                <div key={m.id} style={{ marginBottom: 14, opacity: m.kind === "system" ? 0.7 : 1 }}>
                  <div className="mono" style={{ fontSize: 11, color: m.kind === "user" ? "var(--orange)" : "var(--pink)" }}>
                    {m.name}
                  </div>
                  <div style={{ fontSize: 14, marginTop: 2, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {busy && <div className="mono" style={{ fontSize: 12, color: "var(--mute)" }}>crew is working…</div>}
            </div>
            <div style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid var(--line)" }}>
              <input
                className="omni-input"
                style={{
                  flex: 1,
                  background: "rgba(0,0,0,0.5)",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  color: "var(--ink)",
                  padding: "9px 12px",
                  fontSize: 13,
                  outline: "none",
                }}
                placeholder="@Everyone, @Claude, @Hermes… — mention who should answer"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                disabled={busy}
              />
              <button className="btn" onClick={() => void send()} disabled={busy}>
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ConfigPanel({
  cfg,
  onChange,
}: {
  cfg: ConfigMap;
  onChange: (next: ConfigMap) => void;
}) {
  function update(id: string, patch: Partial<AgentConfig>) {
    const def = AGENTS.find((a) => a.id === id)!;
    const base: AgentConfig = cfg[id] || {
      enabled: false,
      transport: "cli",
      cmd: def.defaultCmd || "",
      provider: def.defaultProvider,
    };
    onChange({ ...cfg, [id]: { ...base, ...patch } });
  }

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
      <p style={{ color: "var(--mute)", fontSize: 13, marginTop: 0, maxWidth: 660 }}>
        Each agent runs as a command-line tool you launch in the Terminal —
        Claude Code, Gemini CLI, Codex, OpenCode, or an <code>ssh</code> to Hermes
        on your Hostinger box. The Hub runs the command for each message and shows
        the reply here. <code>{"{prompt}"}</code> is replaced by the message (or
        appended if you omit it). Switch a tool to <em>API</em> to use a key instead.
      </p>
      {AGENTS.map((a) => {
        const c = cfg[a.id] || { enabled: false, transport: "cli" as const, cmd: a.defaultCmd || "", provider: a.defaultProvider };
        const transport = c.transport ?? "cli";
        return (
          <div key={a.id} className="panel" style={{ padding: 12, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="mono glow-text" style={{ fontSize: 12, width: 22, textAlign: "center" }}>{mono(a.name)}</span>
              <span className="mono" style={{ fontSize: 13 }}>{a.name}</span>
              <span style={{ fontSize: 11, color: "var(--mute)" }}>{a.role}</span>
              <label style={{ marginLeft: "auto", fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={!!c.enabled}
                  onChange={(e) => update(a.id, { enabled: e.target.checked })}
                />
                enabled
              </label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, marginTop: 10 }}>
              <Field label="connect via">
                <select
                  value={transport}
                  onChange={(e) => update(a.id, { transport: e.target.value as AgentConfig["transport"] })}
                  style={fieldStyle}
                >
                  <option value="cli">Terminal (CLI)</option>
                  <option value="api">API (key)</option>
                </select>
              </Field>
              {transport === "cli" ? (
                <Field label="terminal command">
                  <input style={fieldStyle} value={c.cmd ?? a.defaultCmd ?? ""} placeholder={a.defaultCmd || 'tool -p "{prompt}"'}
                    onChange={(e) => update(a.id, { cmd: e.target.value })} />
                </Field>
              ) : (
                <>
                  <Field label="provider">
                    <select
                      value={c.provider}
                      onChange={(e) => update(a.id, { provider: e.target.value as AgentConfig["provider"] })}
                      style={fieldStyle}
                    >
                      {PROVIDERS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </Field>
                  {c.provider === "http" ? (
                    <Field label="endpoint">
                      <input style={fieldStyle} value={c.endpoint || ""} placeholder="https://hermes.yourbox…"
                        onChange={(e) => update(a.id, { endpoint: e.target.value })} />
                    </Field>
                  ) : (
                    <Field label="model">
                      <input style={fieldStyle} value={c.model || ""} placeholder={a.defaultModel || ""}
                        onChange={(e) => update(a.id, { model: e.target.value })} />
                    </Field>
                  )}
                  <Field label={c.provider === "http" ? "bearer (optional)" : "API key"}>
                    <input style={fieldStyle} type="password" value={c.apiKey || ""} placeholder="•••••••"
                      onChange={(e) => update(a.id, { apiKey: e.target.value })} />
                  </Field>
                </>
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
