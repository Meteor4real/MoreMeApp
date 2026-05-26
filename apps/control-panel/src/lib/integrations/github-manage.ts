import { getServiceToken } from "@/lib/tokens";
import { timedFetch } from "@/lib/integrations/fetch";

const API = "https://api.github.com";

async function gh<T>(
  token: string,
  path: string,
  init: RequestInit = {}
): Promise<T | null> {
  const res = await timedFetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "ChuckHub",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  if (res.status === 204) return null;
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`github ${path} ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export type GhWorkflow = {
  id: number;
  name: string;
  path: string;
  state: string;
};

export async function listWorkflows(
  accountId: string,
  owner: string,
  repo: string
): Promise<GhWorkflow[]> {
  const token = await getServiceToken(accountId, "GITHUB_TOKEN");
  if (!token) throw new Error("GitHub token not connected");
  const r = await gh<{ workflows: GhWorkflow[] }>(
    token,
    `/repos/${owner}/${repo}/actions/workflows?per_page=30`
  );
  return r?.workflows ?? [];
}

export async function dispatchWorkflow(
  accountId: string,
  owner: string,
  repo: string,
  workflowId: number | string,
  ref: string,
  inputs?: Record<string, string>
): Promise<void> {
  const token = await getServiceToken(accountId, "GITHUB_TOKEN");
  if (!token) throw new Error("GitHub token not connected");
  await gh(
    token,
    `/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
    {
      method: "POST",
      body: JSON.stringify({ ref, inputs: inputs ?? {} }),
    }
  );
}

export async function setStarred(
  accountId: string,
  owner: string,
  repo: string,
  starred: boolean
): Promise<void> {
  const token = await getServiceToken(accountId, "GITHUB_TOKEN");
  if (!token) throw new Error("GitHub token not connected");
  await gh(token, `/user/starred/${owner}/${repo}`, {
    method: starred ? "PUT" : "DELETE",
    headers: { "Content-Length": "0" },
  });
}

export async function isStarred(
  accountId: string,
  owner: string,
  repo: string
): Promise<boolean> {
  const token = await getServiceToken(accountId, "GITHUB_TOKEN");
  if (!token) throw new Error("GitHub token not connected");
  const res = await timedFetch(`${API}/user/starred/${owner}/${repo}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "ChuckHub",
    },
    cache: "no-store",
  });
  return res.status === 204;
}
