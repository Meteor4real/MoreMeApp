# MoreMe (+ NT5 News) — Project Brief & Working Rules

> Persistent context for this project. Re-read before working. This is the
> source of truth for intent; the owner's latest direction is law.

## What this repo is

This repo started life as the "NetworkChuck Hub" but has been **refocused**.
The product is now **MoreMe** — a personal life-OS / planner — with **NT5
News** kept as a bonus surface. Everything else was retired.

Monorepo (npm workspaces):

- `apps/desktop` — **THE product** (Electron + Vite + React + TS). A focused
  two-tab shell behind the accounts gate: **MoreMe** (primary) and **News**
  (NT5, bonus). No browser, no terminal, no AI crew, no control panel.
- `apps/web` — public download page (Vercel). Static.
- `apps/control-panel` — legacy Next.js dashboard, preserved but unused by the
  desktop app.

Release flow (owner runs it): Actions → Release workflow → tag `vX.Y.Z` →
matrix build → installers attached to the GitHub release. `main` stays
releasable.

## The pivot (what changed and why)

- The old Hub surfaces — Browser, Terminal, AI Group Chat, Hermes spine,
  Control Panel + service vault, Library, OST player, ticker/notifications/
  floating widgets, Tutorial Tom, and the HALOS / DigitalBlueprint /
  SignalFinder / BroBot / Documents / Toolbox embeds — are **deleted**.
- An "Ops Cockpit" add-on (the old Control Panel's 20+ service adapters,
  repackaged for the third-party Odysseus app) is **parked / on the board**,
  not being built now.
- The app is **MoreMe, solely**, plus **NT5 News** as a bonus.

## MoreMe — the product (apps/desktop/src/moreme)

A calendar-first life OS for a Mount Vernon **Innovation Diploma (iD)**
student. Real school research: The Mount Vernon School (Sandy Springs, GA) —
iD is the 4-year project-based signature program; **iProject** is the
independent passion-project block (the story's "GTD"). Characters Lily
(friend), Mrs. Bridget (teacher), Principal Harrison stay as fictional NPCs.

Data model (`moreme/types.ts`, `moreme/store.ts`):
- **`CalEvent`** is the one schedulable unit: recurring routines AND one-off
  events (class, school work, iProject, business, venture, project, ARG,
  meeting, travel, announcement, fitness, personal). Fields: category, date,
  times/all-day, location, people, linked project, sub-task checklist,
  priority, **visibility (visible/hidden — "unannounced" plans)**, recurrence
  (none/daily/weekdays/weekly), repeat-until, reminders, per-occurrence XP.
- **Completions** are per `(eventId, date)`; XP is recomputed from them plus
  project milestone (+30) and project-complete (+100) bonuses.
- **Levels**: 20 levels, quadratic per-level cost (`levelStep(n)=500·n²`).
  Fewer levels, much heavier XP each. No tiers, no prestige.
- **Achievements** are earnable & rule-based with live progress (see
  `ACHIEVEMENTS` + `aggregate()`): ahead-of-bell, week/month-ahead, iProject
  marathon, polymath, quiet streaks, mile markers, level milestones, etc.
- **Conflict detection** flags overlapping timed events on a day.
- **Projects** (milestones), **Circle** (people), **Goals**
  (week/semester/year/identity), and a **distraction log** (zero-distraction
  is a standing expectation, logged passively → feeds Quiet-streak
  achievements; it is NOT a checkable block).

UI (`moreme/ui.tsx`): tabs Today / Calendar (month grid + day detail) /
Projects / Goals / Achievements / Levels, plus a full event editor modal.
Mint dark theme tokens in `moreme/styles.ts`.

REMOVED for good: modes (semester/vacation/exam/travel), strict time-blocked
schedules, focus blocks, strikes, session breaks, tiers, prestige.

## NT5 News — the bonus surface (kept as-is)

Embedded NT5 (`embedded/NT5.tsx`, `embedded/nt5/*`, `embedded/NT5Studio.tsx`)
with the on-device wire scheduler (`services/nt5Wire.ts`) that generates fresh
anchor articles via the bundled local model, the Origin Realms pulse
(`services/originRealms.ts`), and the broadcast bar. Don't expand it; just keep
it building. Anchors run on `window.hub.llm`.

## HARD RULES (owner's words)

- **NO EMOJIS** anywhere in the UI. Use geometric marks (◆ ◈ › ◇ ▲ ✦ ❖) or
  text monograms.
- **Direct-to-main.** Commit on the working branch, push, and merge to `main`
  so the owner can cut a release. No review gate.
- **No shells, no fake data.** Real, or an honest "needs setup" state.
- Secrets / DB creds / model identity: never commit.

## Accounts

Supabase auth gate (`auth/`) — login/signup + guest. Anon key is client-safe;
no DB password in the binary.

## Build / verify

`npm run build --workspace=@nchub/desktop` (tsc --noEmit + vite + electron) and
`npm run build:web`. Commit verified increments. Keep `main` releasable.

## Build status

DONE:
- Stripped the Hub to a two-tab shell (MoreMe + NT5 News) behind accounts.
- Rebuilt MoreMe as a calendar-first life OS (rich CalEvent model, month
  calendar, event editor, 20-level quadratic XP, 27 earnable achievements,
  projects/people/goals, passive distraction log, Mount Vernon iD framing).
- NT5 News retained (wire scheduler + Origin pulse + newsroom/wire/studio).

NEXT / IDEAS:
- Week/Day calendar views and a "get ahead" planner that rolls up upcoming
  school work by class with a % pre-done bar (the story's superpower).
- Reminders/notifications surfacing (reminders field exists; not yet wired).
- Sync MoreMe state to the Supabase account so it follows the user.
- Owner: cut a release from main; Windows GUI testing.
