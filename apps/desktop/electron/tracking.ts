// MoreMe — OS-level foreground tracking. Opt-in by design (the user has to
// flip a switch). Polls the active window every 5 seconds via platform-
// native shell commands (no native node deps to compile):
//   Windows: PowerShell using user32!GetForegroundWindow + GetWindowText
//   macOS:   `osascript` AppleScript against System Events
//   Linux:   `xdotool getactivewindow getwindowname` (+ getwindowpid → /proc)
//
// Browser tabs: most browsers put the foreground tab's title in the window
// title (e.g. "YouTube — Google Chrome"). We parse "<tab> - <browser>" so
// each tab transition becomes its own session entry. Background tabs are
// not visible without a browser extension; this is the practical signal.
//
// Sessions are accumulated and flushed to disk (userData/tracking.json) so
// they survive restarts. The renderer reads via IPC tracking:report.

import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import fs from "node:fs";
import { exec } from "node:child_process";

const POLL_MS = 5_000;

export type TrackingPrefs = { enabled: boolean };
export type AppSession = {
  app: string;       // process / app name
  title: string;     // window title (often "<tab> — <browser>")
  tab?: string;      // parsed tab title (browsers only)
  browser?: string;  // browser name when tab is set
  start: number;     // ms epoch
  end: number;       // ms epoch
  durationMs: number;
};

function prefsPath() { return path.join(app.getPath("userData"), "tracking-prefs.json"); }
function dataPath()  { return path.join(app.getPath("userData"), "tracking.json"); }

export function readPrefs(): TrackingPrefs {
  try { return { enabled: false, ...JSON.parse(fs.readFileSync(prefsPath(), "utf8")) }; }
  catch { return { enabled: false }; }
}
function writePrefs(p: TrackingPrefs) {
  try { fs.mkdirSync(path.dirname(prefsPath()), { recursive: true }); fs.writeFileSync(prefsPath(), JSON.stringify(p)); } catch { /* ignore */ }
}

type AllSessions = { sessions: AppSession[] };
function readSessions(): AllSessions {
  try { const j = JSON.parse(fs.readFileSync(dataPath(), "utf8")); return { sessions: Array.isArray(j?.sessions) ? j.sessions : [] }; }
  catch { return { sessions: [] }; }
}
function writeSessions(s: AllSessions) {
  // Keep at most 30 days of sessions on disk so it can't run away.
  const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
  const trimmed = s.sessions.filter((x) => x.end >= cutoff);
  try { fs.writeFileSync(dataPath(), JSON.stringify({ sessions: trimmed })); } catch { /* ignore */ }
}

const BROWSER_HINTS = ["Google Chrome", "Chromium", "Firefox", "Microsoft Edge", "Safari", "Brave", "Opera", "Vivaldi", "Arc"];

// Parse "Tab Title — Browser" / "Tab Title - Browser". Most modern browsers
// use one of em-dash, en-dash, or hyphen as separator.
function parseTitle(raw: string): { tab?: string; browser?: string } {
  const t = raw.trim();
  for (const sep of [" — ", " – ", " - "]) {
    const i = t.lastIndexOf(sep);
    if (i > 0) {
      const after = t.slice(i + sep.length).trim();
      if (BROWSER_HINTS.includes(after)) return { tab: t.slice(0, i).trim(), browser: after };
    }
  }
  return {};
}

// Returns "<process/app name>|<window title>" or "" if unknown / failed.
function queryActiveWindow(): Promise<{ app: string; title: string } | null> {
  return new Promise((resolve) => {
    const platform = process.platform;
    let cmd = "";
    if (platform === "win32") {
      // PowerShell oneliner using PInvoke to call GetForegroundWindow +
      // GetWindowText + GetWindowThreadProcessId, then Get-Process for app name.
      cmd =
        'powershell -NoProfile -ExecutionPolicy Bypass -Command "' +
        "$sig=@'\n" +
        "using System;using System.Runtime.InteropServices;using System.Text;\n" +
        "public class W{[DllImport(\\\"user32.dll\\\")]public static extern IntPtr GetForegroundWindow();" +
        "[DllImport(\\\"user32.dll\\\")]public static extern int GetWindowText(IntPtr h,StringBuilder s,int n);" +
        "[DllImport(\\\"user32.dll\\\")]public static extern int GetWindowThreadProcessId(IntPtr h,out int pid);}\n" +
        "'@; Add-Type $sig; " +
        "$h=[W]::GetForegroundWindow(); $sb=New-Object System.Text.StringBuilder 512; [void][W]::GetWindowText($h,$sb,512); " +
        "$pid=0; [void][W]::GetWindowThreadProcessId($h,[ref]$pid); " +
        "$proc=(Get-Process -Id $pid -ErrorAction SilentlyContinue).ProcessName; " +
        "Write-Output \"$proc|$($sb.ToString())\"\"";
    } else if (platform === "darwin") {
      cmd =
        "osascript -e 'tell application \"System Events\" to set p to first application process whose frontmost is true' " +
        "-e 'tell p to set wn to (name of front window)' " +
        "-e 'set an to name of p' " +
        "-e 'return an & \"|\" & wn'";
    } else {
      // Linux — depends on xdotool being installed.
      cmd = "bash -c 'name=$(xdotool getactivewindow getwindowname 2>/dev/null); pid=$(xdotool getactivewindow getwindowpid 2>/dev/null); proc=$(cat /proc/$pid/comm 2>/dev/null); echo \"$proc|$name\"'";
    }
    exec(cmd, { timeout: 3000, windowsHide: true }, (err, stdout) => {
      if (err) { resolve(null); return; }
      const raw = (stdout || "").trim();
      const i = raw.indexOf("|");
      if (i < 0) { resolve(null); return; }
      const appName = raw.slice(0, i).trim();
      const title = raw.slice(i + 1).trim();
      if (!appName) { resolve(null); return; }
      resolve({ app: appName, title });
    });
  });
}

let pollTimer: NodeJS.Timeout | null = null;
let prefs: TrackingPrefs = readPrefs();
let current: { app: string; title: string; tab?: string; browser?: string; start: number } | null = null;
let lastTickFailures = 0;

function key(app: string, title: string) {
  const parsed = parseTitle(title);
  return `${app}|${parsed.tab ?? title}|${parsed.browser ?? ""}`;
}

function flushCurrent(now: number) {
  if (!current) return;
  const dur = Math.max(0, now - current.start);
  if (dur < 1500) { current = null; return; } // ignore flicker
  const all = readSessions();
  all.sessions.push({
    app: current.app,
    title: current.title,
    tab: current.tab,
    browser: current.browser,
    start: current.start,
    end: now,
    durationMs: dur,
  });
  writeSessions(all);
  current = null;
}

async function tick() {
  if (!prefs.enabled) return;
  const w = await queryActiveWindow();
  if (!w) {
    lastTickFailures++;
    // Five failures in a row probably means the OS query is just broken
    // on this machine. Flush the current session so we don't lie.
    if (lastTickFailures >= 5 && current) flushCurrent(Date.now());
    return;
  }
  lastTickFailures = 0;
  const parsed = parseTitle(w.title);
  const k = key(w.app, w.title);
  const now = Date.now();
  const curKey = current ? key(current.app, current.title) : null;
  if (curKey !== k) {
    flushCurrent(now);
    current = { app: w.app, title: w.title, tab: parsed.tab, browser: parsed.browser, start: now };
  }
  broadcast();
}

function broadcast() {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send("tracking:tick", { enabled: prefs.enabled, current });
  }
}

export function setupTracking() {
  const start = () => {
    if (pollTimer) return;
    pollTimer = setInterval(() => { void tick(); }, POLL_MS);
    void tick();
  };
  const stop = () => {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    flushCurrent(Date.now());
  };
  if (prefs.enabled) start();

  ipcMain.handle("tracking:get", () => ({ prefs, current }));
  ipcMain.handle("tracking:set", (_e, next: Partial<TrackingPrefs>) => {
    prefs = { ...prefs, ...next };
    writePrefs(prefs);
    if (prefs.enabled) start();
    else stop();
    broadcast();
    return prefs;
  });
  ipcMain.handle("tracking:report", (_e, args?: { sinceMs?: number }) => {
    const since = typeof args?.sinceMs === "number" ? args.sinceMs : 0;
    const { sessions } = readSessions();
    return { sessions: sessions.filter((x) => x.end >= since) };
  });
  ipcMain.handle("tracking:clear", () => {
    writeSessions({ sessions: [] });
    return { ok: true };
  });

  app.on("before-quit", () => { stop(); });
}
