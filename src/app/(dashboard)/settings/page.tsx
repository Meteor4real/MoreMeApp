import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/Panel";
import { TokenVault } from "@/components/TokenVault";
import { ensureSchema, requireAccount } from "@/lib/auth";
import { decryptSecret, maskSecret } from "@/lib/crypto";
import { query } from "@/lib/db";
import { Layout, User } from "lucide-react";

export const dynamic = "force-dynamic";

const SERVICES = [
  { key: "GITHUB_TOKEN", service: "github", label: "GitHub" },
  { key: "VERCEL_TOKEN", service: "vercel", label: "Vercel" },
  {
    key: "SUPABASE_ACCESS_TOKEN",
    service: "supabase",
    label: "Supabase",
  },
  { key: "N8N_API_KEY", service: "n8n", label: "n8n" },
  { key: "PROXMOX_TOKEN_SECRET", service: "proxmox", label: "Proxmox" },
  { key: "PORTAINER_API_KEY", service: "portainer", label: "Portainer" },
  { key: "CLOUDFLARE_API_TOKEN", service: "cloudflare", label: "Cloudflare" },
  { key: "TAILSCALE_API_KEY", service: "tailscale", label: "Tailscale" },
  { key: "TWINGATE_API_KEY", service: "twingate", label: "Twingate" },
  { key: "PIHOLE_PASSWORD", service: "pihole", label: "Pi-hole" },
  { key: "FRIGATE_BASE_URL", service: "frigate", label: "Frigate" },
  { key: "YOUTUBE_API_KEY", service: "youtube", label: "YouTube Data API" },
  { key: "ZIMA_SSH_HOST", service: "zima", label: "ZimaCube (SSH)" },
  {
    key: "CLAUDE_SSH_HOST",
    service: "claude-vps",
    label: "Claude Code VPS (SSH)",
  },
];

type Row = {
  service: string;
  key_name: string;
  ciphertext: string;
  iv: string;
  created_at: string;
};

export default async function Settings() {
  const account = await requireAccount();
  await ensureSchema();

  const rows = await query<Row>(
    `select service, key_name, ciphertext, iv, created_at
       from chuckhub_service_tokens where account_id = $1`,
    [account.id]
  );
  const initial = await Promise.all(
    rows.map(async (r) => {
      try {
        const plain = await decryptSecret(r.ciphertext, r.iv);
        return {
          service: r.service,
          key_name: r.key_name,
          masked: maskSecret(plain),
          decrypt_error: false as const,
          created_at: r.created_at,
        };
      } catch {
        return {
          service: r.service,
          key_name: r.key_name,
          masked: "•••• unreadable",
          decrypt_error: true as const,
          created_at: r.created_at,
        };
      }
    })
  );

  const name = account.display_name || account.email.split("@")[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="// configuration"
        title="Settings"
        description="Account, API token vault, layout preferences. Tokens are encrypted at rest in Postgres with AES-256-GCM."
      />

      <Panel title="Account" subtitle="single sign-on" status="ok">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-chuck-red/40 bg-black shadow-glowSoft">
            <User className="h-5 w-5 text-chuck-pink" />
          </div>
          <div>
            <div className="font-mono text-sm">{name}</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-chuck-mute">
              {account.email} · Postgres-backed sessions
            </div>
          </div>
        </div>
      </Panel>

      <Panel
        title="Service Tokens"
        subtitle="encrypted · AES-256-GCM"
        status="warn"
        hot
      >
        <p className="mb-3 font-mono text-xs text-chuck-mute">
          Paste a token to persist it encrypted in Postgres. Environment variables in
          Vercel still take precedence for runtime usage; the vault is for tokens you
          want stored alongside your account.
        </p>
        <TokenVault services={SERVICES} initial={initial} />
      </Panel>

      <Panel title="Layout" subtitle="overview widgets" status="idle">
        <div className="flex items-start gap-3">
          <Layout className="h-5 w-5 text-chuck-pink" />
          <p className="font-mono text-xs text-chuck-mute">
            Drag-and-drop widget customization coming soon. For now the Overview uses
            the default panel set defined in{" "}
            <span className="text-chuck-ink">src/app/(dashboard)/page.tsx</span>.
          </p>
        </div>
      </Panel>
    </div>
  );
}
