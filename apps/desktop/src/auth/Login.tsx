import { useState } from "react";
import logoUrl from "../assets/logo.png";
import { signIn, signUp, loadCfg, saveCfg, configured, setGuest } from "./supabase";

export function Login({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showCfg, setShowCfg] = useState(!configured());
  const [cfg, setCfg] = useState(loadCfg);

  async function submit() {
    if (!configured()) {
      setMsg("Set the Supabase URL + anon key first, or continue as guest.");
      setShowCfg(true);
      return;
    }
    setBusy(true);
    setMsg(null);
    const r = mode === "login" ? await signIn(email.trim(), pw) : await signUp(email.trim(), pw);
    setBusy(false);
    if (r.ok) {
      if ("needsConfirm" in r && r.needsConfirm) {
        setMsg("Check your email to confirm your account, then sign in.");
        setMode("login");
        return;
      }
      onDone();
    } else {
      setMsg(r.error || "Failed.");
    }
  }

  return (
    <div style={{ height: "100vh", display: "grid", placeItems: "center", background: "radial-gradient(circle at 50% 30%, rgba(255,45,74,0.08), transparent 60%)" }}>
      <div className="panel" style={{ width: 380, maxWidth: "90vw", padding: 26 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <img src={logoUrl} width={84} height={84} alt="MoreMe" style={{ borderRadius: 16, filter: "drop-shadow(0 0 16px rgba(62,219,181,0.45))" }} />
          <div className="strip" style={{ width: 220 }} />
        </div>

        <div style={{ display: "flex", gap: 8, margin: "18px 0 12px" }}>
          {(["login", "signup"] as const).map((m) => (
            <button key={m} className="btn" onClick={() => setMode(m)}
              style={{ flex: 1, textTransform: "capitalize", color: mode === m ? "var(--pink)" : undefined, borderColor: mode === m ? "rgba(255,87,119,0.6)" : undefined }}>
              {m === "login" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>

        <input style={inp} placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input style={inp} type="password" placeholder="password" value={pw} onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void submit()} />

        <button className="btn" style={{ width: "100%", justifyContent: "center", marginTop: 8 }} disabled={busy} onClick={() => void submit()}>
          {busy ? "…" : mode === "login" ? "Sign in" : "Create account"}
        </button>

        {msg && <div style={{ fontSize: 12, color: "var(--pink)", marginTop: 10, textAlign: "center" }}>{msg}</div>}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontSize: 11 }}>
          <button onClick={() => setShowCfg((s) => !s)} style={linkBtn}>Backend setup</button>
          <button onClick={() => { setGuest(); onDone(); }} style={linkBtn}>Continue as guest</button>
        </div>

        {showCfg && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
            <div className="mono" style={{ fontSize: 10, color: "var(--mute)", marginBottom: 6, letterSpacing: 1 }}>SUPABASE PROJECT</div>
            <input style={inp} placeholder="https://xxxx.supabase.co" value={cfg.url} onChange={(e) => setCfg({ ...cfg, url: e.target.value })} />
            <input style={inp} placeholder="anon (public) key" value={cfg.anon} onChange={(e) => setCfg({ ...cfg, anon: e.target.value })} />
            <button className="btn" style={{ width: "100%", justifyContent: "center" }} onClick={() => { saveCfg(cfg); setShowCfg(false); setMsg("Backend saved."); }}>
              Save backend
            </button>
            <div style={{ fontSize: 10, color: "var(--mute)", marginTop: 6 }}>
              The anon key is public-safe (RLS protects data). The DB password is never used here.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%", background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 8,
  color: "var(--ink)", padding: "9px 12px", fontSize: 13, fontFamily: "ui-monospace, monospace",
  outline: "none", marginBottom: 8,
};
const linkBtn: React.CSSProperties = {
  background: "none", border: "none", color: "var(--mute)", cursor: "pointer", fontSize: 11, textDecoration: "underline",
};
