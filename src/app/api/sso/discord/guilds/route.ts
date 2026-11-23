import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchDiscordGuildsForUser } from "@/lib/discord-oauth";

/**
 * Scoped SSO Bridge Endpoint for SSE Nexus, SSE Tournament Web, and future SSE apps.
 * Client apps call this endpoint with `Authorization: Bearer <sse_oauth_access_token>`
 * so DISCORD_CLIENT_SECRET stays exclusively inside this central auth service.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return NextResponse.json(
      { error: "Missing Bearer OAuth access token." },
      { status: 401 }
    );
  }

  const baseUrl =
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  // Validate the OAuth 2.1 access token via Better Auth's built-in /userinfo handler in-process
  const verifyReq = new Request(`${baseUrl}/api/auth/oauth2/userinfo`, {
    method: "GET",
    headers: { authorization: authHeader },
  });
  const verifyRes = await auth.handler(verifyReq);
  if (!verifyRes.ok) {
    return NextResponse.json(
      { error: "Invalid or expired SSE OAuth access token." },
      { status: 401 }
    );
  }

  const claims = (await verifyRes.json()) as {
    sub?: string;
    discord_id?: string | null;
  };
  if (!claims.sub) {
    return NextResponse.json(
      { error: "Token subject missing." },
      { status: 401 }
    );
  }

  const guilds = await fetchDiscordGuildsForUser(claims.sub);
  return NextResponse.json({
    user_id: claims.sub,
    discord_id: claims.discord_id ?? null,
    guilds,
  });
}
