import type { Document } from "mongodb";
import { getAuthCollections, userIdFilter } from "./mongodb";
import { RoleBadge, resolveUserRolesAndPermissions } from "./roles";
import { UserBadgeItem, resolveUserBadges } from "./badges";

export interface PublicUserProfile {
  name: string;
  username: string;
  bio: string | null;
  image: string | null;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  role: string;
  roleDetails: RoleBadge[];
  badges: UserBadgeItem[];
  totalBadgesCatalog: number;
  socials: {
    discord: { username: string | null; id: string } | null;
    github: { username: string | null; url: string | null } | null;
  };
  joinedAt: string | null;
}

export type PublicProfileLookupResult =
  | { status: "ok"; profile: PublicUserProfile }
  | { status: "private"; username: string }
  | { status: "not_found" };

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeLookupUsername(raw: string): string {
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // keep raw if malformed URI encoding
  }
  return decoded.trim().replace(/^@+/, "").toLowerCase();
}

export async function getPublicProfileByUsername(
  rawUsername: string
): Promise<PublicProfileLookupResult> {
  const normalized = normalizeLookupUsername(rawUsername);
  if (!normalized || !/^[a-z0-9._-]{2,32}$/.test(normalized)) {
    return { status: "not_found" };
  }

  const { users, accounts, twoFactors } = await getAuthCollections();

  // Exact lowercase match first, then case-insensitive fallback
  let userDoc: Document | null = await users.findOne({ username: normalized });
  if (!userDoc) {
    userDoc = await users.findOne({
      username: { $regex: `^${escapeRegex(normalized)}$`, $options: "i" },
    });
  }

  if (!userDoc) {
    return { status: "not_found" };
  }

  if (userDoc.isPublicProfile === false) {
    return {
      status: "private",
      username: String(userDoc.username || normalized),
    };
  }

  const allUserIds = [
    userDoc._id ? String(userDoc._id) : null,
    typeof userDoc.id === "string" ? userDoc.id : null,
  ];

  const [userAccounts, twoFactorDoc] = await Promise.all([
    accounts.find({ userId: userIdFilter(...allUserIds) }).toArray(),
    twoFactors.findOne({ userId: userIdFilter(...allUserIds) }),
  ]);

  const discordAccount = userAccounts.find((a) => a.providerId === "discord");
  const githubAccount = userAccounts.find((a) => a.providerId === "github");

  const discordId = discordAccount?.accountId
    ? String(discordAccount.accountId)
    : typeof userDoc.discordId === "string" && userDoc.discordId
      ? userDoc.discordId
      : null;
  const discordUsername =
    typeof userDoc.discordUsername === "string" && userDoc.discordUsername
      ? userDoc.discordUsername
      : null;

  const githubId = githubAccount?.accountId
    ? String(githubAccount.accountId)
    : typeof userDoc.githubId === "string" && userDoc.githubId
      ? userDoc.githubId
      : null;
  const githubUsername =
    typeof userDoc.githubUsername === "string" && userDoc.githubUsername
      ? userDoc.githubUsername
      : null;

  const email = typeof userDoc.email === "string" ? userDoc.email : "";
  const emailVerified = Boolean(userDoc.emailVerified);
  const twoFactorEnabled = Boolean(
    userDoc.twoFactorEnabled ?? (twoFactorDoc && twoFactorDoc.verified !== false)
  );

  const roleState = await resolveUserRolesAndPermissions({
    storedRoles: userDoc.roles,
    discordId,
    email,
  });

  const badgeState = await resolveUserBadges({
    storedBadges: userDoc.badges,
    pinnedBadges: userDoc.pinnedBadges,
    twoFactorEnabled,
    emailVerified,
    discordLinked: Boolean(discordId),
    githubLinked: Boolean(githubId),
    isAdmin: roleState.isAdmin,
  });

  const showPublicSocials = userDoc.showPublicSocials !== false;

  return {
    status: "ok",
    profile: {
      name: String(userDoc.name || userDoc.username || "SSE Member"),
      username: String(userDoc.username || normalized),
      bio: typeof userDoc.bio === "string" && userDoc.bio.trim() ? userDoc.bio : null,
      image: typeof userDoc.image === "string" && userDoc.image.trim() ? userDoc.image : null,
      emailVerified,
      twoFactorEnabled,
      role: roleState.primaryRole,
      roleDetails: roleState.roleDetails,
      badges: badgeState.earnedBadges,
      totalBadgesCatalog: badgeState.allBadges.length,
      socials: {
        discord:
          showPublicSocials && discordId
            ? { username: discordUsername, id: discordId }
            : null,
        github:
          showPublicSocials && githubId
            ? {
                username: githubUsername,
                url: githubUsername
                  ? `https://github.com/${encodeURIComponent(githubUsername)}`
                  : null,
              }
            : null,
      },
      joinedAt: userDoc.createdAt
        ? new Date(userDoc.createdAt as string | Date).toISOString()
        : null,
    },
  };
}
