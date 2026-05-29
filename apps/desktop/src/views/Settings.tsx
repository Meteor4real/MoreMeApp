import { useEffect, useState } from "react";
import { getSession } from "../auth/supabase";
import { ACCENTS, applyAccent, loadAccent } from "../theme-accent";
import { getData, setData, whoAmI, cloudConfigured } from "../embedded/haloscloud";
import { loadPrefs, savePrefs, SEARCH_ENGINES, subscribePrefs } from "../uiPrefs";
import logoUrl from "../assets/logo.png";

type FeedbackItem = { id: string; author: string; text: string; ts: number };
const FKEY = "hub:feedback";

export function Settings({ onSignOut }: { onSignOut: () => void }) {
  const [accent, setAccent] = useState(loadAccent);
  const [prefs, setPrefs] = useState(loadPrefs);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [fb, setFb] = useState("");
  const [llm, setLlm] = useState<{ ready: boolean; downloading: boolean; progress: number }>({ ready: false, downloading: false, progress: 0 });
  const [llmBusy, setLlmBusy] = useState(false);
  const [bg, setBg] = useState<{ minimizeToTray: boolean; runOnStartup: boolean }>({ minimizeToTray: false, runOnStartup: false });
  const session = getSession();

  useEffect(() => {
    if (cloudConfigured()) void getData<FeedbackItem[]>(FKEY, []).then(setFeedback);
    void window.hub.bg.get().then(setBg);
    return subscribePrefs(setPrefs);
  }, []);

  async function setBgPref(k: keyof typeof bg, v: boolean) {
    const next = await window.hub.bg.set({ [k]: v });
    setBg(next);
  }
  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const s = await window.hub.llm.status();
        if (!cancelled) setLlm(s);
      } catch { /* ignore */ }
    }
    void tick();
    const t = setInterval(tick, 2500);
    const off = window.hub.llm.onProgress((p) => setLlm((prev) => ({ ...prev, progress: p, downloading: p < 100 })));
    return () => { cancelled = true; clearInterval(t); off(); };
  }, []);

  function pickAccent(name: string) { setAccent(name); applyAccent(name); }

  async function downloadModel() {
    setLlmBusy(true);
    try {
      await window.hub.llm.ensure();
    } finally { setLlmBusy(false); }
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

  function set<K extends keyof typeof prefs>(k: K, v: (typeof prefs)[K]) { setPrefs(savePrefs({ [k]: v } as Partial<typeof prefs>)); }

  return (
    <div className="stage">
      <div className="panel-head">
        <img src={logoUrl} width={20} height={20} alt="" style={{ borderRadius: 5 }} />
        Settings
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 18, display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", alignContent: "start" }}>
        {/* account */}
        <section className="panel" style={{ padding: 16 }}>
          <div className="sec-title">Account</div>
          <div style={{ fontSize: 13, color: "var(--ink)", marginTop: 8 }}>
            {session ? `Signed in as ${session.email}` : "Browsing as guest"}
          </div>
          <button className="btn" style={{ marginTop: 12 }} onClick={onSignOut}>Sign out</button>
        </section>

        {/* House AI model */}
        <section className="panel" style={{ padding: 16 }}>
          <div className="sec-title">House AI brain</div>
          <p style={{ fontSize: 12, color: "var(--mute)", marginTop: 6 }}>
            The bundled local model powers BroBot, the NT5 anchors, Tutorial Tom, and the
            background news wire — no key, no network calls. About 2 GB; downloads once,
            then runs offline forever.
          </p>
          <div className="mono" style={{ fontSize: 12, marginTop: 8, color: llm.ready ? "var(--pink)" : "var(--mute)" }}>
            {llm.ready
              ? "Ready · running locally"
              : llm.downloading
                ? `Downloading… ${Math.round(llm.progress)}%`
                : "Not downloaded"}
          </div>
          {llm.downloading && (
            <div style={{ marginTop: 6, height: 4, background: "rgba(0,0,0,0.4)", borderRadius: 4, overflow: "hidden" }}>
              <div className="strip" style={{ height: "100%", width: `${Math.max(2, Math.round(llm.progress))}%` }} />
            </div>
          )}
          <button className="btn" style={{ marginTop: 12 }} onClick={() => void downloadModel()} disabled={llmBusy || llm.downloading}>
            {llm.ready ? "Re-download" : llm.downloading ? "Downloading…" : "Download now"}
          </button>
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

        {/* On-screen info */}
        <section className="panel" style={{ padding: 16 }}>
          <div className="sec-title">On-screen info</div>
          <p style={{ fontSize: 12, color: "var(--mute)", marginTop: 6 }}>
            Floating info pieces that ride along on top of the canvas. Right-click any card
            to dismiss it until the next session.
          </p>
          <Toggle label="NT5 breaking & filed updates" checked={prefs.infoBreaking} onChange={(v) => set("infoBreaking", v)} />
          <Toggle label="Latest stories from the anchor desk" checked={prefs.infoNextUp} onChange={(v) => set("infoNextUp", v)} />
          <Toggle label="Origin Realms server pulse" checked={prefs.infoOrigin} onChange={(v) => set("infoOrigin", v)} />
          <Toggle label="Bottom ticker" checked={prefs.tickerEnabled} onChange={(v) => set("tickerEnabled", v)} />
          <div style={{ marginTop: 10 }}>
            <label style={{ display: "block", fontSize: 11, color: "var(--mute)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>News wire interval (min)</label>
            <input type="number" min={2} max={240} value={prefs.wireMinutes} onChange={(e) => set("wireMinutes", Math.max(2, Math.min(240, Number(e.target.value) || 20)))}
              style={inp} />
          </div>
        </section>

        {/* Background mode — true 24/7 across reboots */}
        <section className="panel" style={{ padding: 16 }}>
          <div className="sec-title">Background mode · always-on</div>
          <p style={{ fontSize: 12, color: "var(--mute)", marginTop: 6 }}>
            Keep the Hub running in the tray so the NT5 wire, Origin Realms pulse,
            and floating info stay alive even when the window is closed. Optionally
            start with the system so the wire is always on.
          </p>
          <Toggle label="Close button hides to the tray (don't quit)" checked={bg.minimizeToTray} onChange={(v) => void setBgPref("minimizeToTray", v)} />
          <Toggle label="Run on system startup (open hidden)" checked={bg.runOnStartup} onChange={(v) => void setBgPref("runOnStartup", v)} />
          <div style={{ fontSize: 11, color: "var(--mute)", marginTop: 6 }}>
            Quit from the tray icon's menu when you want the app to actually stop.
          </div>
        </section>

        {/* Browser */}
        <section className="panel" style={{ padding: 16 }}>
          <div className="sec-title">Browser</div>
          <div style={{ marginTop: 10 }}>
            <label style={{ display: "block", fontSize: 11, color: "var(--mute)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Search engine</label>
            <select value={prefs.searchEngine} onChange={(e) => set("searchEngine", e.target.value as typeof prefs.searchEngine)} style={inp}>
              {Object.entries(SEARCH_ENGINES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
            </select>
          </div>
          <div style={{ marginTop: 10 }}>
            <label style={{ display: "block", fontSize: 11, color: "var(--mute)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Home page (URL — leave blank for the Hub start page)</label>
            <input value={prefs.homePage} onChange={(e) => set("homePage", e.target.value)} placeholder="https://…" style={inp} />
          </div>
          <Toggle label="Show bookmarks bar" checked={prefs.showBookmarksBar} onChange={(v) => set("showBookmarksBar", v)} />
        </section>

        {/* feedback feed */}
        <section className="panel" style={{ padding: 16, gridColumn: "1 / -1" }}>
          <div className="sec-title">Feedback feed</div>
          <p style={{ fontSize: 12, color: "var(--mute)", marginTop: 6 }}>Shared ideas everyone can see — Davis reviews these for the app. (Tutorial Tom posts here too.)</p>
          <div style={{ display: "flex", gap: 8, margin: "10px 0" }}>
            <input value={fb} onChange={(e) => setFb(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void postFeedback()} placeholder="suggest an idea…"
              style={inp} />
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

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", fontSize: 13, color: "var(--ink)", cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

const inp: React.CSSProperties = {
  flex: 1,
  background: "rgba(0,0,0,0.5)",
  border: "1px solid var(--line)",
  borderRadius: 8,
  color: "var(--ink)",
  padding: "8px 12px",
  fontSize: 13,
  fontFamily: "ui-monospace, monospace",
  outline: "none",
  width: "100%",
};
