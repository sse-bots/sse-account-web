import { NextResponse } from "next/server";
import type { Document, Filter } from "mongodb";
import { z } from "zod";
import { getAuthSession } from "@/lib/session";
import { getAuthCollections, userDocMatch } from "@/lib/mongodb";
import { normalizeBadgeSlug } from "@/lib/badges";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pinSchema = z.object({
  pinnedBadges: z.array(z.string()).max(6),
});

export async function PATCH(req: Request) {
  const ctx = await getAuthSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = pinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "You can pin up to 6 earned badges." },
      { status: 400 }
    );
  }

  const earnedSet = new Set(ctx.badges.map((b) => b.slug));
  const cleanPinned = Array.from(
    new Set(
      parsed.data.pinnedBadges
        .map((s) => normalizeBadgeSlug(s))
        .filter((s) => earnedSet.has(s))
    )
  ).slice(0, 6);

  const { users } = await getAuthCollections();
  await users.updateOne(
    userDocMatch(ctx.userId) as unknown as Filter<Document>,
    { $set: { pinnedBadges: cleanPinned, updatedAt: new Date() } }
  );

  return NextResponse.json({ ok: true, pinnedBadges: cleanPinned });
}
