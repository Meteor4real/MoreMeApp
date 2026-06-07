"use client";

import { useEffect, useState } from "react";
import { Logo } from "./logo";

const OWNER = "Meteor4real";
const REPO = "NetworkChuckHub";
const RELEASES_PAGE = `https://github.com/${OWNER}/${REPO}/releases`;
const ACTIONS_PAGE = `https://github.com/${OWNER}/${REPO}/actions`;

type OS = "win" | "mac-arm64" | "mac-x64" | "linux" | null;

// Artifact names must match apps/desktop/electron-builder.yml.
const primary = {
  os: "Windows 10/11 · x64",
  file: "MoreMe-Setup.exe",
  key: "win" as const,
};

const others: { os: string; file: string; key: Exclude<OS, null> }[] = [
  { os: "macOS · Apple Silicon", file: "MoreMe-mac-arm64.dmg", key: "mac-arm64" },
  { os: "macOS · Intel", file: "MoreMe-mac-x64.dmg", key: "mac-x64" },
  { os: "Linux · AppImage", file: "MoreMe-linux.AppImage", key: "linux" },
  { os: "Windows · portable .zip", file: "MoreMe-win-x64.zip", key: "win" },
];

function detectOS(): OS {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  const platform = navigator.platform || "";
  if (/Win/i.test(platform)) return "win";
  if (/Linux/i.test(platform) && !/Android/i.test(ua)) return "linux";
  if (/Mac/i.test(platform)) return "mac-arm64";
  return null;
}

type Asset = { name: string; browser_download_url: string; size: number };
type Release = { tag_name: string; html_url: string; published_at: string; assets: Asset[] };

const rooms: { tag: string; title: string; body: string }[] = [
  {
    tag: "Calendar",
    title: "An event model that actually holds your life",
    body: "Month, week, and day timelines. Categories for class, iProject, business, ARG, meeting, travel, announcement. Recurrence, sub-task checklists, priority, time-conflict flags, and hidden 'unannounced' plans you reveal when you're ready.",
  },
  {
    tag: "Get Ahead",
    title: "Finish next week before next week starts",
    body: "For every class, a % pre-done bar over the next 7, 14, or 30 days, plus an empire-wide hero. Crush the upcoming weeks early — the bar fills as you do — until walking into school is the last step, not the first.",
  },
  {
    tag: "The Empire",
    title: "Your businesses, your number",
    body: "Track every venture you run — status, monthly revenue, next action. MoreMe derives current MRR, lifetime, and a 6-month mini chart per venture. First Dollar, Five Figures, Empire — they're achievements you actually earn.",
  },
  {
    tag: "GTD, the loop",
    title: "Capture · Plan · Schedule · Review",
    body: "A capture bar over every tab dumps anything into your inbox. Plans is the reference bucket for ideas and drafts. Today triages the inbox. Weekly Review walks you through last week's loose ends and locks the goals for the next one.",
  },
  {
    tag: "Synced + quiet",
    title: "Levels you earn, reminders that fire",
    body: "20 levels on a steep curve — heavy XP each, no busywork. Earnable achievements. Reminders fire as OS notifications. State syncs to your account so the app follows you across devices, runs from the tray, and stays alive when the window's closed.",
  },
  {
    tag: "NT5 News",
    title: "A second tab, on the house",
    body: "An on-device wire generates fresh anchor articles while the app is open, with a broadcast bar and a teleprompter Studio. It's a self-contained bonus surface — not required, not in your way, just there when you want it.",
  },
];

export default function Page() {
  const [os, setOs] = useState<OS>(null);
  const [release, setRelease] = useState<Release | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    setOs(detectOS());
  }, []);

  // Fetch the real latest release from the GitHub API. Only assets that
  // actually exist render as download buttons; missing platforms show a
  // "build pending" state instead of a dead /releases/latest/download link.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`, { cache: "no-store" });
        if (!r.ok) { setLoadErr(`Release API returned ${r.status}`); return; }
        const j = (await r.json()) as Release;
        if (!cancelled) setRelease(j);
      } catch (e) {
        if (!cancelled) setLoadErr(String(e));
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const assets = release?.assets ?? [];
  const findAsset = (file: string) => assets.find((a) => a.name === file);

  const primaryAsset = findAsset(primary.file);
  const winPreferred = os === "win";
  const allCount = 1 + others.length;
  const readyCount = (primaryAsset ? 1 : 0) + others.filter((d) => findAsset(d.file)).length;
  const status: "loading" | "pending" | "partial" | "ready" | "error" =
    loadErr ? "error"
    : !release ? "loading"
    : readyCount === 0 ? "pending"
    : readyCount < allCount ? "partial"
    : "ready";

  function statusBanner() {
    if (status === "loading") {
      return <div className="mt-6 chuck-panel p-3 text-center font-mono text-xs text-chuck-mute">Checking the latest release…</div>;
    }
    if (status === "error") {
      return (
        <div className="mt-6 chuck-panel p-3 text-center font-mono text-xs text-chuck-mute">
          Couldn&apos;t reach GitHub Releases ({loadErr}).{" "}
          <a href={RELEASES_PAGE} target="_blank" rel="noopener" className="chuck-glow-text underline">Browse manually</a>.
        </div>
      );
    }
    if (status === "pending") {
      return (
        <div className="mt-6 chuck-panel p-3 text-center font-mono text-xs leading-relaxed">
          <span className="chuck-chip-live mr-2">Build pending</span>
          <span className="text-chuck-ink">
            {release?.tag_name} is published but no installers have uploaded yet.
          </span>{" "}
          <a href={ACTIONS_PAGE} target="_blank" rel="noopener" className="chuck-glow-text underline">
            Check Actions
          </a>
          <span className="text-chuck-mute"> · this page updates automatically once a build attaches.</span>
        </div>
      );
    }
    if (status === "partial") {
      return (
        <div className="mt-6 chuck-panel p-3 text-center font-mono text-xs">
          <span className="chuck-chip mr-2">{readyCount} / {allCount} ready</span>
          <span className="text-chuck-ink">{release?.tag_name} — some platforms still building.</span>{" "}
          <a href={ACTIONS_PAGE} target="_blank" rel="noopener" className="chuck-glow-text underline">Actions</a>
        </div>
      );
    }
    return null;
  }

  return (
    <main className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-6 pb-20 pt-16">
      {/* Hero */}
      <header className="flex flex-col items-center text-center">
        <div className="animate-pulseGlow">
          <Logo size={104} />
        </div>

        <div className="mt-6 chuck-chip-live">◇ Calendar-first life OS</div>

        <h1 className="mt-5 font-mono text-4xl font-black uppercase tracking-[0.18em] text-chuck-ink sm:text-5xl">
          More<span className="chuck-glow-text">Me</span>
        </h1>

        <p className="mt-5 max-w-2xl text-base leading-relaxed text-chuck-mute">
          A real calendar, a Get-Ahead view that finishes school early, an
          Empire dashboard for the businesses you run, GTD capture, and 20
          levels you actually earn. Synced across devices. Always running.
          Quiet by default.
        </p>

        <div className="mt-8 h-[2px] w-full max-w-sm chuck-strip" />

        {statusBanner()}

        {/* Primary download */}
        <div className="mt-10 w-full max-w-md">
          {primaryAsset ? (
            <a
              href={primaryAsset.browser_download_url}
              download={primary.file}
              rel="noopener"
              className="group block chuck-panel-hot p-5 text-left transition hover:shadow-glow"
            >
              <div className="flex items-center justify-between">
                <span className="chuck-chip">{winPreferred ? "Likely yours" : "Recommended"}</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-chuck-mute">
                  .exe installer · {fmtBytes(primaryAsset.size)}
                </span>
              </div>
              <div className="mt-3 chuck-title text-lg">Download for Windows</div>
              <div className="mt-1 font-mono text-xs text-chuck-mute">{primary.os}</div>
              <div className="mt-1 font-mono text-xs text-chuck-pink">{primary.file}</div>
            </a>
          ) : (
            <div className="chuck-panel p-5 text-left opacity-60">
              <div className="flex items-center justify-between">
                <span className="chuck-chip">Pending</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-chuck-mute">.exe installer</span>
              </div>
              <div className="mt-3 chuck-title text-lg">Windows build not uploaded yet</div>
              <div className="mt-1 font-mono text-xs text-chuck-mute">{primary.os}</div>
              <div className="mt-1 font-mono text-xs text-chuck-mute">{primary.file} · waiting on CI</div>
            </div>
          )}
        </div>

        {/* Other platforms */}
        <div className="mt-4 grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
          {others.map((d) => {
            const a = findAsset(d.file);
            return a ? (
              <a
                key={d.file}
                href={a.browser_download_url}
                download={d.file}
                rel="noopener"
                className="chuck-panel px-3 py-2 text-left transition hover:border-chuck-pink/60"
              >
                <div className="font-mono text-[11px] uppercase tracking-wider text-chuck-ink">{d.os}</div>
                <div className="font-mono text-[10px] text-chuck-mute">{d.file} · {fmtBytes(a.size)}</div>
              </a>
            ) : (
              <div
                key={d.file}
                className="chuck-panel px-3 py-2 text-left opacity-50"
                title="This platform hasn't uploaded yet"
              >
                <div className="font-mono text-[11px] uppercase tracking-wider text-chuck-mute">{d.os}</div>
                <div className="font-mono text-[10px] text-chuck-mute">pending CI · {d.file}</div>
              </div>
            );
          })}
        </div>

        <p className="mt-6 max-w-md text-xs leading-relaxed text-chuck-mute">
          MoreMe is built for Windows first. The macOS and Linux builds run
          the app, but background-on-startup behavior is best on Windows.
        </p>
        <p className="mt-2 text-xs text-chuck-mute">
          No download yet?{" "}
          <a href={RELEASES_PAGE} target="_blank" rel="noopener" className="chuck-glow-text underline-offset-2 hover:underline">
            See all releases on GitHub
          </a>{" "}
          or{" "}
          <a href={ACTIONS_PAGE} target="_blank" rel="noopener" className="chuck-glow-text underline-offset-2 hover:underline">
            check the build pipeline
          </a>
          .
        </p>
      </header>

      {/* What's inside */}
      <section className="mt-16">
        <div className="mb-6 flex items-center gap-3">
          <span className="chuck-title text-sm">What&apos;s inside</span>
          <div className="h-px flex-1 chuck-strip-thin" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {rooms.map((r) => (
            <div key={r.tag} className="chuck-panel p-5">
              <div className="chuck-chip-live">{r.tag}</div>
              <h3 className="mt-3 chuck-title text-base">{r.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-chuck-mute">{r.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-16 flex items-center justify-center gap-3 font-mono text-[11px] uppercase tracking-widest text-chuck-mute">
        <span>MoreMe{release ? ` · ${release.tag_name}` : ""}</span>
        <span className="text-chuck-line">·</span>
        <a
          href="https://github.com/meteor4real/networkchuckhub"
          className="transition hover:text-chuck-pink"
        >
          Source
        </a>
      </footer>
    </main>
  );
}

function fmtBytes(n: number): string {
  if (!n) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0; let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
}
