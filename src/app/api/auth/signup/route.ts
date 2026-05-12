import { NextRequest, NextResponse } from "next/server";
import { createAccount, findAccountByEmail, setSessionCookie } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string; displayName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !email.includes("@") || email.length > 320) {
    return NextResponse.json({ error: "valid email required" }, { status: 400 });
  }
  if (password.length < 1) {
    return NextResponse.json({ error: "password required" }, { status: 400 });
  }
  if (password.length > 256) {
    return NextResponse.json({ error: "password too long" }, { status: 400 });
  }

  try {
    const existing = await findAccountByEmail(email);
    if (existing) {
      // If the row pre-dates the password_hash column (legacy data), allow
      // claiming it by setting a password rather than blocking the user.
      if (!existing.password_hash) {
        const { hashPassword } = await import("@/lib/auth");
        const { query } = await import("@/lib/db");
        const hash = await hashPassword(password);
        await query(
          `update chuckhub_accounts
              set password_hash = $2,
                  display_name = coalesce(display_name, $3)
            where id = $1`,
          [existing.id, hash, body.displayName?.trim() || email.split("@")[0]]
        );
        await setSessionCookie(existing.id);
        await logActivity(existing.id, "account.claimed", `Password set for ${email}`);
        return NextResponse.json({
          account: {
            id: existing.id,
            email: existing.email,
            display_name: existing.display_name,
            avatar_url: existing.avatar_url,
            created_at: existing.created_at,
          },
        });
      }
      return NextResponse.json({ error: "account already exists" }, { status: 409 });
    }

    const account = await createAccount({
      email,
      password,
      displayName: body.displayName,
    });
    await setSessionCookie(account.id);
    await logActivity(account.id, "account.created", `Account created for ${account.email}`);
    return NextResponse.json({ account });
  } catch (e) {
    const message = (e as Error).message || "signup failed";
    // Surface duplicate-key as a friendly 409 (race between check + insert)
    if (/duplicate key|unique/i.test(message)) {
      return NextResponse.json({ error: "account already exists" }, { status: 409 });
    }
    console.error("signup failed:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
