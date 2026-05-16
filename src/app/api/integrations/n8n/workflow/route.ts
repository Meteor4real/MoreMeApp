import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth";
import { setWorkflowActive } from "@/lib/integrations/n8n-manage";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: { workflowId?: string; active?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body.workflowId || typeof body.active !== "boolean") {
    return NextResponse.json(
      { error: "workflowId and active required" },
      { status: 400 }
    );
  }
  try {
    await setWorkflowActive(account.id, body.workflowId, body.active);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
