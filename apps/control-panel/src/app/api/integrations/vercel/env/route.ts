import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth";
import {
  createEnvVar,
  deleteEnvVar,
  listEnvVars,
} from "@/lib/integrations/vercel-manage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const projectId = new URL(req.url).searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  try {
    const envs = await listEnvVars(account.id, projectId);
    // Drop the value field — Vercel returns it for plain vars but we don't
    // need to leak it client-side once it's set.
    return NextResponse.json({
      envs: envs.map((e) => ({
        id: e.id,
        key: e.key,
        type: e.type,
        target: e.target,
        updatedAt: e.updatedAt,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: {
    projectId?: string;
    key?: string;
    value?: string;
    type?: "plain" | "encrypted";
    target?: ("production" | "preview" | "development")[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body.projectId || !body.key || !body.value) {
    return NextResponse.json(
      { error: "projectId, key, value required" },
      { status: 400 }
    );
  }
  try {
    const created = await createEnvVar(account.id, body.projectId, {
      key: body.key,
      value: body.value,
      type: body.type ?? "encrypted",
      target: body.target?.length ? body.target : ["production", "preview", "development"],
    });
    return NextResponse.json({ env: { id: created.id, key: created.key } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest) {
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const u = new URL(req.url);
  const projectId = u.searchParams.get("projectId");
  const envId = u.searchParams.get("envId");
  if (!projectId || !envId) {
    return NextResponse.json(
      { error: "projectId and envId required" },
      { status: 400 }
    );
  }
  try {
    await deleteEnvVar(account.id, projectId, envId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
