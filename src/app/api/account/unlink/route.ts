import { NextResponse } from "next/server";
import type { Document, Filter } from "mongodb";
import { z } from "zod";
import { getAuthSession } from "@/lib/session";
import {
  getAuthCollections,
  logSecurityEvent,
  userDocMatch,
  userIdFilter,
} from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  providerId: z.enum(["discord", "github"]),
});

export async function POST(req: Request) {
  const ctx = await getAuthSession();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid provider specified." },
      { status: 400 }
    );
  }

  const { providerId } = parsed.data;
  const { accounts, users } = await getAuthCollections();
  const userDoc = await users.findOne(
    userDocMatch(ctx.userId) as unknown as Filter<Document>
  );
  const idMatch = userIdFilter(
    ctx.userId,
    userDoc?._id ? String(userDoc._id) : null
  );

  const userAccounts = await accounts.find({ userId: idMatch }).toArray();
  const target = userAccounts.find((a) => a.providerId === providerId);
  if (!target) {
    return NextResponse.json(
      { error: `${providerId} is not linked to your account.` },
      { status: 404 }
    );
  }

  const remainingMethods = userAccounts.filter(
    (a) => a.providerId !== providerId
  );
  if (remainingMethods.length === 0) {
    return NextResponse.json(
      {
        error:
          "You cannot unlink your only sign-in method. Set a password or link another provider first.",
      },
      { status: 400 }
    );
  }

  await accounts.deleteMany({ userId: idMatch, providerId });

  const unsetFields =
    providerId === "discord"
      ? { discordId: null, discordUsername: null }
      : { githubId: null, githubUsername: null };

  await users.updateOne(
    userDocMatch(ctx.userId) as unknown as Filter<Document>,
    { $set: { ...unsetFields, updatedAt: new Date() } }
  );

  await logSecurityEvent({
    userId: ctx.userId,
    action: "social_unlinked",
    title: `${providerId === "discord" ? "Discord" : "GitHub"} Account Unlinked`,
    detail: `Disconnected ${providerId} from SSE profile`,
    status: "warning",
  });

  return NextResponse.json({ ok: true });
}
