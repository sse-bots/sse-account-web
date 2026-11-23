import { NextResponse } from "next/server";
import type { Document, Filter } from "mongodb";
import { getAuthSession, getConnectedAppsForUser } from "@/lib/session";
import {
  getAuthCollections,
  logSecurityEvent,
  userDocMatch,
  userIdFilter,
} from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getAuthSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { users } = await getAuthCollections();
  const userDoc = await users.findOne(
    userDocMatch(ctx.userId) as unknown as Filter<Document>
  );
  const apps = await getConnectedAppsForUser(
    ctx.userId,
    userDoc?._id ? String(userDoc._id) : null
  );

  return NextResponse.json(
    {
      consents: apps.map((a) => ({
        id: a.clientId,
        clientId: a.clientId,
        clientName: a.clientName,
        clientUri: a.clientUri,
        clientIcon: a.clientIcon,
        scopes: a.scopes,
        connectionType: a.connectionType,
        createdAt: a.connectedAt,
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function DELETE(req: Request) {
  const ctx = await getAuthSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json(
      { error: "clientId is required." },
      { status: 400 }
    );
  }

  const {
    users,
    oauthConsents,
    oauthAccessTokens,
    oauthRefreshTokens,
  } = await getAuthCollections();
  const userDoc = await users.findOne(
    userDocMatch(ctx.userId) as unknown as Filter<Document>
  );
  const filter = {
    userId: userIdFilter(ctx.userId, userDoc?._id ? String(userDoc._id) : null),
    clientId,
  };

  await Promise.all([
    oauthConsents.deleteMany(filter),
    oauthAccessTokens.deleteMany(filter),
    oauthRefreshTokens.deleteMany(filter),
  ]);

  await logSecurityEvent({
    userId: ctx.userId,
    action: "app_revoked",
    title: "Revoked Connected App",
    detail: `Removed OAuth tokens & consent for client ${clientId}`,
    status: "warning",
  });

  return NextResponse.json({ ok: true });
}
