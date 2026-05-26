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
  it opens a creative, reimplemented in-app version. (Loading live sites in
  webviews is only a temporary stopgap until each embedded version is built.)
- `WildCall` is phone-only — never include it.

## HARD RULES (owner's words)

- **NO EMOJIS.** Anywhere in the UI. Use the theme's geometric marks
  (◆ ◈ › ◇ ▲ etc.) or text monograms instead.
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

- **The Control Panel** (front-and-center, its own prominent area): the ChuckHub
  dashboard reimagined in-app, talking to Supabase directly. Integrations —
  live: GitHub, Vercel, YouTube, Cloudflare, Tailscale, n8n. Build the
  "coming soon": Proxmox, Portainer, Pi-hole, Frigate, ZimaCube, Supabase mgmt,
  Twingate, YouTube OAuth. **Add new connectors: Home Assistant, Hermes
  dashboard, Twingate, Hostinger.**
- **The Terminal** (below Control Panel): real Windows PowerShell via node-pty.
  Also hosts the AI group chat plumbing.
- **AI Group Chat**: Claude, Gemini, Codex, **Hermes** (co-boss, runs on
  Hostinger, reachable via terminal + group chat), plus on-call bots (BroBot's
  AI, NT5 anchors) that only chime in when called by name. They split tasks,
  fact-check each other, critique, and converge before the owner sees output.
- **Browser**: DuckDuckGo-style, tabs, visit any page, DuckDuckGo-grade
  security/privacy. **~20 house-made extensions** (only ones WE make), all
  stupid/funny/irreverent. No third-party store.
- **Library**: launch + view Steam games, Modrinth, Blockbench.
- **Startup sequence** like the HALOS Interface boot.
- **Accounts** via Supabase (Postgres).
- **Unified notifications + ticker**: data from all sites surfaces here —
  NT5 articles/blogs, BroBot gallery adds, "Gemini started a project", MoreMe
  "time for bed", etc. Not overwhelming. All site notification systems land here.
- **OSTs**: more music than HALOS's single bland pad. (Generating audio is hard
  here — if blocked, tell the owner exactly what to install/run so they supply
  files.)

## Embedded app versions to build (in `apps/desktop`)

- **MoreMe**: scrap unlimited self-logged XP. Rebuild as a strict DAILY
  time-blocked checklist ("this time → this time: do X", repeating to end of
  day). XP only by checking a block during/after its window. Add Semester /
  Vacation / Exam / Travel modes (don't exist yet). Full blueprint: morning/
  bedtime routines, fitness, food, weekly/semester/yearly/identity goals,
  projects (3 active max), gaming rules, XP/levels/tiers (Initiate→Dude
  Perfect), streaks, seasons/prestige, battlepass, achievements.
- **DigitalBlueprint**: real material system — any texture, shininess,
  transparency, emissive, shape (Blender-grade minus mesh authoring). Add a
  real LLM-assisted generator (currently `js/ai.js` is an empty stub). Redo the
  too-simple logo. Fix: GLB imports don't persist; saved-worlds list key bug.
- **HALOS**: NO simple geometry. Alien-ify the 26 Andromedan glyphs (currently
  basic circle/line/polygon — too human; `app.js` `AZ_ANDROMADEAN_ALPHABET`).
  Replace the pyramid logo (4 spots + 15-option picker). Remove OpenClaw
  entirely → **Hermes**. Apply Polar Cosmos Crew renames (below).
- **NT5**: real always-on, topic-driven reporting (cron is daily-only; hot
  topics only hit localStorage and never reach Claude — dead-ended). Owner
  wants e.g. Origin Realms (Minecraft servers) on the feed. 5 anchors in
  `lib/anchors.ts`. Article+ElevenLabs pipeline is real; the always-on + topic
  store + `/article/[slug]` page need building.
- **BroBot**: its local AI joins the group chat; gallery events feed the ticker.
- **SignalFinder**: built FROM SCRATCH, in-app only (no repo exists). Strategic
  networking / opportunity-radar: creator discovery, multi-dimension scoring
  (response likelihood, collab compatibility, momentum, timing, relevance),
  outreach CRM, personalization.

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

REMAINING / NEXT:
- Accounts via Supabase + Control Panel reimagined in-app talking to the DB
  directly (BLOCKED on owner rotating the pasted Supabase password).
- New Control Panel connectors (Home Assistant, Hermes dashboard, Twingate,
  Hostinger) + the ChuckHub "coming soon" integrations (Proxmox, Portainer,
  Pi-hole, Frigate, ZimaCube, Supabase mgmt, YouTube OAuth).
- Wire real keys/endpoints to light up group chat / NT5 / DigitalBlueprint gen.
- BroBot embedded version + its AI into the group chat.
- DigitalBlueprint less-simple logo; walk-mode (pointer lock); GLB import.
- Windows GUI testing (owner). Cut release from main (owner).

Verify every increment with `npm run build --workspace=@nchub/desktop`
(tsc + vite) and `npm run build:web`. Commit verified increments. Keep main
current so the owner can tag a release.
