import type { ColorMode } from "./theme-config";

export const SITE_SETTINGS = {
  siteName: "SSE Accounts",
  shortName: "SSE",
  brandPrefix: "SSE",
  organizationName: "SSE World",
  tagline: "Central Identity & 2-Step Vault",
  description:
    "Create one unified SSE profile with Two-Step Verification (TOTP & Email OTP), GitHub/Discord-style badges, linked social accounts, and single sign-on across every SSE website.",
  supportEmail: "support@sse-world.local",
  legalLastUpdated: "November 23, 2026",

  links: {
    supportServerInvite: process.env.NEXT_PUBLIC_SUPPORT_SERVER_INVITE || "",
    nexusAppUrl:
      process.env.NEXT_PUBLIC_NEXUS_URL || "https://sse-nexus.vercel.app",
    tournamentAppUrl: process.env.NEXT_PUBLIC_TOURNAMENT_URL || "",
    githubOrgUrl: "https://github.com/sse-bots",
  },

  features: {
    enableEmailPassword: true,
    enablePublicSignUp: true,
    enableDiscordOAuth: true,
    enableGitHubOAuth: true,
    enableTwoFactor: true,
    enableEmailOtpSignIn: true,
    enableBadges: true,
    requireEmailVerification: false,
    networkTimeoutMs: 18_000,
  },

  defaultTheme: {
    preset: "default",
    primary: "green",
    neutral: "slate",
    font: "public-sans",
    radius: "0.5rem",
    mode: "dark" as ColorMode,
  },

  oauth: {
    envPrefix: "SSE",
    defaultScopes: [
      "openid",
      "profile",
      "email",
      "offline_access",
      "sse:servers",
      "sse:activations",
      "sse:roles",
    ] as string[],
    scopeLabels: {
      openid: "Verify your central SSE identity",
      profile:
        "Read your display name, username, avatar, badges, and linked Discord / GitHub IDs",
      email: "Read your primary email address",
      offline_access: "Keep you signed in across sessions (refresh tokens)",
      "sse:servers": "Read your Discord servers via linked Discord account",
      "sse:activations": "View your SSE bot activation status",
      "sse:roles": "Read your assigned SSE roles and permissions",
    } as Record<string, string>,
  },

  ecosystemApps: [
    {
      name: "SSE Nexus",
      description:
        "Manage Discord server bot activations, Single/Bundle/Global keys, and live status.",
      href: process.env.NEXT_PUBLIC_NEXUS_URL || "https://sse-nexus.vercel.app",
      badge: "Bot Hub",
    },
    {
      name: "SSE Tournament Web",
      description:
        "Host Mech Arena, Free Fire, and Minecraft tournaments with brackets and live leaderboards.",
      href: process.env.NEXT_PUBLIC_TOURNAMENT_URL || "",
      badge: "Tournaments",
    },
  ],
};

export type SiteSettings = typeof SITE_SETTINGS;
