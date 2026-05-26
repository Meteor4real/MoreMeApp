import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth";
import { getVercelOverview } from "@/lib/integrations/vercel";

export const dynamic = "force-dynamic";

export async function GET() {
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const vc = await getVercelOverview(account.id);
    if (!vc) return NextResponse.json({ error: "Vercel not connected" }, { status: 404 });
    return NextResponse.json({
      projects: vc.projects.map((p) => ({
        id: p.id,
        name: p.name,
        framework: p.framework,
        updatedAt: p.updatedAt,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
