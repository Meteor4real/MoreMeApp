import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth";
import {
  createDnsRecord,
  deleteDnsRecord,
  listDnsRecords,
  purgeEverything,
} from "@/lib/integrations/cloudflare-manage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const zoneId = new URL(req.url).searchParams.get("zoneId");
  if (!zoneId) return NextResponse.json({ error: "zoneId required" }, { status: 400 });
  try {
    return NextResponse.json({ records: await listDnsRecords(account.id, zoneId) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: {
    zoneId?: string;
    type?: string;
    name?: string;
    content?: string;
    ttl?: number;
    proxied?: boolean;
    purgeAll?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body.zoneId) {
    return NextResponse.json({ error: "zoneId required" }, { status: 400 });
  }
  try {
    if (body.purgeAll) {
      await purgeEverything(account.id, body.zoneId);
      return NextResponse.json({ ok: true });
    }
    if (!body.type || !body.name || !body.content) {
      return NextResponse.json(
        { error: "type, name, content required" },
        { status: 400 }
      );
    }
    const record = await createDnsRecord(account.id, body.zoneId, {
      type: body.type,
      name: body.name,
      content: body.content,
      ttl: body.ttl,
      proxied: body.proxied,
    });
    return NextResponse.json({ record });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest) {
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const u = new URL(req.url);
  const zoneId = u.searchParams.get("zoneId");
  const recordId = u.searchParams.get("recordId");
  if (!zoneId || !recordId) {
    return NextResponse.json(
      { error: "zoneId and recordId required" },
      { status: 400 }
    );
  }
  try {
    await deleteDnsRecord(account.id, zoneId, recordId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
