import { NextResponse } from "next/server";
import type { Document, Filter } from "mongodb";
import { z } from "zod";
import { getAuthSession } from "@/lib/session";
import { getAuthCollections, userDocMatch, userIdFilter } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const deleteSchema = z.object({
  confirmEmail: z.string().trim().email(),
});

export async function POST(req: Request) {
  const ctx = await getAuthSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (
    !parsed.success ||
    parsed.data.confirmEmail.toLowerCase() !== ctx.email.toLowerCase()
  ) {
    return NextResponse.json(
      { error: "Please type your exact account email to confirm deletion." },
      { status: 400 }
    );
  }

  const {
    users,
    accounts,
    sessions,
    twoFactors,
    oauthConsents,
    oauthAccessTokens,
    oauthRefreshTokens,
    securityLogs,
  } = await getAuthCollections();

  const userDoc = await users.findOne(
    userDocMatch(ctx.userId) as unknown as Filter<Document>
  );
  const idMatch = {
    userId: userIdFilter(ctx.userId, userDoc?._id ? String(userDoc._id) : null),
  };

  await Promise.all([
    sessions.deleteMany(idMatch),
    accounts.deleteMany(idMatch),
    twoFactors.deleteMany(idMatch),
    oauthConsents.deleteMany(idMatch),
    oauthAccessTokens.deleteMany(idMatch),
    oauthRefreshTokens.deleteMany(idMatch),
    securityLogs.deleteMany(idMatch),
    users.deleteOne(userDocMatch(ctx.userId) as unknown as Filter<Document>),
  ]);

  return NextResponse.json({ ok: true });
}
