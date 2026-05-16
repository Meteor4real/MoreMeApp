import { PageHeader } from "@/components/PageHeader";
import { Panel, Stat } from "@/components/Panel";
import { NotConfigured, IntegrationError } from "@/components/EmptyState";
import { Tabs } from "@/components/Tabs";
import { CloudflareManage } from "@/components/manage/CloudflareManage";
import { TailscaleManage } from "@/components/manage/TailscaleManage";
import { ComingSoon } from "@/components/manage/ComingSoon";
import { requireAccount } from "@/lib/auth";
import { hasServiceToken } from "@/lib/tokens";
import { getCloudflareOverview } from "@/lib/integrations/cloudflare";
import { getTailscaleOverview } from "@/lib/integrations/tailscale";
import { Cloud } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Networking() {
  const account = await requireAccount();

  const hasCf = await hasServiceToken(account.id, "CLOUDFLARE_API_TOKEN");
  const hasTs = await hasServiceToken(account.id, "TAILSCALE_API_KEY");
  const hasTw = await hasServiceToken(account.id, "TWINGATE_API_KEY");

  let cf = null,
    cfErr: string | null = null;
  if (hasCf) {
    try {
      cf = await getCloudflareOverview(account.id);
    } catch (e) {
      cfErr = (e as Error).message;
    }
  }

  let ts = null,
    tsErr: string | null = null;
  if (hasTs) {
    try {
      ts = await getTailscaleOverview(account.id);
    } catch (e) {
      tsErr = (e as Error).message;
    }
  }

  const overview = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat
          label="CF zones"
          value={cf ? cf.zones.length : "—"}
          hint={cf ? "all accounts" : "not connected"}
          glow={!!cf}
        />
        <Stat
          label="CF tunnels"
          value={cf ? cf.tunnels.length : "—"}
          hint={
            cf
              ? process.env.CLOUDFLARE_ACCOUNT_ID
                ? "via account"
                : "set CLOUDFLARE_ACCOUNT_ID"
              : "not connected"
          }
        />
        <Stat
          label="Tailscale devices"
          value={ts ? ts.devices.length : "—"}
          hint={
            ts ? `${ts.devices.filter((d) => d.online).length} online` : "not connected"
          }
          glow={!!ts}
        />
        <Stat
          label="Twingate"
          value={hasTw ? "connected" : "—"}
          hint={hasTw ? "manage on Twingate.com" : "not connected"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          title="Cloudflare — Zones"
          subtitle={cf ? `${cf.zones.length} visible` : "not connected"}
          status={cf ? "ok" : "idle"}
        >
          {!hasCf ? (
            <NotConfigured service="Cloudflare" envKey="CLOUDFLARE_API_TOKEN" />
          ) : cfErr ? (
            <IntegrationError service="Cloudflare" error={cfErr} />
          ) : !cf || cf.zones.length === 0 ? (
            <p className="font-mono text-xs text-chuck-mute">
              No zones returned for this token.
            </p>
          ) : (
            <ul className="space-y-2 font-mono text-xs">
              {cf.zones.map((z) => (
                <li
                  key={z.id}
                  className="flex items-center justify-between rounded-sm border border-chuck-line/60 bg-black/30 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Cloud className="h-3.5 w-3.5 text-chuck-pink" />
                    <span>{z.name}</span>
                  </div>
                  <span className="text-chuck-mute">{z.plan.name}</span>
                  <span
                    className={
                      z.status === "active"
                        ? "chuck-chip text-emerald-300 border-emerald-400/40"
                        : "chuck-chip"
                    }
                  >
                    {z.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Cloudflare — Tunnels"
          subtitle={cf ? `${cf.tunnels.length} found` : "not connected"}
          status={cf && cf.tunnels.length > 0 ? "ok" : "idle"}
        >
          {!hasCf ? (
            <NotConfigured service="Cloudflare" envKey="CLOUDFLARE_API_TOKEN" />
          ) : !process.env.CLOUDFLARE_ACCOUNT_ID ? (
            <p className="font-mono text-xs text-chuck-mute">
              Set <span className="text-chuck-ink">CLOUDFLARE_ACCOUNT_ID</span>{" "}
              env var to fetch tunnels.
            </p>
          ) : !cf || cf.tunnels.length === 0 ? (
            <p className="font-mono text-xs text-chuck-mute">No tunnels.</p>
          ) : (
            <ul className="space-y-2 font-mono text-xs">
              {cf.tunnels.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-sm border border-chuck-line/60 bg-black/30 px-3 py-2"
                >
                  <span>{t.name}</span>
                  <span
                    className={
                      t.status === "healthy"
                        ? "chuck-chip text-emerald-300 border-emerald-400/40"
                        : "chuck-chip"
                    }
                  >
                    {t.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Tailscale"
          subtitle={ts ? `tailnet: ${ts.tailnet}` : "not connected"}
          status={ts ? "ok" : "idle"}
          className="lg:col-span-2"
        >
          {!hasTs ? (
            <NotConfigured
              service="Tailscale"
              envKey="TAILSCALE_API_KEY"
              description="Set TAILSCALE_API_KEY (vault) and TAILSCALE_TAILNET (env)."
            />
          ) : tsErr ? (
            <IntegrationError service="Tailscale" error={tsErr} />
          ) : !ts || ts.devices.length === 0 ? (
            <p className="font-mono text-xs text-chuck-mute">No devices.</p>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-chuck-line/60 text-[10px] uppercase tracking-widest text-chuck-mute">
                  <th className="py-2 font-mono font-normal">Device</th>
                  <th className="py-2 font-mono font-normal">OS</th>
                  <th className="py-2 font-mono font-normal">IP</th>
                  <th className="py-2 font-mono font-normal">Last seen</th>
                  <th className="py-2 font-mono font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {ts.devices.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-chuck-line/30 font-mono text-xs"
                  >
                    <td className="py-2">{d.hostname}</td>
                    <td className="py-2 text-chuck-mute">{d.os}</td>
                    <td className="py-2 text-chuck-mute">
                      {d.addresses[0] ?? "—"}
                    </td>
                    <td className="py-2 text-chuck-mute">
                      {new Date(d.lastSeen).toLocaleString()}
                    </td>
                    <td className="py-2">
                      <span
                        className={
                          d.online
                            ? "chuck-chip text-emerald-300 border-emerald-400/40"
                            : "chuck-chip"
                        }
                      >
                        {d.online ? "online" : "offline"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </div>
  );

  const manage = (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 chuck-title text-xs">Cloudflare</h3>
        <CloudflareManage
          connected={!!cf}
          zones={cf?.zones.map((z) => ({ id: z.id, name: z.name })) ?? []}
        />
      </section>
      <section>
        <h3 className="mb-3 chuck-title text-xs">Tailscale</h3>
        <TailscaleManage
          connected={!!ts}
          devices={ts?.devices ?? []}
          tailnet={ts?.tailnet ?? "-"}
        />
      </section>
      <section>
        <h3 className="mb-3 chuck-title text-xs">Twingate</h3>
        <ComingSoon
          title="Twingate manage"
          preview={[
            "Add or remove protected resources",
            "Invite users and assign group access",
            "View live tunnel health per peer",
          ]}
        />
      </section>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="// edge & overlay"
        title="Networking"
        description="Overview shows live Cloudflare, Tailscale, and Twingate state. Manage lets you edit DNS, purge cache, revoke devices."
      />
      <Tabs
        tabs={[
          { id: "overview", label: "Overview", content: overview },
          { id: "manage", label: "Manage", content: manage, badge: "live" },
        ]}
      />
    </div>
  );
}
