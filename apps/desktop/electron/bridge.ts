// MoreMe agent bridge — the physical hookup for an EXTERNAL AI (Hermes).
//
// When the AI master switch is set to "external", a tiny HTTP server starts
// on 127.0.0.1 and forwards JSON-RPC-ish calls into the renderer's
// window.moremeAgent surface. When the switch is "builtin" (the default),
// NOTHING listens — the server only exists while the user has explicitly
// handed the keys to an outside agent.
//
// Security posture:
//  - Binds 127.0.0.1 only. Never 0.0.0.0. A remote Hermes reaches it
//    through the user's own tunnel (SSH -L / tailscale), which is their
//    explicit choice — the app itself never exposes a network surface.
//  - Bearer token required on every call. Generated with crypto randomness,
//    persisted in userData so the user's Hermes config survives restarts,
//    regenerable from the UI at any time.
//  - The renderer dispatcher whitelists which agent-API roots are callable;
//    this server is a dumb pipe.

import { app, BrowserWindow, ipcMain } from "electron";
import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

export type AiMode = "builtin" | "external";
type AiPrefs = { mode: AiMode; token: string; port: number };

const DEFAULT_PORT = 38217;

function prefsPath() { return path.join(app.getPath("userData"), "ai-bridge.json"); }

function newToken(): string { return crypto.randomBytes(24).toString("hex"); }

function readAiPrefs(): AiPrefs {
  try {
    const j = JSON.parse(fs.readFileSync(prefsPath(), "utf8")) as Partial<AiPrefs>;
    return {
      mode: j.mode === "external" ? "external" : "builtin",
      token: typeof j.token === "string" && j.token.length >= 32 ? j.token : newToken(),
      port: typeof j.port === "number" && j.port > 1024 && j.port < 65536 ? j.port : DEFAULT_PORT,
    };
  } catch {
    return { mode: "builtin", token: newToken(), port: DEFAULT_PORT };
  }
}
function writeAiPrefs(p: AiPrefs) {
  try {
    fs.mkdirSync(path.dirname(prefsPath()), { recursive: true });
    fs.writeFileSync(prefsPath(), JSON.stringify(p));
  } catch { /* ignore */ }
}

let prefs: AiPrefs = readAiPrefs();
let server: http.Server | null = null;
let listening = false;

// ── renderer forwarding ─────────────────────────────────────────────────
// The bridge can't touch app state itself — it forwards each call to the
// renderer, where the whitelisted dispatcher executes it against
// window.moremeAgent and replies.

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: NodeJS.Timeout };
const pending = new Map<string, Pending>();

function invokeRenderer(pathStr: string, args: unknown[]): Promise<unknown> {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) return Promise.reject(new Error("app window not available"));
  const id = crypto.randomBytes(8).toString("hex");
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error("renderer did not respond within 15s"));
    }, 15_000);
    pending.set(id, { resolve, reject, timer });
    win.webContents.send("bridge:invoke", { id, path: pathStr, args });
  });
}

ipcMain.on("bridge:result", (_e, msg: { id: string; ok: boolean; result?: unknown; error?: string }) => {
  const p = pending.get(msg.id);
  if (!p) return;
  clearTimeout(p.timer);
  pending.delete(msg.id);
  if (msg.ok) p.resolve(msg.result);
  else p.reject(new Error(msg.error || "agent call failed"));
});

// ── the HTTP surface ────────────────────────────────────────────────────

function readBody(req: http.IncomingMessage, limit = 512 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > limit) { reject(new Error("body too large")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function send(res: http.ServerResponse, code: number, body: unknown) {
  const s = JSON.stringify(body);
  res.writeHead(code, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(s) });
  res.end(s);
}

// Served at GET /manual — the connect-time briefing for an external agent.
// This is the "extra info on top of your skill file": what the bridge can
// do, the wire-filing contract, and the house rules. It ships inside the
// app so it's always in sync with the build the agent is actually driving.
const MANUAL = `MOREME BRIDGE — CONNECT-TIME BRIEFING
You are connected to a live MoreMe install as its EXTERNAL AI. The built-in
model is off; generation is yours. This supplements your MoreMe skill file.

CALLS
POST /agent  Authorization: Bearer <token>
  body: { "path": "<namespace.method>", "args": [ ... ] }  ->  { ok, result }
Callable roots: state, tabs, widgets, ranks, achievements, theme, quotes, wire.
No subscriptions over HTTP — poll state() or wire.articles() as needed.

YOUR MAIN JOB — RUN THE NT5 NEWS NETWORK (wire namespace)
  wire.topics()    -> the user's desk: the subjects THEY chose. Cover these.
  wire.articles()  -> current wire, newest first (avoid duplicate titles).
  wire.pullReal()  -> pulls real headlines for enabled topics as plain snippets.
  wire.file(a)     -> file one article you wrote. Input:
    { title, body, kind?, category?, anchor_id?, image_url?,
      source_urls?, source_name?, topic_label? }
  wire.clear()     -> wipe the wire (destructive; only if asked).

SHAPES (kind) — length/structure is yours to honor:
  brief: 2-3 tight sentences. article: 4-6 paragraphs, blank-line separated.
  broadcast: ONE urgent sentence. blog: 3-4 paragraph opinion column.
  social: <=280 chars, casual anchor voice. ticker: one crawl line, no card.
ANCHORS (anchor_id): voss lead/authoritative · lena field/energetic ·
  orin tech+space/measured · dex gaming/snappy · zara culture/warm.
CATEGORIES: breaking field earth_trending gaming space tech culture cc_lore.

HOUSE RULES (non-negotiable)
- Never fabricate real-world news. Real stories need real source_urls you
  actually consulted. Fiction is allowed ONLY as category cc_lore (the Nova
  Terris universe) and never carries source URLs.
- NO EMOJIS in anything user-visible. Geometric marks are fine.
- Assume nothing about the user; the topic desk is the whole brief.
- No fake data, no dead ends, no placeholder content anywhere in the app.
- Achievements/state: never write unlockedAchievements or bump the grade.

ALSO AVAILABLE (same POST /agent contract)
  state() — full app state. tabs/widgets/ranks/achievements/theme/quotes —
  the full runtime customization surface documented in your skill file.
MoreMe nav for reference: sidebar groups DAY (Today, Calendar), SCHOOL
(Get Ahead), BUILD (Projects|Plans, Empire), SELF (Goals, Screens,
Progress), YOURS (dynamic tabs). NT5: Front Page / Broadcast / Topics.
`;

function authorized(req: http.IncomingMessage): boolean {
  const h = req.headers.authorization || "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  if (!m) return false;
  const given = Buffer.from(m[1]);
  const want = Buffer.from(prefs.token);
  return given.length === want.length && crypto.timingSafeEqual(given, want);
}

function startServer() {
  if (server) return;
  server = http.createServer(async (req, res) => {
    try {
      // Health probe is the only unauthenticated route — it reveals nothing
      // beyond "something speaks the bridge protocol here" and where the
      // briefing lives.
      if (req.method === "GET" && req.url === "/health") {
        send(res, 200, { ok: true, app: "moreme", bridge: 1, manual: "/manual" });
        return;
      }
      if (!authorized(req)) { send(res, 401, { ok: false, error: "unauthorized" }); return; }

      // The connect-time briefing: read this first on every new session —
      // it supplements the agent's skill file with the live contract.
      if (req.method === "GET" && req.url === "/manual") {
        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(MANUAL);
        return;
      }

      if (req.method === "POST" && req.url === "/agent") {
        const raw = await readBody(req);
        let parsed: { path?: unknown; args?: unknown };
        try { parsed = JSON.parse(raw); } catch { send(res, 400, { ok: false, error: "invalid JSON" }); return; }
        const p = typeof parsed.path === "string" ? parsed.path : "";
        const args = Array.isArray(parsed.args) ? parsed.args : [];
        if (!p) { send(res, 400, { ok: false, error: "missing path" }); return; }
        try {
          const result = await invokeRenderer(p, args);
          send(res, 200, { ok: true, result });
        } catch (e) {
          send(res, 422, { ok: false, error: e instanceof Error ? e.message : String(e) });
        }
        return;
      }

      send(res, 404, { ok: false, error: "unknown route" });
    } catch (e) {
      try { send(res, 500, { ok: false, error: e instanceof Error ? e.message : String(e) }); } catch { /* ignore */ }
    }
  });
  server.on("error", () => { listening = false; });
  server.listen(prefs.port, "127.0.0.1", () => { listening = true; });
}

function stopServer() {
  if (!server) return;
  try { server.close(); } catch { /* ignore */ }
  server = null;
  listening = false;
}

function applyMode() {
  if (prefs.mode === "external") startServer();
  else stopServer();
}

// ── IPC for the renderer UI (the AI card in Customize) ──────────────────

export function setupBridge() {
  ipcMain.handle("ai:get", () => ({ mode: prefs.mode, port: prefs.port, token: prefs.token, listening }));
  ipcMain.handle("ai:set", (_e, mode: AiMode) => {
    prefs = { ...prefs, mode: mode === "external" ? "external" : "builtin" };
    writeAiPrefs(prefs);
    applyMode();
    return { mode: prefs.mode, port: prefs.port, token: prefs.token, listening };
  });
  ipcMain.handle("ai:regenToken", () => {
    prefs = { ...prefs, token: newToken() };
    writeAiPrefs(prefs);
    return { mode: prefs.mode, port: prefs.port, token: prefs.token, listening };
  });
  app.on("before-quit", () => stopServer());
  applyMode();
}
