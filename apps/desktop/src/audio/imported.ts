// User-imported audio tracks. Procedural tracks stay (the OST engine), and
// users can add real MP3/OGG/WAV/M4A on top via Settings -> Music. Stored as
// data URLs in localStorage so they survive restarts without filesystem
// plumbing. Playback uses a single shared HTMLAudioElement; the imported
// player is controlled separately from the procedural `ost` singleton, but
// only ONE plays at a time (importing pauses procedural and vice versa).

export type ImportedTrack = {
  id: string;
  name: string;
  vibe: string;
  color: string;
  dataUrl: string;      // "data:audio/mpeg;base64,..." or similar
  bytes: number;
  addedAt: number;
};

const KEY = "nchub.music.imported.v1";
const subs = new Set<(t: ImportedTrack[]) => void>();

export function loadImported(): ImportedTrack[] {
  try { const r = localStorage.getItem(KEY); if (r) { const a = JSON.parse(r) as ImportedTrack[]; if (Array.isArray(a)) return a; } } catch { /* ignore */ }
  return [];
}
function persist(list: ImportedTrack[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {
    // Likely quota — strip the most recent and try once more.
    try { localStorage.setItem(KEY, JSON.stringify(list.slice(1))); } catch { /* give up */ }
  }
  subs.forEach((fn) => fn(loadImported()));
}
export function subscribeImported(fn: (t: ImportedTrack[]) => void): () => void {
  subs.add(fn); fn(loadImported()); return () => subs.delete(fn);
}
export function removeImported(id: string) { persist(loadImported().filter((t) => t.id !== id)); }
export function renameImported(id: string, name: string) {
  persist(loadImported().map((t) => t.id === id ? { ...t, name } : t));
}

export async function importFile(file: File, vibe = "imported"): Promise<ImportedTrack> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });
  const t: ImportedTrack = {
    id: "imp-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: file.name.replace(/\.[^.]+$/, ""),
    vibe, color: pickColor(file.name),
    dataUrl, bytes: file.size, addedAt: Date.now(),
  };
  persist([t, ...loadImported()]);
  return t;
}

function pickColor(seed: string): string {
  const palette = ["#ff5577", "#22d3ee", "#22c55e", "#f59e0b", "#a78bfa", "#ec4899", "#84cc16", "#fb923c"];
  let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

// Shared player — one element so a new play() always supersedes the previous.
let audio: HTMLAudioElement | null = null;
let currentId: string | null = null;
const playerSubs = new Set<() => void>();
function notifyPlayer() { playerSubs.forEach((fn) => fn()); }
export function importedNowPlaying(): string | null { return currentId; }
export function importedIsPlaying(): boolean { return !!(audio && !audio.paused); }
export function subscribeImportedPlayer(fn: () => void): () => void { playerSubs.add(fn); return () => playerSubs.delete(fn); }
export function playImported(t: ImportedTrack, volume = 0.6) {
  if (!audio) audio = new Audio();
  audio.src = t.dataUrl;
  audio.volume = volume;
  audio.loop = false;
  audio.onended = () => { currentId = null; notifyPlayer(); };
  audio.onpause = notifyPlayer; audio.onplay = notifyPlayer;
  currentId = t.id;
  void audio.play().catch(() => undefined);
  notifyPlayer();
}
export function stopImported() {
  if (audio) { audio.pause(); audio.currentTime = 0; }
  currentId = null;
  notifyPlayer();
}
export function setImportedVolume(v: number) { if (audio) audio.volume = Math.max(0, Math.min(1, v)); }
