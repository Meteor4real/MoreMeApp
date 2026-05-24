import { getServiceToken } from "@/lib/tokens";
import { timedFetch } from "@/lib/integrations/fetch";

const API = "https://api.cloudflare.com/client/v4";

async function cf<T>(
  token: string,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await timedFetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`cloudflare ${path} ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export type CfDnsRecord = {
  id: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied: boolean;
};

export async function listDnsRecords(
  accountId: string,
  zoneId: string
): Promise<CfDnsRecord[]> {
  const token = await getServiceToken(accountId, "CLOUDFLARE_API_TOKEN");
  if (!token) throw new Error("Cloudflare token not connected");
  const j = await cf<{ result: CfDnsRecord[] }>(
    token,
    `/zones/${zoneId}/dns_records?per_page=100`
  );
  return j.result;
}

export async function createDnsRecord(
  accountId: string,
  zoneId: string,
  input: {
    type: string;
    name: string;
    content: string;
    ttl?: number;
    proxied?: boolean;
  }
): Promise<CfDnsRecord> {
  const token = await getServiceToken(accountId, "CLOUDFLARE_API_TOKEN");
  if (!token) throw new Error("Cloudflare token not connected");
  const j = await cf<{ result: CfDnsRecord }>(
    token,
    `/zones/${zoneId}/dns_records`,
    {
      method: "POST",
      body: JSON.stringify({
        type: input.type,
        name: input.name,
        content: input.content,
        ttl: input.ttl ?? 1,
        proxied: input.proxied ?? false,
      }),
    }
  );
  return j.result;
}

export async function deleteDnsRecord(
  accountId: string,
  zoneId: string,
  recordId: string
): Promise<void> {
  const token = await getServiceToken(accountId, "CLOUDFLARE_API_TOKEN");
  if (!token) throw new Error("Cloudflare token not connected");
  await cf(token, `/zones/${zoneId}/dns_records/${recordId}`, { method: "DELETE" });
}

export async function purgeEverything(
  accountId: string,
  zoneId: string
): Promise<void> {
  const token = await getServiceToken(accountId, "CLOUDFLARE_API_TOKEN");
  if (!token) throw new Error("Cloudflare token not connected");
  await cf(token, `/zones/${zoneId}/purge_cache`, {
    method: "POST",
    body: JSON.stringify({ purge_everything: true }),
  });
}
