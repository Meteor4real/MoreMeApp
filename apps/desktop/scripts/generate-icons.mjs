#!/usr/bin/env node
// Generates platform icons from build/icon.svg. When the real recolored
// NetworkChuck source image is provided, drop it in as build/icon-source.png
// and this script prefers it over the SVG.
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const buildDir = path.join(root, "build");
const svgPath = path.join(buildDir, "icon.svg");
const pngSource = path.join(buildDir, "icon-source.png");

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const [{ default: sharp }, pngToIco, png2icons] = await Promise.all([
    import("sharp"),
    import("png-to-ico").then((m) => m.default),
    import("png2icons"),
  ]);

  await mkdir(buildDir, { recursive: true });
  const input = (await exists(pngSource)) ? await readFile(pngSource) : await readFile(svgPath);

  const sz = (n) => sharp(input).resize(n, n, { fit: "contain", background: { r: 10, g: 10, b: 12, alpha: 1 } }).png().toBuffer();
  const [p16, p32, p64, p128, p256, p512, p1024] = await Promise.all(
    [16, 32, 64, 128, 256, 512, 1024].map(sz)
  );

  await writeFile(path.join(buildDir, "icon.png"), p512);
  await writeFile(path.join(buildDir, "icon.ico"), await pngToIco([p16, p32, p64, p128, p256]));
  const icns = png2icons.createICNS(p1024, png2icons.BILINEAR, 0);
  if (icns) await writeFile(path.join(buildDir, "icon.icns"), icns);

  console.log("Icons generated in", buildDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
