import { query } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { ensureSchema } from "@/lib/auth";

type Row = { ciphertext: string; iv: string };

/**
 * Returns the value of a token by env key for the given account.
 * Prefers process.env (so Vercel env vars work for everyone), falls
 * back to the account's encrypted vault row. Returns null if neither.
 */
export async function getServiceToken(
  accountId: string,
  envKey: string
): Promise<string | null> {
  const fromEnv = process.env[envKey];
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  await ensureSchema();
  const rows = await query<Row>(
    `select ciphertext, iv from chuckhub_service_tokens
     where account_id = $1 and key_name = $2 limit 1`,
    [accountId, envKey]
  );
  const r = rows[0];
  if (!r) return null;
  try {
    return decryptSecret(r.ciphertext, r.iv);
  } catch {
    return null;
  }
}

export async function hasServiceToken(
  accountId: string,
  envKey: string
): Promise<boolean> {
  return (await getServiceToken(accountId, envKey)) !== null;
}
