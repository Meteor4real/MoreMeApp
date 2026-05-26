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

  terminal: {
    start: (cols: number, rows: number): Promise<{ ok: boolean; error?: string }> =>
      ipcRenderer.invoke("term:start", cols, rows),
    input: (data: string) => ipcRenderer.send("term:input", data),
    resize: (cols: number, rows: number) =>
      ipcRenderer.send("term:resize", cols, rows),
    kill: () => ipcRenderer.send("term:kill"),
    onData: (cb: (data: string) => void) => {
      const fn = (_e: unknown, d: string) => cb(d);
      ipcRenderer.on("term:data", fn);
      return () => ipcRenderer.removeListener("term:data", fn);
    },
    onExit: (cb: () => void) => {
      const fn = () => cb();
      ipcRenderer.on("term:exit", fn);
      return () => ipcRenderer.removeListener("term:exit", fn);
    },
  },
};

contextBridge.exposeInMainWorld("hub", api);

export type HubApi = typeof api;
