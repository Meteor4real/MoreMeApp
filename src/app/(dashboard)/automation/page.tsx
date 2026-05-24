import { PageHeader } from "@/components/PageHeader";
import { Panel, Stat } from "@/components/Panel";
import { NotConfigured, IntegrationError } from "@/components/EmptyState";
import { Tabs } from "@/components/Tabs";
import { N8nManage } from "@/components/manage/N8nManage";
import { requireAccount } from "@/lib/auth";
import { hasServiceToken } from "@/lib/tokens";
import { getN8nOverview } from "@/lib/integrations/n8n";
import { ExternalLink, Workflow } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Automation() {
  const account = await requireAccount();

  const hasKey = await hasServiceToken(account.id, "N8N_API_KEY");
  const baseUrl = process.env.N8N_BASE_URL;

  let n = null,
    err: string | null = null;
  if (hasKey && baseUrl) {
    try {
      n = await getN8nOverview(account.id);
    } catch (e) {
      err = (e as Error).message;
    }
  }

  const activeCount = n ? n.workflows.filter((w) => w.active).length : 0;

  const overview = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat
          label="Workflows"
          value={n ? n.workflows.length : "—"}
          hint={n ? "fetched" : "n8n not connected"}
          glow={!!n}
        />
        <Stat
          label="Active"
          value={n ? activeCount : "—"}
          hint={n ? "currently enabled" : "n8n not connected"}
        />
        <Stat
          label="Recent executions"
          value={n ? n.recent.length : "—"}
          glow={!!n}
        />
        <Stat
          label="Failures (recent)"
          value={
            n ? n.recent.filter((e) => e.status === "error").length : "—"
          }
        />
      </div>

      <Panel
        title="Workflows"
        subtitle={n ? n.baseUrl : "not connected"}
        status={n ? "ok" : "idle"}
      >
        {!hasKey ? (
          <NotConfigured
            service="n8n"
            envKey="N8N_API_KEY"
            description="Save your n8n API key and set N8N_BASE_URL env var (e.g. https://n8n.example.com)."
          />
        ) : !baseUrl ? (
          <NotConfigured
            service="n8n"
            envKey="N8N_BASE_URL"
            description="API key saved — now set the N8N_BASE_URL env var."
          />
        ) : err ? (
          <IntegrationError service="n8n" error={err} />
        ) : !n || n.workflows.length === 0 ? (
          <p className="font-mono text-xs text-chuck-mute">No workflows.</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-chuck-line/60 text-[10px] uppercase tracking-widest text-chuck-mute">
                <th className="py-2 font-mono font-normal">Name</th>
                <th className="py-2 font-mono font-normal">Updated</th>
                <th className="py-2 font-mono font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {n.workflows.map((w) => (
                <tr
                  key={w.id}
                  className="border-b border-chuck-line/30 font-mono text-xs hover:bg-black/30"
                >
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <Workflow className="h-3.5 w-3.5 text-chuck-pink" />
                      {w.name}
                    </div>
                  </td>
                  <td className="py-2.5 text-chuck-mute">
                    {new Date(w.updatedAt).toLocaleString()}
                  </td>
                  <td className="py-2.5">
                    <span
                      className={
                        w.active
                          ? "chuck-chip text-emerald-300 border-emerald-400/40"
                          : "chuck-chip"
                      }
                    >
                      {w.active ? "active" : "inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      {n && n.recent.length > 0 && (
        <Panel
          title="Recent executions"
          subtitle={`last ${n.recent.length}`}
          status="ok"
        >
          <ul className="space-y-1.5 font-mono text-xs">
            {n.recent.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between rounded-sm border border-chuck-line/60 bg-black/30 px-3 py-1.5"
              >
                <span className="text-chuck-mute">#{e.id}</span>
                <span className="text-chuck-mute">{e.mode}</span>
                <span className="text-chuck-mute">
                  {new Date(e.startedAt).toLocaleString()}
                </span>
                <span
                  className={
                    e.status === "success"
                      ? "chuck-chip text-emerald-300 border-emerald-400/40"
                      : e.status === "error"
                      ? "chuck-chip-live"
                      : "chuck-chip"
                  }
                >
                  {e.status}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );

  const manage = (
    <N8nManage
      connected={!!n}
      workflows={n?.workflows.map((w) => ({
        id: w.id,
        name: w.name,
        active: w.active,
      })) ?? []}
      baseUrl={n?.baseUrl ?? null}
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="// n8n"
        title="Automation"
        description="Live workflows + the ability to toggle them active/inactive without leaving the hub."
        actions={
          n ? (
            <a
              className="chuck-btn"
              href={n.baseUrl}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="h-4 w-4 text-chuck-pink" />
              Open n8n
            </a>
          ) : null
        }
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
