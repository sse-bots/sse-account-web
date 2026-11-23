import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { jwt } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { oauthProvider } from "@better-auth/oauth-provider";
import { mongoClient, getDbSync } from "./mongodb";
import { SITE_SETTINGS } from "./site-settings";

function normalizeOrigin(url?: string | null): string | null {
  const cleaned = (url || "").trim().replace(/\/+$/, "");
  return cleaned || null;
}

const appUrl =
  normalizeOrigin(process.env.BETTER_AUTH_URL) ||
  normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL) ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : null) ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
  "http://localhost:3000";

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
      process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : null,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
      ...extraTrustedOrigins,
      ...(process.env.NODE_ENV !== "production"
        ? ["http://localhost:3000"]
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

export const auth = betterAuth({
  appName: SITE_SETTINGS.siteName,
  baseURL: appUrl,
  trustedOrigins,
  secret: process.env.BETTER_AUTH_SECRET || "build-placeholder-secret-change-me",
  disabledPaths: ["/token"],
  database: mongodbAdapter(getDbSync(), {
    client: mongoClient,
  }),
  emailAndPassword: {
    enabled: SITE_SETTINGS.features.enableEmailPassword,
    requireEmailVerification: SITE_SETTINGS.features.requireEmailVerification,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  user: {
    changeEmail: {
      enabled: true,
    },
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
    },
  },
  socialProviders: SITE_SETTINGS.features.enableDiscordOAuth
    ? {
        discord: {
          clientId: process.env.DISCORD_CLIENT_ID || "",
          clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
          scope: ["identify", "email", "guilds"],
          mapProfileToUser: (profile) => {
            const avatarUrl = profile.avatar
              ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=256`
              : undefined;
            return {
              name:
                profile.global_name || profile.username || `User ${profile.id}`,
              email:
                profile.email || `${profile.id}@discord.sse-world.local`,
              image: avatarUrl,
              discordId: String(profile.id),
              discordUsername: profile.username || String(profile.id),
            };
          },
        },
      }
    : {},
  account: {
    updateAccountOnSignIn: true,
    accountLinking: {
      enabled: true,
      trustedProviders: ["discord"],
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
        const username =
          typeof u.username === "string" ? u.username : null;
        const sseRole = resolveSseRole(discordId, user.email);
        return {
          username,
          discord_id: discordId,
          discord_username: discordUsername,
          sse_role: sseRole,
        };
      },
      customIdTokenClaims: async ({ user }) => {
        const u = user as unknown as Record<string, unknown>;
        const discordId =
          typeof u.discordId === "string" ? u.discordId : null;
        const username =
          typeof u.username === "string" ? u.username : null;
        const sseRole = resolveSseRole(discordId, user.email);
        return {
          username,
          discord_id: discordId,
          sse_role: sseRole,
        };
      },
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
