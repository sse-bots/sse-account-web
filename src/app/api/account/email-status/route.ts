import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/session";
import { getLastDeliveryStatus } from "@/lib/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getAuthSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = await getLastDeliveryStatus(ctx.email);
  return NextResponse.json(
    { status },
    { headers: { "Cache-Control": "no-store" } }
  );
}
