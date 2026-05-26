import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth";
import { getServiceToken } from "@/lib/tokens";
import { timedFetch } from "@/lib/integrations/fetch";

export const dynamic = "force-dynamic";

const API = "https://api.tailscale.com/api/v2";

export async function DELETE(req: NextRequest) {
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const deviceId = new URL(req.url).searchParams.get("deviceId");
  if (!deviceId)
    return NextResponse.json({ error: "deviceId required" }, { status: 400 });
  const token = await getServiceToken(account.id, "TAILSCALE_API_KEY");
  if (!token)
    return NextResponse.json({ error: "Tailscale not connected" }, { status: 404 });
  try {
    const res = await timedFetch(`${API}/device/${encodeURIComponent(deviceId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `tailscale ${res.status}: ${body.slice(0, 200)}` },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
