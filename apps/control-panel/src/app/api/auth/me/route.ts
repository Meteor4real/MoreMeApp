import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const account = await getCurrentAccount();
  return NextResponse.json({ account });
}
