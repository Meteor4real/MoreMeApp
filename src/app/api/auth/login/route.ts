import { NextRequest, NextResponse } from "next/server";
import { findAccountByEmail, setSessionCookie, verifyPassword } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ error: "email and password required" }, { status: 400 });
  }

  try {
    const account = await findAccountByEmail(email);
    if (!account || !account.password_hash) {
      return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
    }
    const ok = await verifyPassword(password, account.password_hash);
    if (!ok) {
      return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
    }

    await setSessionCookie(account.id);
    await logActivity(account.id, "session.login", "Signed in");
    return NextResponse.json({
      account: {
        id: account.id,
        email: account.email,
        display_name: account.display_name,
        avatar_url: account.avatar_url,
        created_at: account.created_at,
      },
    });
  } catch (e) {
    console.error("login failed:", e);
    return NextResponse.json(
      { error: (e as Error).message || "login failed" },
      { status: 500 }
    );
  }
}
