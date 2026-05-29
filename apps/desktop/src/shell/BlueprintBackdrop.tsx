// Tiny three.js backdrop scene for the NT5 full broadcast. When the owner
// enables Blueprint backdrop in Settings, this component renders a slowly
// rotating studio of the DigitalBlueprint's last saved scene (or a
// procedural default) behind the anchor stage. No interactivity, no audio.

import { useEffect, useRef } from "react";
import * as THREE from "three";

type BlueprintMesh = {
  shape: "box" | "sphere" | "cylinder" | "cone" | "torus" | "plane";
  pos?: [number, number, number];
  scale?: [number, number, number];
  color?: string;
  metal?: number;
  rough?: number;
  glow?: string;
  glowI?: number;
};

function loadBlueprintScene(): BlueprintMesh[] {
  try {
    const raw = localStorage.getItem("nchub.digitalblueprint.scene.v1");
    if (raw) {
      const parsed = JSON.parse(raw) as BlueprintMesh[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch { /* ignore */ }
  // Default procedural studio: a ring of glowing pillars
  return Array.from({ length: 8 }).map((_, i): BlueprintMesh => {
    const angle = (i / 8) * Math.PI * 2;
    const r = 4;
    return {
      shape: i % 2 === 0 ? "cylinder" : "box",
      pos: [Math.cos(angle) * r, 1, Math.sin(angle) * r],
      scale: [0.6, 1.5 + (i % 3) * 0.5, 0.6],
      color: ["#d946ef", "#22d3ee", "#a855f7", "#3b82f6"][i % 4],
      glow: ["#d946ef", "#22d3ee", "#a855f7", "#3b82f6"][i % 4],
      glowI: 0.6,
      metal: 0.8,
      rough: 0.3,
    };
  });
}

function geom(shape: BlueprintMesh["shape"]): THREE.BufferGeometry {
  switch (shape) {
    case "sphere": return new THREE.SphereGeometry(0.6, 32, 24);
    case "cylinder": return new THREE.CylinderGeometry(0.5, 0.5, 1.2, 32);
    case "cone": return new THREE.ConeGeometry(0.6, 1.2, 24);
    case "torus": return new THREE.TorusGeometry(0.5, 0.18, 18, 48);
    case "plane": return new THREE.PlaneGeometry(1.5, 1.5);
    default: return new THREE.BoxGeometry(1, 1, 1);
  }
}

export function BlueprintBackdrop() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current!;
    const sc = new THREE.Scene();
    sc.background = null;
    const cam = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
    cam.position.set(0, 4, 12);
    cam.lookAt(0, 1, 0);
    const rnd = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rnd.setPixelRatio(Math.min(devicePixelRatio, 2));
    rnd.toneMapping = THREE.ACESFilmicToneMapping;
    rnd.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(rnd.domElement);
    rnd.domElement.style.width = "100%";
    rnd.domElement.style.height = "100%";

    sc.add(new THREE.HemisphereLight(0xffffff, 0x152540, 0.5));
    const dir = new THREE.DirectionalLight(0xfff0d0, 0.9);
    dir.position.set(5, 8, 4);
    sc.add(dir);

    const root = new THREE.Group();
    sc.add(root);
    for (const m of loadBlueprintScene()) {
      const mat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(m.color || "#9ca3af"),
        metalness: m.metal ?? 0.5,
        roughness: m.rough ?? 0.4,
        emissive: new THREE.Color(m.glow || "#000000"),
        emissiveIntensity: m.glowI ?? 0,
      });
      const mesh = new THREE.Mesh(geom(m.shape), mat);
      const p = m.pos || [0, 0.5, 0];
      const s = m.scale || [1, 1, 1];
      mesh.position.set(p[0], p[1], p[2]);
      mesh.scale.set(s[0], s[1], s[2]);
      root.add(mesh);
    }

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
    function loop(time: number) {
      root.rotation.y = time * 0.0001;
      rnd.render(sc, cam);
      raf = requestAnimationFrame(loop);
    }
    loop(0);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      rnd.dispose();
      try { el.removeChild(rnd.domElement); } catch { /* ignore */ }
    };
  }, []);

  return <div ref={host} style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", opacity: 0.55 }} />;
}
