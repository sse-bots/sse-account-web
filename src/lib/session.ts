import { headers } from "next/headers";
import type { Document, Filter } from "mongodb";
import { auth } from "./auth";
import {
  getAuthCollections,
  getMongoClient,
  userDocMatch,
  userIdFilter,
} from "./mongodb";
import { RoleBadge, resolveUserRolesAndPermissions } from "./roles";
import {
  AccountVerification,
  UserBadgeItem,
  resolveAccountVerification,
  resolveUserBadges,
} from "./badges";

export interface LinkedAccountSummary {
  id: string;
  providerId: string;
  accountId: string;
  username: string | null;
  createdAt: string | null;
}

export interface ConnectedAppSummary {
  clientId: string;
  clientName: string;
  clientUri: string | null;
  clientIcon: string | null;
  scopes: string[];
  connectionType: "trusted" | "authorized";
  connectedAt: string | null;
}

export interface AuthSessionContext {
  userId: string;
  sessionId: string;
  name: string;
  username: string | null;
  bio: string | null;
  isPublicProfile: boolean;
  showPublicSocials: boolean;
  showPublicBadges: boolean;
  verification: AccountVerification;
  email: string;
  emailVerified: boolean;
  image: string | null;
  discordId: string | null;
  discordUsername: string | null;
  githubId: string | null;
  githubUsername: string | null;
  hasPassword: boolean;
  twoFactorEnabled: boolean;
  securityScore: number;
  linkedProviders: string[];
  linkedAccounts: LinkedAccountSummary[];
  connectedAppsCount: number;
  role: string;
  roles: string[];
  roleDetails: RoleBadge[];
  permissions: string[];
  badges: UserBadgeItem[];
  allBadges: UserBadgeItem[];
  isEnvAdmin: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isHead: boolean;
  createdAt: string | null;
}

async function fetchSocialUsername(
  provider: "discord" | "github",
  accessToken: string
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    if (provider === "discord") {
      const res = await fetch("https://discord.com/api/v10/users/@me", {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
        cache: "no-store",
      });
      if (!res.ok) return null;
      const d = (await res.json()) as { username?: string };
      return d.username || null;
    } else {
      const res = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "SSE-Accounts",
        },
        signal: controller.signal,
        cache: "no-store",
      });
      if (!res.ok) return null;
      const g = (await res.json()) as { login?: string };
      return g.login || null;
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetches ALL connected OAuth applications for a user by merging:
 *  - oauthConsent (explicitly approved apps)
 *  - oauthAccessToken (active sessions, including Trusted First-Party skipConsent apps like SSE Nexus!)
 *  - oauthRefreshToken (persistent logins)
 */
export async function getConnectedAppsForUser(
  ...userIds: Array<string | null | undefined>
): Promise<ConnectedAppSummary[]> {
  const {
    oauthConsents,
    oauthAccessTokens,
    oauthRefreshTokens,
    oauthClients,
  } = await getAuthCollections();

  const filter = { userId: userIdFilter(...userIds) };
  const [consents, accessTokens, refreshTokens] = await Promise.all([
    oauthConsents.find(filter).toArray(),
    oauthAccessTokens.find(filter).toArray(),
    oauthRefreshTokens.find(filter).toArray(),
  ]);

  const byClient = new Map<
    string,
    {
      scopes: Set<string>;
      hasConsent: boolean;
      connectedAt: Date | null;
    }
  >();

  const record = (
    clientId: string,
    rawScopes: unknown,
    isConsent: boolean,
    ts: unknown
  ) => {
    if (!clientId) return;
    let entry = byClient.get(clientId);
    if (!entry) {
      entry = { scopes: new Set<string>(), hasConsent: false, connectedAt: null };
      byClient.set(clientId, entry);
    }
    if (isConsent) entry.hasConsent = true;

    if (Array.isArray(rawScopes)) {
      for (const s of rawScopes) {
        if (s) entry.scopes.add(String(s));
      }
    } else if (typeof rawScopes === "string") {
      for (const s of rawScopes.split(/\s+/).filter(Boolean)) {
        entry.scopes.add(s);
      }
    }

    if (ts) {
      const dt = new Date(ts as string | Date);
      if (
        !Number.isNaN(dt.getTime()) &&
        (!entry.connectedAt || dt.getTime() > entry.connectedAt.getTime())
      ) {
        entry.connectedAt = dt;
      }
    }
  };

  for (const c of consents) {
    record(String(c.clientId || ""), c.scopes, true, c.updatedAt || c.createdAt);
  }
  for (const t of accessTokens) {
    record(String(t.clientId || ""), t.scopes, false, t.createdAt);
  }
  for (const r of refreshTokens) {
    record(String(r.clientId || ""), r.scopes, false, r.createdAt);
  }

  const clientIds = Array.from(byClient.keys());
  if (clientIds.length === 0) return [];

  const clients = await oauthClients
    .find({ clientId: { $in: clientIds } })
    .toArray();
  const clientMap = new Map(clients.map((c) => [String(c.clientId), c]));

  return clientIds
    .map((cid) => {
      const meta = clientMap.get(cid);
      const info = byClient.get(cid)!;
      const defaultScopes = Array.isArray(meta?.scopes)
        ? meta.scopes.map(String)
        : [];
      const scopes =
        info.scopes.size > 0 ? Array.from(info.scopes) : defaultScopes;

      return {
        clientId: cid,
        clientName: String(meta?.name || cid),
        clientUri: typeof meta?.uri === "string" ? meta.uri : null,
        clientIcon: typeof meta?.icon === "string" ? meta.icon : null,
        scopes,
        connectionType: (meta?.skipConsent && !info.hasConsent
          ? "trusted"
          : "authorized") as "trusted" | "authorized",
        connectedAt: info.connectedAt ? info.connectedAt.toISOString() : null,
      };
    })
    .sort((a, b) => a.clientName.localeCompare(b.clientName));
}

export async function getAuthSession(): Promise<AuthSessionContext | null> {
  await getMongoClient();

  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session?.user) return null;

  const { users, accounts, twoFactors } = await getAuthCollections();
  const userDoc = await users.findOne(
    userDocMatch(session.user.id) as unknown as Filter<Document>
  );

  // Match BOTH session.user.id and userDoc._id (string & ObjectId) so linked social accounts are NEVER missed!
  const allUserIds = [
    session.user.id,
    userDoc?._id ? String(userDoc._id) : null,
    typeof userDoc?.id === "string" ? userDoc.id : null,
  ];

  const [userAccounts, twoFactorDoc, connectedApps] = await Promise.all([
    accounts.find({ userId: userIdFilter(...allUserIds) }).toArray(),
    twoFactors.findOne({ userId: userIdFilter(...allUserIds) }),
    getConnectedAppsForUser(...allUserIds),
  ]);

  const discordAccount = userAccounts.find((a) => a.providerId === "discord");
  const githubAccount = userAccounts.find((a) => a.providerId === "github");

  const discordId = discordAccount?.accountId
    ? String(discordAccount.accountId)
    : typeof userDoc?.discordId === "string" && userDoc.discordId
      ? userDoc.discordId
      : null;

  const githubId = githubAccount?.accountId
    ? String(githubAccount.accountId)
    : typeof userDoc?.githubId === "string" && userDoc.githubId
      ? userDoc.githubId
      : null;

  let discordUsername =
    typeof userDoc?.discordUsername === "string" && userDoc.discordUsername
      ? userDoc.discordUsername
      : null;
  let githubUsername =
    typeof userDoc?.githubUsername === "string" && userDoc.githubUsername
      ? userDoc.githubUsername
      : null;

  const backfill: Record<string, unknown> = {};
  if (discordId && userDoc && userDoc.discordId !== discordId) {
    backfill.discordId = discordId;
  }
  if (githubId && userDoc && userDoc.githubId !== githubId) {
    backfill.githubId = githubId;
  }
  if (
    discordAccount &&
    !discordUsername &&
    typeof discordAccount.accessToken === "string"
  ) {
    const fetched = await fetchSocialUsername(
      "discord",
      discordAccount.accessToken
    );
    if (fetched) {
      discordUsername = fetched;
      backfill.discordUsername = fetched;
    }
  }
  if (
    githubAccount &&
    !githubUsername &&
    typeof githubAccount.accessToken === "string"
  ) {
    const fetched = await fetchSocialUsername(
      "github",
      githubAccount.accessToken
    );
    if (fetched) {
      githubUsername = fetched;
      backfill.githubUsername = fetched;
    }
  }
  if (userDoc && !Array.isArray(userDoc.roles)) {
    backfill.roles = ["member"];
  }

  if (userDoc && Object.keys(backfill).length > 0) {
    await users
      .updateOne({ _id: userDoc._id }, { $set: backfill })
      .catch(() => {});
  }

  const hasPassword = userAccounts.some(
    (a) => a.providerId === "credential" && Boolean(a.password)
  );
  const linkedProviders = Array.from(
    new Set(userAccounts.map((a) => String(a.providerId)))
  );
  const linkedAccounts: LinkedAccountSummary[] = userAccounts
    .filter((a) => a.providerId !== "credential")
    .map((a) => {
      const pid = String(a.providerId);
      return {
        id: String(a.id || a._id),
        providerId: pid,
        accountId: String(a.accountId || ""),
        username:
          pid === "discord"
            ? discordUsername
            : pid === "github"
              ? githubUsername
              : null,
        createdAt: a.createdAt
          ? new Date(a.createdAt as string | Date).toISOString()
          : null,
      };
    });

  const resolvedEmail = String(userDoc?.email || session.user.email || "");
  const emailVerified = Boolean(
    userDoc?.emailVerified ?? session.user.emailVerified
  );
  const twoFactorEnabled = Boolean(
    userDoc?.twoFactorEnabled ??
      (session.user as unknown as Record<string, unknown>).twoFactorEnabled ??
      (twoFactorDoc && twoFactorDoc.verified !== false)
  );

  const roleState = await resolveUserRolesAndPermissions({
    storedRoles: userDoc?.roles,
    discordId,
    email: resolvedEmail,
  });

  const badgeState = await resolveUserBadges({
    storedBadges: userDoc?.badges,
    badgeTiers: userDoc?.badgeTiers,
    pinnedBadges: userDoc?.pinnedBadges,
    twoFactorEnabled,
    emailVerified,
    discordLinked: Boolean(discordId),
    githubLinked: Boolean(githubId),
    isAdmin: roleState.isAdmin,
  });

  const verification = resolveAccountVerification(userDoc?.verification);

  // Compute live Security Score (0–100)
  let securityScore = 15; // base account
  if (hasPassword) securityScore += 15;
  if (emailVerified) securityScore += 15;
  if (discordId || githubId) securityScore += 15;
  if (discordId && githubId) securityScore += 5;
  if (twoFactorEnabled) securityScore += 35;
  securityScore = Math.min(100, securityScore);

  return {
    userId: session.user.id,
    sessionId: session.session.id,
    name: String(userDoc?.name || session.user.name || "User"),
    username: typeof userDoc?.username === "string" ? userDoc.username : null,
    bio: typeof userDoc?.bio === "string" ? userDoc.bio : null,
    isPublicProfile: userDoc?.isPublicProfile !== false,
    showPublicSocials: userDoc?.showPublicSocials !== false,
    showPublicBadges: userDoc?.showPublicBadges !== false,
    verification,
    email: resolvedEmail,
    emailVerified,
    image: (userDoc?.image as string | null) ?? session.user.image ?? null,
    discordId,
    discordUsername,
    githubId,
    githubUsername,
    hasPassword,
    twoFactorEnabled,
    securityScore,
    linkedProviders,
    linkedAccounts,
    connectedAppsCount: connectedApps.length,
    role: roleState.primaryRole,
    roles: roleState.roles,
    roleDetails: roleState.roleDetails,
    permissions: roleState.permissions,
    badges: badgeState.earnedBadges,
    allBadges: badgeState.allBadges,
    isEnvAdmin: roleState.isEnvAdmin,
    isOwner: roleState.isOwner,
    isAdmin: roleState.isAdmin,
    isHead: roleState.isHead,
    createdAt: userDoc?.createdAt
      ? new Date(userDoc.createdAt as string | Date).toISOString()
      : null,
  };
}
