// MoreMe — Customize. Rename tabs, hide tabs, override the 20 rank names,
// add your own achievements (claim them manually for XP), and define a
// custom theme palette. Everything persists with the rest of state.

import { useState } from "react";
import { T, setTheme, refreshTheme, currentThemeName, PALETTES, THEME_META, type ThemeName, type Palette } from "./styles";
import { MAX_LEVEL, RANK_NAMES, WIDGET_KINDS } from "./types";
import type { CustomAchievement, State, Widget } from "./types";
import {
  addCustomAchievement, addDynamicTab, addWidget, blankCustomAchievement, blankWidget,
  claimCustomAchievement, clearCustomTheme, isTabHidden, moveDynamicTab, moveWidget,
  rankFor, removeCustomAchievement, removeDynamicTab, resetAllRanks, resetTabLabel,
  setCustomTheme, setRank, setTabLabel, setUseCustomTheme, toggleTabHidden,
  unclaimCustomAchievement, updateCustomAchievement, updateDynamicTab, levelInfo,
} from "./store";
import { WidgetEditor } from "./widgets";

const TAB_DEFAULTS: { id: string; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "ahead", label: "Get Ahead" },
  { id: "calendar", label: "Calendar" },
  { id: "screens", label: "Screens" },
  { id: "empire", label: "Empire" },
  { id: "projects", label: "Projects" },
  { id: "plans", label: "Plans" },
  { id: "goals", label: "Goals" },
  { id: "achievements", label: "Achievements" },
  { id: "insights", label: "Insights" },
  { id: "levels", label: "Levels" },
];

export function CustomizeView({ s }: { s: State }) {
  return (
    <div style={{ maxWidth: 920, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div className="serif" style={{ fontSize: 22, lineHeight: 1 }}>Customize</div>
        <div style={{ fontSize: 11, color: T.inkTiny, letterSpacing: ".08em", textTransform: "uppercase", marginTop: 4 }}>
          Make MoreMe yours
        </div>
      </div>
      <TabsCard s={s} />
      <PagesAndWidgetsCard s={s} />
      <RanksCard s={s} />
      <CustomAchievementsCard s={s} />
      <CustomThemeCard s={s} />
      <div style={{ fontSize: 11, color: T.inkTiny, fontStyle: "italic", padding: "6px 0 20px" }}>
        Every override is saved instantly. Reset any field to put the default back.
      </div>
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="mm-card" style={{ padding: 16 }}>
      <div style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: T.inkTiny, marginBottom: 4 }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: T.inkSoft, lineHeight: 1.5, marginBottom: 10 }}>{sub}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}

function TabsCard({ s }: { s: State }) {
  return (
    <Section title="Tabs" sub="Rename or hide any tab. Reset puts the default back.">
      {TAB_DEFAULTS.map((t) => {
        const cur = s.customization.tabLabels[t.id] ?? "";
        const hidden = isTabHidden(t.id, s);
        return (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 100, fontSize: 12, color: T.inkSoft }}>{t.label}</span>
            <input
              value={cur}
              placeholder={`Override (default: ${t.label})`}
              onChange={(e) => setTabLabel(t.id, e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="mm-btn" style={{ padding: "4px 8px" }} onClick={() => resetTabLabel(t.id)} title="Reset to default">↺</button>
            <button
              className="mm-btn"
              style={{ padding: "4px 10px", color: hidden ? T.warn : undefined, borderColor: hidden ? T.warn + "55" : undefined }}
              onClick={() => toggleTabHidden(t.id)}
            >
              {hidden ? "Hidden" : "Visible"}
            </button>
          </div>
        );
      })}
    </Section>
  );
}

function RanksCard({ s }: { s: State }) {
  const lv = levelInfo(s).level;
  return (
    <Section title="Rank names" sub={`Override any of the 20 rank names. Yours appear in the header at the matching level.`}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((level) => {
          const def = RANK_NAMES[level - 1] ?? "";
          const cur = s.customization.customRanks[level - 1] ?? "";
          const reached = lv >= level;
          return (
            <div key={level} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 28, fontSize: 11, color: reached ? T.mint : T.inkTiny, textAlign: "right" }}>L{level}</span>
              <input
                value={cur}
                placeholder={def}
                onChange={(e) => setRank(level, e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
        <button className="mm-btn" onClick={() => { if (confirm("Clear every rank override?")) resetAllRanks(); }}>Reset all to defaults</button>
      </div>
      <div style={{ fontSize: 11, color: T.inkTiny, marginTop: 4 }}>
        Current rank: <b style={{ color: T.mint }}>{rankFor(lv, s)}</b> (level {lv}).
      </div>
    </Section>
  );
}

function CustomAchievementsCard({ s }: { s: State }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [xp, setXp] = useState("100");
  function add() {
    if (!title.trim()) return;
    addCustomAchievement({ ...blankCustomAchievement(), title: title.trim(), desc: desc.trim(), xp: Math.max(0, parseInt(xp, 10) || 0) });
    setTitle(""); setDesc(""); setXp("100");
  }
  return (
    <Section title={`Your achievements · ${s.customization.customAchievements.length}`} sub="Set your own goals. Claim them when you've actually earned them — claim awards XP once and sticks.">
      {s.customization.customAchievements.length === 0 && (
        <div style={{ fontSize: 12, color: T.inkTiny, fontStyle: "italic" }}>None yet. Define your own below.</div>
      )}
      {s.customization.customAchievements.map((a) => <CustomAchievementRow key={a.id} a={a} />)}
      <div style={{ marginTop: 6, padding: 10, background: T.sunk, borderRadius: 10, border: `1px dashed ${T.mint}55`, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 11, color: T.mint, letterSpacing: ".06em", textTransform: "uppercase" }}>Add a goal</div>
        <input value={title} placeholder="Title — e.g. 'Run a 7-min mile'" onChange={(e) => setTitle(e.target.value)} />
        <input value={desc} placeholder="Description (optional)" onChange={(e) => setDesc(e.target.value)} />
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <label style={{ fontSize: 11, color: T.inkTiny }}>XP reward</label>
          <input type="number" min={0} value={xp} onChange={(e) => setXp(e.target.value)} style={{ width: 90 }} />
          <div style={{ flex: 1 }} />
          <button className="mm-btn mm-btn-primary" onClick={add}>+ Add</button>
        </div>
      </div>
    </Section>
  );
}

function CustomAchievementRow({ a }: { a: CustomAchievement }) {
  return (
    <div className={"mm-ach" + (a.claimedAt ? " unlocked" : "")} style={{ alignItems: "center" }}>
      <div className="mm-medal">{a.claimedAt ? "★" : "◇"}</div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <input value={a.title} onChange={(e) => updateCustomAchievement(a.id, { title: e.target.value })} style={{ fontWeight: 700 }} />
        <input value={a.desc} placeholder="Description" onChange={(e) => updateCustomAchievement(a.id, { desc: e.target.value })} />
        <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, color: T.inkTiny }}>
          <label>XP</label>
          <input type="number" min={0} value={a.xp} onChange={(e) => updateCustomAchievement(a.id, { xp: Math.max(0, parseInt(e.target.value, 10) || 0) })} style={{ width: 80 }} />
          {a.claimedAt && <span style={{ marginLeft: 8 }}>· claimed {new Date(a.claimedAt).toLocaleDateString()}</span>}
        </div>
      </div>
      {!a.claimedAt ? (
        <button className="mm-btn mm-btn-primary" onClick={() => claimCustomAchievement(a.id)}>Claim · +{a.xp} XP</button>
      ) : (
        <button className="mm-btn" onClick={() => unclaimCustomAchievement(a.id)} title="Undo claim (refund XP)">Unclaim</button>
      )}
      <button className="mm-btn mm-btn-danger" style={{ padding: "4px 8px" }} onClick={() => removeCustomAchievement(a.id)}>×</button>
    </div>
  );
}

const FIELDS: { key: keyof Palette; label: string }[] = [
  { key: "bg",       label: "Background" },
  { key: "elev",     label: "Cards" },
  { key: "sunk",     label: "Inputs" },
  { key: "ink",      label: "Text" },
  { key: "inkSoft",  label: "Text (soft)" },
  { key: "inkTiny",  label: "Text (mute)" },
  { key: "line",     label: "Lines" },
  { key: "mint",     label: "Accent" },
  { key: "mintDeep", label: "Accent deep" },
  { key: "mintHi",   label: "Accent hi" },
  { key: "warn",     label: "Warning" },
  { key: "cool",     label: "Cool / link" },
];

function CustomThemeCard({ s }: { s: State }) {
  const seedPalette: Palette = s.customization.customTheme ?? PALETTES.dp;
  const [draft, setDraft] = useState<Palette>(seedPalette);
  const set = (k: keyof Palette, v: string) => setDraft((d) => ({ ...d, [k]: v }));
  const apply = () => { setCustomTheme(draft); refreshTheme(); };
  const isActive = currentThemeName() === "custom" && s.customization.useCustomTheme;
  return (
    <Section title="Custom theme" sub="Paint your own palette. Apply to switch the whole app to it.">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
        {FIELDS.map((f) => (
          <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="color" value={draft[f.key]} onChange={(e) => set(f.key, e.target.value)} style={{ width: 32, height: 32, padding: 0, border: "none", background: "transparent" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, color: T.inkTiny, letterSpacing: ".06em", textTransform: "uppercase" }}>{f.label}</div>
              <input value={draft[f.key]} onChange={(e) => set(f.key, e.target.value)} style={{ fontSize: 11, fontFamily: "ui-monospace, monospace" }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 10, color: T.inkTiny, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 4 }}>Hero image URL (optional)</div>
        <input value={draft.heroImage ?? ""} placeholder="https://… — paste an image URL; leave blank for none"
          onChange={(e) => setDraft((d) => ({ ...d, heroImage: e.target.value || undefined }))}
          style={{ fontFamily: "ui-monospace, monospace", fontSize: 11 }} />
        <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: T.inkTiny }}>Quick picks (Unsplash):</span>
          {[
            { label: "Court", url: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&w=1600&q=70" },
            { label: "Track", url: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&w=1600&q=70" },
            { label: "Ocean", url: "https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?auto=format&w=1600&q=70" },
            { label: "Peaks", url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&w=1600&q=70" },
            { label: "Coffee", url: "https://images.unsplash.com/photo-1453928582365-b6ad33cbcf64?auto=format&w=1600&q=70" },
          ].map((p) => (
            <button key={p.label} className="mm-tab" onClick={() => setDraft((d) => ({ ...d, heroImage: p.url }))}>{p.label}</button>
          ))}
          {draft.heroImage && <button className="mm-tab" onClick={() => setDraft((d) => ({ ...d, heroImage: undefined }))}>Clear</button>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <button className="mm-btn mm-btn-primary" onClick={apply}>Apply as theme</button>
        <button className="mm-btn" onClick={() => setDraft({ ...PALETTES.dp })}>Reset to DP</button>
        <button className="mm-btn" onClick={() => setDraft({ ...PALETTES.papatui })}>Reset to Papatui</button>
        <button className="mm-btn" onClick={() => setDraft({ ...PALETTES.sports })}>Reset to Sports</button>
        {s.customization.customTheme && (
          <button className="mm-btn mm-btn-danger" onClick={() => { clearCustomTheme(); refreshTheme(); }}>Clear saved custom</button>
        )}
        <div style={{ flex: 1 }} />
        {isActive && <span className="mm-pill" style={{ background: T.mint, color: T.bg }}>Active</span>}
      </div>
      <div style={{ fontSize: 11, color: T.inkTiny, marginTop: 4 }}>
        Pick from {(Object.keys(THEME_META) as ThemeName[]).filter((n) => n !== "custom").length + 1} themes in <b>Projects → Theme</b>; Custom unlocks once you Apply one here.
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
        <button className="mm-btn" onClick={() => { setTheme("dp"); }}>Try DP</button>
        <button className="mm-btn" onClick={() => { setTheme("papatui"); }}>Try Papatui</button>
        <button className="mm-btn" onClick={() => { setTheme("sports"); }}>Try Sports</button>
        <button className="mm-btn" onClick={() => { setUseCustomTheme(true); setTheme("custom"); }}>Try Custom</button>
      </div>
      <div style={{ fontSize: 10, color: T.inkTiny, fontStyle: "italic", marginTop: 12, paddingTop: 10, borderTop: `1px dashed ${T.line}`, display: "flex", alignItems: "center", gap: 6 }}>
        <span aria-hidden="true">☕</span>
        Built fellow-learner style — NetworkChuck energy, none of the dead Hub.
      </div>
    </Section>
  );
}

// ── Pages & widgets — the runtime UI builder ──────────────────────────────
// Compose dynamic tabs + drop widgets onto any tab (built-in or dynamic).
// An external agent uses the same store helpers via window.hub.customize;
// this UI is just the human-driven path.

const BUILTIN_TAB_OPTIONS: { id: string; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "ahead", label: "Get Ahead" },
  { id: "calendar", label: "Calendar" },
  { id: "screens", label: "Screens" },
  { id: "empire", label: "Empire" },
  { id: "projects", label: "Projects" },
  { id: "plans", label: "Plans" },
  { id: "goals", label: "Goals" },
  { id: "achievements", label: "Achievements" },
  { id: "insights", label: "Insights" },
  { id: "levels", label: "Levels" },
];

function PagesAndWidgetsCard({ s }: { s: State }) {
  const dyn = s.customization.dynamicTabs;
  const [target, setTarget] = useState<string>(dyn[0]?.id ?? "today");
  const [newTabLabel, setNewTabLabel] = useState("");
  const [newTabIcon, setNewTabIcon] = useState("");

  const tabOptions = [
    ...BUILTIN_TAB_OPTIONS.map((t) => ({ id: t.id, label: t.label, builtIn: true })),
    ...dyn.map((d) => ({ id: d.id, label: d.label, builtIn: false })),
  ];
  const widgetsHere = s.customization.widgets[target] ?? [];

  function addNewTab() {
    const label = newTabLabel.trim();
    if (!label) return;
    const t = addDynamicTab(label, newTabIcon.trim() || undefined);
    setTarget(t.id);
    setNewTabLabel(""); setNewTabIcon("");
  }

  return (
    <Section title="Pages & widgets" sub="Build whatever you want. Add a tab; drop widgets on it. (Or onto a built-in tab — they show above its default content.)">
      <div className="mm-row" style={{ alignItems: "flex-end" }}>
        <div className="mm-field" style={{ flex: 1 }}>
          <label>New tab label</label>
          <input value={newTabLabel} placeholder="e.g. Workouts" onChange={(e) => setNewTabLabel(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addNewTab(); }} />
        </div>
        <div className="mm-field" style={{ width: 100 }}>
          <label>Icon (optional)</label>
          <input value={newTabIcon} placeholder="🏋️" onChange={(e) => setNewTabIcon(e.target.value)} />
        </div>
        <button className="mm-btn mm-btn-primary" onClick={addNewTab}>+ Add tab</button>
      </div>

      {dyn.length > 0 && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 11, color: T.inkTiny, letterSpacing: ".06em", textTransform: "uppercase" }}>Your tabs</div>
          {dyn.map((d, i) => (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input value={d.icon ?? ""} placeholder="icon" onChange={(e) => updateDynamicTab(d.id, { icon: e.target.value })} style={{ width: 56 }} />
              <input value={d.label} placeholder="Label" onChange={(e) => updateDynamicTab(d.id, { label: e.target.value })} style={{ flex: 1 }} />
              <button className="mm-btn" style={{ padding: "3px 8px" }} disabled={i === 0} onClick={() => moveDynamicTab(d.id, -1)}>↑</button>
              <button className="mm-btn" style={{ padding: "3px 8px" }} disabled={i === dyn.length - 1} onClick={() => moveDynamicTab(d.id, 1)}>↓</button>
              <button className="mm-btn mm-btn-danger" style={{ padding: "3px 8px" }} onClick={() => { if (confirm(`Delete tab "${d.label}" and all its widgets?`)) { removeDynamicTab(d.id); if (target === d.id) setTarget("today"); } }}>×</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ height: 1, background: T.line, margin: "12px 0" }} />

      <div className="mm-row" style={{ alignItems: "flex-end" }}>
        <div className="mm-field" style={{ flex: 1 }}>
          <label>Drop widgets onto</label>
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            <optgroup label="Built-in tabs">
              {BUILTIN_TAB_OPTIONS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </optgroup>
            {dyn.length > 0 && (
              <optgroup label="Your tabs">
                {dyn.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
              </optgroup>
            )}
          </select>
        </div>
        <div className="mm-field" style={{ flex: 1 }}>
          <label>Add a widget</label>
          <div className="mm-row">
            {WIDGET_KINDS.map((k) => (
              <button key={k} className="mm-tab" onClick={() => addWidget(target, blankWidget(k))}>{k}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 8, fontSize: 11, color: T.inkTiny }}>
        On <b>{tabOptions.find((t) => t.id === target)?.label ?? target}</b> · {widgetsHere.length} widget{widgetsHere.length === 1 ? "" : "s"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
        {widgetsHere.length === 0 && <div style={{ fontSize: 12, color: T.inkTiny, fontStyle: "italic" }}>No widgets on this tab yet.</div>}
        {widgetsHere.map((w: Widget) => (
          <WidgetEditor key={w.id} tabId={target} w={w} onMove={(dir) => moveWidget(target, w.id, dir)} />
        ))}
      </div>
    </Section>
  );
}
