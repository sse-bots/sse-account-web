import { headers } from "next/headers";
import type { Document, Filter } from "mongodb";
import { auth, resolveSseRole } from "./auth";
import {
  getAuthCollections,
  getMongoClient,
  userDocMatch,
  userIdFilter,
} from "./mongodb";

export interface LinkedAccountSummary {
  id: string;
  providerId: string;
  accountId: string;
  createdAt: string | null;
}

export interface AuthSessionContext {
  userId: string;
  sessionId: string;
  name: string;
  username: string | null;
  bio: string | null;
  email: string;
  emailVerified: boolean;
  image: string | null;
  discordId: string | null;
  discordUsername: string | null;
  githubId: string | null;
  githubUsername: string | null;
  hasPassword: boolean;
  linkedProviders: string[];
  linkedAccounts: LinkedAccountSummary[];
  role: "owner" | "admin" | "user";
  isOwner: boolean;
  isAdmin: boolean;
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

export async function getAuthSession(): Promise<AuthSessionContext | null> {
  await getMongoClient();

  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session?.user) return null;

  const { users, accounts } = await getAuthCollections();
  const [userDoc, userAccounts] = await Promise.all([
    users.findOne(userDocMatch(session.user.id) as unknown as Filter<Document>),
    accounts.find({ userId: userIdFilter(session.user.id) }).toArray(),
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

  // Backfill linked IDs & usernames once after account linking (without touching user's display name or email)
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
    .map((a) => ({
      id: String(a.id || a._id),
      providerId: String(a.providerId),
      accountId: String(a.accountId || ""),
      createdAt: a.createdAt
        ? new Date(a.createdAt as string | Date).toISOString()
        : null,
    }));

  const resolvedEmail = String(userDoc?.email || session.user.email || "");
  const role = resolveSseRole(discordId, resolvedEmail);

  return {
    userId: session.user.id,
    sessionId: session.session.id,
    name: String(userDoc?.name || session.user.name || "User"),
    username:
      typeof userDoc?.username === "string" ? userDoc.username : null,
    bio: typeof userDoc?.bio === "string" ? userDoc.bio : null,
    email: resolvedEmail,
    emailVerified: Boolean(userDoc?.emailVerified ?? session.user.emailVerified),
    image: (userDoc?.image as string | null) ?? session.user.image ?? null,
    discordId,
    discordUsername,
    githubId,
    githubUsername,
    hasPassword,
    linkedProviders,
    linkedAccounts,
    role,
    isOwner: role === "owner",
    isAdmin: role === "owner" || role === "admin",
    createdAt: userDoc?.createdAt
      ? new Date(userDoc.createdAt as string | Date).toISOString()
      : null,
  };
}
