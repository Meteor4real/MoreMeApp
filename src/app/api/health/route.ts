import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  try {
    const r = await pool.query("select 1 as ok");
    checks.postgres = { ok: r.rows[0]?.ok === 1 };
  } catch (e) {
    checks.postgres = { ok: false, detail: (e as Error).message };
  }

  const envChecks = [
    "GITHUB_TOKEN",
    "VERCEL_TOKEN",
    "SUPABASE_ACCESS_TOKEN",
    "CLOUDFLARE_API_TOKEN",
    "TAILSCALE_API_KEY",
    "N8N_API_KEY",
    "YOUTUBE_API_KEY",
  ];
  checks.env = {
    ok: true,
    detail: envChecks
      .map((k) => `${k}:${process.env[k] ? "set" : "missing"}`)
      .join(" "),
  };

  return NextResponse.json({
    service: "chuckhub",
    timestamp: new Date().toISOString(),
    checks,
  });
}
