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
