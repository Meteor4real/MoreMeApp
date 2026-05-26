import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth";
import { redeployFromLatest } from "@/lib/integrations/vercel-manage";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: {
    projectId?: string;
    projectName?: string;
    target?: "production" | "preview";
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body.projectId || !body.projectName) {
    return NextResponse.json(
      { error: "projectId and projectName required" },
      { status: 400 }
    );
  }
  try {
    const dep = await redeployFromLatest(
      account.id,
      body.projectId,
      body.projectName,
      body.target ?? "production"
    );
    return NextResponse.json({ deployment: dep });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
