import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/auth";

export type Activity = {
  id: string;
  kind: string;
  message: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export async function logActivity(
  accountId: string,
  kind: string,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await ensureSchema();
    await query(
      `insert into chuckhub_activity (account_id, kind, message, metadata)
       values ($1, $2, $3, $4)`,
      [accountId, kind, message, metadata ? JSON.stringify(metadata) : null]
    );
  } catch {
    // never fail a request because activity logging broke
  }
}

export async function listActivity(
  accountId: string,
  limit = 20
): Promise<Activity[]> {
  await ensureSchema();
  return query<Activity>(
    `select id, kind, message, metadata, created_at
     from chuckhub_activity
     where account_id = $1
     order by created_at desc
     limit $2`,
    [accountId, limit]
  );
}
