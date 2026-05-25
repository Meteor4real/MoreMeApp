import { getServiceToken } from "@/lib/tokens";
import { timedFetch } from "@/lib/integrations/fetch";

const API = "https://api.vercel.com";

async function vc<T>(token: string, path: string): Promise<T> {
  const teamSuffix = process.env.VERCEL_TEAM_ID
    ? (path.includes("?") ? "&" : "?") + `teamId=${process.env.VERCEL_TEAM_ID}`
    : "";
  const res = await timedFetch(`${API}${path}${teamSuffix}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`vercel ${path} ${res.status}`);
  return res.json() as Promise<T>;
}

export type VcDeployment = {
  uid: string;
  name: string;
  url: string;
  state:
    | "BUILDING"
    | "ERROR"
    | "INITIALIZING"
    | "QUEUED"
    | "READY"
    | "CANCELED";
  createdAt: number;
  target: string | null;
  meta?: { githubCommitMessage?: string; githubCommitRef?: string };
};

export type VcProject = {
  id: string;
  name: string;
  framework: string | null;
  updatedAt: number;
};

export type VcOverview = {
  username: string | null;
  deployments: VcDeployment[];
  projects: VcProject[];
};

export async function getVercelOverview(accountId: string): Promise<VcOverview | null> {
  const token = await getServiceToken(accountId, "VERCEL_TOKEN");
  if (!token) return null;

  type DepResp = { deployments: VcDeployment[] };
  type ProjResp = { projects: VcProject[] };
  type UserResp = { user: { username: string } };

  const [user, dep, proj] = await Promise.all([
    vc<UserResp>(token, "/v2/user").catch(() => null),
    vc<DepResp>(token, "/v6/deployments?limit=8"),
    vc<ProjResp>(token, "/v9/projects?limit=8"),
  ]);

  return {
    username: user?.user?.username ?? null,
    deployments: dep.deployments,
    projects: proj.projects,
  };
}
