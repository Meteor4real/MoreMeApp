import { getServiceToken } from "@/lib/tokens";

const API = "https://api.tailscale.com/api/v2";

export type TsDevice = {
  id: string;
  name: string;
  hostname: string;
  os: string;
  addresses: string[];
  lastSeen: string;
  online: boolean;
};

export async function getTailscaleOverview(
  accountId: string
): Promise<{ devices: TsDevice[]; tailnet: string } | null> {
  const token = await getServiceToken(accountId, "TAILSCALE_API_KEY");
  const tailnet = process.env.TAILSCALE_TAILNET || "-";
  if (!token) return null;

  type Resp = {
    devices: Array<{
      id: string;
      name: string;
      hostname: string;
      os: string;
      addresses: string[];
      lastSeen: string;
    }>;
  };

  const res = await fetch(
    `${API}/tailnet/${encodeURIComponent(tailnet)}/devices`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as Resp;
  const now = Date.now();
  const devices: TsDevice[] = data.devices.map((d) => ({
    ...d,
    online: now - new Date(d.lastSeen).getTime() < 5 * 60 * 1000,
  }));
  return { devices, tailnet };
}
