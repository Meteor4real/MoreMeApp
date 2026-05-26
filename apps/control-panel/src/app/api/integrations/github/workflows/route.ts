import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth";
import {
  dispatchWorkflow,
  listWorkflows,
} from "@/lib/integrations/github-manage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const u = new URL(req.url);
  const owner = u.searchParams.get("owner");
  const repo = u.searchParams.get("repo");
  if (!owner || !repo) {
    return NextResponse.json({ error: "owner and repo required" }, { status: 400 });
  }
  try {
    const workflows = await listWorkflows(account.id, owner, repo);
    return NextResponse.json({ workflows });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: {
    owner?: string;
    repo?: string;
    workflowId?: number | string;
    ref?: string;
    inputs?: Record<string, string>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body.owner || !body.repo || !body.workflowId) {
    return NextResponse.json(
      { error: "owner, repo, workflowId required" },
      { status: 400 }
    );
  }
  try {
    await dispatchWorkflow(
      account.id,
      body.owner,
      body.repo,
      body.workflowId,
      body.ref ?? "main",
      body.inputs
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
