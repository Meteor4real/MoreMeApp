# NetworkChuck Hub

A unified personal-ops command center — your homelab, devops, AI tooling,
networking, and all your sites fused into one dark, glowing-red app.

This repo is a monorepo:

| Workspace | What it is |
| --- | --- |
| `apps/web` | The public **download page** (deployed on Vercel). Static, no database. |
| `apps/desktop` | The **NetworkChuck Hub desktop app** (Electron, Windows-first). _In progress._ |
| `apps/control-panel` | The original ChuckHub dashboard, preserved — becomes the app's in-app **Control Panel**. |

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

## Security note

The desktop app talks to its database (Supabase/Postgres) directly using a
connection string kept in **app config / environment variables only** — never
committed to this repo. The public download page needs no database.
