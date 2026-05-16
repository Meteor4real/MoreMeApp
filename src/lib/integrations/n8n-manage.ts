import { getServiceToken } from "@/lib/tokens";
import { timedFetch } from "@/lib/integrations/fetch";

async function n8nFetch<T>(
  accountId: string,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const apiKey = await getServiceToken(accountId, "N8N_API_KEY");
  const baseUrl = process.env.N8N_BASE_URL;
  if (!apiKey) throw new Error("n8n API key not connected");
  if (!baseUrl) throw new Error("N8N_BASE_URL env var not set");
  const res = await timedFetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "X-N8N-API-KEY": apiKey,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`n8n ${path} ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export async function setWorkflowActive(
  accountId: string,
  workflowId: string,
  active: boolean
): Promise<void> {
  // n8n API v1: POST /workflows/:id/activate or /deactivate
  await n8nFetch(
    accountId,
    `/api/v1/workflows/${workflowId}/${active ? "activate" : "deactivate"}`,
    { method: "POST" }
  );
}
