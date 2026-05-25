import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/Panel";
import { NotConfigured } from "@/components/EmptyState";
import { Tabs } from "@/components/Tabs";
import { ComingSoon } from "@/components/manage/ComingSoon";
import { requireAccount } from "@/lib/auth";
import { hasServiceToken } from "@/lib/tokens";
import { ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

type LocalService = {
  title: string;
  description: string;
  envKey: string;
  baseUrlEnv: string;
};

const SERVICES: LocalService[] = [
  {
    title: "Proxmox",
    description:
      "VM/LXC inventory pulled from the Proxmox API once a token is saved.",
    envKey: "PROXMOX_TOKEN_SECRET",
    baseUrlEnv: "PROXMOX_BASE_URL",
  },
  {
    title: "Portainer / Docker",
    description: "Containers and stacks across nodes via the Portainer API.",
    envKey: "PORTAINER_API_KEY",
    baseUrlEnv: "PORTAINER_BASE_URL",
  },
  {
    title: "Frigate NVR",
    description: "Camera list, recent detections, and live snapshots.",
    envKey: "FRIGATE_BASE_URL",
    baseUrlEnv: "FRIGATE_BASE_URL",
  },
  {
    title: "Pi-hole",
    description: "DNS queries, blocked count, blocklist size via v6 API.",
    envKey: "PIHOLE_PASSWORD",
    baseUrlEnv: "PIHOLE_BASE_URL",
  },
  {
    title: "ZimaCube",
    description: "Disk usage and health probed over SSH.",
    envKey: "ZIMA_SSH_HOST",
    baseUrlEnv: "ZIMA_SSH_HOST",
  },
];

export default async function Homelab() {
  const account = await requireAccount();
  const services = await Promise.all(
    SERVICES.map(async (s) => ({
      ...s,
      tokenSaved: await hasServiceToken(account.id, s.envKey),
      baseUrl: process.env[s.baseUrlEnv] ?? null,
    }))
  );

  const connectedCount = services.filter((s) => s.tokenSaved).length;

  const overview = (
    <div className="space-y-6">
      <section className="chuck-panel-hot p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-chuck-pink">
              // status
            </div>
            <p className="font-mono text-xs text-chuck-mute">
              {connectedCount === 0
                ? "No homelab integrations configured yet. Save tokens in Settings and set the matching base-URL env vars to bring panels online."
                : `${connectedCount} of ${services.length} homelab integrations have a token saved.`}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {services.map((s) => (
          <Panel
            key={s.title}
            title={s.title}
            subtitle={
              s.tokenSaved && s.baseUrl
                ? s.baseUrl
                : s.tokenSaved
                ? `set ${s.baseUrlEnv}`
                : "not connected"
            }
            status={s.tokenSaved && s.baseUrl ? "ok" : "idle"}
          >
            {!s.tokenSaved ? (
              <NotConfigured
                service={s.title}
                envKey={s.envKey}
                description={s.description}
              />
            ) : !s.baseUrl ? (
              <p className="font-mono text-xs text-chuck-mute">
                Token saved. Set the{" "}
                <span className="text-chuck-ink">{s.baseUrlEnv}</span> env var so
                ChuckHub knows where to reach this service.
              </p>
            ) : (
              <div className="space-y-2 font-mono text-xs">
                <p className="text-chuck-mute">{s.description}</p>
                <p className="text-chuck-mute">
                  Live data fetcher for this service isn&apos;t wired yet —
                  contributions welcome. Use the deep-link below to open the
                  native UI in the meantime.
                </p>
                <a
                  href={s.baseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="chuck-btn"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-chuck-pink" />
                  Open {s.title}
                </a>
              </div>
            )}
          </Panel>
        ))}
      </div>
    </div>
  );

  const manage = (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 chuck-title text-xs">Proxmox</h3>
        <ComingSoon
          title="Proxmox manage"
          preview={[
            "Start / stop / migrate VMs and LXC containers",
            "Edit hardware (vCPU, RAM, disk) on the fly",
            "Trigger snapshots and rollbacks",
            "View live node CPU / RAM / I/O graphs",
          ]}
        />
      </section>
      <section>
        <h3 className="mb-3 chuck-title text-xs">Portainer / Docker</h3>
        <ComingSoon
          title="Portainer manage"
          preview={[
            "Start / stop / restart any container",
            "Pull updated images and redeploy stacks",
            "Tail logs in real time",
            "Edit compose files via inline editor",
          ]}
        />
      </section>
      <section>
        <h3 className="mb-3 chuck-title text-xs">Frigate NVR</h3>
        <ComingSoon
          title="Frigate manage"
          preview={[
            "Snapshot any camera on demand",
            "Toggle motion / object detection per zone",
            "Review and tag recent events",
          ]}
        />
      </section>
      <section>
        <h3 className="mb-3 chuck-title text-xs">Pi-hole</h3>
        <ComingSoon
          title="Pi-hole manage"
          preview={[
            "Whitelist / blacklist domains in one click",
            "Toggle blocking on a timer (10m / 30m / 1h)",
            "Refresh gravity (blocklists) on schedule",
          ]}
        />
      </section>
      <section>
        <h3 className="mb-3 chuck-title text-xs">ZimaCube</h3>
        <ComingSoon
          title="ZimaCube manage"
          preview={[
            "View disk health (SMART) and pool status",
            "Trigger scrubs / rebuilds via SSH",
            "Manage shared folders and snapshots",
          ]}
        />
      </section>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="// homelab"
        title="Infrastructure"
        description="Local services live on your network — ChuckHub needs an internet-reachable URL (Twingate / Tailscale Funnel / Cloudflare Tunnel) plus a token to pull real data."
      />
      <Tabs
        tabs={[
          { id: "overview", label: "Overview", content: overview },
          { id: "manage", label: "Manage", content: manage, badge: "soon" },
        ]}
      />
    </div>
  );
}
