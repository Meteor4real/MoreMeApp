import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

// In a CJS build __dirname exists; guard for ESM just in case.
const dir =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

const DEV_URL = process.env.VITE_DEV_SERVER_URL;

let win: BrowserWindow | null = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#0a0a0c",
    show: false,
    autoHideMenuBar: true,
    title: "NetworkChuck Hub",
    webPreferences: {
      preload: path.join(dir, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true, // tabbed browser uses <webview>
    },
  });

  win.once("ready-to-show", () => win?.show());

  // External target=_blank links open in the OS browser, not new Electron windows.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) shell.openExternal(url);
    return { action: "deny" };
  });

  if (DEV_URL) {
    win.loadURL(DEV_URL);
  } else {
    win.loadFile(path.join(dir, "../dist/index.html"));
  }

  win.on("closed", () => {
    win = null;
  });
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------

type Pty = {
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  kill: () => void;
  onData: (cb: (data: string) => void) => void;
  onExit: (cb: () => void) => void;
};

const terminals = new Map<number, Pty>();

function defaultShell(): { file: string; args: string[] } {
  if (process.platform === "win32") {
    return { file: "powershell.exe", args: [] };
  }
  return { file: process.env.SHELL || "/bin/bash", args: [] };
}

function registerIpc() {
  ipcMain.handle("app:getVersion", () => app.getVersion());
  ipcMain.handle("app:platform", () => process.platform);

  // CORS-free JSON fetch from the main process (renderer fetch to the deployed
  // sites would be blocked by CORS). Used by the unified ticker/notifications.
  ipcMain.handle("feeds:fetch", async (_e, url: string) => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) return { ok: false, status: res.status };
      return { ok: true, data: await res.json() };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  // --- AI group chat: multi-provider chat completion (CORS-free) ---
  ipcMain.handle("ai:chat", async (_e, req: AiChatRequest): Promise<AiChatResult> => {
    try {
      return await aiChat(req);
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  // --- Launchers (Steam / Modrinth / Blockbench / arbitrary URI) ---
  ipcMain.handle("launch:steam", (_e, appId?: string) => {
    const uri = appId ? `steam://rungameid/${appId}` : "steam://open/games";
    return shell.openExternal(uri).then(() => true).catch(() => false);
  });
  ipcMain.handle("launch:uri", (_e, uri: string) => {
    return shell.openExternal(uri).then(() => true).catch(() => false);
  });

  // --- Terminal (PowerShell on Windows) via node-pty ---
  ipcMain.handle("term:start", (e, cols: number, rows: number) => {
    let pty: typeof import("node-pty");
    try {
      // Lazy require so a missing/native-unbuilt module doesn't crash startup.
      pty = require("node-pty");
    } catch (err) {
      return { ok: false, error: "node-pty unavailable: " + String(err) };
    }
    const id = e.sender.id;
    const { file, args } = defaultShell();
    const proc = pty.spawn(file, args, {
      name: "xterm-color",
      cols: cols || 80,
      rows: rows || 24,
      cwd: os.homedir(),
      env: process.env as Record<string, string>,
    });
    const wrapped: Pty = {
      write: (d) => proc.write(d),
      resize: (c, r) => proc.resize(c, r),
      kill: () => proc.kill(),
      onData: (cb) => proc.onData(cb),
      onExit: (cb) => proc.onExit(() => cb()),
    };
    wrapped.onData((d) => e.sender.send("term:data", d));
    wrapped.onExit(() => {
      e.sender.send("term:exit");
      terminals.delete(id);
    });
    terminals.set(id, wrapped);
    return { ok: true };
  });

  ipcMain.on("term:input", (e, data: string) => {
    terminals.get(e.sender.id)?.write(data);
  });
  ipcMain.on("term:resize", (e, cols: number, rows: number) => {
    terminals.get(e.sender.id)?.resize(cols, rows);
  });
  ipcMain.on("term:kill", (e) => {
    terminals.get(e.sender.id)?.kill();
    terminals.delete(e.sender.id);
  });
}

// ---------------------------------------------------------------------------
// AI providers
// ---------------------------------------------------------------------------

type AiMsg = { role: "user" | "assistant"; content: string };
type AiChatRequest = {
  provider: "anthropic" | "openai" | "gemini" | "http";
  endpoint?: string;
  apiKey?: string;
  model?: string;
  system: string;
  messages: AiMsg[];
};
type AiChatResult = { ok: true; text: string } | { ok: false; error: string };

async function aiChat(req: AiChatRequest): Promise<AiChatResult> {
  const { provider, apiKey, model, system, messages } = req;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 60000);
  const j = (r: Response) => r.json() as Promise<Record<string, unknown>>;
  try {
    if (provider === "anthropic") {
      if (!apiKey) return { ok: false, error: "missing API key" };
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: model || "claude-opus-4-7",
          max_tokens: 1024,
          // prompt caching: the role/system block is stable across turns
          system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await j(res);
      if (!res.ok) return { ok: false, error: errOf(data, res.status) };
      const blocks = data.content as { type: string; text?: string }[] | undefined;
      return { ok: true, text: blocks?.map((b) => b.text || "").join("") || "" };
    }

    if (provider === "openai") {
      if (!apiKey) return { ok: false, error: "missing API key" };
      const base = (req.endpoint || "https://api.openai.com/v1").replace(/\/$/, "");
      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: model || "gpt-4o-mini",
          messages: [{ role: "system", content: system }, ...messages],
        }),
      });
      const data = await j(res);
      if (!res.ok) return { ok: false, error: errOf(data, res.status) };
      const choices = data.choices as { message?: { content?: string } }[] | undefined;
      return { ok: true, text: choices?.[0]?.message?.content || "" };
    }

    if (provider === "gemini") {
      if (!apiKey) return { ok: false, error: "missing API key" };
      const m = model || "gemini-1.5-flash";
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          signal: ctrl.signal,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: messages.map((mm) => ({
              role: mm.role === "assistant" ? "model" : "user",
              parts: [{ text: mm.content }],
            })),
          }),
        }
      );
      const data = await j(res);
      if (!res.ok) return { ok: false, error: errOf(data, res.status) };
      const cands = data.candidates as
        | { content?: { parts?: { text?: string }[] } }[]
        | undefined;
      return { ok: true, text: cands?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "" };
    }

    // "http" — a generic endpoint (e.g. Hermes on Hostinger).
    if (!req.endpoint) return { ok: false, error: "missing endpoint" };
    const res = await fetch(req.endpoint, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "content-type": "application/json",
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ system, messages }),
    });
    const data = await j(res);
    if (!res.ok) return { ok: false, error: errOf(data, res.status) };
    const text =
      (data.reply as string) ||
      (data.text as string) ||
      (data.message as string) ||
      (typeof data === "string" ? (data as string) : JSON.stringify(data));
    return { ok: true, text };
  } finally {
    clearTimeout(t);
  }
}

function errOf(data: Record<string, unknown>, status: number): string {
  const e = data.error as { message?: string } | string | undefined;
  if (typeof e === "string") return e;
  return e?.message || `HTTP ${status}`;
}
