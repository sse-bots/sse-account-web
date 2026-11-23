import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { jwt } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { oauthProvider } from "@better-auth/oauth-provider";
import { mongoClient, getDbSync, userDocMatch } from "./mongodb";
import { SITE_SETTINGS } from "./site-settings";

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

const ownerDiscordId = (
  process.env.OWNER_DISCORD_ID ||
  process.env.HUB_OWNER_ID ||
  ""
).trim();

const adminEmailSet = new Set(
  (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

export function resolveSseRole(
  discordId: string | null | undefined,
  email: string | null | undefined
): "owner" | "admin" | "user" {
  if (ownerDiscordId && discordId && discordId === ownerDiscordId) {
    return "owner";
  }
  if (email && adminEmailSet.has(email.trim().toLowerCase())) {
    return "admin";
  }
  return "user";
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
    expiresIn: 60 * 60 * 24 * 30, // 30 days persistent session
    updateAge: 60 * 60 * 24, // refresh expiry every 24h
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
      username: {
        type: "string",
        required: false,
        input: true,
      },
      bio: {
        type: "string",
        required: false,
        input: true,
      },
      discordId: {
        type: "string",
        required: false,
        input: false,
      },
      discordUsername: {
        type: "string",
        required: false,
        input: false,
      },
      githubId: {
        type: "string",
        required: false,
        input: false,
      },
      githubUsername: {
        type: "string",
        required: false,
        input: false,
      },
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
          } else if (account.providerId === "github") {
            await users
              .updateOne(filter as never, {
                $set: {
                  githubId: String(account.accountId),
                  updatedAt: new Date(),
                },
              })
              .catch(() => {});
          }
        },
      },
    },
  },
  plugins: [
    jwt({
      disableSettingJwtHeader: true,
    }),
    oauthProvider({
      loginPage: "/sign-in",
      consentPage: "/oauth/consent",
      scopes: SITE_SETTINGS.oauth.defaultScopes,
      allowPublicClientPrelogin: true,
      customUserInfoClaims: async ({ user }) => {
        const u = user as unknown as Record<string, unknown>;
        const discordId =
          typeof u.discordId === "string" ? u.discordId : null;
        const discordUsername =
          typeof u.discordUsername === "string" ? u.discordUsername : null;
        const githubId = typeof u.githubId === "string" ? u.githubId : null;
        const githubUsername =
          typeof u.githubUsername === "string" ? u.githubUsername : null;
        const username =
          typeof u.username === "string" ? u.username : null;
        const sseRole = resolveSseRole(discordId, user.email);
        return {
          username,
          discord_id: discordId,
          discord_username: discordUsername,
          github_id: githubId,
          github_username: githubUsername,
          sse_role: sseRole,
        };
      },
      customIdTokenClaims: async ({ user }) => {
        const u = user as unknown as Record<string, unknown>;
        const discordId =
          typeof u.discordId === "string" ? u.discordId : null;
        const githubId = typeof u.githubId === "string" ? u.githubId : null;
        const username =
          typeof u.username === "string" ? u.username : null;
        const sseRole = resolveSseRole(discordId, user.email);
        return {
          username,
          discord_id: discordId,
          github_id: githubId,
          sse_role: sseRole,
        };
      },
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
