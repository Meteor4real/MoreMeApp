import { NextRequest, NextResponse } from "next/server";
import { createAccount, findAccountByEmail, setSessionCookie } from "@/lib/auth";

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
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "valid email required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const existing = await findAccountByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "account already exists" }, { status: 409 });
  }

  try {
    const account = await createAccount({
      email,
      password,
      displayName: body.displayName,
    });
    await setSessionCookie(account.id);
    return NextResponse.json({ account });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "signup failed" },
      { status: 500 }
    );
  }
}
