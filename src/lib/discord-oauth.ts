import { getAuthCollections, userIdFilter } from "./mongodb";

const DISCORD_API = "https://discord.com/api/v10";

export interface DiscordUserGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

export async function getValidDiscordAccessToken(
  userId: string
): Promise<string | null> {
  const { accounts } = await getAuthCollections();
  const account = await accounts.findOne({
    userId: userIdFilter(userId),
    providerId: "discord",
  });
  if (!account) return null;

  const accessToken = account.accessToken as string | undefined;
  const refreshToken = account.refreshToken as string | undefined;
  const expiresAt = account.accessTokenExpiresAt
    ? new Date(account.accessTokenExpiresAt as string | Date).getTime()
    : 0;

  if (accessToken && (!expiresAt || expiresAt - Date.now() > 60_000)) {
    return accessToken;
  }

  if (
    !refreshToken ||
    !process.env.DISCORD_CLIENT_ID ||
    !process.env.DISCORD_CLIENT_SECRET
  ) {
    return accessToken || null;
  }

  try {
    const body = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
    const res = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      cache: "no-store",
    });
    if (!res.ok) return accessToken || null;

    const refreshed = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    await accounts.updateOne(
      { _id: account._id },
      {
        $set: {
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token || refreshToken,
          accessTokenExpiresAt: new Date(
            Date.now() + (refreshed.expires_in || 3600) * 1000
          ),
          updatedAt: new Date(),
        },
      }
    );
    return refreshed.access_token;
  } catch {
    return accessToken || null;
  }
}

export async function fetchDiscordGuildsForUser(
  userId: string
): Promise<DiscordUserGuild[]> {
  const token = await getValidDiscordAccessToken(userId);
  if (!token) return [];
  try {
    const res = await fetch(`${DISCORD_API}/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? (data as DiscordUserGuild[]) : [];
  } catch {
    return [];
  }
}
