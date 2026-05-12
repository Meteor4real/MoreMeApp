import { NextResponse } from "next/server";
import { pool, SCHEMA_SQL } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await pool.query(SCHEMA_SQL);
    return NextResponse.json({ ok: true, applied: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
