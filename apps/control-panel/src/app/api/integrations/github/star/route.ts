import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth";
import { isStarred, setStarred } from "@/lib/integrations/github-manage";

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
    return NextResponse.json({ starred: await isStarred(account.id, owner, repo) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

export async function PUT(req: NextRequest) {
  return setStar(req, true);
}

export async function DELETE(req: NextRequest) {
  return setStar(req, false);
}

async function setStar(req: NextRequest, starred: boolean) {
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const u = new URL(req.url);
  const owner = u.searchParams.get("owner");
  const repo = u.searchParams.get("repo");
  if (!owner || !repo) {
    return NextResponse.json({ error: "owner and repo required" }, { status: 400 });
  }
  try {
    await setStarred(account.id, owner, repo, starred);
    return NextResponse.json({ ok: true, starred });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
