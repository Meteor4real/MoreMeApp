"use client";

import { useEffect, useState } from "react";
import { Logo } from "./logo";

const RELEASES_BASE =
  process.env.NEXT_PUBLIC_RELEASES_BASE ??
  "https://github.com/Meteor4real/NetworkChuckHub/releases/latest/download";

const RELEASES_PAGE =
  process.env.NEXT_PUBLIC_RELEASES_PAGE ??
  "https://github.com/Meteor4real/NetworkChuckHub/releases";

type OS = "win" | "mac-arm64" | "mac-x64" | "linux" | null;

// Artifact names must match apps/desktop/electron-builder.yml.
const primary = {
  os: "Windows 10/11 · x64",
  file: "NetworkChuckHub-Setup.exe",
  key: "win" as const,
};

const others: { os: string; file: string; key: Exclude<OS, null> }[] = [
  { os: "macOS · Apple Silicon", file: "NetworkChuckHub-mac-arm64.dmg", key: "mac-arm64" },
  { os: "macOS · Intel", file: "NetworkChuckHub-mac-x64.dmg", key: "mac-x64" },
  { os: "Linux · AppImage", file: "NetworkChuckHub-linux.AppImage", key: "linux" },
  { os: "Windows · portable .zip", file: "NetworkChuckHub-win-x64.zip", key: "win" },
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

const rooms: { tag: string; title: string; body: string }[] = [
  {
    tag: "Control Panel",
    title: "Run the stack",
    body: "GitHub, Vercel, Cloudflare, Tailscale, n8n, Home Assistant, Twingate, Hostinger — read and manage them all from one glowing console. Not a viewer; a controller.",
  },
  {
    tag: "The Terminal",
    title: "Real PowerShell",
    body: "A live shell wired to Windows PowerShell, and the home of the AI group chat where Claude, Gemini, Codex, Hermes, and the bots split tasks and fact-check each other before you ever see a result.",
  },
  {
    tag: "The Browser",
    title: "Tabs, sandboxed",
    body: "Visit any site in hardened tabs, plus embedded in-app versions of your own sites — so they can do things a normal tab never could. About 20 dumb/funny house extensions ship by default.",
  },
  {
    tag: "Your Apps",
    title: "All of it, docked",
    body: "NT5 News, BroBot, DigitalBlueprint, MoreMe, the HALOS Interface, SignalFinder — every project lives in the left rail. Steam, Modrinth, and Blockbench launch from here too.",
  },
];

export default function Page() {
  const [os, setOs] = useState<OS>(null);

  useEffect(() => {
    setOs(detectOS());
  }, []);

  const winPreferred = os === "win";

  return (
    <main className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-6 pb-20 pt-16">
      {/* Hero */}
      <header className="flex flex-col items-center text-center">
        <div className="animate-pulseGlow">
          <Logo size={104} />
        </div>

        <div className="mt-6 chuck-chip-live">◆ Personal-Ops Command Center</div>

        <h1 className="mt-5 font-mono text-4xl font-black uppercase tracking-[0.18em] text-chuck-ink sm:text-5xl">
          NetworkChuck <span className="chuck-glow-text">Hub</span>
        </h1>

        <p className="mt-5 max-w-2xl text-base leading-relaxed text-chuck-mute">
          One dark, glowing-red desktop app that fuses your homelab, devops, AI
          tooling, networking, and all your sites into a single command center.
          A browser, a real terminal, an AI group chat, and every project you
          run — docked in one place.
        </p>

        <div className="mt-8 h-[2px] w-full max-w-sm chuck-strip" />

        {/* Primary download */}
        <div className="mt-10 w-full max-w-md">
          <a
            href={`${RELEASES_BASE}/${primary.file}`}
            download={primary.file}
            rel="noopener"
            className="group block chuck-panel-hot p-5 text-left transition hover:shadow-glow"
          >
            <div className="flex items-center justify-between">
              <span className="chuck-chip">{winPreferred ? "Likely yours" : "Recommended"}</span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-chuck-mute">
                .exe installer
              </span>
            </div>
            <div className="mt-3 chuck-title text-lg">Download for Windows</div>
            <div className="mt-1 font-mono text-xs text-chuck-mute">{primary.os}</div>
            <div className="mt-1 font-mono text-xs text-chuck-pink">{primary.file}</div>
          </a>
        </div>

        {/* Other platforms */}
        <div className="mt-4 grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
          {others.map((d) => (
            <a
              key={d.file}
              href={`${RELEASES_BASE}/${d.file}`}
              download={d.file}
              rel="noopener"
              className="chuck-panel px-3 py-2 text-left transition hover:border-chuck-pink/60"
            >
              <div className="font-mono text-[11px] uppercase tracking-wider text-chuck-ink">
                {d.os}
              </div>
              <div className="font-mono text-[10px] text-chuck-mute">{d.file}</div>
            </a>
          ))}
        </div>

        <p className="mt-6 max-w-md text-xs leading-relaxed text-chuck-mute">
          NetworkChuck Hub is built for Windows — the macOS and Linux builds run
          the dashboard but skip Windows-only features (Steam launch, PowerShell
          terminal).
        </p>
        <p className="mt-2 text-xs text-chuck-mute">
          No download yet?{" "}
          <a
            href={RELEASES_PAGE}
            target="_blank"
            rel="noopener"
            className="chuck-glow-text underline-offset-2 hover:underline"
          >
            See all releases on GitHub
          </a>
          .
        </p>
      </header>

      {/* What's inside */}
      <section className="mt-16">
        <div className="mb-6 flex items-center gap-3">
          <span className="chuck-title text-sm">What's inside</span>
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
        <span>NetworkChuck Hub · v0.1</span>
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
