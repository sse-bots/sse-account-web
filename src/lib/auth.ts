import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { emailOTP, jwt, twoFactor } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { oauthProvider } from "@better-auth/oauth-provider";
import type { Document, Filter } from "mongodb";
import {
  mongoClient,
  getDbSync,
  userDocMatch,
  getAuthCollections,
  logSecurityEvent,
} from "./mongodb";
import { SITE_SETTINGS } from "./site-settings";
import { isEnvAdminMatch, resolveUserRolesAndPermissions } from "./roles";
import { resolveUserBadges } from "./badges";
import { sendOtpEmail } from "./mailer";

function normalizeOrigin(url?: string | null): string | null {
  const cleaned = (url || "").trim().replace(/\/+$/, "");
  if (!cleaned) return null;
  if (!/^https?:\/\//i.test(cleaned)) {
    return `https://${cleaned}`;
  }
  return cleaned;
}

const appUrl =
  normalizeOrigin(process.env.BETTER_AUTH_URL) ||
  normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL) ||
  normalizeOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
  normalizeOrigin(process.env.VERCEL_URL) ||
  "http://localhost:3000";

const isHttps = appUrl.startsWith("https://");

const extraTrustedOrigins = (process.env.TRUSTED_ORIGINS || "")
  .split(",")
  .map((o) => normalizeOrigin(o))
  .filter((o): o is string => Boolean(o));

const trustedOrigins = Array.from(
  new Set(
    [
      appUrl,
      normalizeOrigin(process.env.BETTER_AUTH_URL),
      normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL),
      normalizeOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL),
      normalizeOrigin(process.env.VERCEL_URL),
      ...extraTrustedOrigins,
      ...(process.env.NODE_ENV !== "production"
        ? ["http://localhost:3000", "http://127.0.0.1:3000"]
        : []),
    ].filter((o): o is string => Boolean(o))
  )
);

export function resolveSseRole(
  discordId: string | null | undefined,
  email: string | null | undefined
): "admin" | "member" {
  return isEnvAdminMatch(discordId, email) ? "admin" : "member";
}

export function getConfiguredSocialProviders() {
  return {
    discord:
      SITE_SETTINGS.features.enableDiscordOAuth &&
      Boolean((process.env.DISCORD_CLIENT_ID || "").trim()) &&
      Boolean((process.env.DISCORD_CLIENT_SECRET || "").trim()),
    github:
      SITE_SETTINGS.features.enableGitHubOAuth &&
      Boolean((process.env.GITHUB_CLIENT_ID || "").trim()) &&
      Boolean((process.env.GITHUB_CLIENT_SECRET || "").trim()),
  };
}

async function resolveOidcClaims(user: Record<string, unknown>) {
  const userId = String(user.id || "");
  let discordId = typeof user.discordId === "string" ? user.discordId : null;
  let discordUsername =
    typeof user.discordUsername === "string" ? user.discordUsername : null;
  let githubId = typeof user.githubId === "string" ? user.githubId : null;
  let githubUsername =
    typeof user.githubUsername === "string" ? user.githubUsername : null;
  let username = typeof user.username === "string" ? user.username : null;
  let email = typeof user.email === "string" ? user.email : null;
  let emailVerified = Boolean(user.emailVerified);
  let twoFactorEnabled = Boolean(user.twoFactorEnabled);
  let storedRoles: unknown = user.roles;
  let storedBadges: unknown = user.badges;
  let pinnedBadges: unknown = user.pinnedBadges;

  if (userId) {
    try {
      const { users } = await getAuthCollections();
      const freshDoc = await users.findOne(
        userDocMatch(userId) as unknown as Filter<Document>
      );
      if (freshDoc) {
        if (typeof freshDoc.discordId === "string") discordId = freshDoc.discordId;
        if (typeof freshDoc.discordUsername === "string")
          discordUsername = freshDoc.discordUsername;
        if (typeof freshDoc.githubId === "string") githubId = freshDoc.githubId;
        if (typeof freshDoc.githubUsername === "string")
          githubUsername = freshDoc.githubUsername;
        if (typeof freshDoc.username === "string") username = freshDoc.username;
        if (typeof freshDoc.email === "string") email = freshDoc.email;
        emailVerified = Boolean(freshDoc.emailVerified);
        twoFactorEnabled = Boolean(freshDoc.twoFactorEnabled);
        storedRoles = freshDoc.roles;
        storedBadges = freshDoc.badges;
        pinnedBadges = freshDoc.pinnedBadges;
      }
    } catch {
      // fall back to session fields
    }
  }

  const roleState = await resolveUserRolesAndPermissions({
    storedRoles,
    discordId,
    email,
  });

  const badgeState = await resolveUserBadges({
    storedBadges,
    pinnedBadges,
    twoFactorEnabled,
    emailVerified,
    discordLinked: Boolean(discordId),
    githubLinked: Boolean(githubId),
    isAdmin: roleState.isAdmin,
  });

  return {
    username,
    discord_id: discordId,
    discord_username: discordUsername,
    github_id: githubId,
    github_username: githubUsername,
    sse_role: roleState.primaryRole,
    sse_roles: roleState.roles,
    sse_permissions: roleState.permissions,
    sse_badges: badgeState.badgeSlugs,
    two_factor_enabled: twoFactorEnabled,
  };
}

const socialProviders: Record<string, unknown> = {};

if (SITE_SETTINGS.features.enableDiscordOAuth) {
  socialProviders.discord = {
    clientId: (process.env.DISCORD_CLIENT_ID || "").trim(),
    clientSecret: (process.env.DISCORD_CLIENT_SECRET || "").trim(),
    scope: ["identify", "email", "guilds"],
    mapProfileToUser: (profile: {
      id: string;
      username?: string;
      global_name?: string | null;
      email?: string | null;
      avatar?: string | null;
    }) => {
      const avatarUrl = profile.avatar
        ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=256`
        : undefined;
      return {
        name: profile.global_name || profile.username || `User ${profile.id}`,
        email: profile.email || `${profile.id}@discord.sse-world.local`,
        image: avatarUrl,
        discordId: String(profile.id),
        discordUsername: profile.username || String(profile.id),
      };
    },
  };
}

if (SITE_SETTINGS.features.enableGitHubOAuth) {
  socialProviders.github = {
    clientId: (process.env.GITHUB_CLIENT_ID || "").trim(),
    clientSecret: (process.env.GITHUB_CLIENT_SECRET || "").trim(),
    scope: ["read:user", "user:email"],
    mapProfileToUser: (profile: {
      id: number | string;
      login?: string;
      name?: string | null;
      email?: string | null;
      avatar_url?: string | null;
    }) => {
      return {
        name: profile.name || profile.login || `GitHub User ${profile.id}`,
        email: profile.email || `${profile.id}@github.sse-world.local`,
        image: profile.avatar_url || undefined,
        githubId: String(profile.id),
        githubUsername: profile.login || String(profile.id),
      };
    },
  };
}

export const auth = betterAuth({
  appName: SITE_SETTINGS.siteName,
  baseURL: appUrl,
  trustedOrigins,
  secret:
    (process.env.BETTER_AUTH_SECRET || "").trim() ||
    "build-placeholder-secret-change-me",
  disabledPaths: ["/token"],
  database: mongodbAdapter(getDbSync(), {
    client: mongoClient,
  }),
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: false,
    },
  },
  advanced: {
    useSecureCookies: isHttps,
    defaultCookieAttributes: {
      sameSite: "lax",
      httpOnly: true,
      secure: isHttps,
      path: "/",
    },
  },
  emailAndPassword: {
    enabled: SITE_SETTINGS.features.enableEmailPassword,
    requireEmailVerification: SITE_SETTINGS.features.requireEmailVerification,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  user: {
    additionalFields: {
      username: { type: "string", required: false, input: true },
      bio: { type: "string", required: false, input: true },
      discordId: { type: "string", required: false, input: false },
      discordUsername: { type: "string", required: false, input: false },
      githubId: { type: "string", required: false, input: false },
      githubUsername: { type: "string", required: false, input: false },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socialProviders: socialProviders as any,
  account: {
    updateAccountOnSignIn: true,
    accountLinking: {
      enabled: true,
      trustedProviders: ["discord", "github"],
      allowDifferentEmails: true,
      updateUserInfoOnLink: false,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          if (!user?.id) return;
          const db = getDbSync();
          const users = db.collection("user");
          await users
            .updateOne(userDocMatch(String(user.id)) as never, {
              $setOnInsert: { roles: ["member"], badges: [], pinnedBadges: [] },
            })
            .catch(() => {});
          await logSecurityEvent({
            userId: String(user.id),
            action: "account_created",
            title: "SSE Account Created",
            detail: `Registered with ${user.email}`,
            status: "success",
          });
        },
      },
    },
    account: {
      create: {
        after: async (account) => {
          if (!account?.userId || !account?.accountId) return;
          const db = getDbSync();
          const users = db.collection("user");
          const filter = userDocMatch(String(account.userId));
          if (account.providerId === "discord") {
            await users
              .updateOne(filter as never, {
                $set: {
                  discordId: String(account.accountId),
                  updatedAt: new Date(),
                },
              })
              .catch(() => {});
            await logSecurityEvent({
              userId: String(account.userId),
              action: "social_linked",
              title: "Discord Account Linked",
              detail: `Connected Discord ID ${account.accountId}`,
              status: "success",
            });
          } else if (account.providerId === "github") {
            await users
              .updateOne(filter as never, {
                $set: {
                  githubId: String(account.accountId),
                  updatedAt: new Date(),
                },
              })
              .catch(() => {});
            await logSecurityEvent({
              userId: String(account.userId),
              action: "social_linked",
              title: "GitHub Account Linked",
              detail: `Connected GitHub ID ${account.accountId}`,
              status: "success",
            });
          }
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
          if (!session?.userId) return;
          await logSecurityEvent({
            userId: String(session.userId),
            action: "sign_in",
            title: "New Sign-In Session",
            detail: `${session.ipAddress || "Unknown IP"} · ${(session.userAgent || "Browser").slice(0, 60)}`,
            status: "info",
          });
        },
      },
    },
  },
  plugins: [
    jwt({
      disableSettingJwtHeader: true,
    }),
    twoFactor({
      issuer: SITE_SETTINGS.siteName,
      totpOptions: {
        digits: 6,
        period: 30,
      },
      otpOptions: {
        period: 5,
        async sendOTP({ user, otp }) {
          await sendOtpEmail({
            to: user.email,
            otp,
            purpose: "2fa",
          });
        },
      },
      backupCodeOptions: {
        amount: 10,
        length: 10,
      },
    }),
    emailOTP({
      overrideDefaultEmailVerification: true,
      otpLength: 6,
      expiresIn: 300,
      async sendVerificationOTP({ email, otp, type }) {
        const purpose =
          type === "sign-in"
            ? "sign-in"
            : type === "email-verification"
              ? "email-verification"
              : "forget-password";
        await sendOtpEmail({
          to: email,
          otp,
          purpose,
        });
      },
    }),
    oauthProvider({
      loginPage: "/sign-in",
      consentPage: "/oauth/consent",
      scopes: SITE_SETTINGS.oauth.defaultScopes,
      allowPublicClientPrelogin: true,
      customUserInfoClaims: async ({ user }) => {
        return resolveOidcClaims(user as unknown as Record<string, unknown>);
      },
      customIdTokenClaims: async ({ user }) => {
        const claims = await resolveOidcClaims(
          user as unknown as Record<string, unknown>
        );
        return {
          username: claims.username,
          discord_id: claims.discord_id,
          github_id: claims.github_id,
          sse_role: claims.sse_role,
          sse_roles: claims.sse_roles,
          sse_permissions: claims.sse_permissions,
          sse_badges: claims.sse_badges,
          two_factor_enabled: claims.two_factor_enabled,
        };
      },
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
