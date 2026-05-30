import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { houseChat } from "../houseLLM";

// Blueprint / draughting-paper aesthetic, matching the real Digital Blueprint
// site: navy graph-paper, light-blue ink, amber accent, Courier New labels.
const DB = {
  paper: "#0e1c34", paper2: "#0a1628", paper3: "#122542",
  ink: "#a8d8ff", inkSoft: "#7fb8e6", inkLight: "#6a86aa", inkDim: "#4a5e7c",
  accent: "#ffb84d", accent2: "#ff7a4a", rule: "#2a4268", ruleSoft: "rgba(88,138,198,0.35)",
  gridLine: "rgba(168,216,255,0.10)", gridMinor: "rgba(168,216,255,0.04)",
};
const DB_STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
.db-embed { background: ${DB.paper}; color: ${DB.ink}; font-family: "Inter", system-ui, sans-serif; }
.db-embed .db-mono { font-family: "Courier New", ui-monospace, monospace; letter-spacing: 0.15em; text-transform: uppercase; }
.db-embed .db-paper {
  background-color: ${DB.paper};
  background-image:
    linear-gradient(${DB.gridLine} 1px, transparent 1px),
    linear-gradient(90deg, ${DB.gridLine} 1px, transparent 1px),
    linear-gradient(${DB.gridMinor} 1px, transparent 1px),
    linear-gradient(90deg, ${DB.gridMinor} 1px, transparent 1px);
  background-size: 80px 80px, 80px 80px, 16px 16px, 16px 16px;
}
.db-embed .db-btn { background: ${DB.paper3}; border: 1px solid ${DB.ink}; border-radius: 2px; padding: 7px 12px; color: ${DB.ink}; font-family: "Courier New", monospace; font-size: 11px; letter-spacing: 0.13em; text-transform: uppercase; cursor: pointer; transition: all .12s; }
.db-embed .db-btn:hover { background: ${DB.ink}; color: ${DB.paper}; }
.db-embed .db-btn.primary { background: ${DB.ink}; color: ${DB.paper}; }
.db-embed .db-btn.primary:hover { background: ${DB.accent}; border-color: ${DB.accent}; color: ${DB.paper}; }
.db-embed input, .db-embed textarea, .db-embed select { background: ${DB.paper2}; border: 1px solid ${DB.rule}; border-radius: 2px; color: ${DB.ink}; outline: none; font-family: "Courier New", monospace; }
.db-embed input:focus, .db-embed textarea:focus, .db-embed select:focus { border-color: ${DB.accent}; }
.db-embed input[type=range] { accent-color: ${DB.accent}; }
`;

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
  clearcoat: number; ior: number; sheen: number;
  wireframe: boolean; flatShading: boolean; textureUrl: string; texture: string;
  px: number; py: number; pz: number; sx: number; sy: number; sz: number;
  rx: number; ry: number; rz: number;
  // Spatial documentation: text attached to the object in 3D space. Title is
  // rendered as a label above the object; body shows in the inspector and on
  // hover/selection over the floating label.
  annTitle: string; annBody: string;
};

// Atmosphere — real-time controls over scene lighting + sky so the blueprint
// supports simulation of scale, lighting, and "atmosphere" as the spec calls
// for. Stored independently of objects.
type Atmosphere = {
  bg: string;          // scene background / sky color
  ambient: number;     // hemisphere intensity 0..2
  sunColor: string;
  sunIntensity: number; // directional light intensity 0..3
  sunAzimuth: number;  // degrees
  sunElevation: number; // degrees
};
const DEFAULT_ATMOSPHERE: Atmosphere = {
  bg: "#0a1628", ambient: 0.6, sunColor: "#fff0d0", sunIntensity: 1.1,
  sunAzimuth: 40, sunElevation: 55,
};

// Procedural textures the AI (or you) can apply — "AI makes textures" without
// needing image files. Returns a CanvasTexture.
function makeTexture(kind: string, color = "#888888"): THREE.CanvasTexture | null {
  if (!kind || kind === "none") return null;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d")!;
  x.fillStyle = color;
  x.fillRect(0, 0, 256, 256);
  x.fillStyle = "rgba(0,0,0,0.35)";
  if (kind === "checker") {
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2) x.fillRect(i * 32, j * 32, 32, 32);
  } else if (kind === "grid") {
    x.strokeStyle = "rgba(0,0,0,0.4)";
    for (let i = 0; i <= 256; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.moveTo(0, i); x.lineTo(256, i); x.stroke(); }
  } else if (kind === "stripes") {
    for (let i = 0; i < 256; i += 24) x.fillRect(i, 0, 12, 256);
  } else if (kind === "noise") {
    const img = x.getImageData(0, 0, 256, 256);
    for (let i = 0; i < img.data.length; i += 4) { const n = (Math.random() - 0.5) * 90; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
    x.putImageData(img, 0, 0);
  } else if (kind === "dots") {
    for (let i = 16; i < 256; i += 40) for (let j = 16; j < 256; j += 40) { x.beginPath(); x.arc(i, j, 8, 0, 7); x.fill(); }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Position a directional light on a hemispherical dome relative to the scene
// origin, parameterized by azimuth (compass) + elevation (above horizon).
function placeSun(light: THREE.DirectionalLight, azDeg: number, elDeg: number) {
  const r = 12;
  const az = THREE.MathUtils.degToRad(azDeg);
  const el = THREE.MathUtils.degToRad(elDeg);
  light.position.set(
    r * Math.cos(el) * Math.cos(az),
    r * Math.sin(el),
    r * Math.cos(el) * Math.sin(az)
  );
}

// Project a 3D world position to canvas-relative pixel coordinates.
function project(world: THREE.Vector3, cam: THREE.PerspectiveCamera, w: number, h: number) {
  const p = world.clone().project(cam);
  return {
    x: (p.x * 0.5 + 0.5) * w,
    y: (-p.y * 0.5 + 0.5) * h,
    behind: p.z >= 1,
  };
}

export function DigitalBlueprint() {
  const mount = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const scene = useRef<THREE.Scene>();
  const renderer = useRef<THREE.WebGLRenderer>();
  const camera = useRef<THREE.PerspectiveCamera>();
  const objects = useRef<THREE.Mesh[]>([]);
  const selected = useRef<THREE.Mesh | null>(null);
  const hemi = useRef<THREE.HemisphereLight>();
  const sun = useRef<THREE.DirectionalLight>();
  const api = useRef<{ setWalk: (b: boolean) => void; importGlb: (f: File) => void }>({
    setWalk: () => {},
    importGlb: () => {},
  });
  const [mode, setMode] = useState<"orbit" | "walk">("orbit");
  const [snap, setSnap] = useState<Snap | null>(null);
  const [prompt, setPrompt] = useState("a small sci-fi reactor: a glowing core sphere flanked by metal pillars");
  const [genStatus, setGenStatus] = useState<string | null>(null);
  const [atmos, setAtmos] = useState<Atmosphere>(DEFAULT_ATMOSPHERE);
  const [showAllLabels, setShowAllLabels] = useState(true);
  // Re-renders the annotation overlay every animation frame so labels track
  // the camera. Cheap: we cap labels at the object count.
  const [, setTick] = useState(0);

  useEffect(() => {
    const el = mount.current!;
    const sc = new THREE.Scene();
    sc.background = new THREE.Color("#0a1628");
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

    const hemiL = new THREE.HemisphereLight(0xffffff, 0x152540, atmos.ambient);
    sc.add(hemiL);
    hemi.current = hemiL;
    const dir = new THREE.DirectionalLight(new THREE.Color(atmos.sunColor), atmos.sunIntensity);
    placeSun(dir, atmos.sunAzimuth, atmos.sunElevation);
    sc.add(dir);
    sun.current = dir;
    const grid = new THREE.GridHelper(40, 40, 0xffb84d, 0x2a4268);
    (grid.material as THREE.Material).opacity = 0.4;
    (grid.material as THREE.Material).transparent = true;
    sc.add(grid);

    const controls = new OrbitControls(cam, rnd.domElement);
    controls.enableDamping = true;

    // walk mode (pointer lock + WASD) alongside orbit
    const pointer = new PointerLockControls(cam, rnd.domElement);
    const keys: Record<string, boolean> = {};
    const kd = (e: KeyboardEvent) => (keys[e.code] = true);
    const ku = (e: KeyboardEvent) => (keys[e.code] = false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    pointer.addEventListener("unlock", () => {
      controls.enabled = true;
      setMode("orbit");
    });
    const clock = new THREE.Clock();
    api.current.setWalk = (b: boolean) => {
      if (b) {
        controls.enabled = false;
        pointer.lock();
      } else {
        pointer.unlock();
        controls.enabled = true;
      }
    };
    api.current.importGlb = (file: File) => {
      file.arrayBuffer().then((buf) => {
        new GLTFLoader().parse(buf, "", (gltf) => {
          gltf.scene.position.set(0, 0, 0);
          sc.add(gltf.scene);
        });
      });
    };

    scene.current = sc;
    renderer.current = rnd;
    camera.current = cam;

    const ray = new THREE.Raycaster();
    const onClick = (e: MouseEvent) => {
      if (pointer.isLocked) return; // in walk mode, clicks drive look/lock
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
    let frame = 0;
    const loop = () => {
      const dt = clock.getDelta();
      if (pointer.isLocked) {
        const sp = 4 * dt;
        if (keys["KeyW"]) pointer.moveForward(sp);
        if (keys["KeyS"]) pointer.moveForward(-sp);
        if (keys["KeyA"]) pointer.moveRight(-sp);
        if (keys["KeyD"]) pointer.moveRight(sp);
      } else {
        controls.update();
      }
      rnd.render(sc, cam);
      // Drive the annotation overlay at ~20 Hz so labels track the camera
      // without re-rendering the React tree on every frame.
      frame++;
      if (frame % 3 === 0) setTick((t) => (t + 1) & 0x7fff);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      rnd.domElement.removeEventListener("click", onClick);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      controls.dispose();
      pointer.dispose();
      pmrem.dispose();
      rnd.dispose();
      el.removeChild(rnd.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-apply atmosphere whenever its state changes.
  useEffect(() => {
    if (scene.current) scene.current.background = new THREE.Color(atmos.bg);
    if (hemi.current) hemi.current.intensity = atmos.ambient;
    if (sun.current) {
      sun.current.color.set(atmos.sunColor);
      sun.current.intensity = atmos.sunIntensity;
      placeSun(sun.current, atmos.sunAzimuth, atmos.sunElevation);
    }
  }, [atmos]);

  function readSnap(m: THREE.Mesh): Snap {
    const mat = m.material as THREE.MeshPhysicalMaterial;
    const deg = (r: number) => Math.round(THREE.MathUtils.radToDeg(r));
    const ann = (m.userData.annotation as { title?: string; body?: string } | undefined) || {};
    return {
      color: "#" + mat.color.getHexString(),
      metalness: mat.metalness, roughness: mat.roughness,
      emissive: "#" + mat.emissive.getHexString(), emissiveIntensity: mat.emissiveIntensity,
      opacity: mat.opacity, transmission: mat.transmission,
      clearcoat: mat.clearcoat, ior: mat.ior, sheen: mat.sheen,
      wireframe: mat.wireframe, flatShading: mat.flatShading,
      textureUrl: (m.userData.textureUrl as string) || "",
      texture: (m.userData.texture as string) || "none",
      px: m.position.x, py: m.position.y, pz: m.position.z,
      sx: m.scale.x, sy: m.scale.y, sz: m.scale.z,
      rx: deg(m.rotation.x), ry: deg(m.rotation.y), rz: deg(m.rotation.z),
      annTitle: ann.title || "", annBody: ann.body || "",
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
      clearcoat: opts?.clearcoat ?? 0, ior: opts?.ior ?? 1.5, sheen: opts?.sheen ?? 0,
    });
    if (opts?.texture && opts.texture !== "none") {
      mat.map = makeTexture(opts.texture, "#" + mat.color.getHexString());
    }
    const m = new THREE.Mesh(geom(shape), mat);
    m.userData.shape = shape;
    if (opts?.texture) m.userData.texture = opts.texture;
    m.position.set(opts?.px ?? 0, opts?.py ?? 0.6, opts?.pz ?? 0);
    if (opts?.sx) m.scale.set(opts.sx, opts.sy ?? opts.sx, opts.sz ?? opts.sx);
    if (opts?.rx || opts?.ry || opts?.rz)
      m.rotation.set(THREE.MathUtils.degToRad(opts.rx || 0), THREE.MathUtils.degToRad(opts.ry || 0), THREE.MathUtils.degToRad(opts.rz || 0));
    scene.current!.add(m);
    objects.current.push(m);
    saveSceneSnapshot();
    return m;
  }

  // Persist the current scene as a compact JSON snapshot so the NT5 broadcast
  // backdrop (and anyone else) can render it. Called on every mutation.
  function saveSceneSnapshot() {
    try {
      const snap = objects.current.map((m) => {
        const mat = m.material as THREE.MeshPhysicalMaterial;
        return {
          shape: m.userData.shape || "box",
          pos: [m.position.x, m.position.y, m.position.z],
          scale: [m.scale.x, m.scale.y, m.scale.z],
          color: "#" + mat.color.getHexString(),
          metal: mat.metalness,
          rough: mat.roughness,
          glow: "#" + mat.emissive.getHexString(),
          glowI: mat.emissiveIntensity,
        };
      });
      localStorage.setItem("nchub.digitalblueprint.scene.v1", JSON.stringify(snap));
    } catch { /* ignore */ }
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
    if (p.clearcoat !== undefined) mat.clearcoat = p.clearcoat;
    if (p.ior !== undefined) mat.ior = p.ior;
    if (p.sheen !== undefined) mat.sheen = p.sheen;
    if (p.wireframe !== undefined) mat.wireframe = p.wireframe;
    if (p.flatShading !== undefined) { mat.flatShading = p.flatShading; mat.needsUpdate = true; }
    if (p.px !== undefined) m.position.x = p.px;
    if (p.py !== undefined) m.position.y = p.py;
    if (p.pz !== undefined) m.position.z = p.pz;
    if (p.sx !== undefined) m.scale.x = p.sx;
    if (p.sy !== undefined) m.scale.y = p.sy;
    if (p.sz !== undefined) m.scale.z = p.sz;
    if (p.rx !== undefined) m.rotation.x = THREE.MathUtils.degToRad(p.rx);
    if (p.ry !== undefined) m.rotation.y = THREE.MathUtils.degToRad(p.ry);
    if (p.rz !== undefined) m.rotation.z = THREE.MathUtils.degToRad(p.rz);
    if (p.textureUrl !== undefined) {
      m.userData.textureUrl = p.textureUrl;
      if (p.textureUrl) {
        new THREE.TextureLoader().load(p.textureUrl, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          mat.map = tex; mat.needsUpdate = true;
        });
      } else { mat.map = null; mat.needsUpdate = true; }
    }
    if (p.texture !== undefined) {
      m.userData.texture = p.texture;
      mat.map = makeTexture(p.texture, "#" + mat.color.getHexString());
      mat.needsUpdate = true;
    }
    if (p.annTitle !== undefined || p.annBody !== undefined) {
      const prev = (m.userData.annotation as { title?: string; body?: string } | undefined) || {};
      m.userData.annotation = {
        title: p.annTitle !== undefined ? p.annTitle : (prev.title || ""),
        body:  p.annBody  !== undefined ? p.annBody  : (prev.body  || ""),
      };
    }
    mat.needsUpdate = true;
    setSnap(readSnap(m));
    saveSceneSnapshot();
  }

  function del() {
    const m = selected.current;
    if (!m) return;
    scene.current!.remove(m);
    objects.current = objects.current.filter((o) => o !== m);
    m.geometry.dispose();
    (m.material as THREE.Material).dispose();
    select(null);
    saveSceneSnapshot();
  }

  async function generate() {
    setGenStatus("Checking the local brain…");
    const st = await window.hub.llm.status();
    if (!st.ready) {
      if (st.downloading) {
        setGenStatus(`Local brain is still downloading (${Math.round(st.progress || 0)}%). Try again once it finishes; it's a one-time download.`);
      } else {
        setGenStatus("Local brain isn't ready yet. Open Settings → House AI brain → Download now, then retry.");
      }
      return;
    }
    setGenStatus("Generating…");
    // Three-pass strategy. Each pass tightens what the small local model has
    // to do: pass 1 = full schema with materials, pass 2 = minimum schema
    // (shape/pos/scale/color), pass 3 = literal "give me 8 lines like this"
    // with a worked example. Whichever pass parses first wins.
    const prompts = [
      {
        system:
          "Output a JSON array of 3D primitives and NOTHING else. No prose, no markdown, no code fences. " +
          'Schema: [{"shape":"box"|"sphere"|"cylinder"|"cone"|"torus"|"plane","pos":[x,y,z],"scale":[sx,sy,sz],"color":"#rrggbb","metal":0-1,"rough":0-1,"glow":"#rrggbb","glowI":0-3}, ...]. ' +
          "6-14 primitives. y>=0. metal/rough/glow are optional. Stack pieces so they read as a real object.",
        user: `Build: ${prompt}\n\nRespond with the JSON array only, starting with [ and ending with ].`,
      },
      {
        system: "Output ONLY a JSON array. No text before or after. Each item is " +
          '{"shape":"box"|"sphere"|"cylinder"|"cone"|"torus"|"plane","pos":[x,y,z],"scale":[sx,sy,sz],"color":"#rrggbb"}.' +
          " 8 to 12 items. y>=0.",
        user: `Build: ${prompt}\n\n[`,
      },
      {
        system: "You output a JSON array. Nothing else. Copy this format EXACTLY: " +
          '[{"shape":"box","pos":[0,0.5,0],"scale":[2,1,1],"color":"#888888"},{"shape":"sphere","pos":[0,1.6,0],"scale":[0.6,0.6,0.6],"color":"#ffcc88"}]',
        user: `Replace the contents with 8-12 primitives that look like: ${prompt}\nReply with the array only.`,
      },
    ];

    let raw = "";
    let parsed: unknown[] | null = null;
    for (let attempt = 0; attempt < prompts.length && !parsed; attempt++) {
      setGenStatus(attempt === 0 ? "Generating…" : `Pass ${attempt + 1}…`);
      const res = await houseChat(prompts[attempt].system, prompts[attempt].user);
      if (!res.ok) { setGenStatus(`Local brain error: ${res.error}`); return; }
      raw = res.text || "";
      parsed = extractJsonArray(raw);
    }
    if (!parsed || parsed.length === 0) {
      // Last-resort template match — picks a pre-built scene whose keywords
      // overlap the prompt. Keeps the action productive instead of erroring
      // out when the small local model can't hit valid JSON.
      const tpl = matchTemplate(prompt);
      if (tpl) {
        parsed = tpl as unknown[];
        setGenStatus(`Brain output wasn't parseable; dropped in a template scene matching "${prompt}". Edit it from the inspector.`);
      } else {
        setGenStatus(`Local brain produced something we couldn't parse. Try a more specific prompt (e.g. "wooden chair", "stone arch", "small house"). Last output: ${raw.slice(0, 160)}…`);
        return;
      }
    }
    let n = 0;
    for (const o of (parsed as Array<Record<string, unknown>>).slice(0, 24)) {
      const shape = (o.shape as Shape) || "box";
      const pos = (Array.isArray(o.pos) ? o.pos : Array.isArray(o.position) ? o.position : [0, 0.6, 0]) as number[];
      const scl = (Array.isArray(o.scale) ? o.scale : [1, 1, 1]) as number[];
      const rot = (Array.isArray(o.rotation) ? o.rotation : [0, 0, 0]) as number[];
      addShape(shape, {
        color: (o.color as string) || "#9ca3af",
        metalness: numOr(o.metal ?? o.metalness, 0.2),
        roughness: numOr(o.rough ?? o.roughness, 0.5),
        emissive: (o.glow as string) ?? (o.emissive as string) ?? "#000000",
        emissiveIntensity: numOr(o.glowI ?? o.emissiveIntensity, 0),
        px: numOr(pos[0], 0), py: Math.max(0, numOr(pos[1], 0.5)), pz: numOr(pos[2], 0),
        sx: numOr(scl[0], 1), sy: numOr(scl[1], 1), sz: numOr(scl[2], 1),
        rx: numOr(rot[0], 0), ry: numOr(rot[1], 0), rz: numOr(rot[2], 0),
      });
      n++;
    }
    setGenStatus(n > 0 ? `Generated ${n} object${n === 1 ? "" : "s"}.` : "No usable primitives in the parsed JSON.");
  }
  function numOr(v: unknown, fallback: number): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  // Template library for the AI fallback. Keyword-matched starter scenes —
  // not "generated" content (these are hand-authored primitives), just a
  // sane place to land when the small local model can't hit valid JSON.
  function matchTemplate(p: string): Array<Record<string, unknown>> | null {
    const k = p.toLowerCase();
    if (/chair|stool|seat/.test(k)) return [
      { shape: "box", pos: [0, 0.5, 0], scale: [1.2, 0.18, 1.2], color: "#8b5a2b", metal: 0.1, rough: 0.7 },
      { shape: "cylinder", pos: [-0.5, 0.25, -0.5], scale: [0.12, 0.5, 0.12], color: "#6b4220", metal: 0.1, rough: 0.7 },
      { shape: "cylinder", pos: [0.5, 0.25, -0.5], scale: [0.12, 0.5, 0.12], color: "#6b4220", metal: 0.1, rough: 0.7 },
      { shape: "cylinder", pos: [-0.5, 0.25, 0.5], scale: [0.12, 0.5, 0.12], color: "#6b4220", metal: 0.1, rough: 0.7 },
      { shape: "cylinder", pos: [0.5, 0.25, 0.5], scale: [0.12, 0.5, 0.12], color: "#6b4220", metal: 0.1, rough: 0.7 },
      { shape: "box", pos: [0, 1.25, -0.55], scale: [1.2, 1.4, 0.12], color: "#8b5a2b", metal: 0.1, rough: 0.7 },
    ];
    if (/table|desk/.test(k)) return [
      { shape: "box", pos: [0, 0.9, 0], scale: [2.4, 0.12, 1.2], color: "#5c3a1a", metal: 0.1, rough: 0.6 },
      { shape: "cylinder", pos: [-1.05, 0.45, -0.5], scale: [0.12, 0.9, 0.12], color: "#3b240e", metal: 0.1, rough: 0.6 },
      { shape: "cylinder", pos: [1.05, 0.45, -0.5], scale: [0.12, 0.9, 0.12], color: "#3b240e", metal: 0.1, rough: 0.6 },
      { shape: "cylinder", pos: [-1.05, 0.45, 0.5], scale: [0.12, 0.9, 0.12], color: "#3b240e", metal: 0.1, rough: 0.6 },
      { shape: "cylinder", pos: [1.05, 0.45, 0.5], scale: [0.12, 0.9, 0.12], color: "#3b240e", metal: 0.1, rough: 0.6 },
    ];
    if (/house|cabin|hut|cottage/.test(k)) return [
      { shape: "box", pos: [0, 1, 0], scale: [4, 2, 3], color: "#a47148", metal: 0.05, rough: 0.85 },
      { shape: "cone", pos: [0, 2.6, 0], scale: [2.6, 1.4, 2], color: "#7c3018", metal: 0.05, rough: 0.85 },
      { shape: "box", pos: [0, 0.9, 1.51], scale: [0.7, 1.4, 0.05], color: "#3a2210", metal: 0.05, rough: 0.85 },
      { shape: "box", pos: [-1.2, 1.2, 1.51], scale: [0.6, 0.6, 0.05], color: "#88c0d0", metal: 0.3, rough: 0.3, glow: "#88c0d0", glowI: 0.4 },
      { shape: "box", pos: [1.2, 1.2, 1.51], scale: [0.6, 0.6, 0.05], color: "#88c0d0", metal: 0.3, rough: 0.3, glow: "#88c0d0", glowI: 0.4 },
      { shape: "cylinder", pos: [1.2, 2.4, -0.6], scale: [0.25, 0.8, 0.25], color: "#4a3020", metal: 0.05, rough: 0.85 },
    ];
    if (/car|vehicle|truck/.test(k)) return [
      { shape: "box", pos: [0, 0.5, 0], scale: [3.4, 0.6, 1.4], color: "#1f2937", metal: 0.8, rough: 0.25 },
      { shape: "box", pos: [0, 1.05, 0], scale: [1.8, 0.5, 1.3], color: "#1f2937", metal: 0.8, rough: 0.25 },
      { shape: "cylinder", pos: [-1.1, 0.3, 0.75], scale: [0.35, 0.18, 0.35], color: "#0a0a0a", metal: 0.6, rough: 0.6 },
      { shape: "cylinder", pos: [1.1, 0.3, 0.75], scale: [0.35, 0.18, 0.35], color: "#0a0a0a", metal: 0.6, rough: 0.6 },
      { shape: "cylinder", pos: [-1.1, 0.3, -0.75], scale: [0.35, 0.18, 0.35], color: "#0a0a0a", metal: 0.6, rough: 0.6 },
      { shape: "cylinder", pos: [1.1, 0.3, -0.75], scale: [0.35, 0.18, 0.35], color: "#0a0a0a", metal: 0.6, rough: 0.6 },
      { shape: "box", pos: [1.5, 0.6, 0.55], scale: [0.05, 0.18, 0.18], color: "#fff3b0", glow: "#fff3b0", glowI: 1.2 },
      { shape: "box", pos: [1.5, 0.6, -0.55], scale: [0.05, 0.18, 0.18], color: "#fff3b0", glow: "#fff3b0", glowI: 1.2 },
    ];
    if (/arch|gate|portal/.test(k)) return [
      { shape: "box", pos: [-1.2, 1.5, 0], scale: [0.4, 3, 0.4], color: "#9ca3af", metal: 0.05, rough: 0.85 },
      { shape: "box", pos: [1.2, 1.5, 0], scale: [0.4, 3, 0.4], color: "#9ca3af", metal: 0.05, rough: 0.85 },
      { shape: "torus", pos: [0, 3.05, 0], scale: [1.4, 1.4, 0.4], color: "#9ca3af", metal: 0.05, rough: 0.85 },
      { shape: "box", pos: [0, 0.05, 0], scale: [3.6, 0.1, 1], color: "#71717a", metal: 0.05, rough: 0.85 },
    ];
    if (/tower|spire|skyscraper/.test(k)) return [
      { shape: "box", pos: [0, 1, 0], scale: [1.4, 2, 1.4], color: "#52525b", metal: 0.4, rough: 0.6 },
      { shape: "box", pos: [0, 2.7, 0], scale: [1.1, 1.4, 1.1], color: "#52525b", metal: 0.4, rough: 0.6 },
      { shape: "box", pos: [0, 3.9, 0], scale: [0.8, 1, 0.8], color: "#52525b", metal: 0.4, rough: 0.6 },
      { shape: "cone", pos: [0, 4.9, 0], scale: [0.6, 1.2, 0.6], color: "#a3a3a3", metal: 0.6, rough: 0.3 },
      { shape: "sphere", pos: [0, 5.7, 0], scale: [0.18, 0.18, 0.18], color: "#ffd166", glow: "#ffd166", glowI: 1.6 },
    ];
    if (/tree|pine|oak/.test(k)) return [
      { shape: "cylinder", pos: [0, 0.6, 0], scale: [0.2, 1.2, 0.2], color: "#5a3a1a", metal: 0, rough: 0.9 },
      { shape: "cone", pos: [0, 1.9, 0], scale: [1, 1.6, 1], color: "#1f7a3a", metal: 0, rough: 0.85 },
      { shape: "cone", pos: [0, 2.8, 0], scale: [0.8, 1.2, 0.8], color: "#1f7a3a", metal: 0, rough: 0.85 },
      { shape: "cone", pos: [0, 3.5, 0], scale: [0.55, 0.9, 0.55], color: "#2a8a4a", metal: 0, rough: 0.85 },
    ];
    return null;
  }
  // Resilient JSON-array extractor: strips ```code fences```, finds the first
  // balanced [...] pair (so trailing text doesn't trip JSON.parse), and tries
  // a couple of fix-ups (trailing commas, single-quoted strings).
  function extractJsonArray(text: string): unknown[] | null {
    let t = text.trim().replace(/^```(json)?/i, "").replace(/```$/i, "").trim();
    const start = t.indexOf("[");
    if (start === -1) return null;
    let depth = 0;
    let end = -1;
    for (let i = start; i < t.length; i++) {
      const c = t[i];
      if (c === "[") depth++;
      else if (c === "]") { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end === -1) return null;
    let body = t.slice(start, end + 1);
    // common LLM goofs
    body = body.replace(/,\s*([\]}])/g, "$1"); // trailing commas
    body = body.replace(/([{,]\s*)([a-zA-Z_]+)(\s*:)/g, '$1"$2"$3'); // bare keys
    try { const v = JSON.parse(body); return Array.isArray(v) ? v : null; }
    catch { /* try once more with single→double quotes */ }
    try { const v = JSON.parse(body.replace(/'([^']*)'/g, '"$1"')); return Array.isArray(v) ? v : null; }
    catch { return null; }
  }

  const shapes: Shape[] = ["box", "sphere", "cylinder", "cone", "torus", "plane"];

  return (
    <div className="stage db-embed">
      <style>{DB_STYLE}</style>
      <div className="db-mono" style={{ padding: "10px 14px", borderBottom: `1px solid ${DB.ink}`, fontSize: 12, color: DB.ink, display: "flex", alignItems: "center" }}>
        <svg width="22" height="22" viewBox="0 0 32 32" style={{ marginRight: 8 }} aria-hidden="true">
          <defs>
            <linearGradient id="dbg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffb84d" />
              <stop offset="1" stopColor="#ff7a4a" />
            </linearGradient>
          </defs>
          <path d="M3 16 A13 13 0 0 1 29 16" fill="none" stroke="url(#dbg)" strokeWidth="1" strokeDasharray="2 3" opacity="0.7" />
          <g fill="none" stroke="url(#dbg)" strokeWidth="1.6" strokeLinejoin="round">
            <path d="M16 4 L27 10 L27 22 L16 28 L5 22 L5 10 Z" />
            <path d="M16 4 L16 16 M16 16 L27 10 M16 16 L5 10 M16 16 L16 28" />
          </g>
          <circle cx="16" cy="16" r="2" fill="url(#dbg)" />
        </svg>
        DigitalBlueprint
      </div>
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0, position: "relative", background: atmos.bg }}>
          <div ref={mount} style={{ position: "absolute", inset: 0 }} />
          <div ref={overlay} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <AnnotationLayer
              objects={objects.current}
              camera={camera.current}
              mount={mount.current}
              selectedMesh={selected.current}
              showAll={showAllLabels}
            />
          </div>
        </div>
        <div className="db-paper" style={{ width: 300, borderLeft: `1px solid ${DB.ink}`, overflow: "auto", padding: 12 }}>
          <Label>Add</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {shapes.map((s) => (
              <button key={s} className="db-btn" onClick={() => select(addShape(s))}>{s}</button>
            ))}
          </div>

          <Label>View</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
            <button
              className="db-btn"
              onClick={() => {
                const next = mode !== "walk";
                api.current.setWalk(next);
                setMode(next ? "walk" : "orbit");
              }}
            >
              {mode === "walk" ? "Exit walk" : "Walk mode"}
            </button>
            <label className="db-btn" style={{ cursor: "pointer" }}>
              Import GLB
              <input
                type="file"
                accept=".glb,.gltf"
                style={{ display: "none" }}
                onChange={(e) => {
                  const fileEl = e.currentTarget;
                  const f = fileEl.files?.[0];
                  if (f) api.current.importGlb(f);
                  fileEl.value = "";
                }}
              />
            </label>
          </div>
          {mode === "walk" && (
            <div style={{ fontSize: 11, color: DB.inkLight, marginBottom: 10 }}>
              WASD to move · mouse to look · Esc to exit
            </div>
          )}

          <Label>AI generate</Label>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3}
            style={{ width: "100%", padding: 8, fontSize: 12, resize: "vertical" }} />
          <button className="db-btn primary" style={{ marginTop: 6 }} onClick={() => void generate()}>Generate scene</button>
          {genStatus && <div style={{ fontSize: 11, color: DB.inkLight, marginTop: 6 }}>{genStatus}</div>}

          <div style={{ height: 1, background: DB.rule, margin: "14px 0" }} />

          <Label>Atmosphere</Label>
          <Row l="sky"><input type="color" value={atmos.bg} onChange={(e) => setAtmos({ ...atmos, bg: e.target.value })} /></Row>
          <Slider l="ambient" v={atmos.ambient} max={2} on={(v) => setAtmos({ ...atmos, ambient: v })} />
          <Row l="sun color"><input type="color" value={atmos.sunColor} onChange={(e) => setAtmos({ ...atmos, sunColor: e.target.value })} /></Row>
          <Slider l="sun intensity" v={atmos.sunIntensity} max={3} on={(v) => setAtmos({ ...atmos, sunIntensity: v })} />
          <SliderInt l="sun azimuth°" v={atmos.sunAzimuth} min={0} max={360} on={(v) => setAtmos({ ...atmos, sunAzimuth: v })} />
          <SliderInt l="sun elevation°" v={atmos.sunElevation} min={5} max={90} on={(v) => setAtmos({ ...atmos, sunElevation: v })} />
          <Row l="show all labels">
            <input type="checkbox" checked={showAllLabels} onChange={(e) => setShowAllLabels(e.target.checked)} />
          </Row>

          <div style={{ height: 1, background: DB.rule, margin: "14px 0" }} />

          {!snap && <div style={{ fontSize: 12, color: DB.inkLight }}>Click an object to edit its material + transform.</div>}
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
              <Slider l="clearcoat" v={snap.clearcoat} on={(v) => patch({ clearcoat: v })} />
              <Slider l="ior (refraction)" v={snap.ior} max={2.5} on={(v) => patch({ ior: v })} />
              <Slider l="sheen (fabric)" v={snap.sheen} on={(v) => patch({ sheen: v })} />
              <Row l="wireframe"><input type="checkbox" checked={snap.wireframe} onChange={(e) => patch({ wireframe: e.target.checked })} /></Row>
              <Row l="flat shading"><input type="checkbox" checked={snap.flatShading} onChange={(e) => patch({ flatShading: e.target.checked })} /></Row>
              <Label>Annotation</Label>
              <input value={snap.annTitle} placeholder="label (shows above the object)" onChange={(e) => patch({ annTitle: e.target.value })}
                style={{ width: "100%", padding: "6px 8px", fontSize: 11 }} />
              <textarea value={snap.annBody} placeholder="explanation, lore, specs — shown next to the label in 3D space"
                onChange={(e) => patch({ annBody: e.target.value })} rows={3}
                style={{ width: "100%", padding: "6px 8px", fontSize: 11, marginTop: 6, resize: "vertical" }} />

              <Label>Texture URL</Label>
              <input value={snap.textureUrl} placeholder="https://…(jpg/png)" onChange={(e) => patch({ textureUrl: e.target.value })}
                style={{ width: "100%", padding: "6px 8px", fontSize: 11 }} />

              <Label>Procedural texture</Label>
              <select value={snap.texture} onChange={(e) => patch({ texture: e.target.value })}
                style={{ width: "100%", padding: "6px 8px", fontSize: 11 }}>
                {["none", "checker", "grid", "stripes", "noise", "dots"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>

              <Label>Transform</Label>
              <Vec l="pos" a={snap.px} b={snap.py} c={snap.pz} on={(x, y, z) => patch({ px: x, py: y, pz: z })} />
              <Vec l="scale" a={snap.sx} b={snap.sy} c={snap.sz} step={0.1} on={(x, y, z) => patch({ sx: x, sy: y, sz: z })} />
              <Vec l="rotation°" a={snap.rx} b={snap.ry} c={snap.rz} step={15} on={(x, y, z) => patch({ rx: x, ry: y, rz: z })} />

              <button className="db-btn" style={{ marginTop: 12, borderColor: DB.accent2, color: DB.accent2 }} onClick={del}>Delete object</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="db-mono" style={{ fontSize: 10, color: DB.accent, margin: "8px 0 6px" }}>{children}</div>;
}
function Row({ l, children }: { l: string; children: React.ReactNode }) {
  return <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: DB.inkSoft, marginBottom: 6 }}><span>{l}</span>{children}</div>;
}
function Slider({ l, v, on, max = 1 }: { l: string; v: number; on: (v: number) => void; max?: number }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: DB.inkSoft }}><span>{l}</span><span>{v.toFixed(2)}</span></div>
      <input type="range" min={0} max={max} step={0.01} value={v} onChange={(e) => on(Number(e.target.value))} style={{ width: "100%" }} />
    </div>
  );
}
function Vec({ l, a, b, c, on, step = 0.25 }: { l: string; a: number; b: number; c: number; on: (x: number, y: number, z: number) => void; step?: number }) {
  const s: React.CSSProperties = { width: "31%", padding: "5px 6px", fontSize: 11 };
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 11, color: DB.inkSoft }}>{l}</div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        <input type="number" step={step} value={a} onChange={(e) => on(Number(e.target.value), b, c)} style={s} />
        <input type="number" step={step} value={b} onChange={(e) => on(a, Number(e.target.value), c)} style={s} />
        <input type="number" step={step} value={c} onChange={(e) => on(a, b, Number(e.target.value))} style={s} />
      </div>
    </div>
  );
}
function SliderInt({ l, v, on, min = 0, max = 100 }: { l: string; v: number; on: (v: number) => void; min?: number; max?: number }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: DB.inkSoft }}><span>{l}</span><span>{v}</span></div>
      <input type="range" min={min} max={max} step={1} value={v} onChange={(e) => on(Number(e.target.value))} style={{ width: "100%" }} />
    </div>
  );
}

// Floating annotation labels — positioned by projecting each annotated
// object's world position to canvas-relative pixels. Shows on selection,
// and on every annotated object when "show all labels" is on.
function AnnotationLayer({ objects, camera, mount, selectedMesh, showAll }: {
  objects: THREE.Mesh[];
  camera: THREE.PerspectiveCamera | undefined;
  mount: HTMLDivElement | null;
  selectedMesh: THREE.Mesh | null;
  showAll: boolean;
}) {
  if (!camera || !mount) return null;
  const w = mount.clientWidth, h = mount.clientHeight;
  const eligible = objects.filter((o) => {
    const ann = o.userData.annotation as { title?: string; body?: string } | undefined;
    if (!ann || (!ann.title && !ann.body)) return false;
    if (showAll) return true;
    return o === selectedMesh;
  });
  return (
    <>
      {eligible.map((o, i) => {
        const ann = o.userData.annotation as { title?: string; body?: string };
        const world = new THREE.Vector3();
        o.getWorldPosition(world);
        // lift the label above the object using its scale.y as a rough height
        world.y += (o.scale.y || 1) * 0.7 + 0.4;
        const p = project(world, camera, w, h);
        if (p.behind) return null;
        return (
          <div key={i} style={{
            position: "absolute",
            left: p.x, top: p.y,
            transform: "translate(-50%, -100%)",
            background: "rgba(10, 22, 40, 0.88)",
            border: "1px solid #ffb84d",
            borderRadius: 4,
            color: "#a8d8ff",
            padding: "4px 8px",
            fontFamily: "'Courier New', monospace",
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            boxShadow: "0 0 14px rgba(255,184,77,0.25)",
            pointerEvents: "auto",
            maxWidth: 240,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
            title={ann.body}
          >
            {ann.title || "(no title)"}
            {ann.body && (
              <div style={{
                marginTop: 4,
                fontSize: 10,
                color: "#7fb8e6",
                textTransform: "none",
                letterSpacing: "0.02em",
                fontFamily: "Inter, system-ui, sans-serif",
                whiteSpace: "normal",
                lineHeight: 1.4,
                maxHeight: 80,
                overflow: "auto",
              }}>{ann.body}</div>
            )}
          </div>
        );
      })}
    </>
  );
}
