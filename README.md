# ChuckHub

> One sidebar, every service. A NetworkChuck-inspired personal ops dashboard.

ChuckHub is a Next.js 15 (App Router) command center that fuses your homelab,
devops stack, AI terminals, and content empire into a single dark,
glowing-red control panel.

## Modules

- `/` — Overview (status grid, recent activity, hero panel)
- `/ai` — AI Terminal hub (Claude Code, Gemini, Codex, opencode)
- `/automation` — n8n workflows (Terry, Robin, et al.)
- `/homelab` — Proxmox, Docker, ZimaCube, Frigate, Pi-hole
- `/networking` — Twingate, Tailscale, Cloudflare, Traefik
- `/dev` — GitHub, Vercel, Supabase
- `/security` — Robin, Kali Lab, alert feed
- `/content` — YouTube + NetworkChuck Academy
- `/settings` — API token vault, layout preferences

## API surface

- `GET /api/health` — connectivity + env probe
- `POST /api/init` — apply Postgres schema (accounts, sessions, tokens, layout, alerts)

## Stack

- Next.js 15 (App Router) + React 19
- Tailwind CSS (custom `chuck-*` palette + glowing strip primitives)
- Postgres (`pg`) — schema in `src/lib/db.ts`
- lucide-react icons
- Deployed on Vercel

## Local dev

```bash
npm install
cp .env.example .env.local   # fill in what you have
npm run dev
```

Open http://localhost:3000.

## Required env vars

Already configured per setup:

- `POSTGRES_URL`

Add these in Vercel → Project → Environment Variables as you wire each service.
None are required to render the UI — panels show representative data until
tokens are present.

| Var | Service |
|---|---|
| `GITHUB_TOKEN` | GitHub REST API |
| `VERCEL_TOKEN` | Vercel REST API |
| `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF` | Supabase Management API |
| `N8N_BASE_URL` + `N8N_API_KEY` | n8n self-hosted |
| `PROXMOX_BASE_URL` + `PROXMOX_TOKEN_ID` + `PROXMOX_TOKEN_SECRET` | Proxmox API |
| `PORTAINER_BASE_URL` + `PORTAINER_API_KEY` | Portainer |
| `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` | Cloudflare |
| `TAILSCALE_API_KEY` + `TAILSCALE_TAILNET` | Tailscale |
| `TWINGATE_API_KEY` + `TWINGATE_NETWORK` | Twingate |
| `PIHOLE_BASE_URL` + `PIHOLE_PASSWORD` | Pi-hole v6 |
| `FRIGATE_BASE_URL` | Frigate NVR |
| `TRAEFIK_BASE_URL` | Traefik dashboard |
| `YOUTUBE_API_KEY` + `YOUTUBE_CHANNEL_ID` | YouTube Data API |
| `ZIMA_SSH_HOST` + `ZIMA_SSH_USER` | ZimaCube SSH probe |
| `CLAUDE_SSH_HOST` + `CLAUDE_SSH_USER` | Claude Code VPS terminal |

See `.env.example` for the full list.

## First-run

After deploy, hit `POST /api/init` once to create the tables:

```bash
curl -X POST https://your-deploy.vercel.app/api/init
```

## Design language

The UI is intentionally NetworkChuck-coded: matte-black panels, monospaced
typography, and the signature **glowing red/pink/orange strip** running across
the top of every page and along the left sidebar edge. Look for the `chuck-strip`
and `chuck-strip-vertical` utility classes in `src/app/globals.css`.

— because coffee, and because hacker.
