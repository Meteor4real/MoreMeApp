import { app, BrowserWindow, ipcMain, shell, session, safeStorage, Tray, Menu, nativeImage } from "electron";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import os from "node:os";

// In a CJS build __dirname exists; guard for ESM just in case.
const dir =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

const DEV_URL = process.env.VITE_DEV_SERVER_URL;

let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let quitting = false;

// Background prefs — stored on disk so the user's choices survive restarts.
type BgPrefs = { minimizeToTray: boolean; runOnStartup: boolean };
function bgPrefsPath() { return path.join(app.getPath("userData"), "bg-prefs.json"); }
function readBgPrefs(): BgPrefs {
  try { return { minimizeToTray: false, runOnStartup: false, ...JSON.parse(fs.readFileSync(bgPrefsPath(), "utf8")) }; }
  catch { return { minimizeToTray: false, runOnStartup: false }; }
}
function writeBgPrefs(p: BgPrefs) {
  try { fs.mkdirSync(path.dirname(bgPrefsPath()), { recursive: true }); fs.writeFileSync(bgPrefsPath(), JSON.stringify(p)); } catch { /* ignore */ }
}
function applyBgPrefs(p: BgPrefs) {
  if (process.platform !== "linux") {
    try { app.setLoginItemSettings({ openAtLogin: !!p.runOnStartup, openAsHidden: true }); } catch { /* ignore */ }
  }
}

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

  // When the user closes the window AND they've opted into "minimize to tray",
  // hide instead of destroy — the renderer keeps running so the NT5 wire
  // scheduler + Origin Realms poll + AI session stay alive in the background.
  win.on("close", (e) => {
    if (quitting) return;
    if (readBgPrefs().minimizeToTray) {
      e.preventDefault();
      win?.hide();
    }
  });
  win.on("closed", () => { win = null; });
}

function ensureTray() {
  if (tray) return tray;
  const iconPath = path.join(dir, "../build/icon.png");
  let img = nativeImage.createFromPath(iconPath);
  if (img.isEmpty()) img = nativeImage.createEmpty();
  tray = new Tray(img);
  tray.setToolTip("NetworkChuck Hub — running in the background");
  refreshTrayMenu();
  tray.on("click", () => { if (win) { win.show(); win.focus(); } else createWindow(); });
  return tray;
}
function refreshTrayMenu() {
  if (!tray) return;
  const p = readBgPrefs();
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Show NetworkChuck Hub", click: () => { if (win) { win.show(); win.focus(); } else createWindow(); } },
    { type: "separator" },
    { label: "Run on system startup", type: "checkbox", checked: p.runOnStartup, click: (m) => { const next = { ...p, runOnStartup: !!m.checked }; writeBgPrefs(next); applyBgPrefs(next); refreshTrayMenu(); } },
    { label: "Close button hides to tray (background NT5 wire)", type: "checkbox", checked: p.minimizeToTray, click: (m) => { const next = { ...p, minimizeToTray: !!m.checked }; writeBgPrefs(next); refreshTrayMenu(); } },
    { type: "separator" },
    { label: "Quit", click: () => { quitting = true; app.quit(); } },
  ]));
}

app.whenReady().then(() => {
  configureSecurity();
  registerIpc();
  ensureTray();
  applyBgPrefs(readBgPrefs());
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("before-quit", () => { quitting = true; });

// Harden every webview the renderer creates: no node, context-isolated, no
// extra preload, external links to the OS browser.
app.on("web-contents-created", (_e, contents) => {
  contents.on("will-attach-webview", (_evt, webPreferences) => {
    delete (webPreferences as { preload?: string }).preload;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
  });
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) shell.openExternal(url);
    return { action: "deny" };
  });
});

// ---------------------------------------------------------------------------
// Browser security (DuckDuckGo-style): tracker blocking, HTTPS-upgrade on
// top-level navigations, DNT/GPC headers, deny-by-default permissions, and a
// de-fingerprinted user agent. Applied to both the default and hub sessions.
// ---------------------------------------------------------------------------

const TRACKER_HOSTS = [
  "doubleclick.net", "googlesyndication.com", "google-analytics.com",
  "googletagmanager.com", "adservice.google.com", "scorecardresearch.com",
  "quantserve.com", "adnxs.com", "criteo.com", "taboola.com", "outbrain.com",
  "connect.facebook.net", "facebook.net", "hotjar.com", "mixpanel.com",
  "segment.com", "segment.io", "amplitude.com", "fullstory.com",
  "doubleverify.com", "adsafeprotected.com", "moatads.com", "bat.bing.com",
  "ads-twitter.com", "analytics.tiktok.com", "pixel.facebook.com",
  "stats.g.doubleclick.net", "app-measurement.com", "branch.io",
];

function hostBlocked(rawUrl: string): boolean {
  try {
    const h = new URL(rawUrl).hostname.toLowerCase();
    return TRACKER_HOSTS.some((t) => h === t || h.endsWith("." + t));
  } catch {
    return false;
  }
}

const ALLOWED_PERMS = new Set(["fullscreen", "clipboard-sanitized-write"]);

// Camera/mic are allowed only for the app's OWN UI (HALOS Meet), never for
// remote sites loaded in browser webviews.
function isAppOrigin(u?: string): boolean {
  if (!u) return false;
  return u.startsWith("file://") || (!!DEV_URL && u.startsWith(DEV_URL));
}

function harden(ses: Electron.Session) {
  ses.webRequest.onBeforeRequest((details, cb) => {
    if (hostBlocked(details.url)) return cb({ cancel: true });
    // Upgrade insecure top-level navigations to HTTPS (skip localhost).
    if (
      details.resourceType === "mainFrame" &&
      details.url.startsWith("http://") &&
      !/^http:\/\/(localhost|127\.|\[::1\]|0\.0\.0\.0)/i.test(details.url)
    ) {
      return cb({ redirectURL: details.url.replace(/^http:/i, "https:") });
    }
    cb({});
  });

  ses.webRequest.onBeforeSendHeaders((details, cb) => {
    details.requestHeaders["DNT"] = "1";
    details.requestHeaders["Sec-GPC"] = "1";
    cb({ requestHeaders: details.requestHeaders });
  });

  ses.setPermissionRequestHandler((_wc, perm, cb, details) => {
    if (ALLOWED_PERMS.has(perm)) return cb(true);
    if (perm === "media" && isAppOrigin(details?.requestingUrl)) return cb(true);
    cb(false);
  });
  ses.setPermissionCheckHandler((_wc, perm, origin) => {
    if (ALLOWED_PERMS.has(perm)) return true;
    if (perm === "media" && isAppOrigin(origin)) return true;
    return false;
  });

  const ua = ses
    .getUserAgent()
    .replace(/ Electron\/[\d.]+/i, "")
    .replace(/ NetworkChuck Hub\/[\d.]+/i, "");
  ses.setUserAgent(ua);
}

function configureSecurity() {
  harden(session.defaultSession);
  try {
    harden(session.fromPartition("persist:hub"));
  } catch {
    /* partition created lazily; will inherit on first use */
  }
  attachDownloads(session.defaultSession);
  try { attachDownloads(session.fromPartition("persist:hub")); } catch { /* same */ }
}

// --- Downloads ------------------------------------------------------------
type DownloadRec = { id: string; filename: string; path: string; url: string; bytes: number; state: "completed" | "interrupted" | "cancelled"; ts: number };
function downloadsPath() { return path.join(app.getPath("userData"), "downloads.json"); }
function readDownloads(): DownloadRec[] {
  try { return JSON.parse(fs.readFileSync(downloadsPath(), "utf8")) as DownloadRec[]; } catch { return []; }
}
function writeDownloads(arr: DownloadRec[]) {
  try {
    fs.mkdirSync(path.dirname(downloadsPath()), { recursive: true });
    fs.writeFileSync(downloadsPath(), JSON.stringify(arr.slice(0, 1000)));
  } catch { /* ignore */ }
}
function broadcastDownloads(win?: BrowserWindow) {
  const arr = readDownloads();
  const w = win ?? BrowserWindow.getAllWindows()[0];
  w?.webContents.send("downloads:updated", arr);
}
function attachDownloads(ses: Electron.Session) {
  ses.on("will-download", (_e, item) => {
    const id = String(Date.now()) + Math.random().toString(36).slice(2, 6);
    const savePath = path.join(app.getPath("downloads"), item.getFilename());
    item.setSavePath(savePath);
    item.on("done", (_evt, state) => {
      const rec: DownloadRec = {
        id,
        filename: item.getFilename(),
        path: savePath,
        url: item.getURL(),
        bytes: item.getTotalBytes(),
        state: state === "completed" ? "completed" : state === "cancelled" ? "cancelled" : "interrupted",
        ts: Date.now(),
      };
      const arr = [rec, ...readDownloads()];
      writeDownloads(arr);
      broadcastDownloads();
    });
  });
}

app.on("window-all-closed", () => {
  // If the user explicitly chose Quit (from tray or menu), let it through.
  // Otherwise — when we run in tray mode — staying alive is the point.
  if (quitting) { app.quit(); return; }
  if (process.platform === "darwin") return;
  // Non-mac: only quit if there's no tray running OR the user hasn't opted into
  // background mode. Tray + minimizeToTray means stay alive.
  if (!tray || !readBgPrefs().minimizeToTray) app.quit();
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

const terminals = new Map<string, Pty>();

// Split a command line into argv, honoring single/double quotes. A "{prompt}"
// token is replaced by the prompt; if none is present the prompt is appended.
function buildArgv(cmd: string, prompt: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m: RegExpExecArray | null;
  let hadToken = false;
  while ((m = re.exec(cmd))) {
    const tok = m[1] ?? m[2] ?? m[3];
    if (tok.includes("{prompt}")) {
      hadToken = true;
      out.push(tok.replace(/\{prompt\}/g, prompt));
    } else {
      out.push(tok);
    }
  }
  if (!hadToken) out.push(prompt);
  return out;
}

async function runAgentCli(
  cmd: string,
  prompt: string,
  timeoutMs: number
): Promise<{ ok: boolean; text?: string; error?: string }> {
  const argv = buildArgv(cmd.trim(), prompt);
  if (!argv.length) return { ok: false, error: "No command configured." };
  const file = argv[0];
  const args = argv.slice(1);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { spawn } = require("node:child_process") as typeof import("node:child_process");
  return new Promise((resolve) => {
    let proc: ReturnType<typeof spawn>;
    try {
      proc = spawn(file, args, { shell: false, windowsHide: true });
    } catch (err) {
      resolve({ ok: false, error: String(err) });
      return;
    }
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      proc.kill();
      resolve({ ok: false, error: `Timed out after ${Math.round(timeoutMs / 1000)}s. Is "${file}" installed and logged in?` });
    }, timeoutMs);
    proc.stdout?.on("data", (d: Buffer) => (out += d.toString()));
    proc.stderr?.on("data", (d: Buffer) => (err += d.toString()));
    proc.on("error", (e: Error) => {
      clearTimeout(timer);
      resolve({ ok: false, error: `Could not start "${file}": ${e.message}` });
    });
    proc.on("close", (code: number) => {
      clearTimeout(timer);
      const text = out.trim() || err.trim();
      if (code === 0 || text) resolve({ ok: true, text });
      else resolve({ ok: false, error: err.trim() || `Exited with code ${code}.` });
    });
  });
}

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

  // --- General JSON request (CORS-free) — used by Supabase auth, etc. ---
  ipcMain.handle(
    "net:request",
    async (_e, opts: { method: string; url: string; headers?: Record<string, string>; body?: unknown }) => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 15000);
        const res = await fetch(opts.url, {
          method: opts.method,
          headers: opts.headers,
          body: opts.body != null ? JSON.stringify(opts.body) : undefined,
          signal: ctrl.signal,
        });
        clearTimeout(t);
        const txt = await res.text();
        let data: unknown = null;
        try {
          data = txt ? JSON.parse(txt) : null;
        } catch {
          data = txt;
        }
        return { ok: res.ok, status: res.status, data };
      } catch (err) {
        return { ok: false, status: 0, error: String(err) };
      }
    }
  );

  // --- AI group chat: multi-provider chat completion (CORS-free) ---
  ipcMain.handle("ai:chat", async (_e, req: AiChatRequest): Promise<AiChatResult> => {
    try {
      return await aiChat(req);
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  // --- AI via Terminal: run a CLI agent (claude/gemini/codex/opencode, or
  // an ssh to Hermes on Hostinger) non-interactively and return its output.
  // The user configures the command per agent; {prompt} is substituted, else
  // the prompt is appended as the final argument. Runs with shell:false.
  ipcMain.handle("agent:run", async (_e, cmd: string, prompt: string, timeoutMs?: number) => {
    return runAgentCli(cmd, prompt, timeoutMs ?? 180000);
  });

  // --- Launchers (Steam / Modrinth / Blockbench / arbitrary URI) ---
  ipcMain.handle("launch:steam", (_e, appId?: string) => {
    const uri = appId ? `steam://rungameid/${appId}` : "steam://open/games";
    return shell.openExternal(uri).then(() => true).catch(() => false);
  });
  ipcMain.handle("launch:uri", (_e, uri: string) => {
    return shell.openExternal(uri).then(() => true).catch(() => false);
  });
  ipcMain.handle("launch:path", async (_e, p: string) => {
    const err = await shell.openPath(p);
    return { ok: !err, error: err || undefined };
  });
  ipcMain.handle("steam:list", () => listSteamGames());

  // --- Downloads — captured from webview sessions (will-download) ---
  ipcMain.handle("downloads:list", () => readDownloads());
  ipcMain.handle("downloads:clear", () => { writeDownloads([]); broadcastDownloads(); return { ok: true }; });
  ipcMain.handle("downloads:remove", (_e, id: string) => { writeDownloads(readDownloads().filter((d) => d.id !== id)); broadcastDownloads(); return { ok: true }; });
  ipcMain.handle("downloads:open", (_e, p: string) => shell.openPath(p));
  ipcMain.handle("downloads:reveal", (_e, p: string) => { shell.showItemInFolder(p); return { ok: true }; });

  // --- Background / Tray prefs — drives true cross-reboot "24/7" mode ---
  ipcMain.handle("bg:get", () => readBgPrefs());
  ipcMain.handle("bg:set", (_e, p: Partial<{ minimizeToTray: boolean; runOnStartup: boolean }>) => {
    const next = { ...readBgPrefs(), ...p };
    writeBgPrefs(next);
    applyBgPrefs(next);
    refreshTrayMenu();
    return next;
  });
  ipcMain.handle("bg:quit", () => { quitting = true; app.quit(); });

  // --- System pulse — CPU load + free memory + free disk for the user's
  //     home volume. Used by the floating info widget. ---
  ipcMain.handle("sys:pulse", async () => {
    const cpus = os.cpus();
    let total = 0, idle = 0;
    for (const c of cpus) {
      idle += c.times.idle;
      total += c.times.user + c.times.nice + c.times.sys + c.times.irq + c.times.idle;
    }
    const cpuPct = total ? Math.round(100 * (1 - idle / total)) : 0;
    const memTotal = os.totalmem();
    const memFree = os.freemem();
    const memPct = Math.round(100 * (1 - memFree / memTotal));
    let diskFree = 0, diskTotal = 0;
    try {
      const stats = fs.statfsSync(os.homedir());
      diskTotal = Number(stats.blocks) * Number(stats.bsize);
      diskFree = Number(stats.bfree) * Number(stats.bsize);
    } catch { /* not all platforms */ }
    return { cpuPct, memPct, memFreeGb: memFree / 1024 / 1024 / 1024, diskFreeGb: diskFree / 1024 / 1024 / 1024, diskTotalGb: diskTotal / 1024 / 1024 / 1024 };
  });

  // --- Media: anchor voices via the Hub voice service.
  //     The Hub ships with its OWN voices — end users never plug in their
  //     own ElevenLabs key. The desktop client calls a hosted proxy that
  //     holds the key server-side; the proxy URL is configurable via env
  //     so the owner can repoint it without shipping a new binary. If the
  //     proxy is unreachable, the renderer falls back to Web Speech.
  const VOICE_PROXY_BASE = process.env.NCHUB_VOICE_PROXY || "https://voice.networkchuckhub.app";
  ipcMain.handle("media:tts", async (_e, opts: { voiceId: string; text: string; model?: string }) => {
    try {
      const r = await fetch(`${VOICE_PROXY_BASE}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "audio/mpeg" },
        body: JSON.stringify({ voiceId: opts.voiceId, text: opts.text, model: opts.model || "eleven_turbo_v2_5" }),
      });
      if (!r.ok) return { ok: false, error: `Voice proxy ${r.status}` };
      const buf = Buffer.from(await r.arrayBuffer());
      return { ok: true, mime: "audio/mpeg", base64: buf.toString("base64") };
    } catch (err) { return { ok: false, error: String(err) }; }
  });
  ipcMain.handle("media:voices", async () => {
    try {
      const r = await fetch(`${VOICE_PROXY_BASE}/voices`);
      if (!r.ok) return { ok: false, error: `Voice proxy ${r.status}` };
      const j = await r.json() as { voices?: { id: string; name: string; labels?: Record<string, string> }[] };
      return { ok: true, voices: (j.voices || []).map((v) => ({ id: v.id, name: v.name, labels: v.labels || {} })) };
    } catch (err) { return { ok: false, error: String(err) }; }
  });
  ipcMain.handle("media:pexelsVideo", async (_e, opts: { query: string; perPage?: number }) => {
    const cred = vaultGet("pexels");
    if (!cred.token) return { ok: false, error: "Connect Pexels in the Control Panel first." };
    try {
      const r = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(opts.query)}&per_page=${opts.perPage || 6}&orientation=landscape`, {
        headers: { Authorization: cred.token },
      });
      if (!r.ok) return { ok: false, error: `Pexels ${r.status}` };
      const j = await r.json() as { videos?: { id: number; image: string; duration: number; video_files: { link: string; quality: string; width: number; height: number }[] }[] };
      const videos = (j.videos || []).map((v) => {
        // Pick the best HD-or-smaller file (avoid massive 4K bytes inside the iframe).
        const file = v.video_files.find((f) => f.quality === "hd" && f.width <= 1920) || v.video_files[0];
        return { id: v.id, poster: v.image, duration: v.duration, url: file?.link };
      }).filter((v) => v.url);
      return { ok: true, videos };
    } catch (err) { return { ok: false, error: String(err) }; }
  });

  // --- Terminal (PowerShell on Windows) via node-pty. Sessions are keyed by
  //     a caller-provided string ID so the renderer can run multiple shells
  //     in parallel and keep them alive across React tab switches.
  ipcMain.handle("term:start", (e, sessionId: string, cols: number, rows: number) => {
    let pty: {
      spawn: (
        file: string,
        args: string[],
        opts: Record<string, unknown>
      ) => {
        onData: (cb: (d: string) => void) => void;
        onExit: (cb: (e: unknown) => void) => void;
        write: (d: string) => void;
        resize: (c: number, r: number) => void;
        kill: () => void;
      };
    };
    try {
      pty = require("@homebridge/node-pty-prebuilt-multiarch");
    } catch (err) {
      return { ok: false, error: "pty unavailable: " + String(err) };
    }
    if (terminals.has(sessionId)) return { ok: true }; // already running
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
    wrapped.onData((d) => e.sender.send("term:data", sessionId, d));
    wrapped.onExit(() => {
      e.sender.send("term:exit", sessionId);
      terminals.delete(sessionId);
    });
    terminals.set(sessionId, wrapped);
    return { ok: true };
  });

  ipcMain.on("term:input", (_e, sessionId: string, data: string) => {
    terminals.get(sessionId)?.write(data);
  });
  ipcMain.on("term:resize", (_e, sessionId: string, cols: number, rows: number) => {
    terminals.get(sessionId)?.resize(cols, rows);
  });
  ipcMain.on("term:kill", (_e, sessionId: string) => {
    terminals.get(sessionId)?.kill();
    terminals.delete(sessionId);
  });
  ipcMain.handle("term:list", () => [...terminals.keys()]);

  // --- Local LLM (node-llama-cpp) — powers the house AIs (Tom/NT5/BroBot),
  //     no API key. Model downloads once on first use. ---
  ipcMain.handle("llm:status", () => ({ ready: llmReady, downloading: llmDownloading, progress: llmProgress }));
  ipcMain.handle("llm:ensure", (e) => ensureLlm((p) => e.sender.send("llm:progress", p)));
  ipcMain.handle("llm:chat", (_e, system: string, prompt: string) =>
    llmChat(system, prompt).catch((err) => ({ ok: false, error: String(err) }))
  );

  // --- Per-user connection vault (secure, on-device) ---
  ipcMain.handle("vault:list", () => vaultList());
  ipcMain.handle("vault:get", (_e, service: string) => vaultGet(service));
  ipcMain.handle("vault:set", (_e, service: string, token: string, baseUrl?: string) =>
    vaultSet(service, token, baseUrl)
  );
  ipcMain.handle("vault:delete", (_e, service: string) => vaultDelete(service));
}

// ---------------------------------------------------------------------------
// Local LLM (node-llama-cpp). Downloads Llama-3.2-3B-Instruct (~2 GB) once to
// userData/models, then runs fully offline. Powers Tutorial Tom, NT5's wire,
// BroBot's chat, and SignalFinder drafts — no API key.
// ---------------------------------------------------------------------------
const MODEL_URL = "https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf";
const MODEL_FILE = "Llama-3.2-3B-Instruct-Q4_K_M.gguf";
let llmReady = false;
let llmDownloading = false;
let llmProgress = 0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let llamaModel: any = null;

function modelDir() {
  return path.join(app.getPath("userData"), "models");
}
function modelPath() {
  return path.join(modelDir(), MODEL_FILE);
}

async function ensureLlm(onProgress?: (p: number) => void): Promise<{ ok: boolean; error?: string }> {
  try {
    if (llmReady) return { ok: true };
    fs.mkdirSync(modelDir(), { recursive: true });
    const target = modelPath();
    if (!fs.existsSync(target)) {
      llmDownloading = true;
      llmProgress = 0;
      try {
        const res = await fetch(MODEL_URL);
        if (!res.ok || !res.body) throw new Error(`model download failed: ${res.status}`);
        const total = Number(res.headers.get("content-length") || 0);
        let loaded = 0;
        const tmp = target + ".partial";
        const out = fs.createWriteStream(tmp);
        const reader = (res.body as ReadableStream<Uint8Array>).getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            out.write(Buffer.from(value));
            loaded += value.byteLength;
            if (total) {
              llmProgress = loaded / total;
              onProgress?.(llmProgress);
            }
          }
        }
        out.end();
        await new Promise<void>((r) => out.on("close", () => r()));
        fs.renameSync(tmp, target);
      } finally {
        llmDownloading = false;
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import("node-llama-cpp");
    const llama = await mod.getLlama();
    llamaModel = await llama.loadModel({ modelPath: target });
    llmReady = true;
    return { ok: true };
  } catch (err) {
    llmDownloading = false;
    return { ok: false, error: String(err) };
  }
}

async function llmChat(system: string, prompt: string): Promise<{ ok: boolean; text?: string; error?: string }> {
  if (!llmReady) {
    const r = await ensureLlm();
    if (!r.ok) return { ok: false, error: r.error || "model not ready" };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import("node-llama-cpp");
  const context = await llamaModel.createContext();
  try {
    const session = new mod.LlamaChatSession({ contextSequence: context.getSequence(), systemPrompt: system });
    const text = await session.prompt(prompt, { maxTokens: 700 });
    return { ok: true, text };
  } finally {
    try {
      context.dispose?.();
    } catch {
      /* ignore */
    }
  }
}

// ---------------------------------------------------------------------------
// Connection vault — each user stores THEIR OWN service credentials in-app.
// Tokens encrypted with the OS keychain (safeStorage); persisted to userData.
// Never committed, never in env, never bundled.
// ---------------------------------------------------------------------------

type VaultEntry = { token?: string; baseUrl?: string }; // token = base64 cipher
type VaultFile = Record<string, VaultEntry>;

function vaultPath() {
  return path.join(app.getPath("userData"), "connections.json");
}
function readVault(): VaultFile {
  try {
    return JSON.parse(fs.readFileSync(vaultPath(), "utf8"));
  } catch {
    return {};
  }
}
function writeVault(v: VaultFile) {
  try {
    fs.writeFileSync(vaultPath(), JSON.stringify(v), "utf8");
  } catch {
    /* ignore */
  }
}
function enc(plain: string): string {
  if (safeStorage.isEncryptionAvailable()) return "v1:" + safeStorage.encryptString(plain).toString("base64");
  return "b64:" + Buffer.from(plain, "utf8").toString("base64"); // fallback if no keychain
}
function dec(stored: string): string {
  try {
    if (stored.startsWith("v1:")) return safeStorage.decryptString(Buffer.from(stored.slice(3), "base64"));
    if (stored.startsWith("b64:")) return Buffer.from(stored.slice(4), "base64").toString("utf8");
  } catch {
    /* ignore */
  }
  return "";
}
function vaultList() {
  const v = readVault();
  return Object.keys(v).map((service) => ({
    service,
    hasToken: !!v[service].token,
    baseUrl: v[service].baseUrl || "",
  }));
}
function vaultGet(service: string) {
  const e = readVault()[service];
  if (!e) return { token: "", baseUrl: "" };
  return { token: e.token ? dec(e.token) : "", baseUrl: e.baseUrl || "" };
}
function vaultSet(service: string, token: string, baseUrl?: string) {
  const v = readVault();
  v[service] = { token: token ? enc(token) : undefined, baseUrl: baseUrl || undefined };
  writeVault(v);
  return { ok: true };
}
function vaultDelete(service: string) {
  const v = readVault();
  delete v[service];
  writeVault(v);
  return { ok: true };
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

// ---------------------------------------------------------------------------
// Steam library scan (Windows): parse appmanifest_*.acf across library folders.
// ---------------------------------------------------------------------------

type SteamGame = { appid: string; name: string };
type SteamResult = { ok: boolean; error?: string; games: SteamGame[] };

function listSteamGames(): SteamResult {
  try {
    if (process.platform !== "win32") {
      return { ok: false, error: "Steam library scan is Windows-only.", games: [] };
    }
    const pf = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
    const steamDir = path.join(pf, "Steam");
    const libs = new Set<string>([path.join(steamDir, "steamapps")]);

    const libVdf = path.join(steamDir, "steamapps", "libraryfolders.vdf");
    if (fs.existsSync(libVdf)) {
      const txt = fs.readFileSync(libVdf, "utf8");
      const re = /"path"\s*"([^"]+)"/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(txt))) {
        libs.add(path.join(m[1].replace(/\\\\/g, "\\"), "steamapps"));
      }
    }

    const games: SteamGame[] = [];
    for (const lib of libs) {
      if (!fs.existsSync(lib)) continue;
      for (const f of fs.readdirSync(lib)) {
        if (!f.startsWith("appmanifest_") || !f.endsWith(".acf")) continue;
        const t = fs.readFileSync(path.join(lib, f), "utf8");
        const id = /"appid"\s*"(\d+)"/.exec(t);
        const nm = /"name"\s*"([^"]+)"/.exec(t);
        if (id && nm) games.push({ appid: id[1], name: nm[1] });
      }
    }
    games.sort((a, b) => a.name.localeCompare(b.name));
    return { ok: true, games };
  } catch (e) {
    return { ok: false, error: String(e), games: [] };
  }
}
