import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { ensureSchema, getCurrentAccount } from "@/lib/auth";
import { hasServiceToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";

const INTEGRATIONS = [
  "GITHUB_TOKEN",
  "VERCEL_TOKEN",
  "SUPABASE_ACCESS_TOKEN",
  "CLOUDFLARE_API_TOKEN",
  "TAILSCALE_API_KEY",
  "N8N_API_KEY",
  "YOUTUBE_API_KEY",
  "PIHOLE_PASSWORD",
];

export async function GET() {
  const account = await getCurrentAccount();
  if (!account) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const checks: Record<
    string,
    { ok: boolean; detail?: string; source?: "env" | "vault" | "missing" }
  > = {};

  try {
    await ensureSchema();
    const r = await pool.query("select 1 as ok");
    checks.postgres = { ok: r.rows[0]?.ok === 1 };
  } catch (e) {
    checks.postgres = { ok: false, detail: (e as Error).message };
  }

  // For each integration, mark ok if env var OR vault row is present.
  for (const key of INTEGRATIONS) {
    const fromEnv = !!process.env[key];
    if (fromEnv) {
      checks[key] = { ok: true, source: "env" };
      continue;
    }
    const fromVault = await hasServiceToken(account.id, key).catch(() => false);
    checks[key] = fromVault
      ? { ok: true, source: "vault" }
      : { ok: false, source: "missing" };
  }

  return NextResponse.json({
    service: "chuckhub",
    timestamp: new Date().toISOString(),
    checks,
  });
}
