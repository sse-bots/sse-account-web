import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/session";
import { getAuthCollections, serializeDoc } from "@/lib/mongodb";
import { resolveSseRole } from "@/lib/auth";

export async function GET(req: Request) {
  const ctx = await getAuthSession();
  if (!ctx || !ctx.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  const { users } = await getAuthCollections();
  const filter = q
    ? {
        $or: [
          { name: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
          { username: { $regex: q, $options: "i" } },
          { discordId: { $regex: q, $options: "i" } },
        ],
      }
    : {};

  const rows = await users
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(60)
    .toArray();

  return NextResponse.json({
    users: rows.map((u) =>
      serializeDoc({
        id: String(u.id || u._id),
        name: u.name || "User",
        username: u.username || null,
        email: u.email || "",
        image: u.image || null,
        discordId: u.discordId || null,
        discordUsername: u.discordUsername || null,
        role: resolveSseRole(
          typeof u.discordId === "string" ? u.discordId : null,
          typeof u.email === "string" ? u.email : null
        ),
        createdAt: u.createdAt || null,
      })
    ),
  });
}
