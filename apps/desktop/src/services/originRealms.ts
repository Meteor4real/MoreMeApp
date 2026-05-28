// Origin Realms live data. mcstatus.io is a free, key-free Minecraft server
// status API — we use it for player count + MOTD as the live pulse, and as
// context fed to Dex (the NT5 gaming correspondent) when he files articles
// so his coverage tracks what's actually happening on the server right now.

export type OriginPulse = {
  online: boolean;
  players: number;
  max: number;
  motd: string;
  version: string;
  ts: number;
};

let last: OriginPulse | null = null;
const subs = new Set<(p: OriginPulse) => void>();

export function getOriginPulse(): OriginPulse | null { return last; }
export function subscribeOriginPulse(fn: (p: OriginPulse) => void): () => void {
  subs.add(fn);
  if (last) fn(last);
  return () => subs.delete(fn);
}

async function fetchPulse(): Promise<OriginPulse | null> {
  try {
    const r = await fetch("https://api.mcstatus.io/v2/status/java/play.originrealms.com", { cache: "no-store" });
    if (!r.ok) return null;
    const j: {
      online?: boolean;
      players?: { online?: number; max?: number };
      motd?: { clean?: string[] };
      version?: { name_clean?: string };
    } = await r.json();
    return {
      online: !!j.online,
      players: j.players?.online ?? 0,
      max: j.players?.max ?? 0,
      motd: (j.motd?.clean || []).join(" ") || "Origin Realms",
      version: j.version?.name_clean || "",
      ts: Date.now(),
    };
  } catch { return null; }
}

let started = false;
export function startOriginPolling(): void {
  if (started) return;
  started = true;
  async function tick() {
    const p = await fetchPulse();
    if (p) { last = p; subs.forEach((fn) => fn(p)); }
  }
  void tick();
  setInterval(() => { void tick(); }, 60_000);
}
