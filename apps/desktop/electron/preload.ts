import { contextBridge, ipcRenderer } from "electron";

// Context-isolated bridge. The renderer never touches Node/Electron directly.
const api = {
  getVersion: (): Promise<string> => ipcRenderer.invoke("app:getVersion"),
  platform: (): Promise<NodeJS.Platform> => ipcRenderer.invoke("app:platform"),

  launchSteam: (appId?: string): Promise<boolean> =>
    ipcRenderer.invoke("launch:steam", appId),
  launchUri: (uri: string): Promise<boolean> =>
    ipcRenderer.invoke("launch:uri", uri),
  launchPath: (p: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke("launch:path", p),
  steamList: (): Promise<{ ok: boolean; error?: string; games: { appid: string; name: string }[] }> =>
    ipcRenderer.invoke("steam:list"),

  fetchJson: <T = unknown>(
    url: string
  ): Promise<{ ok: boolean; data?: T; status?: number; error?: string }> =>
    ipcRenderer.invoke("feeds:fetch", url),

  net: (opts: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
  }): Promise<{ ok: boolean; status: number; data?: unknown; error?: string }> =>
    ipcRenderer.invoke("net:request", opts),

  gate: {
    get: (): Promise<string[]> => ipcRenderer.invoke("gate:get"),
    set: (codes: string[]): Promise<{ ok: boolean }> => ipcRenderer.invoke("gate:set", codes),
  },

  privacy: {
    apply: (p: { dntGpc?: boolean; block3p?: boolean }): Promise<{ ok: boolean }> =>
      ipcRenderer.invoke("privacy:apply", p),
  },

  tool: {
    exec: (command: string, cwd?: string): Promise<{ ok: boolean; code: number; stdout: string; stderr: string }> =>
      ipcRenderer.invoke("tool:exec", command, cwd),
    readFile: (p: string): Promise<{ ok: boolean; content?: string; error?: string }> =>
      ipcRenderer.invoke("tool:readFile", p),
    writeFile: (p: string, content: string): Promise<{ ok: boolean; error?: string }> =>
      ipcRenderer.invoke("tool:writeFile", p, content),
    listDir: (p: string): Promise<{ ok: boolean; entries?: { name: string; dir: boolean }[]; error?: string }> =>
      ipcRenderer.invoke("tool:listDir", p),
  },

  llm: {
    status: (): Promise<{ ready: boolean; downloading: boolean; progress: number }> =>
      ipcRenderer.invoke("llm:status"),
    ensure: (): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke("llm:ensure"),
    chat: (system: string, prompt: string, opts?: { temperature?: number; maxTokens?: number }): Promise<{ ok: boolean; text?: string; error?: string }> =>
      ipcRenderer.invoke("llm:chat", system, prompt, opts),
    onProgress: (cb: (p: number) => void) => {
      const fn = (_e: unknown, p: number) => cb(p);
      ipcRenderer.on("llm:progress", fn);
      return () => ipcRenderer.removeListener("llm:progress", fn);
    },
  },

  vault: {
    list: (): Promise<{ service: string; hasToken: boolean; baseUrl: string }[]> =>
      ipcRenderer.invoke("vault:list"),
    get: (service: string): Promise<{ token: string; baseUrl: string }> =>
      ipcRenderer.invoke("vault:get", service),
    set: (service: string, token: string, baseUrl?: string): Promise<{ ok: boolean }> =>
      ipcRenderer.invoke("vault:set", service, token, baseUrl),
    remove: (service: string): Promise<{ ok: boolean }> =>
      ipcRenderer.invoke("vault:delete", service),
  },

  aiChat: (req: {
    provider: "anthropic" | "openai" | "gemini" | "http";
    endpoint?: string;
    apiKey?: string;
    model?: string;
    system: string;
    messages: { role: "user" | "assistant"; content: string }[];
  }): Promise<{ ok: true; text: string } | { ok: false; error: string }> =>
    ipcRenderer.invoke("ai:chat", req),

  // Run a configured CLI agent (claude/gemini/codex/opencode, or ssh to Hermes)
  // non-interactively in the background and return its output for the chat UI.
  agentRun: (cmd: string, prompt: string): Promise<{ ok: boolean; text?: string; error?: string }> =>
    ipcRenderer.invoke("agent:run", cmd, prompt),

  bg: {
    get: (): Promise<{ minimizeToTray: boolean; runOnStartup: boolean }> => ipcRenderer.invoke("bg:get"),
    set: (p: Partial<{ minimizeToTray: boolean; runOnStartup: boolean }>): Promise<{ minimizeToTray: boolean; runOnStartup: boolean }> => ipcRenderer.invoke("bg:set", p),
    quit: (): Promise<void> => ipcRenderer.invoke("bg:quit"),
  },

  sys: {
    pulse: (): Promise<{ cpuPct: number; memPct: number; memFreeGb: number; diskFreeGb: number; diskTotalGb: number }> => ipcRenderer.invoke("sys:pulse"),
  },

  media: {
    tts: (opts: { voiceId: string; text: string; model?: string }): Promise<{ ok: true; mime: string; base64: string } | { ok: false; error: string }> =>
      ipcRenderer.invoke("media:tts", opts),
    voices: (): Promise<{ ok: true; voices: { id: string; name: string; labels: Record<string, string> }[] } | { ok: false; error: string }> =>
      ipcRenderer.invoke("media:voices"),
    pexelsVideo: (opts: { query: string; perPage?: number }): Promise<{ ok: true; videos: { id: number; poster: string; duration: number; url: string }[] } | { ok: false; error: string }> =>
      ipcRenderer.invoke("media:pexelsVideo", opts),
  },

  downloads: {
    list: (): Promise<Array<{ id: string; filename: string; path: string; url: string; bytes: number; state: string; ts: number }>> =>
      ipcRenderer.invoke("downloads:list"),
    clear: (): Promise<{ ok: boolean }> => ipcRenderer.invoke("downloads:clear"),
    remove: (id: string): Promise<{ ok: boolean }> => ipcRenderer.invoke("downloads:remove", id),
    open: (p: string): Promise<string> => ipcRenderer.invoke("downloads:open", p),
    reveal: (p: string): Promise<{ ok: boolean }> => ipcRenderer.invoke("downloads:reveal", p),
    onUpdated: (cb: (arr: Array<{ id: string; filename: string; path: string; url: string; bytes: number; state: string; ts: number }>) => void) => {
      const fn = (_e: unknown, arr: Array<{ id: string; filename: string; path: string; url: string; bytes: number; state: string; ts: number }>) => cb(arr);
      ipcRenderer.on("downloads:updated", fn);
      return () => ipcRenderer.removeListener("downloads:updated", fn);
    },
  },

  terminal: {
    start: (sessionId: string, cols: number, rows: number, shellKind?: string): Promise<{ ok: boolean; error?: string }> =>
      ipcRenderer.invoke("term:start", sessionId, cols, rows, shellKind),
    input: (sessionId: string, data: string) => ipcRenderer.send("term:input", sessionId, data),
    resize: (sessionId: string, cols: number, rows: number) =>
      ipcRenderer.send("term:resize", sessionId, cols, rows),
    kill: (sessionId: string) => ipcRenderer.send("term:kill", sessionId),
    list: (): Promise<string[]> => ipcRenderer.invoke("term:list"),
    onData: (cb: (sessionId: string, data: string) => void) => {
      const fn = (_e: unknown, id: string, d: string) => cb(id, d);
      ipcRenderer.on("term:data", fn);
      return () => ipcRenderer.removeListener("term:data", fn);
    },
    onExit: (cb: (sessionId: string) => void) => {
      const fn = (_e: unknown, id: string) => cb(id);
      ipcRenderer.on("term:exit", fn);
      return () => ipcRenderer.removeListener("term:exit", fn);
    },
  },
};

contextBridge.exposeInMainWorld("hub", api);

export type HubApi = typeof api;
