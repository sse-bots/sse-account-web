import type { ColorMode } from "./theme-config";

/**
 * ============================================================================
 * CENTRAL SITE SETTINGS (Edit here to rename or reconfigure the entire site)
 * ============================================================================
 * Changing `siteName`, `brandPrefix`, `shortName`, `tagline`, URLs, scopes,
 * or defaults below automatically updates:
 *   - Browser <title> & SEO metadata
 *   - Top header, PC sidebar, and animated mobile bottom dock
 *   - Better Auth appName, Sign-In, Sign-Up, and OAuth Consent pages
 *   - Privacy Policy & Terms of Service pages
 *   - OAuth `.env` copy snippets & scope labels
 */
export const SITE_SETTINGS = {
  /** Full display name shown in headers, browser tab, and OAuth screens */
  siteName: "SSE Accounts",

  /** Short badge text inside the square brand icon (2–4 chars) */
  shortName: "SSE",

  /** Ecosystem prefix used in phrases like "Sign in with SSE" and "SSE Profile" */
  brandPrefix: "SSE",

  /** Organization / developer team name shown on legal & footer sections */
  organizationName: "SSE World",

  /** Short subtitle shown under the site name */
  tagline: "Central Profile & Single Sign-On",

  /** Main hero & SEO description */
  description:
    "Create one unified SSE profile to manage your email, password, Discord link, and sign in securely across SSE Nexus, SSE Tournaments, and every official SSE website.",

  /** Support contact email displayed on Privacy & Terms pages */
  supportEmail: "support@sse-world.local",

  /** Last updated date shown on /privacy and /terms */
  legalLastUpdated: "November 23, 2026",

  /** External ecosystem URLs (override via NEXT_PUBLIC_* env vars or edit directly) */
  links: {
    supportServerInvite:
      process.env.NEXT_PUBLIC_SUPPORT_SERVER_INVITE || "",
    nexusAppUrl:
      process.env.NEXT_PUBLIC_NEXUS_URL || "https://sse-nexus.vercel.app",
    tournamentAppUrl:
      process.env.NEXT_PUBLIC_TOURNAMENT_URL || "",
    githubOrgUrl: "https://github.com/sse-bots",
  },

  /** Feature toggles — flip true/false anytime */
  features: {
    enableEmailPassword: true,
    enablePublicSignUp: true,
    enableDiscordOAuth: true,
    /** Set true only after wiring an SMTP/Resend email sender in src/lib/auth.ts */
    requireEmailVerification: false,
    /** API timeout (ms) before GlobalNetworkMonitor redirects to /service-unavailable */
    networkTimeoutMs: 18_000,
  },

  /** Default Nuxt UI Theme Customizer values for first-time visitors */
  defaultTheme: {
    preset: "default",
    primary: "green",
    neutral: "slate",
    font: "public-sans",
    radius: "0.5rem",
    mode: "dark" as ColorMode,
  },

  /** OAuth 2.1 / OIDC Provider configuration */
  oauth: {
    /** Prefix used in the copyable `.env` snippet on /admin/oauth-clients */
    envPrefix: "SSE",
    /** Default scopes offered when registering a new external SSE app */
    defaultScopes: [
      "openid",
      "profile",
      "email",
      "offline_access",
      "sse:servers",
      "sse:activations",
    ] as string[],
    /** Human-readable descriptions shown on /oauth/consent */
    scopeLabels: {
      openid: "Verify your central SSE identity",
      profile: "Read your display name, username, avatar, and linked Discord ID",
      email: "Read your primary email address",
      offline_access: "Keep you signed in across sessions (refresh tokens)",
      "sse:servers": "Read your Discord servers via linked Discord account",
      "sse:activations": "View your SSE bot activation status",
    } as Record<string, string>,
  },

  /** Official SSE ecosystem apps shown on the landing page */
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
