import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth";
import { insertAlert, listAlerts } from "@/lib/alerts";

export const dynamic = "force-dynamic";

export async function GET() {
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const alerts = await listAlerts(50);
  return NextResponse.json({ alerts });
}

export async function POST(req: NextRequest) {
  const account = await getCurrentAccount();
  const headerSecret = req.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  const expected = process.env.CHUCKHUB_SECRET || process.env.AUTH_SECRET;

  if (!account && (!expected || !headerSecret || headerSecret !== expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    source?: string;
    severity?: "info" | "warn" | "crit";
    message?: string;
    metadata?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const source = body.source?.trim();
  const severity = body.severity;
  const message = body.message?.trim();
  if (!source || !message || !severity) {
    return NextResponse.json(
      { error: "source, severity, message required" },
      { status: 400 }
    );
  }
  if (!["info", "warn", "crit"].includes(severity)) {
    return NextResponse.json({ error: "bad severity" }, { status: 400 });
  }

  const alert = await insertAlert({
    source,
    severity,
    message,
    metadata: body.metadata,
  });
  return NextResponse.json({ alert });
}
