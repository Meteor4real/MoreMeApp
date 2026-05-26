import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { loadConfig, isWired } from "../ai/store";

// Embedded DigitalBlueprint — a real in-app 3D editor. Full material system
// (metalness, roughness, transmission/transparency, emissive, textures, flat
// shading, wireframe) via MeshPhysicalMaterial, plus an LLM scene generator
// that turns a prompt into placeable, editable objects. No mesh authoring —
// scope is exactly "Blender minus making models yourself".

type Shape = "box" | "sphere" | "cylinder" | "cone" | "torus" | "plane";

function geom(shape: Shape): THREE.BufferGeometry {
  switch (shape) {
    case "sphere": return new THREE.SphereGeometry(0.6, 48, 32);
    case "cylinder": return new THREE.CylinderGeometry(0.5, 0.5, 1.2, 48);
    case "cone": return new THREE.ConeGeometry(0.6, 1.2, 48);
    case "torus": return new THREE.TorusGeometry(0.5, 0.2, 24, 64);
    case "plane": return new THREE.PlaneGeometry(1.5, 1.5);
    default: return new THREE.BoxGeometry(1, 1, 1);
  }
}

type Snap = {
  color: string; metalness: number; roughness: number; emissive: string;
  emissiveIntensity: number; opacity: number; transmission: number;
  wireframe: boolean; flatShading: boolean; textureUrl: string;
  px: number; py: number; pz: number; sx: number; sy: number; sz: number;
};

export function DigitalBlueprint() {
  const mount = useRef<HTMLDivElement>(null);
  const scene = useRef<THREE.Scene>();
  const renderer = useRef<THREE.WebGLRenderer>();
  const camera = useRef<THREE.PerspectiveCamera>();
  const objects = useRef<THREE.Mesh[]>([]);
  const selected = useRef<THREE.Mesh | null>(null);
  const [snap, setSnap] = useState<Snap | null>(null);
  const [prompt, setPrompt] = useState("a small sci-fi reactor: a glowing core sphere flanked by metal pillars");
  const [genStatus, setGenStatus] = useState<string | null>(null);

  useEffect(() => {
    const el = mount.current!;
    const sc = new THREE.Scene();
    sc.background = new THREE.Color("#0a0a0c");
    const cam = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
    cam.position.set(4, 3, 6);
    const rnd = new THREE.WebGLRenderer({ antialias: true });
    rnd.setPixelRatio(Math.min(devicePixelRatio, 2));
    rnd.toneMapping = THREE.ACESFilmicToneMapping;
    rnd.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(rnd.domElement);
    rnd.domElement.style.width = "100%";
    rnd.domElement.style.height = "100%";

    // environment for real reflections/shininess
    const pmrem = new THREE.PMREMGenerator(rnd);
    sc.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    sc.add(new THREE.HemisphereLight(0xffffff, 0x222233, 0.6));
    const dir = new THREE.DirectionalLight(0xff5577, 1.1);
    dir.position.set(5, 8, 4);
    sc.add(dir);
    const grid = new THREE.GridHelper(40, 40, 0xff2d4a, 0x222228);
    (grid.material as THREE.Material).opacity = 0.35;
    (grid.material as THREE.Material).transparent = true;
    sc.add(grid);

    const controls = new OrbitControls(cam, rnd.domElement);
    controls.enableDamping = true;

    scene.current = sc;
    renderer.current = rnd;
    camera.current = cam;

    const ray = new THREE.Raycaster();
    const onClick = (e: MouseEvent) => {
      const r = rnd.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, cam);
      const hit = ray.intersectObjects(objects.current, false)[0];
      select(hit ? (hit.object as THREE.Mesh) : null);
    };
    rnd.domElement.addEventListener("click", onClick);

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      rnd.setSize(w, h, false);
      cam.aspect = w / Math.max(h, 1);
      cam.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    let raf = 0;
    const loop = () => {
      controls.update();
      rnd.render(sc, cam);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      rnd.domElement.removeEventListener("click", onClick);
      controls.dispose();
      pmrem.dispose();
      rnd.dispose();
      el.removeChild(rnd.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function readSnap(m: THREE.Mesh): Snap {
    const mat = m.material as THREE.MeshPhysicalMaterial;
    return {
      color: "#" + mat.color.getHexString(),
      metalness: mat.metalness, roughness: mat.roughness,
      emissive: "#" + mat.emissive.getHexString(), emissiveIntensity: mat.emissiveIntensity,
      opacity: mat.opacity, transmission: mat.transmission,
      wireframe: mat.wireframe, flatShading: mat.flatShading,
      textureUrl: (m.userData.textureUrl as string) || "",
      px: m.position.x, py: m.position.y, pz: m.position.z,
      sx: m.scale.x, sy: m.scale.y, sz: m.scale.z,
    };
  }

  function select(m: THREE.Mesh | null) {
    objects.current.forEach((o) => ((o.material as THREE.MeshPhysicalMaterial).emissiveIntensity = (o.userData.ei as number) ?? (o.material as THREE.MeshPhysicalMaterial).emissiveIntensity));
    selected.current = m;
    setSnap(m ? readSnap(m) : null);
  }

  function addShape(shape: Shape, opts?: Partial<Snap> & { color?: string }) {
    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(opts?.color || "#ff5577"),
      metalness: opts?.metalness ?? 0.1, roughness: opts?.roughness ?? 0.5,
      transmission: opts?.transmission ?? 0, transparent: (opts?.opacity ?? 1) < 1 || (opts?.transmission ?? 0) > 0,
      opacity: opts?.opacity ?? 1, thickness: 0.5,
      emissive: new THREE.Color(opts?.emissive || "#000000"), emissiveIntensity: opts?.emissiveIntensity ?? 1,
    });
    const m = new THREE.Mesh(geom(shape), mat);
    m.userData.shape = shape;
    m.position.set(opts?.px ?? 0, opts?.py ?? 0.6, opts?.pz ?? 0);
    if (opts?.sx) m.scale.set(opts.sx, opts.sy ?? opts.sx, opts.sz ?? opts.sx);
    scene.current!.add(m);
    objects.current.push(m);
    return m;
  }

  function patch(p: Partial<Snap>) {
    const m = selected.current;
    if (!m) return;
    const mat = m.material as THREE.MeshPhysicalMaterial;
    if (p.color) mat.color.set(p.color);
    if (p.emissive) mat.emissive.set(p.emissive);
    if (p.metalness !== undefined) mat.metalness = p.metalness;
    if (p.roughness !== undefined) mat.roughness = p.roughness;
    if (p.emissiveIntensity !== undefined) mat.emissiveIntensity = p.emissiveIntensity;
    if (p.opacity !== undefined) { mat.opacity = p.opacity; mat.transparent = p.opacity < 1 || mat.transmission > 0; }
    if (p.transmission !== undefined) { mat.transmission = p.transmission; mat.transparent = p.transmission > 0 || mat.opacity < 1; }
    if (p.wireframe !== undefined) mat.wireframe = p.wireframe;
    if (p.flatShading !== undefined) { mat.flatShading = p.flatShading; mat.needsUpdate = true; }
    if (p.px !== undefined) m.position.x = p.px;
    if (p.py !== undefined) m.position.y = p.py;
    if (p.pz !== undefined) m.position.z = p.pz;
    if (p.sx !== undefined) m.scale.x = p.sx;
    if (p.sy !== undefined) m.scale.y = p.sy;
    if (p.sz !== undefined) m.scale.z = p.sz;
    if (p.textureUrl !== undefined) {
      m.userData.textureUrl = p.textureUrl;
      if (p.textureUrl) {
        new THREE.TextureLoader().load(p.textureUrl, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          mat.map = tex; mat.needsUpdate = true;
        });
      } else { mat.map = null; mat.needsUpdate = true; }
    }
    mat.needsUpdate = true;
    setSnap(readSnap(m));
  }

  function del() {
    const m = selected.current;
    if (!m) return;
    scene.current!.remove(m);
    objects.current = objects.current.filter((o) => o !== m);
    m.geometry.dispose();
    (m.material as THREE.Material).dispose();
    select(null);
  }

  async function generate() {
    const cfg = loadConfig()["claude"];
    if (!isWired(cfg)) { setGenStatus("Wire Claude in AI Group Chat to generate."); return; }
    setGenStatus("Generating…");
    const res = await window.hub.aiChat({
      provider: "anthropic", apiKey: cfg!.apiKey, model: cfg!.model || "claude-opus-4-7",
      system:
        "You design 3D scenes for a blueprint editor. Reply ONLY with a JSON array of objects: " +
        '[{"shape":"box|sphere|cylinder|cone|torus|plane","position":[x,y,z],"scale":[x,y,z],' +
        '"color":"#hex","metalness":0-1,"roughness":0-1,"emissive":"#hex","emissiveIntensity":0-3,"opacity":0-1,"transmission":0-1}]. ' +
        "Keep 3-9 objects, y>=0, sensible scales (0.2-3). No prose.",
      messages: [{ role: "user", content: `Build: ${prompt}` }],
    });
    if (!res.ok) { setGenStatus(res.error || "Generation failed."); return; }
    let t = res.text.trim().replace(/^```(json)?/i, "").replace(/```$/, "");
    const a = t.indexOf("["), b = t.lastIndexOf("]");
    if (a >= 0 && b > a) t = t.slice(a, b + 1);
    try {
      const spec = JSON.parse(t) as Array<Record<string, unknown>>;
      let n = 0;
      for (const o of spec) {
        const shape = (o.shape as Shape) || "box";
        const pos = (o.position as number[]) || [0, 0.6, 0];
        const scl = (o.scale as number[]) || [1, 1, 1];
        addShape(shape, {
          color: o.color as string, metalness: o.metalness as number, roughness: o.roughness as number,
          emissive: o.emissive as string, emissiveIntensity: o.emissiveIntensity as number,
          opacity: o.opacity as number, transmission: o.transmission as number,
          px: pos[0], py: pos[1], pz: pos[2], sx: scl[0], sy: scl[1], sz: scl[2],
        });
        n++;
      }
      setGenStatus(`Generated ${n} object(s).`);
    } catch {
      setGenStatus("Could not parse the generated scene.");
    }
  }

  const shapes: Shape[] = ["box", "sphere", "cylinder", "cone", "torus", "plane"];

  return (
    <div className="stage">
      <div className="mono" style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "var(--mute)" }}>
        DigitalBlueprint <span className="glow-text">· 3D editor</span>
      </div>
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <div ref={mount} style={{ flex: 1, minWidth: 0, position: "relative", background: "#0a0a0c" }} />
        <div style={{ width: 300, borderLeft: "1px solid var(--line)", overflow: "auto", padding: 12 }}>
          <Label>Add</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {shapes.map((s) => (
              <button key={s} className="btn" style={{ textTransform: "capitalize" }} onClick={() => select(addShape(s))}>{s}</button>
            ))}
          </div>

          <Label>AI generate</Label>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3}
            style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink)", padding: 8, fontSize: 12, fontFamily: "inherit", outline: "none", resize: "vertical" }} />
          <button className="btn" style={{ marginTop: 6 }} onClick={() => void generate()}>Generate scene</button>
          {genStatus && <div style={{ fontSize: 11, color: "var(--mute)", marginTop: 6 }}>{genStatus}</div>}

          <div style={{ height: 1, background: "var(--line)", margin: "14px 0" }} />

          {!snap && <div style={{ fontSize: 12, color: "var(--mute)" }}>Click an object to edit its material + transform.</div>}
          {snap && (
            <>
              <Label>Material</Label>
              <Row l="color"><input type="color" value={snap.color} onChange={(e) => patch({ color: e.target.value })} /></Row>
              <Slider l="metalness" v={snap.metalness} on={(v) => patch({ metalness: v })} />
              <Slider l="roughness" v={snap.roughness} on={(v) => patch({ roughness: v })} />
              <Row l="emissive"><input type="color" value={snap.emissive} onChange={(e) => patch({ emissive: e.target.value })} /></Row>
              <Slider l="emissive intensity" v={snap.emissiveIntensity} max={3} on={(v) => patch({ emissiveIntensity: v })} />
              <Slider l="opacity" v={snap.opacity} on={(v) => patch({ opacity: v })} />
              <Slider l="transmission (glass)" v={snap.transmission} on={(v) => patch({ transmission: v })} />
              <Row l="wireframe"><input type="checkbox" checked={snap.wireframe} onChange={(e) => patch({ wireframe: e.target.checked })} /></Row>
              <Row l="flat shading"><input type="checkbox" checked={snap.flatShading} onChange={(e) => patch({ flatShading: e.target.checked })} /></Row>
              <Label>Texture URL</Label>
              <input value={snap.textureUrl} placeholder="https://…(jpg/png)" onChange={(e) => patch({ textureUrl: e.target.value })}
                style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 6, color: "var(--ink)", padding: "6px 8px", fontSize: 11, fontFamily: "ui-monospace, monospace", outline: "none" }} />

              <Label>Transform</Label>
              <Vec l="pos" a={snap.px} b={snap.py} c={snap.pz} on={(x, y, z) => patch({ px: x, py: y, pz: z })} />
              <Vec l="scale" a={snap.sx} b={snap.sy} c={snap.sz} step={0.1} on={(x, y, z) => patch({ sx: x, sy: y, sz: z })} />

              <button className="btn" style={{ marginTop: 12 }} onClick={del}>Delete object</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mono" style={{ fontSize: 10, letterSpacing: 1, color: "var(--mute)", textTransform: "uppercase", margin: "8px 0 6px" }}>{children}</div>;
}
function Row({ l, children }: { l: string; children: React.ReactNode }) {
  return <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--mute)", marginBottom: 6 }}><span>{l}</span>{children}</div>;
}
function Slider({ l, v, on, max = 1 }: { l: string; v: number; on: (v: number) => void; max?: number }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--mute)" }}><span>{l}</span><span>{v.toFixed(2)}</span></div>
      <input type="range" min={0} max={max} step={0.01} value={v} onChange={(e) => on(Number(e.target.value))} style={{ width: "100%" }} />
    </div>
  );
}
function Vec({ l, a, b, c, on, step = 0.25 }: { l: string; a: number; b: number; c: number; on: (x: number, y: number, z: number) => void; step?: number }) {
  const s: React.CSSProperties = { width: "31%", background: "rgba(0,0,0,0.5)", border: "1px solid var(--line)", borderRadius: 6, color: "var(--ink)", padding: "5px 6px", fontSize: 11, fontFamily: "ui-monospace, monospace", outline: "none" };
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 11, color: "var(--mute)" }}>{l}</div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        <input type="number" step={step} value={a} onChange={(e) => on(Number(e.target.value), b, c)} style={s} />
        <input type="number" step={step} value={b} onChange={(e) => on(a, Number(e.target.value), c)} style={s} />
        <input type="number" step={step} value={c} onChange={(e) => on(a, b, Number(e.target.value))} style={s} />
      </div>
    </div>
  );
}
