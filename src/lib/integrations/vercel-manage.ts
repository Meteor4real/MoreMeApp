import { getServiceToken } from "@/lib/tokens";
import { timedFetch } from "@/lib/integrations/fetch";

const API = "https://api.vercel.com";

function teamSuffix(path: string): string {
  return process.env.VERCEL_TEAM_ID
    ? (path.includes("?") ? "&" : "?") + `teamId=${process.env.VERCEL_TEAM_ID}`
    : "";
}

async function vc<T>(
  token: string,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await timedFetch(
    `${API}${path}${teamSuffix(path)}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    },
    15_000
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`vercel ${path} ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export type VcEnvVar = {
  id: string;
  key: string;
  value?: string;
  type: "plain" | "encrypted" | "system" | "secret";
  target: string[];
  configurationId?: string | null;
  createdAt?: number;
  updatedAt?: number;
};

export async function listEnvVars(
  accountId: string,
  projectId: string
): Promise<VcEnvVar[]> {
  const token = await getServiceToken(accountId, "VERCEL_TOKEN");
  if (!token) throw new Error("Vercel token not connected");
  const j = await vc<{ envs: VcEnvVar[] }>(token, `/v9/projects/${projectId}/env`);
  return j.envs;
}

export async function createEnvVar(
  accountId: string,
  projectId: string,
  input: {
    key: string;
    value: string;
    type: "plain" | "encrypted";
    target: ("production" | "preview" | "development")[];
  }
): Promise<VcEnvVar> {
  const token = await getServiceToken(accountId, "VERCEL_TOKEN");
  if (!token) throw new Error("Vercel token not connected");
  return vc<VcEnvVar>(token, `/v10/projects/${projectId}/env`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteEnvVar(
  accountId: string,
  projectId: string,
  envId: string
): Promise<void> {
  const token = await getServiceToken(accountId, "VERCEL_TOKEN");
  if (!token) throw new Error("Vercel token not connected");
  await vc(token, `/v9/projects/${projectId}/env/${envId}`, { method: "DELETE" });
}

export type VcRedeployResult = { uid: string; url: string; state: string };

export async function redeployFromLatest(
  accountId: string,
  projectId: string,
  projectName: string,
  target: "production" | "preview" = "production"
): Promise<VcRedeployResult> {
  const token = await getServiceToken(accountId, "VERCEL_TOKEN");
  if (!token) throw new Error("Vercel token not connected");

  // Find the most recent deployment for this project to copy its meta.
  type Dep = {
    uid: string;
    name: string;
    meta?: {
      githubCommitSha?: string;
      githubCommitRef?: string;
      githubRepo?: string;
      githubOrg?: string;
    };
    target?: string | null;
  };
  const list = await vc<{ deployments: Dep[] }>(
    token,
    `/v6/deployments?projectId=${projectId}&limit=5`
  );
  const ref = list.deployments.find((d) => d.target === target) ?? list.deployments[0];
  if (!ref) throw new Error("no prior deployment to redeploy from");

  const body: Record<string, unknown> = {
    name: projectName,
    target,
  };
  if (ref.meta?.githubCommitSha && ref.meta?.githubRepo && ref.meta?.githubOrg) {
    body.gitSource = {
      type: "github",
      ref: ref.meta.githubCommitRef ?? "main",
      sha: ref.meta.githubCommitSha,
      repoId: undefined,
      repo: ref.meta.githubRepo,
      org: ref.meta.githubOrg,
    };
  } else {
    // Fall back to redeploying by uid (Vercel will recreate from same source).
    return vc<VcRedeployResult>(token, `/v13/deployments`, {
      method: "POST",
      body: JSON.stringify({
        name: projectName,
        deploymentId: ref.uid,
        target,
      }),
    });
  }

  return vc<VcRedeployResult>(token, `/v13/deployments`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
