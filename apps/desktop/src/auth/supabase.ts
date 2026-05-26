// Accounts via Supabase Auth (GoTrue REST). Uses the project's anon key, which
// is designed to ship in clients (RLS protects data) — so it can be baked into
// the build or entered in-app. The DB password / service role is NEVER used
// client-side. The project URL is pre-filled from the known project ref; the
// anon key is configured in-app (or bundled at release).

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";

const CFG = "nchub.supabase.cfg.v1";
const SESS = "nchub.supabase.session.v1";

export type SupaCfg = { url: string; anon: string };
export type Session = { token: string; refresh: string; email: string; userId: string };

export function loadCfg(): SupaCfg {
  // A user-saved backend (Login → Backend setup) overrides the baked default.
  try {
    const c = JSON.parse(localStorage.getItem(CFG) || "");
    if (c && c.url && c.anon) return { url: c.url, anon: c.anon };
  } catch {
    /* ignore */
  }
  return { url: SUPABASE_URL, anon: SUPABASE_ANON_KEY };
}
export function saveCfg(c: SupaCfg) {
  localStorage.setItem(CFG, JSON.stringify(c));
}
export function configured(): boolean {
  const c = loadCfg();
  return !!(c.url && c.anon);
}

export function getSession(): Session | null {
  try {
    return JSON.parse(localStorage.getItem(SESS) || "") as Session;
  } catch {
    return null;
  }
}
function setSession(s: Session | null) {
  if (s) localStorage.setItem(SESS, JSON.stringify(s));
  else localStorage.removeItem(SESS);
}

async function call(path: string, body: unknown) {
  const c = loadCfg();
  return window.hub.net({
    method: "POST",
    url: `${c.url.replace(/\/$/, "")}${path}`,
    headers: { apikey: c.anon, "Content-Type": "application/json" },
    body,
  });
}

type GoTrueOk = { access_token: string; refresh_token: string; user: { id: string; email: string } };
function asSession(d: unknown): Session | null {
  const g = d as Partial<GoTrueOk>;
  if (g && g.access_token && g.user) {
    return { token: g.access_token, refresh: g.refresh_token || "", email: g.user.email, userId: g.user.id };
  }
  return null;
}
function errMsg(d: unknown): string {
  const e = d as { error_description?: string; msg?: string; message?: string; error?: string };
  return e?.error_description || e?.msg || e?.message || e?.error || "Authentication failed.";
}

export async function signIn(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const r = await call("/auth/v1/token?grant_type=password", { email, password });
  if (r.ok) {
    const s = asSession(r.data);
    if (s) { setSession(s); return { ok: true }; }
  }
  return { ok: false, error: errMsg(r.data) };
}

export async function signUp(email: string, password: string): Promise<{ ok: boolean; error?: string; needsConfirm?: boolean }> {
  const r = await call("/auth/v1/signup", { email, password });
  if (r.ok) {
    const s = asSession(r.data);
    if (s) { setSession(s); return { ok: true }; }
    // project requires email confirmation — no session returned
    return { ok: true, needsConfirm: true };
  }
  return { ok: false, error: errMsg(r.data) };
}

export function signOut() {
  setSession(null);
}

// guest mode so the app is never hard-blocked when no backend is configured
const GUEST = "nchub.guest.v1";
export function isGuest(): boolean {
  return localStorage.getItem(GUEST) === "1";
}
export function setGuest() {
  localStorage.setItem(GUEST, "1");
}
export function clearGuest() {
  localStorage.removeItem(GUEST);
}

export function isAuthed(): boolean {
  return !!getSession() || isGuest();
}
