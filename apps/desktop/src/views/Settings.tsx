import { useEffect, useState, type ReactNode } from "react";
import { getSession } from "../auth/supabase";
import { ACCENTS, applyAccent, loadAccent } from "../theme-accent";
import { getData, setData, whoAmI, cloudConfigured } from "../embedded/haloscloud";
import { loadPrefs, savePrefs, SEARCH_ENGINES, subscribePrefs, applyUiPrefs, type UiPrefs } from "../uiPrefs";
import { TRACKS, ost } from "../audio/ost";
import { KNOWN_CODES, loadCodes, tryUnlock, relock, subscribeCodes, type CodeKey } from "../featureGate";
import logoUrl from "../assets/logo.png";

type FeedbackItem = { id: string; author: string; text: string; ts: number };
const FKEY = "hub:feedback";

type SectionId =
  | "profile" | "appearance" | "info" | "browser" | "chat" | "house-ai"
  | "nt5" | "music" | "notifications" | "privacy" | "background"
  | "dev-codes" | "account" | "feedback";

const SECTIONS: { id: SectionId; label: string; group: "you" | "look" | "apps" | "system" | "access" }[] = [
  { id: "profile",       label: "Profile",         group: "you" },
  { id: "appearance",    label: "Appearance",      group: "look" },
  { id: "info",          label: "On-screen info",  group: "look" },
  { id: "browser",       label: "Browser",         group: "apps" },
  { id: "chat",          label: "AI Group Chat",   group: "apps" },
  { id: "house-ai",      label: "House AI brain",  group: "apps" },
  { id: "nt5",           label: "NT5 broadcast",   group: "apps" },
  { id: "music",         label: "Music / OST",     group: "apps" },
  { id: "notifications", label: "Notifications",   group: "system" },
  { id: "privacy",       label: "Privacy & security", group: "system" },
  { id: "background",    label: "Background mode", group: "system" },
  { id: "dev-codes",     label: "Dev codes",       group: "access" },
  { id: "account",       label: "Account",         group: "access" },
  { id: "feedback",      label: "Feedback feed",   group: "access" },
];
const GROUP_LABEL: Record<string, string> = { you: "You", look: "Look & Feel", apps: "Apps", system: "System", access: "Access" };

export function Settings({ onSignOut }: { onSignOut: () => void }) {
  const [section, setSection] = useState<SectionId>("profile");
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
  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try { const s = await window.hub.llm.status(); if (!cancelled) setLlm(s); } catch { /* ignore */ }
    }
    void tick();
    const t = setInterval(tick, 2500);
    const off = window.hub.llm.onProgress((p) => setLlm((prev) => ({ ...prev, progress: p, downloading: p < 100 })));
    return () => { cancelled = true; clearInterval(t); off(); };
  }, []);

  function pickAccent(name: string) { setAccent(name); applyAccent(name); applyUiPrefs(loadPrefs()); }
  async function setBgPref(k: keyof typeof bg, v: boolean) { const next = await window.hub.bg.set({ [k]: v }); setBg(next); }
  async function downloadModel() { setLlmBusy(true); try { await window.hub.llm.ensure(); } finally { setLlmBusy(false); } }
  function set<K extends keyof UiPrefs>(k: K, v: UiPrefs[K]) { setPrefs(savePrefs({ [k]: v } as Partial<UiPrefs>)); }
  async function postFeedback() {
    const text = fb.trim(); if (!text) return;
    const item: FeedbackItem = { id: String(Date.now()), author: session?.email || whoAmI(), text, ts: Date.now() };
    const next = [item, ...feedback].slice(0, 200);
    setFeedback(next); setFb("");
    if (cloudConfigured()) await setData(FKEY, next);
  }

  return (
    <div className="stage" style={{ display: "flex", minHeight: 0 }}>
      {/* Left nav */}
      <div style={{ width: 220, borderRight: "1px solid var(--line)", overflow: "auto", padding: "12px 10px", background: "rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 6px 12px" }}>
          <img src={logoUrl} alt="Hub" style={{ width: 28, height: 28, borderRadius: 6 }} />
          <div>
            <div className="glow-text mono" style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase" }}>Settings</div>
            <div style={{ fontSize: 10, color: "var(--mute)" }}>{session ? session.email : "guest"}</div>
          </div>
        </div>
        {(["you", "look", "apps", "system", "access"] as const).map((g) => (
          <div key={g} style={{ marginTop: 10 }}>
            <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--mute)", padding: "0 8px 4px" }}>{GROUP_LABEL[g]}</div>
            {SECTIONS.filter((s) => s.group === g).map((s) => (
              <button key={s.id} data-tour={`settings-sec-${s.id}`} onClick={() => setSection(s.id)} className="btn" style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "8px 12px", fontSize: 12, marginBottom: 4, minHeight: 32,
                color: section === s.id ? "var(--pink)" : "var(--ink)",
                borderColor: section === s.id ? "rgba(255,87,119,0.55)" : "transparent",
                background: section === s.id ? "rgba(255,87,119,0.08)" : "transparent",
              }}>{s.label}</button>
            ))}
          </div>
        ))}
      </div>

      {/* Section body */}
      <div style={{ flex: 1, overflow: "auto", padding: 22, minWidth: 0 }}>
        {section === "profile" && <ProfileSection prefs={prefs} set={set} />}
        {section === "appearance" && <AppearanceSection prefs={prefs} set={set} accent={accent} pickAccent={pickAccent} />}
        {section === "info" && <InfoSection prefs={prefs} set={set} />}
        {section === "browser" && <BrowserSection prefs={prefs} set={set} />}
        {section === "chat" && <ChatSection prefs={prefs} set={set} />}
        {section === "house-ai" && <HouseAiSection prefs={prefs} set={set} llm={llm} llmBusy={llmBusy} downloadModel={downloadModel} />}
        {section === "nt5" && <NT5BroadcastSettings prefs={prefs} set={set} />}
        {section === "music" && <MusicSection prefs={prefs} set={set} />}
        {section === "notifications" && <NotificationsSection prefs={prefs} set={set} />}
        {section === "privacy" && <PrivacySection prefs={prefs} set={set} />}
        {section === "background" && <BackgroundSection bg={bg} setBgPref={setBgPref} />}
        {section === "dev-codes" && <DevCodesSection />}
        {section === "account" && <AccountSection session={session} onSignOut={onSignOut} />}
        {section === "feedback" && <FeedbackSection feedback={feedback} fb={fb} setFb={setFb} postFeedback={postFeedback} />}
      </div>
    </div>
  );
}

// ── PROFILE ─────────────────────────────────────────────────────────────────
function ProfileSection({ prefs, set }: { prefs: UiPrefs; set: <K extends keyof UiPrefs>(k: K, v: UiPrefs[K]) => void }) {
  function pickAvatar(file: File) {
    const r = new FileReader();
    r.onload = () => { if (typeof r.result === "string") set("ownerAvatar", r.result); };
    r.readAsDataURL(file);
  }
  return (
    <SectionShell title="Your profile" intro="Anything you fill in here is fed into every AI call as context (BroBot, NT5 anchors, SignalFinder drafts, Tutorial Tom). The more specific you are, the better the model can act for you.">
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 24, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 180, height: 180, borderRadius: 20, border: "2px solid var(--line)",
            background: prefs.ownerAvatar ? `center/cover no-repeat url("${prefs.ownerAvatar}")` : "linear-gradient(135deg, rgba(255,45,74,0.18), rgba(255,122,45,0.18))",
            display: "grid", placeItems: "center", color: "var(--mute)", fontSize: 36,
            fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontWeight: 800,
            boxShadow: "0 0 22px rgba(255,87,119,0.18)",
          }}>
            {!prefs.ownerAvatar && (prefs.ownerName ? prefs.ownerName.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() : "—")}
          </div>
          <label className="btn" style={{ cursor: "pointer", textAlign: "center" }}>
            Pick image
            <input type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) pickAvatar(f); e.target.value = ""; }} />
          </label>
          {prefs.ownerAvatar && <button className="btn" onClick={() => set("ownerAvatar", "")} style={{ width: "100%" }}>Remove</button>}
        </div>
        <div>
          <Grid cols={2}>
            <Field label="Display name"><Text value={prefs.ownerName} onChange={(v) => set("ownerName", v)} placeholder="how the AI should refer to you" /></Field>
            <Field label="Pronouns"><Text value={prefs.ownerPronouns} onChange={(v) => set("ownerPronouns", v)} placeholder="they/them, she/her, …" /></Field>
            <Field label="Location"><Text value={prefs.ownerLocation} onChange={(v) => set("ownerLocation", v)} placeholder="city or region" /></Field>
            <Field label="Timezone"><Text value={prefs.ownerTimezone} onChange={(v) => set("ownerTimezone", v)} placeholder="IANA, e.g. America/Chicago" /></Field>
            <Field label="Birthday"><input type="date" value={prefs.ownerBirthday} onChange={(e) => set("ownerBirthday", e.target.value)} style={inp} /></Field>
          </Grid>
          <Field label="About you (one paragraph)"><Area value={prefs.ownerBio} onChange={(v) => set("ownerBio", v)} placeholder="who you are, what you do, what you're building right now" /></Field>
          <Field label="Interests / passions"><Text value={prefs.ownerInterests} onChange={(v) => set("ownerInterests", v)} placeholder="e.g. Minecraft, Origin Realms, custom RPG worlds, networking, homelab, NT5 lore" /></Field>
          <Field label="Stack / tools you use"><Text value={prefs.ownerStack} onChange={(v) => set("ownerStack", v)} placeholder="e.g. Hostinger VPS, n8n, Tailscale, Vercel, Cloudflare, Modrinth, Blockbench" /></Field>
        </div>
      </div>
    </SectionShell>
  );
}

// ── APPEARANCE ──────────────────────────────────────────────────────────────
function AppearanceSection({ prefs, set, accent, pickAccent }: { prefs: UiPrefs; set: <K extends keyof UiPrefs>(k: K, v: UiPrefs[K]) => void; accent: string; pickAccent: (n: string) => void }) {
  return (
    <SectionShell title="Appearance" intro="Theme accent, motion, density, and rail behavior.">
      <div className="sec-title">Theme accent</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        {Object.entries(ACCENTS).map(([k, a]) => (
          <button key={k} onClick={() => pickAccent(k)} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, cursor: "pointer",
            background: "rgba(0,0,0,0.4)", border: `1px solid ${accent === k ? a.glow : "var(--line)"}`,
            color: "var(--ink)", fontSize: 12, minHeight: 34,
          }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: `linear-gradient(135deg, ${a.red}, ${a.orange})`, boxShadow: `0 0 8px ${a.glow}` }} />
            {a.label}
          </button>
        ))}
      </div>
      <Hr />
      <Grid cols={2}>
        <Field label="Font size">
          <Select value={prefs.fontSize} onChange={(v) => set("fontSize", v as UiPrefs["fontSize"])} options={[["small", "small"], ["normal", "normal"], ["large", "large"]]} />
        </Field>
        <Field label="Accent intensity">
          <Select value={prefs.accentIntensity} onChange={(v) => set("accentIntensity", v as UiPrefs["accentIntensity"])} options={[["soft", "soft"], ["normal", "normal"], ["loud", "loud"]]} />
        </Field>
      </Grid>
      <Toggle label="Reduce motion (kill shimmer / scanlines / particle animations)" checked={prefs.reduceMotion} onChange={(v) => set("reduceMotion", v)} />
      <Toggle label="Compact density (tighter padding across the app)" checked={prefs.compactDensity} onChange={(v) => set("compactDensity", v)} />
      <Toggle label="Show rail labels next to icons (wider sidebar)" checked={prefs.showRailLabels} onChange={(v) => set("showRailLabels", v)} />
    </SectionShell>
  );
}

// ── ON-SCREEN INFO ──────────────────────────────────────────────────────────
function InfoSection({ prefs, set }: { prefs: UiPrefs; set: <K extends keyof UiPrefs>(k: K, v: UiPrefs[K]) => void }) {
  return (
    <SectionShell title="On-screen info" intro="Floating info pieces that ride along on top of the canvas. Right-click any card to dismiss it until the next session.">
      <Toggle label="NT5 breaking & filed updates" checked={prefs.infoBreaking} onChange={(v) => set("infoBreaking", v)} />
      <Toggle label="Latest stories from the anchor desk" checked={prefs.infoNextUp} onChange={(v) => set("infoNextUp", v)} />
      <Toggle label="Origin Realms server pulse" checked={prefs.infoOrigin} onChange={(v) => set("infoOrigin", v)} />
      <Toggle label="System pulse (CPU / mem / free disk)" checked={prefs.infoSystem} onChange={(v) => set("infoSystem", v)} />
      <Toggle label="Crew chatter (recent group-chat activity)" checked={prefs.infoCrew} onChange={(v) => set("infoCrew", v)} />
      <Toggle label="Live clock + date" checked={prefs.infoClock} onChange={(v) => set("infoClock", v)} />
      <Toggle label="More Me streak + today progress" checked={prefs.infoMoreMe} onChange={(v) => set("infoMoreMe", v)} />
      <Toggle label="BroBot gallery recent" checked={prefs.infoBroBot} onChange={(v) => set("infoBroBot", v)} />
      <Toggle label="GitHub open PR pulse" checked={prefs.infoGithub} onChange={(v) => set("infoGithub", v)} />
      <Toggle label="Vercel latest deploy" checked={prefs.infoVercel} onChange={(v) => set("infoVercel", v)} />
      <Toggle label="Bottom ticker" checked={prefs.tickerEnabled} onChange={(v) => set("tickerEnabled", v)} />
      <Field label="News wire interval (min)"><input type="number" min={2} max={240} value={prefs.wireMinutes} onChange={(e) => set("wireMinutes", Math.max(2, Math.min(240, Number(e.target.value) || 20)))} style={inp} /></Field>
    </SectionShell>
  );
}

// ── BROWSER ─────────────────────────────────────────────────────────────────
function BrowserSection({ prefs, set }: { prefs: UiPrefs; set: <K extends keyof UiPrefs>(k: K, v: UiPrefs[K]) => void }) {
  return (
    <SectionShell title="Browser" intro="Search engine, home page, popup / autoplay blocking, tab restore.">
      <Grid cols={2}>
        <Field label="Search engine">
          <Select value={prefs.searchEngine} onChange={(v) => set("searchEngine", v as typeof prefs.searchEngine)}
            options={Object.entries(SEARCH_ENGINES).map(([k, v]) => [k, v.name])} />
        </Field>
        <Field label="Default new tab page">
          <Select value={prefs.defaultNewTabPage} onChange={(v) => set("defaultNewTabPage", v as UiPrefs["defaultNewTabPage"])}
            options={[["start", "Hub start page"], ["homepage", "Configured home page"], ["blank", "Blank"]]} />
        </Field>
      </Grid>
      <Field label="Home page (URL — leave blank for the Hub start page)">
        <Text value={prefs.homePage} onChange={(v) => set("homePage", v)} placeholder="https://…" />
      </Field>
      <Toggle label="Show bookmarks bar" checked={prefs.showBookmarksBar} onChange={(v) => set("showBookmarksBar", v)} />
      <Toggle label="Block popups" checked={prefs.blockPopups} onChange={(v) => set("blockPopups", v)} />
      <Toggle label="Block autoplay (mute media until you click)" checked={prefs.blockAutoplay} onChange={(v) => set("blockAutoplay", v)} />
      <Toggle label="Restore tabs on launch" checked={prefs.restoreTabsOnLaunch} onChange={(v) => set("restoreTabsOnLaunch", v)} />
    </SectionShell>
  );
}

// ── AI GROUP CHAT ───────────────────────────────────────────────────────────
function ChatSection({ prefs, set }: { prefs: UiPrefs; set: <K extends keyof UiPrefs>(k: K, v: UiPrefs[K]) => void }) {
  return (
    <SectionShell title="AI Group Chat" intro="Defaults used when nobody you @mention overrides them. The agents themselves are configured in the chat tab's Configure panel.">
      <Grid cols={2}>
        <Field label="Default tone">
          <Select value={prefs.chatDefaultTone} onChange={(v) => set("chatDefaultTone", v as UiPrefs["chatDefaultTone"])}
            options={[["casual", "casual"], ["professional", "professional"], ["hype", "hype"], ["short", "short"]]} />
        </Field>
        <Field label="Default response length">
          <Select value={prefs.chatResponseLength} onChange={(v) => set("chatResponseLength", v as UiPrefs["chatResponseLength"])}
            options={[["short", "short (1-2 sentences)"], ["medium", "medium (1 paragraph)"], ["long", "long (multi-paragraph)"]]} />
        </Field>
        <Field label="@mention chain depth (1-4)">
          <input type="number" min={1} max={4} value={prefs.chatChainDepth} onChange={(e) => set("chatChainDepth", Math.max(1, Math.min(4, Number(e.target.value) || 3)))} style={inp} />
        </Field>
      </Grid>
      <Toggle label="Auto-scroll on new messages" checked={prefs.chatAutoScroll} onChange={(v) => set("chatAutoScroll", v)} />
      <Toggle label="Show silent (mention-only) anchors in the roster" checked={prefs.chatShowSilent} onChange={(v) => set("chatShowSilent", v)} />
    </SectionShell>
  );
}

// ── HOUSE AI BRAIN ──────────────────────────────────────────────────────────
function HouseAiSection({ prefs, set, llm, llmBusy, downloadModel }: { prefs: UiPrefs; set: <K extends keyof UiPrefs>(k: K, v: UiPrefs[K]) => void; llm: { ready: boolean; downloading: boolean; progress: number }; llmBusy: boolean; downloadModel: () => void }) {
  return (
    <SectionShell title="House AI brain" intro="The bundled local model powers BroBot, the NT5 anchors, Tutorial Tom, and the background news wire — no key, no network calls.">
      <div className="mono" style={{ fontSize: 12, color: llm.ready ? "var(--pink)" : "var(--mute)" }}>
        {llm.ready ? "Ready · running locally" : llm.downloading ? `Downloading… ${Math.round(llm.progress)}%` : "Not downloaded"}
      </div>
      {llm.downloading && (
        <div style={{ marginTop: 6, height: 4, background: "rgba(0,0,0,0.4)", borderRadius: 4, overflow: "hidden" }}>
          <div className="strip" style={{ height: "100%", width: `${Math.max(2, Math.round(llm.progress))}%` }} />
        </div>
      )}
      <button className="btn" style={{ marginTop: 12 }} onClick={() => void downloadModel()} disabled={llmBusy || llm.downloading}>
        {llm.ready ? "Re-download" : llm.downloading ? "Downloading…" : "Download now"}
      </button>
      <Hr />
      <Grid cols={2}>
        <Field label={`Temperature (${prefs.llmTemperature.toFixed(2)})`}>
          <input type="range" min={0} max={1.5} step={0.05} value={prefs.llmTemperature} onChange={(e) => set("llmTemperature", Number(e.target.value))} style={{ width: "100%", accentColor: "var(--pink)" }} />
        </Field>
        <Field label="Max output tokens">
          <input type="number" min={64} max={4096} step={64} value={prefs.llmMaxTokens} onChange={(e) => set("llmMaxTokens", Math.max(64, Math.min(4096, Number(e.target.value) || 1024)))} style={inp} />
        </Field>
      </Grid>
      <Field label="Custom system-prompt prefix (added to every house AI call)">
        <Area value={prefs.llmSystemPrefix} onChange={(v) => set("llmSystemPrefix", v)} placeholder="e.g. Always respond in markdown. Sign off as 'the crew'." />
      </Field>
    </SectionShell>
  );
}

// ── NT5 BROADCAST (kept) ────────────────────────────────────────────────────
function NT5BroadcastSettings({ prefs, set }: { prefs: UiPrefs; set: <K extends keyof UiPrefs>(k: K, v: UiPrefs[K]) => void }) {
  const [voices, setVoices] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function loadVoices() {
    setLoading(true); setErr(null);
    const r = await window.hub.media.voices();
    setLoading(false);
    if (!r.ok) { setErr(r.error); return; }
    setVoices(r.voices.map((v) => ({ id: v.id, name: v.name })));
  }
  function patchVoice(anchor: keyof typeof prefs.anchorVoices, id: string) {
    set("anchorVoices", { ...prefs.anchorVoices, [anchor]: id });
  }
  const anchors: { id: keyof typeof prefs.anchorVoices; name: string }[] = [
    { id: "voss", name: "Voss Calloway" }, { id: "zara", name: "Zip Kindle" },
    { id: "dex", name: "Dex Morrow" }, { id: "lena", name: "Lena Faust" }, { id: "orin", name: "Orion Vale" },
  ];
  return (
    <SectionShell title="NT5 broadcast" intro="Anchor voices ship with the Hub — no setup required. If the voice service is unreachable, the broadcast falls back to your OS's built-in voices.">
      <button className="btn" onClick={() => void loadVoices()} disabled={loading}>{loading ? "Loading…" : voices.length ? "Reload voices" : "Load anchor voices"}</button>
      {err && <div style={{ fontSize: 11, color: "var(--mute)", marginTop: 6 }}>{err}</div>}
      {voices.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {anchors.map((a) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 12, width: 110, color: "var(--ink)" }}>{a.name}</span>
              <select value={prefs.anchorVoices[a.id]} onChange={(e) => patchVoice(a.id, e.target.value)} style={{ flex: 1, ...inp }}>
                <option value="">(OS voice fallback)</option>
                {voices.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}
      <Hr />
      <Toggle label="Use Pexels video as B-roll backdrop on the full broadcast view" checked={prefs.brollEnabled} onChange={(v) => set("brollEnabled", v)} />
      <Toggle label="Use a DigitalBlueprint scene as a 3D backdrop instead" checked={prefs.blueprintBackdrop} onChange={(v) => set("blueprintBackdrop", v)} />
    </SectionShell>
  );
}

// ── MUSIC ───────────────────────────────────────────────────────────────────
function MusicSection({ prefs, set }: { prefs: UiPrefs; set: <K extends keyof UiPrefs>(k: K, v: UiPrefs[K]) => void }) {
  const [idx, setIdx] = useState(() => Math.max(0, TRACKS.findIndex((t) => t.id === prefs.musicDefaultTrack)));
  const [playing, setPlaying] = useState(() => ost.playing);
  const [vol, setVol] = useState(prefs.musicDefaultVolume);
  const [genre, setGenre] = useState("all");
  const cur = TRACKS[idx] || TRACKS[0];

  // Keep the displayed track in sync with whatever the global OST is doing.
  useEffect(() => {
    const t = setInterval(() => { setPlaying(ost.playing); if (ost.currentIndex >= 0) setIdx(ost.currentIndex); }, 600);
    return () => clearInterval(t);
  }, []);

  function play(i: number) { ost.play(i); setIdx(i); setPlaying(true); }
  function toggle() { if (playing) { ost.stop(); setPlaying(false); } else { play(idx); } }
  function next() { play((idx + 1) % TRACKS.length); }
  function prev() { play((idx - 1 + TRACKS.length) % TRACKS.length); }
  function setVolume(v: number) { setVol(v); ost.setVolume(v); }

  const genres = ["all", ...Array.from(new Set(TRACKS.map((t) => t.vibe)))];
  const shown = genre === "all" ? TRACKS : TRACKS.filter((t) => t.vibe === genre);

  return (
    <SectionShell title="Music / OST" intro={`Procedural soundtrack engine — ${TRACKS.length} tracks across very different genres (lo-fi, drum & bass, trance, chiptune, funk, choral ambient, dub, western, vaporwave…), each with its own instrument palette and drum kit. All synthesized live; no audio files.`}>
      {/* Now playing / transport */}
      <div className="panel" style={{ padding: 16, display: "flex", alignItems: "center", gap: 16, background: `linear-gradient(135deg, ${cur.color}22, rgba(0,0,0,0.3))`, border: `1px solid ${cur.color}55` }}>
        <div style={{ width: 64, height: 64, borderRadius: 12, flexShrink: 0, background: `linear-gradient(135deg, ${cur.color}, #0a0820)`, boxShadow: `0 0 22px ${cur.color}66`, display: "grid", placeItems: "center" }}>
          <span style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(255,255,255,0.85)", boxShadow: playing ? `0 0 12px #fff` : "none", animation: playing ? "nchub-pulseGlow 1.6s ease-in-out infinite" : "none" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="glow-text" style={{ fontSize: 18, fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontWeight: 800 }}>{cur.name}</div>
          <div style={{ fontSize: 12, color: "var(--mute)" }}>{cur.vibe} · {cur.bpm} BPM · pad {cur.pad} · lead {cur.lead} · {cur.drums} kit</div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button className="btn" onClick={prev} title="Previous">‹‹</button>
          <button className="btn" onClick={toggle} style={{ minWidth: 64, color: "var(--pink)" }}>{playing ? "❚❚ Pause" : "► Play"}</button>
          <button className="btn" onClick={next} title="Next">››</button>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0" }}>
        <span style={{ fontSize: 11, color: "var(--mute)", minWidth: 56 }}>Volume</span>
        <input type="range" min={0} max={1} step={0.02} value={vol} onChange={(e) => setVolume(Number(e.target.value))} style={{ flex: 1, accentColor: "var(--pink)" }} />
        <span className="mono" style={{ fontSize: 11, color: "var(--ink)", minWidth: 36, textAlign: "right" }}>{Math.round(vol * 100)}%</span>
      </div>

      {/* Genre filter + track grid */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0" }}>
        {genres.map((g) => (
          <button key={g} className="btn" style={{ fontSize: 10, padding: "3px 9px", minHeight: 26, color: genre === g ? "var(--pink)" : undefined, borderColor: genre === g ? "rgba(255,87,119,0.55)" : undefined }} onClick={() => setGenre(g)}>{g}</button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
        {shown.map((t) => {
          const i = TRACKS.indexOf(t);
          const active = i === idx;
          return (
            <button key={t.id} onClick={() => play(i)} className={active ? "panel-hot panel" : "panel"}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, textAlign: "left", cursor: "pointer", borderColor: active ? `${t.color}aa` : undefined }}>
              <span style={{ width: 30, height: 30, borderRadius: 7, flexShrink: 0, background: `linear-gradient(135deg, ${t.color}, #0a0820)`, boxShadow: `0 0 8px ${t.color}66` }} />
              <span style={{ minWidth: 0, flex: 1 }}>
                <div className="mono" style={{ fontSize: 12, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
                <div style={{ fontSize: 10, color: "var(--mute)" }}>{t.vibe} · {t.bpm} BPM</div>
              </span>
              {active && playing && <span className="glow-text" style={{ fontSize: 10 }}>NOW</span>}
            </button>
          );
        })}
      </div>

      <Hr />
      <div className="sec-title">Startup defaults</div>
      <Toggle label="Autoplay on launch" checked={prefs.musicAutoplay} onChange={(v) => set("musicAutoplay", v)} />
      <Toggle label="Fade in over 3 seconds" checked={prefs.musicFadeIn} onChange={(v) => set("musicFadeIn", v)} />
      <Grid cols={2}>
        <Field label="Default track">
          <Select value={prefs.musicDefaultTrack} onChange={(v) => set("musicDefaultTrack", v)} options={TRACKS.map((t) => [t.id, `${t.name} (${t.vibe})`])} />
        </Field>
        <Field label={`Default volume (${Math.round(prefs.musicDefaultVolume * 100)}%)`}>
          <input type="range" min={0} max={1} step={0.05} value={prefs.musicDefaultVolume} onChange={(e) => set("musicDefaultVolume", Number(e.target.value))} style={{ width: "100%", accentColor: "var(--pink)" }} />
        </Field>
      </Grid>
    </SectionShell>
  );
}

// ── NOTIFICATIONS ───────────────────────────────────────────────────────────
function NotificationsSection({ prefs, set }: { prefs: UiPrefs; set: <K extends keyof UiPrefs>(k: K, v: UiPrefs[K]) => void }) {
  return (
    <SectionShell title="Notifications" intro="On-screen toasts triggered by the news wire, downloads, build pipeline, etc.">
      <Toggle label="Notifications enabled" checked={prefs.notificationsEnabled} onChange={(v) => set("notificationsEnabled", v)} />
      <Grid cols={2}>
        <Field label="Position">
          <Select value={prefs.notificationPosition} onChange={(v) => set("notificationPosition", v as UiPrefs["notificationPosition"])}
            options={[["tr", "top right"], ["br", "bottom right"], ["tl", "top left"], ["bl", "bottom left"]]} />
        </Field>
        <Field label={`Duration (${(prefs.notificationDurationMs / 1000).toFixed(1)}s)`}>
          <input type="range" min={1500} max={15000} step={500} value={prefs.notificationDurationMs} onChange={(e) => set("notificationDurationMs", Number(e.target.value))} style={{ width: "100%", accentColor: "var(--pink)" }} />
        </Field>
      </Grid>
      <Toggle label="Play a soft chime when a notification lands" checked={prefs.notificationSound} onChange={(v) => set("notificationSound", v)} />
    </SectionShell>
  );
}

// ── PRIVACY ─────────────────────────────────────────────────────────────────
function PrivacySection({ prefs, set }: { prefs: UiPrefs; set: <K extends keyof UiPrefs>(k: K, v: UiPrefs[K]) => void }) {
  return (
    <SectionShell title="Privacy & security" intro="DuckDuckGo-grade defaults are on; you can tighten further.">
      <Toggle label="Send Do-Not-Track and Global-Privacy-Control headers" checked={prefs.privacyDntGpc} onChange={(v) => set("privacyDntGpc", v)} />
      <Toggle label="Block third-party cookies" checked={prefs.privacyBlock3pCookies} onChange={(v) => set("privacyBlock3pCookies", v)} />
      <Toggle label="Clear browser history on quit" checked={prefs.privacyClearHistoryOnQuit} onChange={(v) => set("privacyClearHistoryOnQuit", v)} />
      <Toggle label="Clear download list on quit" checked={prefs.privacyClearDownloadsOnQuit} onChange={(v) => set("privacyClearDownloadsOnQuit", v)} />
    </SectionShell>
  );
}

// ── BACKGROUND MODE (kept) ──────────────────────────────────────────────────
function BackgroundSection({ bg, setBgPref }: { bg: { minimizeToTray: boolean; runOnStartup: boolean }; setBgPref: (k: "minimizeToTray" | "runOnStartup", v: boolean) => void }) {
  return (
    <SectionShell title="Background mode · always-on" intro="Keep the Hub running in the tray so the NT5 wire, Origin Realms pulse, and floating info stay alive even when the window is closed.">
      <Toggle label="Close button hides to the tray (don't quit)" checked={bg.minimizeToTray} onChange={(v) => void setBgPref("minimizeToTray", v)} />
      <Toggle label="Run on system startup (open hidden)" checked={bg.runOnStartup} onChange={(v) => void setBgPref("runOnStartup", v)} />
      <div style={{ fontSize: 11, color: "var(--mute)", marginTop: 8 }}>Quit from the tray icon's menu when you want the app to actually stop.</div>
    </SectionShell>
  );
}

// ── DEV CODES ───────────────────────────────────────────────────────────────
function DevCodesSection() {
  const [input, setInput] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [unlocked, setUnlocked] = useState<Set<string>>(loadCodes());
  useEffect(() => subscribeCodes(setUnlocked), []);
  function submit() { const r = tryUnlock(input); setMsg({ ok: r.ok, text: r.message }); if (r.ok) setInput(""); }
  return (
    <SectionShell title="Dev codes" intro="Some apps are hidden by default. Enter a code below to unlock them. Each code stays unlocked until you remove it.">
      <div style={{ display: "flex", gap: 8, maxWidth: 380 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="enter code" inputMode="numeric" style={{ ...inp, letterSpacing: 4, textAlign: "center", fontSize: 16 }} />
        <button className="btn" onClick={submit}>Unlock</button>
      </div>
      {msg && <div style={{ marginTop: 8, fontSize: 12, color: msg.ok ? "#22c55e" : "#ef4444" }}>{msg.text}</div>}
      <Hr />
      <div className="sec-title">Code status</div>
      <div style={{ marginTop: 12 }}>
        {(Object.keys(KNOWN_CODES) as CodeKey[]).map((code) => {
          const meta = KNOWN_CODES[code];
          const on = unlocked.has(code);
          return (
            <div key={code} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", marginBottom: 8, border: `1px solid ${on ? "rgba(34,197,94,0.45)" : "var(--line)"}`, borderRadius: 8, background: on ? "rgba(34,197,94,0.06)" : "rgba(0,0,0,0.25)" }}>
              <div style={{ width: 60, fontFamily: "ui-monospace,monospace", fontSize: 18, letterSpacing: 3, color: on ? "#22c55e" : "var(--mute)", textAlign: "center" }}>{on ? code : "————"}</div>
              <div style={{ flex: 1 }}>
                <div className="mono" style={{ fontSize: 12, color: "var(--ink)", letterSpacing: 1, textTransform: "uppercase" }}>{meta.label}</div>
                <div style={{ fontSize: 11, color: "var(--mute)", marginTop: 2 }}>{on ? `Unlocked: ${meta.unlocks.join(", ")}` : `Locked. Unlocks: ${meta.unlocks.join(", ")}`}</div>
              </div>
              {on && <button className="btn" onClick={() => relock(code)} style={{ fontSize: 11 }}>Lock again</button>}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: "var(--mute)", marginTop: 4, lineHeight: 1.55 }}>
        <b style={{ color: "var(--ink)" }}>NT5 News</b> and <b style={{ color: "var(--ink)" }}>SignalFinder</b> are visible by default. The core surfaces (Browser, Control Panel, Terminal, AI Group Chat, Library, Settings) are always available.
      </div>
    </SectionShell>
  );
}

// ── ACCOUNT ─────────────────────────────────────────────────────────────────
function AccountSection({ session, onSignOut }: { session: { email: string } | null; onSignOut: () => void }) {
  return (
    <SectionShell title="Account" intro="Your Supabase-backed Hub account. Account data is shared across machines; profile + preferences are per-device.">
      <div style={{ fontSize: 14, color: "var(--ink)" }}>{session ? `Signed in as ${session.email}` : "Browsing as guest"}</div>
      <button className="btn" style={{ marginTop: 12 }} onClick={onSignOut}>Sign out</button>
    </SectionShell>
  );
}

// ── FEEDBACK ────────────────────────────────────────────────────────────────
function FeedbackSection({ feedback, fb, setFb, postFeedback }: { feedback: FeedbackItem[]; fb: string; setFb: (v: string) => void; postFeedback: () => Promise<void> }) {
  return (
    <SectionShell title="Feedback feed" intro="Shared ideas everyone can see — Davis reviews these for the app.">
      <div style={{ display: "flex", gap: 8 }}>
        <input value={fb} onChange={(e) => setFb(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void postFeedback()} placeholder="suggest an idea…" style={inp} />
        <button className="btn" onClick={() => void postFeedback()}>Post</button>
      </div>
      {feedback.length === 0 && <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 10 }}>No feedback yet.</div>}
      <div style={{ marginTop: 10 }}>
        {feedback.map((f) => (
          <div key={f.id} className="panel" style={{ padding: 10, marginBottom: 8 }}>
            <div className="mono glow-text" style={{ fontSize: 10 }}>{f.author}</div>
            <div style={{ fontSize: 13 }}>{f.text}</div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

// ── Building blocks ─────────────────────────────────────────────────────────
function SectionShell({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily: "'Orbitron','Space Grotesk',sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: 1, color: "var(--ink)" }}>{title}</div>
      {intro && <p style={{ fontSize: 12, color: "var(--mute)", marginTop: 6, maxWidth: 640, lineHeight: 1.6 }}>{intro}</p>}
      <div style={{ marginTop: 14 }}>{children}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 11, color: "var(--mute)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{label}</label>
      {children}
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
function Text({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={inp} />;
}
function Area({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ ...inp, minHeight: 80, resize: "vertical" as const }} />;
}
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return <select value={value} onChange={(e) => onChange(e.target.value)} style={inp}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>;
}
function Grid({ cols, children }: { cols: number; children: ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 4 }}>{children}</div>;
}
function Hr() { return <div style={{ height: 1, background: "var(--line)", margin: "16px 0" }} />; }

const inp: React.CSSProperties = {
  background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 8,
  color: "var(--ink)", padding: "8px 12px", fontSize: 13, fontFamily: "ui-monospace, monospace",
  outline: "none", width: "100%",
};
