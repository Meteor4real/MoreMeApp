import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionCookie,
  ensureSchema,
  findAccountByEmail,
  verifyMasterCode,
} from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { email?: string; masterCode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const code = body.masterCode ?? "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "valid email required" }, { status: 400 });
  }
  if (!verifyMasterCode(code)) {
    return NextResponse.json({ error: "invalid master code" }, { status: 401 });
  }

  try {
    await ensureSchema();
    const existing = await findAccountByEmail(email);
    if (!existing) {
      // Don't leak whether the account exists, but also don't pretend it did.
      // We picked "don't leak" for the public sign-in form.
      return NextResponse.json({ ok: true, deleted: false });
    }
    await query(`delete from chuckhub_accounts where id = $1`, [existing.id]);
    // If the caller was somehow signed in (e.g. forgot to log out), kill the cookie.
    await clearSessionCookie();
    return NextResponse.json({ ok: true, deleted: true });
  } catch (e) {
    console.error("delete-account failed:", e);
    return NextResponse.json(
      { error: (e as Error).message || "delete failed" },
      { status: 500 }
    );
  }
}
