export type HelpEntry = {
  /** Display name shown in the help heading. */
  title: string;
  /** One-sentence description of what this token unlocks. */
  description: string;
  /** Step-by-step instructions. */
  steps: string[];
  /** Direct link to the page where the token is generated. */
  url?: string;
  /** Required scopes / permissions, if applicable. */
  scopes?: string[];
  /** Companion env vars that also need to be set (not in the vault). */
  envCompanions?: { key: string; description: string }[];
  /** Optional warnings / caveats. */
  notes?: string[];
};

export const HELP: Record<string, HelpEntry> = {
  GITHUB_TOKEN: {
    title: "GitHub personal access token",
    description:
      "Lets ChuckHub list your repos, your open PRs, and basic profile info.",
    steps: [
      "Open the GitHub token settings page (link below).",
      "Click 'Generate new token' → choose 'Fine-grained' (recommended) or 'Classic'.",
      "Give it a clear name like 'chuckhub'.",
      "Set expiration to something you'll remember to rotate (90 days is reasonable).",
      "Grant repo access: 'All repositories' or just the ones you want surfaced.",
      "Permissions → Repository → Contents: Read-only. Metadata: Read-only. Pull requests: Read-only.",
      "Generate, copy, and paste the token here.",
    ],
    url: "https://github.com/settings/personal-access-tokens/new",
    scopes: ["repo (read)", "metadata", "pull_requests (read)"],
  },
  VERCEL_TOKEN: {
    title: "Vercel access token",
    description:
      "Used to list your deployments and projects across personal and team scopes.",
    steps: [
      "Open Vercel's tokens page (link below).",
      "Click 'Create Token'.",
      "Scope: 'Full Account' is simplest; or pick a specific team.",
      "Expiration: pick something reasonable, then create.",
      "Copy the token and paste it here.",
    ],
    url: "https://vercel.com/account/tokens",
    envCompanions: [
      {
        key: "VERCEL_TEAM_ID",
        description: "Optional. Set this in Vercel env vars to scope API calls to a specific team.",
      },
    ],
  },
  SUPABASE_ACCESS_TOKEN: {
    title: "Supabase management API token",
    description:
      "Reads project-level metadata via Supabase's management API.",
    steps: [
      "Open the Supabase access tokens page (link below).",
      "Click 'Generate new token', name it 'chuckhub', and create.",
      "Copy the token and paste it here.",
      "Optionally set SUPABASE_PROJECT_REF in your env to pin a specific project.",
    ],
    url: "https://supabase.com/dashboard/account/tokens",
    envCompanions: [
      {
        key: "SUPABASE_PROJECT_REF",
        description: "Optional project ref (shown in your Supabase project URL) to scope reads.",
      },
    ],
  },
  N8N_API_KEY: {
    title: "n8n API key",
    description:
      "Pulls your workflows and recent executions from a self-hosted n8n instance.",
    steps: [
      "Open n8n in your browser.",
      "Open your user menu → Settings → n8n API.",
      "Click 'Create an API key', name it 'chuckhub'.",
      "Copy the key and paste it here.",
    ],
    envCompanions: [
      {
        key: "N8N_BASE_URL",
        description: "Required. The public URL of your n8n (e.g. https://n8n.example.com).",
      },
    ],
    notes: [
      "n8n must be reachable from ChuckHub. If it's only on your LAN, expose it via Tailscale Funnel or Cloudflare Tunnel first.",
    ],
  },
  PROXMOX_TOKEN_SECRET: {
    title: "Proxmox API token",
    description:
      "Read-only access to VM/LXC inventory and node stats.",
    steps: [
      "Open the Proxmox web UI as root@pam (or any admin user).",
      "Datacenter → Permissions → API Tokens → Add.",
      "Pick a user (e.g. root@pam), enter a token ID like 'chuckhub', leave privilege separation on.",
      "Save the secret value shown — it's only displayed once.",
      "Paste the secret here, then set PROXMOX_BASE_URL and PROXMOX_TOKEN_ID env vars.",
    ],
    envCompanions: [
      { key: "PROXMOX_BASE_URL", description: "e.g. https://pve.example.com:8006" },
      { key: "PROXMOX_TOKEN_ID", description: "Format: user@realm!tokenname (e.g. root@pam!chuckhub)" },
    ],
  },
  PORTAINER_API_KEY: {
    title: "Portainer API key",
    description: "Lists containers and stacks across all your Portainer-managed nodes.",
    steps: [
      "Open Portainer and click your user icon (top-right).",
      "My account → Access tokens → Add access token.",
      "Name it 'chuckhub' and create.",
      "Copy the key and paste it here.",
    ],
    envCompanions: [
      { key: "PORTAINER_BASE_URL", description: "Required, e.g. https://portainer.example.com" },
    ],
  },
  CLOUDFLARE_API_TOKEN: {
    title: "Cloudflare API token",
    description: "Reads your DNS zones and (optionally) cfd tunnels.",
    steps: [
      "Open the Cloudflare API tokens page (link below).",
      "'Create Token' → use the 'Read all resources' template, or build a custom token.",
      "Minimum scopes: Zone → Zone:Read, Zone → DNS:Read.",
      "For tunnels: Account → Cloudflare Tunnel:Read (and set CLOUDFLARE_ACCOUNT_ID env).",
      "Continue → Create → copy the token → paste here.",
    ],
    url: "https://dash.cloudflare.com/profile/api-tokens",
    envCompanions: [
      { key: "CLOUDFLARE_ACCOUNT_ID", description: "Required for tunnel listing. Find it in the Cloudflare dashboard sidebar." },
    ],
    scopes: ["Zone:Read", "DNS:Read", "Cloudflare Tunnel:Read (optional)"],
  },
  TAILSCALE_API_KEY: {
    title: "Tailscale API key",
    description: "Lists devices in your tailnet with online/offline status.",
    steps: [
      "Open the Tailscale admin console → Settings → Keys.",
      "Generate access token → name it 'chuckhub'.",
      "Pick an expiration (max 90 days). Create and copy the key.",
      "Paste here, and set TAILSCALE_TAILNET in your env (use '-' for the default tailnet).",
    ],
    url: "https://login.tailscale.com/admin/settings/keys",
    envCompanions: [
      { key: "TAILSCALE_TAILNET", description: "Required. Your tailnet name, or '-' for the default." },
    ],
    notes: [
      "Tailscale access tokens expire — set a calendar reminder or use an OAuth client for long-lived auth.",
    ],
  },
  TWINGATE_API_KEY: {
    title: "Twingate API key",
    description: "Used to list peers, networks, and resources.",
    steps: [
      "Open your Twingate admin console.",
      "Settings → API → 'Generate Token'.",
      "Pick a scope (Read is enough), name it 'chuckhub', and generate.",
      "Copy and paste here. Set TWINGATE_NETWORK env to your network slug.",
    ],
    envCompanions: [
      { key: "TWINGATE_NETWORK", description: "Your Twingate network name (the subdomain before .twingate.com)." },
    ],
  },
  PIHOLE_PASSWORD: {
    title: "Pi-hole admin password",
    description: "Lets ChuckHub query Pi-hole v6 for DNS stats.",
    steps: [
      "SSH into the host running Pi-hole.",
      "Run: pihole setpassword (and set a password if you haven't).",
      "Or grab it from /etc/pihole/setupVars.conf (WEBPASSWORD hash → use the plain password you set).",
      "Paste the plaintext admin password here.",
      "Set PIHOLE_BASE_URL in env (e.g. http://pi.hole or http://10.0.0.10:80).",
    ],
    envCompanions: [
      { key: "PIHOLE_BASE_URL", description: "Required, e.g. http://pi.hole" },
    ],
    notes: [
      "Pi-hole must be reachable from ChuckHub. If it's LAN-only, tunnel it.",
    ],
  },
  FRIGATE_BASE_URL: {
    title: "Frigate base URL",
    description:
      "Frigate doesn't use a token — just point ChuckHub at its base URL.",
    steps: [
      "Find the URL where you access your Frigate web UI.",
      "Paste it here as the value (e.g. http://frigate.lan:5000).",
      "Optional: set the same value in the FRIGATE_BASE_URL env var.",
    ],
    notes: [
      "If Frigate is LAN-only, expose it via Tailscale Funnel or Cloudflare Tunnel so ChuckHub on Vercel can reach it.",
    ],
  },
  YOUTUBE_API_KEY: {
    title: "YouTube Data API key",
    description:
      "Pulls channel stats and recent uploads via the YouTube Data API v3.",
    steps: [
      "Open Google Cloud Console (link below) and create or pick a project.",
      "APIs & Services → Library → search 'YouTube Data API v3' → Enable.",
      "APIs & Services → Credentials → Create credentials → API key.",
      "Restrict the key to 'YouTube Data API v3' only (recommended).",
      "Copy the key and paste it here.",
      "Set YOUTUBE_CHANNEL_ID in env (find it in your channel's advanced settings).",
    ],
    url: "https://console.cloud.google.com/apis/credentials",
    envCompanions: [
      { key: "YOUTUBE_CHANNEL_ID", description: "Required. Your channel's UC… ID." },
    ],
  },
  ZIMA_SSH_HOST: {
    title: "ZimaCube SSH host",
    description:
      "Placeholder for future ZimaCube SSH probing (disk usage, health).",
    steps: [
      "Paste the SSH host (e.g. zima.local or 10.0.0.5) here.",
      "Set ZIMA_SSH_USER env to your username on the device.",
      "Provision an SSH key from your Vercel runtime to the box (see Vercel docs on SSH secrets).",
    ],
    envCompanions: [
      { key: "ZIMA_SSH_USER", description: "Username for SSH (e.g. casaos)." },
    ],
    notes: [
      "Live probing is not wired yet — this slot reserves the config so it's ready when the SSH bridge lands.",
    ],
  },
  CLAUDE_SSH_HOST: {
    title: "Claude Code VPS SSH host",
    description:
      "Where the in-browser AI terminal launcher will SSH to.",
    steps: [
      "Paste the SSH host (e.g. ssh-bridge.example.com) here.",
      "Set CLAUDE_SSH_USER env to your username on the box.",
      "Run a websocket-to-SSH relay there (e.g. wetty or a custom shell2http) once the bridge ships.",
    ],
    envCompanions: [
      { key: "CLAUDE_SSH_USER", description: "Username for the SSH connection." },
    ],
    notes: [
      "The terminal relay itself isn't shipped yet — this stores the host so it's ready when it is.",
    ],
  },
};
