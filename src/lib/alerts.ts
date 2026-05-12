import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/auth";

export type Alert = {
  id: string;
  source: string;
  severity: "info" | "warn" | "crit";
  message: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export async function listAlerts(limit = 25): Promise<Alert[]> {
  await ensureSchema();
  return query<Alert>(
    `select id, source, severity, message, metadata, created_at
     from chuckhub_alerts order by created_at desc limit $1`,
    [limit]
  );
}

export async function countAlerts(): Promise<number> {
  await ensureSchema();
  const rows = await query<{ n: string }>(`select count(*)::text as n from chuckhub_alerts`);
  return Number(rows[0]?.n ?? 0);
}

export async function insertAlert(input: {
  source: string;
  severity: "info" | "warn" | "crit";
  message: string;
  metadata?: Record<string, unknown>;
}): Promise<Alert> {
  await ensureSchema();
  const rows = await query<Alert>(
    `insert into chuckhub_alerts (source, severity, message, metadata)
     values ($1, $2, $3, $4)
     returning id, source, severity, message, metadata, created_at`,
    [input.source, input.severity, input.message, input.metadata ? JSON.stringify(input.metadata) : null]
  );
  return rows[0]!;
}
