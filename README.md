# SSE Central Identity & OAuth 2.1 Provider (`sse-accounts-web`)

Standalone Next.js 15 + Better Auth + MongoDB central authentication portal for the entire SSE ecosystem (SSE Nexus, SSE Tournament Web, and future sites).

## Quick Rebranding (`src/lib/site-settings.ts`)
Edit **`src/lib/site-settings.ts`** to rename the site (`siteName`, `shortName`, `brandPrefix`, `organizationName`, `tagline`), toggle features (`enableEmailPassword`, `enablePublicSignUp`, `enableDiscordOAuth`), update URLs, or change the default Nuxt UI theme — changes apply across the entire site automatically.

## Setup on Vercel
1. Copy `.env.example` variables into your Vercel project settings.
2. Point `MONGODB_DB_NAME=sse_accounts` (same MongoDB Atlas cluster, isolated database).
3. Add `https://<your-auth-domain>/api/auth/callback/discord` in the Discord Developer Portal.
4. Deploy, sign in as Owner (`OWNER_DISCORD_ID` or `ADMIN_EMAILS`), open `/admin/oauth-clients`, and register **SSE Nexus**, **SSE Tournament Web**, and any future SSE site.
