import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/Panel";
import { KeyRound, Layout, User } from "lucide-react";

const SERVICES = [
  { key: "GITHUB_TOKEN", label: "GitHub", required: true },
  { key: "VERCEL_TOKEN", label: "Vercel", required: true },
  { key: "SUPABASE_ACCESS_TOKEN", label: "Supabase", required: true },
  { key: "N8N_API_KEY", label: "n8n", required: false },
  { key: "PROXMOX_TOKEN_SECRET", label: "Proxmox", required: false },
  { key: "PORTAINER_API_KEY", label: "Portainer", required: false },
  { key: "CLOUDFLARE_API_TOKEN", label: "Cloudflare", required: false },
  { key: "TAILSCALE_API_KEY", label: "Tailscale", required: false },
  { key: "TWINGATE_API_KEY", label: "Twingate", required: false },
  { key: "PIHOLE_PASSWORD", label: "Pi-hole", required: false },
  { key: "FRIGATE_BASE_URL", label: "Frigate", required: false },
  { key: "YOUTUBE_API_KEY", label: "YouTube Data API", required: false },
  { key: "ZIMA_SSH_HOST", label: "ZimaCube (SSH)", required: false },
  { key: "CLAUDE_SSH_HOST", label: "Claude Code VPS (SSH)", required: false },
];

export default function Settings() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="// configuration"
        title="Settings"
        description="API token vault, service wiring, layout preferences. Tokens are encrypted at rest in Postgres."
      />

      <Panel title="Account" subtitle="single sign-on" status="ok">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-chuck-red/40 bg-black shadow-glowSoft">
            <User className="h-5 w-5 text-chuck-pink" />
          </div>
          <div>
            <div className="font-mono text-sm">chuck@hub</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-chuck-mute">
              Postgres-backed sessions
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Service Tokens" subtitle="env-backed · masked" status="warn" hot>
        <p className="mb-3 font-mono text-xs text-chuck-mute">
          ChuckHub reads tokens from environment variables. Add missing ones in Vercel
          → Project → Environment Variables, or paste below to persist them encrypted
          in Postgres.
        </p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {SERVICES.map((s) => (
            <div
              key={s.key}
              className="flex items-center gap-2 rounded-sm border border-chuck-line/60 bg-black/30 px-3 py-2"
            >
              <KeyRound className="h-3.5 w-3.5 text-chuck-pink" />
              <div className="min-w-0 flex-1">
                <div className="font-mono text-xs">{s.label}</div>
                <div className="truncate font-mono text-[10px] text-chuck-mute">
                  {s.key}
                </div>
              </div>
              {s.required && <span className="chuck-chip-live">required</span>}
              <input
                type="password"
                placeholder="•••• paste token"
                className="w-40 rounded-sm border border-chuck-line bg-black/60 px-2 py-1 font-mono text-[11px] text-chuck-ink outline-none focus:border-chuck-red/60"
              />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button className="chuck-btn">Save</button>
        </div>
      </Panel>

      <Panel title="Layout" subtitle="overview widgets" status="idle">
        <div className="flex items-start gap-3">
          <Layout className="h-5 w-5 text-chuck-pink" />
          <p className="font-mono text-xs text-chuck-mute">
            Drag-and-drop widget customization coming soon. For now the Overview
            uses the default panel set defined in <span className="text-chuck-ink">src/app/page.tsx</span>.
          </p>
        </div>
      </Panel>
    </div>
  );
}
