import { getServiceToken } from "@/lib/tokens";

const API = "https://api.cloudflare.com/client/v4";

async function cf<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`cloudflare ${path} ${res.status}`);
  return res.json() as Promise<T>;
}

export type CfZone = { id: string; name: string; status: string; plan: { name: string } };
export type CfTunnel = { id: string; name: string; status: string; created_at: string };

export type CfOverview = {
  zones: CfZone[];
  tunnels: CfTunnel[];
};

export async function getCloudflareOverview(accountId: string): Promise<CfOverview | null> {
  const token = await getServiceToken(accountId, "CLOUDFLARE_API_TOKEN");
  if (!token) return null;

  type ZResp = { result: CfZone[] };
  type TResp = { result: CfTunnel[] };

  const zones = await cf<ZResp>(token, "/zones?per_page=10").catch(() => ({ result: [] }));

  let tunnels: CfTunnel[] = [];
  const accId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (accId) {
    const t = await cf<TResp>(token, `/accounts/${accId}/cfd_tunnel?per_page=10`).catch(
      () => ({ result: [] })
    );
    tunnels = t.result;
  }

  return { zones: zones.result, tunnels };
}
