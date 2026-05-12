import { getServiceToken } from "@/lib/tokens";

const API = "https://api.github.com";

async function gh<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "ChuckHub",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`github ${path} ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type GhUser = {
  login: string;
  name: string | null;
  avatar_url: string;
  public_repos: number;
  followers: number;
  html_url: string;
};

export type GhRepo = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  open_issues_count: number;
  pushed_at: string;
  language: string | null;
  private: boolean;
};

export type GhPr = {
  number: number;
  title: string;
  html_url: string;
  state: string;
  draft: boolean;
  user: { login: string; avatar_url: string } | null;
  repository_url: string;
  updated_at: string;
};

export type GhOverview = {
  user: GhUser;
  repos: GhRepo[];
  openPrs: GhPr[];
};

export async function getGithubOverview(accountId: string): Promise<GhOverview | null> {
  const token = await getServiceToken(accountId, "GITHUB_TOKEN");
  if (!token) return null;

  const [user, repos, prs] = await Promise.all([
    gh<GhUser>(token, "/user"),
    gh<GhRepo[]>(token, "/user/repos?per_page=8&sort=pushed&affiliation=owner"),
    gh<{ items: GhPr[] }>(
      token,
      "/search/issues?q=is:pr+is:open+author:@me&per_page=8&sort=updated"
    ),
  ]);

  return { user, repos, openPrs: prs.items };
}
