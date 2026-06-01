import { useEffect, useState } from "react";
import {
  EXTENSIONS, addCustomExtension, loadCustomExtensions, removeCustomExtension,
  subscribeCustomExtensions, type Extension,
} from "../extensions";

export function ExtensionsView({
  enabled,
  onToggle,
}: {
  enabled: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [custom, setCustom] = useState<Extension[]>(loadCustomExtensions);
  useEffect(() => subscribeCustomExtensions(() => setCustom(loadCustomExtensions())), []);

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function pickFile() {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = ".js,text/javascript";
    inp.onchange = async () => {
      const f = inp.files?.[0]; if (!f) return;
      const text = await f.text();
      setCode(text);
      if (!name) setName(f.name.replace(/\.[^.]+$/, ""));
    };
    inp.click();
  }
  function save() {
    setErr(null);
    if (!code.trim()) { setErr("Paste some JavaScript or upload a .js file first."); return; }
    if (!name.trim()) { setErr("Give your extension a name."); return; }
    try {
      addCustomExtension(name, desc, code);
      setName(""); setDesc(""); setCode("");
    } catch (e) { setErr(String(e)); }
  }

  return (
    <div className="stage">
      <div className="mono" style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "var(--mute)" }}>
        Extensions
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        <p style={{ color: "var(--mute)", fontSize: 13, maxWidth: 720, marginTop: 0 }}>
          Browser extensions run in every webview tab. Toggle a card on or off; changes apply live (no reload). You can also write or upload your own — paste any JavaScript and it runs at the page's <code>dom-ready</code>, with a <code>data-nchub-ext</code> tagging helper so toggling off cleanly strips it.
        </p>

        {/* Add your own */}
        <div className="panel" style={{ padding: 14, marginBottom: 18, borderColor: "rgba(255,87,119,0.35)" }}>
          <div className="mono glow-text" style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>+ Write or upload your own</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8, marginBottom: 8 }}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" style={inp} />
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)" style={inp} />
          </div>
          <textarea value={code} onChange={(e) => setCode(e.target.value)} placeholder={"// Runs in every page. Example:\n// document.body.style.background = 'pink';\n// To make it strip cleanly when disabled, tag inserts:\n// var el = window.__nchubReg_<your-id>(document.createElement('div'));"}
            spellCheck={false}
            style={{ ...inp, width: "100%", minHeight: 140, fontFamily: "ui-monospace,monospace", lineHeight: 1.5, whiteSpace: "pre" }} />
          {err && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 6 }}>{err}</div>}
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            <button className="btn" onClick={save}>Add extension</button>
            <button className="btn" onClick={() => void pickFile()}>Upload .js file</button>
            <span style={{ flex: 1 }} />
            <button className="btn" onClick={() => { setName(""); setDesc(""); setCode(""); setErr(null); }}>Clear</button>
          </div>
        </div>

        {/* User-added */}
        {custom.length > 0 && (
          <>
            <div className="mono" style={{ fontSize: 11, letterSpacing: 1.5, color: "var(--mute)", textTransform: "uppercase", margin: "6px 0 8px" }}>Your extensions</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 18 }}>
              {custom.map((e) => renderCard(e, enabled.has(e.id), () => onToggle(e.id), () => removeCustomExtension(e.id), true))}
            </div>
          </>
        )}

        {/* Built-in */}
        <div className="mono" style={{ fontSize: 11, letterSpacing: 1.5, color: "var(--mute)", textTransform: "uppercase", margin: "6px 0 8px" }}>House extensions</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {EXTENSIONS.map((e) => renderCard(e, enabled.has(e.id), () => onToggle(e.id)))}
        </div>
      </div>
    </div>
  );
}

function renderCard(e: Extension, on: boolean, onToggle: () => void, onDelete?: () => void, isCustom = false) {
  return (
    <div key={e.id} className="panel" style={{ padding: 14, cursor: "pointer", borderColor: on ? "rgba(255,87,119,0.6)" : undefined, boxShadow: on ? "0 0 18px rgba(255,51,85,0.25)" : undefined, color: "var(--ink)", textAlign: "left", position: "relative" }} onClick={onToggle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="glow-text" style={{ fontSize: 18 }}>{isCustom ? "◈" : "◆"}</span>
        <span className="mono" style={{ fontSize: 10, letterSpacing: 1, padding: "2px 8px", borderRadius: 4, border: "1px solid var(--line)", color: on ? "var(--pink)" : "var(--mute)" }}>{on ? "ON" : "OFF"}</span>
      </div>
      <div className="mono" style={{ marginTop: 8, fontSize: 13, fontWeight: 700 }}>{e.name}</div>
      <div style={{ marginTop: 4, fontSize: 12, color: "var(--mute)", lineHeight: 1.4 }}>{e.desc}</div>
      {onDelete && (
        <button onClick={(ev) => { ev.stopPropagation(); if (confirm("Remove " + e.name + "?")) onDelete(); }}
          style={{ position: "absolute", top: 8, right: 8, background: "transparent", border: "none", color: "var(--mute)", fontSize: 11, cursor: "pointer" }}
          title="Remove extension">✕</button>
      )}
    </div>
  );
}

const inp: React.CSSProperties = {
  background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 8,
  color: "var(--ink)", padding: "8px 10px", fontSize: 13, fontFamily: "ui-monospace, monospace", outline: "none",
};
