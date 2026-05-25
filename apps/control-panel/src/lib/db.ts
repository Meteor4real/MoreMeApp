import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __chuckhub_pg__: Pool | undefined;
}

function shouldUseSsl(conn: string): boolean {
  if (/sslmode=disable/i.test(conn)) return false;
  if (/sslmode=(require|verify-ca|verify-full|prefer)/i.test(conn)) return true;
  // Heuristic: any non-localhost managed Postgres needs SSL.
  try {
    const u = new URL(conn);
    const host = u.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) {
      return false;
    }
    return true;
  } catch {
    return process.env.NODE_ENV === "production";
  }
}

/**
 * Resolve a Postgres URL with a preference for transaction-mode pooling,
 * which scales much better in serverless than Supavisor's session-mode
 * pooler (15-client cap that triggers EMAXCONNSESSION).
 *
 * Preference order:
 *   1. CHUCKHUB_POSTGRES_URL  (explicit override)
 *   2. POSTGRES_PRISMA_URL    (Vercel Supabase integration: transaction mode)
 *   3. POSTGRES_URL_NON_POOLING (direct, used for fallback)
 *   4. POSTGRES_URL           (whatever the user set — often session mode)
 */
function resolveConnectionString(): string {
  const candidates = [
    process.env.CHUCKHUB_POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.POSTGRES_URL,
  ];
  for (const c of candidates) {
    if (c && c.length > 0) return c;
  }
  throw new Error(
    "POSTGRES_URL is not set. Add it in Vercel → Project → Env Vars."
  );
}

/**
 * A POSTGRES_URL that points at port 5432 of a *.pooler.supabase.com host
 * is Supavisor in *session* mode, which caps at 15 simultaneous clients
 * across the whole project. Serverless functions hit that ceiling fast.
 * Detect it so we can both warn in logs and tune the pool to survive.
 */
function isSupavisorSessionMode(conn: string): boolean {
  try {
    const u = new URL(conn);
    return /pooler\.supabase\.com$/i.test(u.hostname) && (u.port === "5432" || u.port === "");
  } catch {
    return false;
  }
}

function makePool() {
  const conn = resolveConnectionString();
  const sessionMode = isSupavisorSessionMode(conn);

  if (sessionMode && !process.env.CHUCKHUB_DB_POOLER_WARNED) {
    process.env.CHUCKHUB_DB_POOLER_WARNED = "1";
    console.warn(
      "ChuckHub: POSTGRES_URL points at the Supabase session-mode pooler " +
        "(port 5432). This is capped at 15 clients and will throw " +
        "EMAXCONNSESSION under serverless load. Switch to the transaction-mode " +
        "pooler (port 6543) or set POSTGRES_PRISMA_URL."
    );
  }

  return new Pool({
    connectionString: conn,
    // Serverless: each cold-started function instance holds its own pool.
    // Keep the per-instance ceiling tiny so we don't burn through the
    // upstream pooler's allotment.
    max: 1,
    connectionTimeoutMillis: 8_000,
    idleTimeoutMillis: 10_000,
    allowExitOnIdle: true,
    ssl: shouldUseSsl(conn) ? { rejectUnauthorized: false } : undefined,
  });
}

export const pool: Pool = globalThis.__chuckhub_pg__ ?? makePool();
if (process.env.NODE_ENV !== "production") globalThis.__chuckhub_pg__ = pool;

// Swallow async pool errors so a stale connection drop doesn't crash the
// node process; the next query will reconnect.
pool.on("error", (err) => {
  console.error("pg pool error:", err.message);
});

export async function query<T = unknown>(text: string, params: unknown[] = []) {
  const res = await pool.query<T extends object ? T : never>(text, params as never);
  return res.rows;
}

export const SCHEMA_SQL = /* sql */ `
-- gen_random_uuid() ships natively in Postgres 13+, but some hosted
-- instances still expose it via pgcrypto. CREATE IF NOT EXISTS is a no-op
-- on PG 13+ but fixes deployments where the extension isn't loaded.
create extension if not exists pgcrypto;

create table if not exists chuckhub_accounts (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  display_name text,
  avatar_url text,
  password_hash text,
  created_at timestamptz not null default now()
);
-- backfill for older deployments that pre-date password_hash
alter table chuckhub_accounts add column if not exists password_hash text;

create table if not exists chuckhub_sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references chuckhub_accounts(id) on delete cascade,
  token_hash text unique not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists chuckhub_service_tokens (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references chuckhub_accounts(id) on delete cascade,
  service text not null,
  key_name text not null,
  ciphertext text not null,
  iv text not null,
  created_at timestamptz not null default now(),
  unique (account_id, service, key_name)
);

create table if not exists chuckhub_widget_layout (
  account_id uuid primary key references chuckhub_accounts(id) on delete cascade,
  layout jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists chuckhub_alerts (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  severity text not null check (severity in ('info','warn','crit')),
  message text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists chuckhub_alerts_created_at_idx on chuckhub_alerts (created_at desc);

create table if not exists chuckhub_activity (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references chuckhub_accounts(id) on delete cascade,
  kind text not null,
  message text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists chuckhub_activity_account_created_idx
  on chuckhub_activity (account_id, created_at desc);

-- Persistent application metadata, including an auto-generated signing
-- secret used when CHUCKHUB_SECRET env var is not provided.
create table if not exists chuckhub_meta (
  key text primary key,
  value text not null,
  created_at timestamptz not null default now()
);
`;
