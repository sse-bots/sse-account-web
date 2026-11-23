import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import type { Document, Filter } from "mongodb";
import { getAuthSession } from "@/lib/session";
import { getAuthCollections, serializeDoc, userIdFilter } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getAuthSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessions } = await getAuthCollections();
  const rows = await sessions
    .find({ userId: userIdFilter(ctx.userId) })
    .sort({ createdAt: -1 })
    .limit(30)
    .toArray();

  return NextResponse.json({
    sessions: rows.map((s) => {
      const sid = String(s.id || s._id);
      return serializeDoc({
        id: sid,
        ipAddress: s.ipAddress || "Unknown IP",
        userAgent: s.userAgent || "Unknown Browser",
        createdAt: s.createdAt || null,
        expiresAt: s.expiresAt || null,
        isCurrent: sid === ctx.sessionId || String(s._id) === ctx.sessionId,
      });
    }),
  });
}

export async function DELETE(req: Request) {
  const ctx = await getAuthSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const { sessions } = await getAuthCollections();

  if (sessionId === "others") {
    const currentFilters: Array<string | ObjectId> = [ctx.sessionId];
    if (ObjectId.isValid(ctx.sessionId)) {
      currentFilters.push(new ObjectId(ctx.sessionId));
    }
    await sessions.deleteMany({
      userId: userIdFilter(ctx.userId),
      _id: { $nin: currentFilters },
      id: { $ne: ctx.sessionId },
    } as unknown as Filter<Document>);
    return NextResponse.json({ ok: true });
  }

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  const idCandidates: Array<string | ObjectId> = [sessionId];
  if (ObjectId.isValid(sessionId)) {
    idCandidates.push(new ObjectId(sessionId));
  }

  await sessions.deleteOne({
    userId: userIdFilter(ctx.userId),
    $or: [{ _id: { $in: idCandidates } }, { id: sessionId }],
  } as unknown as Filter<Document>);

  return NextResponse.json({ ok: true });
}
