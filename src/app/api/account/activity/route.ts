import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/session";
import { getAuthCollections, serializeDoc, userIdFilter } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getAuthSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { securityLogs } = await getAuthCollections();
  const rows = await securityLogs
    .find({ userId: userIdFilter(ctx.userId) })
    .sort({ createdAt: -1 })
    .limit(25)
    .toArray();

  return NextResponse.json({
    events: rows.map((r) =>
      serializeDoc({
        id: String(r._id),
        action: String(r.action || "event"),
        title: String(r.title || "Security Event"),
        detail: String(r.detail || ""),
        status: String(r.status || "info"),
        createdAt: r.createdAt || null,
      })
    ),
  });
}
