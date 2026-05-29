# NetworkChuck Hub — Project Brief & Working Rules

> Persistent context for this project. Re-read before working. This is the
> source of truth for intent; the pasted critique from the owner is law.

## What this repo is

The **NetworkChuck Hub** monorepo (npm workspaces):

- `apps/web` — the public **download page** only (Vercel). Static, no DB.
- `apps/desktop` — the **NetworkChuck Hub desktop app** (Electron + Vite +
  React + TS, Windows-first). THE product. Everything below lives here.
- `apps/control-panel` — the original ChuckHub Next.js dashboard, preserved;
  becomes the in-app **Control Panel**.

Release flow (owner runs it): Actions → Release workflow → Run workflow →
branch `main`, tag `vX.Y.Z`. Matrix build (Ubuntu/macOS/Windows) →
softprops/action-gh-release → installers attached → download page links
resolve. `main` should always be releasable.

## ARCHITECTURE — do not get this wrong again

- **The other site repos are FROZEN.** Do NOT push feature changes to
  `NT5-News`, `Digital_Blueprint`, `HALOS-interface`, `More_Me`, `BroBot`.
  They stay as their currently-deployed selves.
- **Every improvement is an EMBEDDED in-app version inside `apps/desktop`.**
  The left sidebar selects apps; selecting one does NOT open the live website —
  it opens a creative, reimplemented in-app version.
- `WildCall` is phone-only — never include it.

## DISTRIBUTION MODEL — this is a PRODUCT for many users (not just the owner)

- NetworkChuck Hub ships to other people (NetworkChuck included). Therefore:
- **Per-user service connections are made IN THE APP, at runtime, by whoever
  installs it** — Hermes, Hostinger, Home Assistant, Twingate, GitHub, Vercel,
  Cloudflare, AI provider keys, etc. Build the in-app connect flows (settings /
  encrypted vault). Each user plugs in THEIR OWN credentials.
- **NEVER hardcode the owner's keys/endpoints. NEVER "set this env var" connector
  cards. NEVER frame work as "blocked on the owner's API keys."** It isn't —
  those are runtime, per-user, entered in-app. (The AI group chat's per-agent
  config is the correct pattern; mirror it.)
- Store per-user secrets securely on-device via Electron `safeStorage`
  (OS-keychain encryption) in the main process — not committed, not in env.
- **Accounts** are the one shared backend (the app's Supabase). The connection
  must NOT be embedded in the distributed client (extractable). Route auth
  through a hosted API (the deployed control-panel `/api/auth`, or Hermes), with
  a configurable base URL — never ship the DB password in the binary.
- The Control Panel is **Option 2: reimplemented natively in the desktop app**
  (not a webview to a deployed site).
- Owner tests on Windows AFTER everything is done. Keep building to completion.

## HARD RULES (owner's words)

- **NO EMOJIS.** Anywhere in the UI. Use the theme's geometric marks
  (◆ ◈ › ◇ ▲ etc.) or text monograms instead.
- **Direct-to-main, always.** Don't open PRs for review; commit on the
  working branch, push, and merge to `main` so the owner can cut a release.
  No "ready-for-review" gate, no waiting on CI to be reviewed — just ship.
- **No shells, no "first prototype", no fake data.** Real or an honest
  "needs setup" state. "THIS IS THE REAL DAMN THING." No cutting corners.
- **Implement the "coming soon" items**, don't leave them as placeholders.
- Theming = **NetworkChuck Hub** (chuck-* dark glowing red→pink→orange).
  Tokens live in `apps/web/tailwind.config.ts` + `apps/desktop/src/theme.css`.
- Model identity / DB creds / secrets: never commit. DB cred goes in app
  config/env only. (Owner must rotate the Supabase password that was pasted
  in chat before accounts ship.)

## Logo

The NetworkChuck headshot mark recolored to the red→orange gradient on a black
tile, with a **custom techy "HUB" wordmark** (bespoke angular letterforms, not
a font). Source: `networkchuck-source.png` → processed by `/tmp/mklogo.mjs`
pattern → `apps/desktop/build/icon-source.png`, `apps/desktop/src/assets/logo.png`,
`apps/web/public/networkchuck-hub-logo.png` + favicon.

## The app's surfaces (sidebar)

- **Browser** (the default canvas): our OWN chrome — tabs that persist across
  restarts, an address bar with bookmarks/extensions/more-menu, and built-in
  about:* pages for Bookmarks/History/Downloads/Passwords/TabGroups/
  Extensions. Search engine is pluggable in Settings (DuckDuckGo / Brave /
  Google / Startpage); home page configurable. DuckDuckGo-grade *privacy*
  posture (tracker blocking, HTTPS-upgrade, DNT/GPC, hardened webviews) —
  NOT DDG's UI as our UI. **~20 house-made extensions** (only ones WE make)
  are toggled in a quick dropdown on the address bar and re-inject on every
  navigation. Downloads are captured via Electron will-download and persisted
  in userData; passwords are encrypted in the OS keychain (safeStorage).
- **Control Panel** (everything in one place): the ChuckHub dashboard
  reimagined in-app, with live per-service data (GitHub, Vercel — now
  team-scoped, Cloudflare, Tailscale, n8n) and connect cards for every other
  service. Tokens encrypted on-device via OS keychain; nothing bundled.
- **Terminal**: real Windows PowerShell via node-pty (default shell elsewhere).
  Also where users launch the CLI agents that show up in the AI group chat.
- **AI Group Chat**: BroBot and the NT5 anchors (Voss/Zara/Dex/Lena/Orin) run
  on the bundled house model — always on call, no setup. The outside crew
  (Claude / Gemini / Codex / OpenCode / Hermes) connect via their CLI tools
  in Configure; users launch the tool and we run it for each message. Chat
  history persists across tab switches and restarts. @Everyone routes to
  every available agent; @Name targets a specific one. Roster hides agents
  that aren't set up; no "add a key" friction.
- **Library**: launch + view Steam games, Modrinth, Blockbench.
- **NO startup sequence.** App opens straight to the canvas; the bundled
  local model auto-downloads in the background.
- **Accounts** via Supabase (Postgres).
- **Floating info widgets**: toggleable on-screen cards (NT5 breaking,
  anchor desk filings, Origin Realms server pulse) — right-click to dismiss
  individually; on/off per-type in Settings.
- **Unified notifications + ticker**: data from all sites surfaces here —
  NT5 articles/blogs, BroBot gallery adds, MoreMe "time for bed", etc.
- **OST player**: 10 procedural tracks (drums, arps, distinct vibes) with a
  picker that lifts the whole stable into the chrome.
- **Tutorial Tom**: a real guided tour (highlight + Prev/Next + Esc to skip)
  plus a Q&A backed by the bundled local model and a shared feedback feed.

## Embedded app versions

All six embedded apps are bundled as **real carbon copies** of their sites,
running offline inside the Hub via iframes — HALOS (real index.html/app.js/
style.css, OpenClaw→Hermes, Polar Cosmos Crew renames, localStorage shim
for /api/auth + /api/data), MoreMe (real site files with paths relativized
and an /api shim), NT5 (real Next.js app statically exported under
public/embedded/nt5 with a wire shim that serves /api/articles/ticker/
stats/broadcast from an on-device store), BroBot (real desktop renderer
built from its release branch with a window.brobot shim — gallery →
localStorage, search → Openverse, chat/LLM bridged via postMessage to the
Hub host so it runs on the local house brain).

The Hub layers things on top of those bundled sites where it makes sense:
- An in-app NT5 wire scheduler runs every N minutes while the app is open,
  generates fresh anchor articles via the house model, persists them, and
  postMessages them into the NT5 iframe so the bundled site stays alive.
  Dex's coverage gets a live Origin Realms (mcstatus.io) snapshot as
  context so his gaming articles track the real server state.
- An NT5 broadcast bar above the iframe plays the lead story aloud using
  the OS's Web Speech voices, heuristic-matched to the assigned anchor.
- A reworked NT5 logo (legible at any size) sits in the sidebar and as a
  header above the iframe. Other apps use their real site brand marks.

SignalFinder is built FROM SCRATCH (no real site to copy); hub-themed,
opportunity-scoring CRM that drafts personalized outreach using the
bundled local model.

## Polar Cosmos Crew renames (apply wherever Polar lore appears)

Meteor→Roetem · Stardust→Tsudrats · Fury→Yruf · Supernova→Avonorepus ·
Nebula→Aluben · Solar Flare→Eralf Ralos · Cosmo→Omsoc · Prism→Msirp · Byte→Etyb

## Build status (update as we go)

DONE (merged to main, networkchuckhub):
- Download page (apps/web); monorepo; control-panel preserved.
- Desktop foundation: boot sequence, rail, tabbed sandboxed browser, PowerShell
  terminal (node-pty), launchers.
- Browser/security hardening: tracker blocking, HTTPS-upgrade, DNT/GPC,
  deny-by-default permissions, de-fingerprinted UA, hardened webviews.
- 20 house extensions (emoji-free); logo + custom techy HUB.
- Unified ticker + notifications (live NT5 + local NT5 + reminders).
- AI group chat: multi-provider (Hermes/Claude/Gemini/Codex + on-call bots),
  coordinator->workers->fact-check, configurable, honest wired/needs-setup.
- Library: Steam scan+launch, Modrinth/Blockbench launchers.
- OST engine (5 procedural tracks) + player.
- Embedded apps: MoreMe (daily time-blocked checklist + modes + tiers/streak),
  SignalFinder (from-scratch opportunity-scoring CRM), NT5 (always-on
  topic-driven anchor reporting via Claude), HALOS (alien glyph codex +
  telemetry + Hermes + Polar renames), DigitalBlueprint (three.js editor + full
  material system + LLM scene generator).

ALSO DONE:
- Accounts: Supabase Auth (anon key, client-safe) login/signup gate + guest.
- Native Control Panel (Option 2) + per-user encrypted connection vault
  (safeStorage) covering all services incl. Home Assistant/Hermes/Twingate/
  Hostinger. Connections are per-user, entered in-app — no bundled secrets.
- All 6 embedded apps: MoreMe, SignalFinder, NT5, HALOS, DigitalBlueprint,
  BroBot (gallery + key-free Openverse search; its AI is the group-chat bot).

REMAINING / NEXT (polish + runtime, not blockers):
- Live per-service data panels in the Control Panel (vault tokens are stored;
  layer GitHub/Vercel/Cloudflare/etc. fetchers on top).
- DigitalBlueprint: walk-mode (pointer lock), GLB import persistence, a
  less-simple in-app logo.
- Runtime, per-user (NOT dev blockers): users enter their own AI keys / Hermes
  endpoint / Supabase anon key in-app.
- Owner: cut release from main; Windows GUI testing once everything's done.

Verify every increment with `npm run build --workspace=@nchub/desktop`
(tsc + vite) and `npm run build:web`. Commit verified increments. Keep main
current so the owner can tag a release.
