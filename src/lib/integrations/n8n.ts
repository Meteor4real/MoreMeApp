import { getServiceToken } from "@/lib/tokens";

export type N8nWorkflow = {
  id: string;
  name: string;
  active: boolean;
  updatedAt: string;
};

export type N8nExecution = {
  id: string;
  finished: boolean;
  mode: string;
  startedAt: string;
  stoppedAt: string | null;
  status: string;
  workflowId: string;
};

export type N8nOverview = {
  baseUrl: string;
  workflows: N8nWorkflow[];
  recent: N8nExecution[];
};

export async function getN8nOverview(accountId: string): Promise<N8nOverview | null> {
  const apiKey = await getServiceToken(accountId, "N8N_API_KEY");
  const baseUrl = process.env.N8N_BASE_URL;
  if (!apiKey || !baseUrl) return null;

  const headers = { "X-N8N-API-KEY": apiKey } as const;

  type WfResp = { data: N8nWorkflow[] };
  type ExResp = { data: N8nExecution[] };

  const [wf, ex] = await Promise.all([
    fetch(`${baseUrl}/api/v1/workflows?limit=10`, { headers, cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<WfResp>) : { data: [] }))
      .catch(() => ({ data: [] })),
    fetch(`${baseUrl}/api/v1/executions?limit=10`, { headers, cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<ExResp>) : { data: [] }))
      .catch(() => ({ data: [] })),
  ]);

  return { baseUrl, workflows: wf.data, recent: ex.data };
}
