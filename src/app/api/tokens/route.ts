import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ensureSchema, getCurrentAccount } from "@/lib/auth";
import { decryptSecret, encryptSecret, maskSecret } from "@/lib/crypto";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

type TokenRow = {
  service: string;
  key_name: string;
  ciphertext: string;
  iv: string;
  created_at: string;
};

export async function GET() {
  try {
    const account = await getCurrentAccount();
    if (!account) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    await ensureSchema();
    const rows = await query<TokenRow>(
      `select service, key_name, ciphertext, iv, created_at
         from chuckhub_service_tokens where account_id = $1`,
      [account.id]
    );
    const tokens = rows.map((r) => {
      try {
        return {
          service: r.service,
          key_name: r.key_name,
          masked: maskSecret(decryptSecret(r.ciphertext, r.iv)),
          decrypt_error: false as const,
          created_at: r.created_at,
        };
      } catch {
        return {
          service: r.service,
          key_name: r.key_name,
          masked: "•••• unreadable",
          decrypt_error: true as const,
          created_at: r.created_at,
        };
      }
    });
    return NextResponse.json({ tokens });
  } catch (e) {
    console.error("GET /api/tokens failed:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const account = await getCurrentAccount();
    if (!account) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    await ensureSchema();

    let body: { service?: string; keyName?: string; value?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "invalid json" }, { status: 400 });
    }

    const service = body.service?.trim();
    const keyName = body.keyName?.trim();
    const value = body.value;
    if (!service || !keyName || !value) {
      return NextResponse.json(
        { error: "service, keyName, value required" },
        { status: 400 }
      );
    }
    if (value.length > 8192) {
      return NextResponse.json({ error: "token too long" }, { status: 400 });
    }

    let enc: ReturnType<typeof encryptSecret>;
    try {
      enc = encryptSecret(value);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }

    await query(
      `insert into chuckhub_service_tokens (account_id, service, key_name, ciphertext, iv)
       values ($1, $2, $3, $4, $5)
       on conflict (account_id, service, key_name)
       do update set ciphertext = excluded.ciphertext, iv = excluded.iv, created_at = now()`,
      [account.id, service, keyName, enc.ciphertext, enc.iv]
    );
    await logActivity(account.id, "token.saved", `Saved ${service} token (${keyName})`);

    return NextResponse.json({ ok: true, masked: maskSecret(value) });
  } catch (e) {
    console.error("POST /api/tokens failed:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const account = await getCurrentAccount();
    if (!account) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    await ensureSchema();
    const { searchParams } = new URL(req.url);
    const keyName = searchParams.get("keyName");
    if (!keyName) {
      return NextResponse.json({ error: "keyName required" }, { status: 400 });
    }
    await query(
      `delete from chuckhub_service_tokens where account_id = $1 and key_name = $2`,
      [account.id, keyName]
    );
    await logActivity(account.id, "token.deleted", `Removed token (${keyName})`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/tokens failed:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
