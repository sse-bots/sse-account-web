import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getConfiguredSocialProviders } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let dbOk = false;
  let dbError: string | null = null;
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    dbOk = true;
  } catch (err) {
    dbError = err instanceof Error ? err.message : "MongoDB connection failed";
  }

  const providers = getConfiguredSocialProviders();

  return NextResponse.json(
    {
      ok: dbOk,
      database: dbOk ? "connected" : "error",
      dbError,
      config: {
        hasBetterAuthUrl: Boolean(process.env.BETTER_AUTH_URL),
        hasBetterAuthSecret: Boolean(process.env.BETTER_AUTH_SECRET),
        hasMongoUri: Boolean(process.env.MONGODB_URI),
        hasDiscordOAuth: providers.discord,
        hasGitHubOAuth: providers.github,
      },
    },
    { status: dbOk ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
