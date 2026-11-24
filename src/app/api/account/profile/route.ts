import { NextResponse } from "next/server";
import type { Document, Filter } from "mongodb";
import { z } from "zod";
import { getAuthSession } from "@/lib/session";
import { getAuthCollections, userDocMatch, userIdFilter } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters.")
    .max(64),
  username: z
    .string()
    .trim()
    .regex(
      /^[a-zA-Z0-9._-]{3,32}$/,
      "Username must be 3–32 letters, numbers, ., _, or -."
    )
    .optional()
    .or(z.literal("")),
  email: z.string().trim().email("Enter a valid email address."),
  bio: z.string().trim().max(240).optional().or(z.literal("")),
  image: z
    .string()
    .trim()
    .url("Avatar must be a valid URL.")
    .optional()
    .or(z.literal("")),
  isPublicProfile: z.boolean().optional(),
  showPublicSocials: z.boolean().optional(),
  showPublicBadges: z.boolean().optional(),
});

export async function GET() {
  const ctx = await getAuthSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(
    { user: ctx },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function PATCH(req: Request) {
  const ctx = await getAuthSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid profile data." },
      { status: 400 }
    );
  }

  const { name, username, email, bio, image, isPublicProfile, showPublicSocials, showPublicBadges } = parsed.data;
  const cleanEmail = email.toLowerCase();
  const cleanUsername = username ? username.toLowerCase() : null;
  const { users } = await getAuthCollections();

  if (cleanEmail !== ctx.email.toLowerCase()) {
    const taken = await users.findOne({
      email: cleanEmail,
      _id: { $nin: userIdFilter(ctx.userId).$in },
      id: { $ne: ctx.userId },
    } as unknown as Filter<Document>);
    if (taken) {
      return NextResponse.json(
        {
          error:
            "That email address is already registered to another SSE account.",
        },
        { status: 409 }
      );
    }
  }

  if (cleanUsername && cleanUsername !== (ctx.username || "").toLowerCase()) {
    const taken = await users.findOne({
      username: cleanUsername,
      _id: { $nin: userIdFilter(ctx.userId).$in },
      id: { $ne: ctx.userId },
    } as unknown as Filter<Document>);
    if (taken) {
      return NextResponse.json(
        { error: "That username is already taken." },
        { status: 409 }
      );
    }
  }

  await users.updateOne(
    userDocMatch(ctx.userId) as unknown as Filter<Document>,
    {
      $set: {
        name,
        username: cleanUsername,
        email: cleanEmail,
        ...(cleanEmail !== ctx.email.toLowerCase()
          ? { emailVerified: false }
          : {}),
        bio: bio || null,
        image: image || null,
        ...(isPublicProfile !== undefined ? { isPublicProfile } : {}),
        ...(showPublicSocials !== undefined ? { showPublicSocials } : {}),
        ...(showPublicBadges !== undefined ? { showPublicBadges } : {}),
        updatedAt: new Date(),
      },
    }
  );

  return NextResponse.json({ ok: true });
}
