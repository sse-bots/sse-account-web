import { headers } from "next/headers";
import type { Document, Filter } from "mongodb";
import { auth, resolveSseRole } from "./auth";
import {
  getAuthCollections,
  getMongoClient,
  userDocMatch,
  userIdFilter,
} from "./mongodb";

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
  hasPassword: boolean;
  linkedProviders: string[];
  role: "owner" | "admin" | "user";
  isOwner: boolean;
  isAdmin: boolean;
  createdAt: string | null;
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
  const discordId =
    typeof userDoc?.discordId === "string" && userDoc.discordId
      ? userDoc.discordId
      : discordAccount?.accountId
        ? String(discordAccount.accountId)
        : null;

  if (discordId && userDoc && !userDoc.discordId) {
    await users
      .updateOne({ _id: userDoc._id }, { $set: { discordId } })
      .catch(() => {});
  }

  const hasPassword = userAccounts.some(
    (a) => a.providerId === "credential" && Boolean(a.password)
  );
  const linkedProviders = Array.from(
    new Set(userAccounts.map((a) => String(a.providerId)))
  );

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
    discordUsername:
      typeof userDoc?.discordUsername === "string"
        ? userDoc.discordUsername
        : null,
    hasPassword,
    linkedProviders,
    role,
    isOwner: role === "owner",
    isAdmin: role === "owner" || role === "admin",
    createdAt: userDoc?.createdAt
      ? new Date(userDoc.createdAt as string | Date).toISOString()
      : null,
  };
}
