import { useEffect, useState } from "react";
import { getSession } from "../auth/supabase";
import { ACCENTS, applyAccent, loadAccent } from "../theme-accent";
import { getData, setData, whoAmI, cloudConfigured } from "../embedded/haloscloud";
import logoUrl from "../assets/logo.png";

type FeedbackItem = { id: string; author: string; text: string; ts: number };
const FKEY = "hub:feedback";

export function Settings({ onSignOut }: { onSignOut: () => void }) {
  const [accent, setAccent] = useState(loadAccent);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [fb, setFb] = useState("");
  const session = getSession();

  useEffect(() => {
    if (cloudConfigured()) void getData<FeedbackItem[]>(FKEY, []).then(setFeedback);
  }, []);

  function pickAccent(name: string) {
    setAccent(name);
    applyAccent(name);
  }
  async function postFeedback() {
    const text = fb.trim();
    if (!text) return;
    setFb("");
    if (!cloudConfigured()) return;
    const next = [{ id: String(Date.now()), author: whoAmI(), text, ts: Date.now() }, ...feedback].slice(0, 200);
    setFeedback(next);
    await setData(FKEY, next);
  }

  return (
    <div className="stage">
      <div className="panel-head">
        <img src={logoUrl} width={20} height={20} alt="" style={{ borderRadius: 5 }} />
        Settings <span className="glow-text">· hub</span>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 18, display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", alignContent: "start" }}>
        {/* account */}
        <section className="panel" style={{ padding: 16 }}>
          <div className="sec-title">Account</div>
          <div style={{ fontSize: 13, color: "var(--ink)", marginTop: 8 }}>
            {session ? `Signed in as ${session.email}` : "Browsing as guest"}
          </div>
          <button className="btn" style={{ marginTop: 12 }} onClick={onSignOut}>Sign out</button>
        </section>

        {/* theme */}
        <section className="panel" style={{ padding: 16 }}>
          <div className="sec-title">Theme accent</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {Object.entries(ACCENTS).map(([k, a]) => (
              <button key={k} onClick={() => pickAccent(k)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, cursor: "pointer", background: "rgba(0,0,0,0.4)", border: `1px solid ${accent === k ? a.glow : "var(--line)"}`, color: "var(--ink)", fontSize: 12 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: `linear-gradient(135deg, ${a.red}, ${a.orange})`, boxShadow: `0 0 8px ${a.glow}` }} />
                {a.label}
              </button>
            ))}
          </div>
        </section>

        {/* feedback feed */}
        <section className="panel" style={{ padding: 16, gridColumn: "1 / -1" }}>
          <div className="sec-title">Feedback feed</div>
          <p style={{ fontSize: 12, color: "var(--mute)", marginTop: 6 }}>Shared ideas everyone can see — Davis reviews these for the app. (Tutorial Tom posts here too.)</p>
          <div style={{ display: "flex", gap: 8, margin: "10px 0" }}>
            <input value={fb} onChange={(e) => setFb(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void postFeedback()} placeholder="suggest an idea…"
              style={{ flex: 1, background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink)", padding: "8px 12px", fontSize: 13, fontFamily: "ui-monospace, monospace", outline: "none" }} />
            <button className="btn" onClick={() => void postFeedback()}>Post</button>
          </div>
          {feedback.length === 0 && <div style={{ fontSize: 12, color: "var(--mute)" }}>No feedback yet.</div>}
          {feedback.map((f) => (
            <div key={f.id} className="panel" style={{ padding: 10, marginBottom: 8 }}>
              <div className="mono glow-text" style={{ fontSize: 10 }}>{f.author}</div>
              <div style={{ fontSize: 13 }}>{f.text}</div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
