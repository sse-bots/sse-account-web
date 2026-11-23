import { NextResponse } from "next/server";
import { getAuthSession, getConnectedAppsForUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getAuthSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const connectedApps = await getConnectedAppsForUser(ctx.userId);
  const payload = {
    exportedAt: new Date().toISOString(),
    profile: {
      userId: ctx.userId,
      name: ctx.name,
      username: ctx.username,
      email: ctx.email,
      emailVerified: ctx.emailVerified,
      bio: ctx.bio,
      image: ctx.image,
      createdAt: ctx.createdAt,
    },
    security: {
      twoFactorEnabled: ctx.twoFactorEnabled,
      hasPassword: ctx.hasPassword,
      securityScore: ctx.securityScore,
    },
    connections: ctx.linkedAccounts,
    connectedApps,
    roles: ctx.roles,
    permissions: ctx.permissions,
    badges: ctx.badges,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="sse-account-export-${ctx.userId.slice(0, 8)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
