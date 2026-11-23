import { NextResponse } from "next/server";
import type { Document, Filter } from "mongodb";
import { z } from "zod";
import { getAuthSession } from "@/lib/session";
import { getAuthCollections, serializeDoc, userDocMatch } from "@/lib/mongodb";
import {
  hasPermission,
  listAllRoles,
  normalizeRoleSlug,
  resolveUserRolesAndPermissions,
} from "@/lib/roles";
import {
  listAllBadges,
  normalizeBadgeSlug,
  resolveUserBadges,
} from "@/lib/badges";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateUserSchema = z.object({
  userId: z.string().min(1),
  roles: z.array(z.string().min(1)).optional(),
  badges: z.array(z.string().min(1)).optional(),
});

export async function GET(req: Request) {
  const ctx = await getAuthSession();
  if (!ctx || !hasPermission(ctx, "users:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  const [{ users }, availableRoles, availableBadges] = await Promise.all([
    getAuthCollections(),
    listAllRoles(),
    listAllBadges(),
  ]);

  const filter = q
    ? {
        $or: [
          { name: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
          { username: { $regex: q, $options: "i" } },
          { discordId: { $regex: q, $options: "i" } },
          { discordUsername: { $regex: q, $options: "i" } },
          { githubId: { $regex: q, $options: "i" } },
          { githubUsername: { $regex: q, $options: "i" } },
        ],
      }
    : {};

  const rows = await users
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(60)
    .toArray();

  const resolvedUsers = await Promise.all(
    rows.map(async (u) => {
      const discordId = typeof u.discordId === "string" ? u.discordId : null;
      const githubId = typeof u.githubId === "string" ? u.githubId : null;
      const email = typeof u.email === "string" ? u.email : "";

      const roleState = await resolveUserRolesAndPermissions({
        storedRoles: u.roles,
        discordId,
        email,
      });

      const badgeState = await resolveUserBadges({
        storedBadges: u.badges,
        pinnedBadges: u.pinnedBadges,
        twoFactorEnabled: Boolean(u.twoFactorEnabled),
        emailVerified: Boolean(u.emailVerified),
        discordLinked: Boolean(discordId),
        githubLinked: Boolean(githubId),
        isAdmin: roleState.isAdmin,
      });

      return serializeDoc({
        id: String(u.id || u._id),
        name: u.name || "User",
        username: u.username || null,
        email,
        image: u.image || null,
        discordId,
        discordUsername: u.discordUsername || null,
        githubId,
        githubUsername: u.githubUsername || null,
        twoFactorEnabled: Boolean(u.twoFactorEnabled),
        role: roleState.primaryRole,
        roles: roleState.roles,
        roleDetails: roleState.roleDetails,
        badges: badgeState.earnedBadges,
        storedBadges: Array.isArray(u.badges) ? u.badges.map(String) : [],
        isEnvAdmin: roleState.isEnvAdmin,
        createdAt: u.createdAt || null,
      });
    })
  );

  return NextResponse.json({
    users: resolvedUsers,
    availableRoles,
    availableBadges,
  });
}

export async function PATCH(req: Request) {
  const ctx = await getAuthSession();
  if (!ctx || !hasPermission(ctx, "users:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid update payload." },
      { status: 400 }
    );
  }

  const [{ users }, allRoles, allBadges] = await Promise.all([
    getAuthCollections(),
    listAllRoles(),
    listAllBadges(),
  ]);

  const targetUser = await users.findOne(
    userDocMatch(parsed.data.userId) as unknown as Filter<Document>
  );
  if (!targetUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (parsed.data.roles !== undefined) {
    const validRoleSlugs = new Set(allRoles.map((r) => r.slug));
    const cleanRoles = new Set<string>(["member"]);
    for (const r of parsed.data.roles) {
      const slug = normalizeRoleSlug(r);
      if (slug && validRoleSlugs.has(slug)) cleanRoles.add(slug);
    }
    updates.roles = Array.from(cleanRoles);
  }

  if (parsed.data.badges !== undefined) {
    const validBadgeSlugs = new Set(allBadges.map((b) => b.slug));
    const cleanBadges = Array.from(
      new Set(
        parsed.data.badges
          .map((b) => normalizeBadgeSlug(b))
          .filter((b) => validBadgeSlugs.has(b))
      )
    );
    updates.badges = cleanBadges;
  }

  await users.updateOne({ _id: targetUser._id }, { $set: updates });
  return NextResponse.json({ ok: true });
}
