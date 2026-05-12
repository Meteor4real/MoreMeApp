import { randomBytes, scryptSync } from "crypto";
import { pool } from "@/lib/db";

/**
 * Resolves the secret used to sign session JWTs AND to derive the
 * AES-256-GCM key for the service-token vault.
 *
 * Order of resolution:
 *   1. process.env.CHUCKHUB_SECRET  (preferred, if >= 16 chars)
 *   2. process.env.AUTH_SECRET      (legacy alias)
 *   3. chuckhub_meta.session_secret in Postgres (auto-generated on first run)
 *
 * The DB fallback means a fresh deploy without any env var still works.
 * The value is cached in module memory after first load.
 */

let cachedSecret: string | null = null;
let cachedCipherKey: Buffer | null = null;
let loadingSecret: Promise<string> | null = null;

const META_KEY = "session_secret";

async function ensureMetaTable(): Promise<void> {
  // Self-contained so we can be called before ensureSchema runs.
  await pool.query(`
    create table if not exists chuckhub_meta (
      key text primary key,
      value text not null,
      created_at timestamptz not null default now()
    );
  `);
}

async function readMetaSecret(): Promise<string | null> {
  await ensureMetaTable();
  const res = await pool.query<{ value: string }>(
    `select value from chuckhub_meta where key = $1`,
    [META_KEY]
  );
  return res.rows[0]?.value ?? null;
}

async function generateAndStoreMetaSecret(): Promise<string> {
  const candidate = randomBytes(48).toString("hex"); // 96 hex chars
  await pool.query(
    `insert into chuckhub_meta (key, value) values ($1, $2)
     on conflict (key) do nothing`,
    [META_KEY, candidate]
  );
  // Re-read to win any race with a parallel insert.
  const stored = await readMetaSecret();
  return stored ?? candidate;
}

async function resolveSecret(): Promise<string> {
  const envVal = process.env.CHUCKHUB_SECRET || process.env.AUTH_SECRET;
  if (envVal && envVal.length >= 16) return envVal;

  const fromDb = await readMetaSecret();
  if (fromDb) return fromDb;

  return generateAndStoreMetaSecret();
}

export async function loadSecret(): Promise<string> {
  if (cachedSecret) return cachedSecret;
  if (loadingSecret) return loadingSecret;
  loadingSecret = resolveSecret()
    .then((s) => {
      cachedSecret = s;
      return s;
    })
    .catch((e) => {
      // Don't poison the cache on failure — next caller retries.
      loadingSecret = null;
      throw e;
    });
  return loadingSecret;
}

export async function loadSigningKey(): Promise<Uint8Array> {
  const s = await loadSecret();
  return new TextEncoder().encode(s);
}

export async function loadCipherKey(): Promise<Buffer> {
  if (cachedCipherKey) return cachedCipherKey;
  const s = await loadSecret();
  cachedCipherKey = scryptSync(s, "chuckhub-salt-v1", 32);
  return cachedCipherKey;
}

/**
 * Test-only: reset module state. Not used in production.
 */
export function __resetSecretCache(): void {
  cachedSecret = null;
  cachedCipherKey = null;
  loadingSecret = null;
}
