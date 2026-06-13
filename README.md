# MoreMe

A calendar-first personal life OS. Real event model, Get-Ahead per class,
Empire dashboard for the ventures you run, GTD capture + Weekly Review, and
20 levels you actually earn. Synced. Quiet. Always on. Plus **NT5 News** —
an on-device anchor wire — as a bonus second tab.

> **For LLM agents (Hermes / Claude / OpenClaw / etc.):** the operations
> manual is at [`HERMES_SKILL.md`](./HERMES_SKILL.md) (also installed at
> `.claude/skills/moreme-davis/SKILL.md`). It covers how to operate, modify,
> and manage the user on MoreMe via the in-renderer `window.moremeAgent` API.

The repo's still named `networkchuckhub` (this was the NetworkChuck Hub
monorepo originally) but the product has been refocused.

| Workspace | What it is |
| --- | --- |
| `apps/web` | The public **download page** (deployed on Vercel). Static, no database. |
| `apps/desktop` | The **MoreMe desktop app** (Electron + Vite + React + TS, Windows-first). |
| `apps/control-panel` | The original ChuckHub dashboard, preserved but unused by the desktop app. |

## Download page (`apps/web`)

```bash
npm install
npm run dev:web      # http://localhost:3000
npm run build:web
```

Vercel serves `apps/web`. Download buttons point at the GitHub Releases for
this repo; they resolve once the desktop app is built and a release is cut.

## Releasing the desktop app

Open the repo's **Actions → Release** workflow, "Run workflow", pick a tag
(e.g. `v0.1.0`) on `main`. It builds the installers for each OS and attaches
them to the GitHub Release, which is what the download page links to.

Installer artifacts produced (must match `apps/web/app/page.tsx`):

- `MoreMe-Setup.exe` (Windows installer)
- `MoreMe-win-x64.zip` (Windows portable)
- `MoreMe-mac-arm64.dmg` / `MoreMe-mac-x64.dmg`
- `MoreMe-linux.AppImage`

## Security note

State syncs to Supabase via Row Level Security — the desktop app uses the
project's **anon (public) key**, which is designed to ship in clients. The
service-role key and the database password are **never committed and never
shipped in the binary**.
