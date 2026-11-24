import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/session";
import { getAuthCollections } from "@/lib/mongodb";
import { hasPermission } from "@/lib/roles";
import {
  BADGE_ICON_OPTIONS,
  ensureDefaultBadges,
  listAllBadges,
  normalizeBadgeSlug,
} from "@/lib/badges";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const optionalImageUrlSchema = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || /^https?:\/\/.+/i.test(v),
    "Artwork URL must start with http:// or https://"
  )
  .optional()
  .nullable();

const createBadgeSchema = z.object({
  name: z.string().trim().min(2).max(40),
  slug: z.string().trim().min(2).max(40).optional(),
  description: z.string().trim().max(180).optional().default(""),
  howToEarn: z.string().trim().max(200).optional().default(""),
  icon: z.string().trim().min(1).max(32).optional().default("award"),
  imageUrl: optionalImageUrlSchema,
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .default("#6366f1"),
  rarity: z
    .enum(["common", "rare", "epic", "legendary", "staff"])
    .optional()
    .default("rare"),
  category: z.enum(["achievement", "highlight"]).optional().default("achievement"),
  isLegacy: z.boolean().optional().default(false),
});

const patchBadgeSchema = z.object({
  slug: z.string().trim().min(1),
  name: z.string().trim().min(2).max(40).optional(),
  description: z.string().trim().max(180).optional(),
  howToEarn: z.string().trim().max(200).optional(),
  icon: z.string().trim().min(1).max(32).optional(),
  imageUrl: optionalImageUrlSchema,
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  rarity: z.enum(["common", "rare", "epic", "legendary", "staff"]).optional(),
  category: z.enum(["achievement", "highlight"]).optional(),
  isLegacy: z.boolean().optional(),
});

export async function GET() {
  const ctx = await getAuthSession();
  if (!ctx || !hasPermission(ctx, "roles:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allBadges = await listAllBadges();
  return NextResponse.json({
    badges: allBadges,
    iconOptions: BADGE_ICON_OPTIONS,
  });
}

export async function POST(req: Request) {
  const ctx = await getAuthSession();
  if (!ctx || !hasPermission(ctx, "roles:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createBadgeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid badge data." },
      { status: 400 }
    );
  }

  await ensureDefaultBadges();
  const { badges } = await getAuthCollections();
  const slug = normalizeBadgeSlug(parsed.data.slug || parsed.data.name);
  if (slug.length < 2) {
    return NextResponse.json({ error: "Badge slug too short." }, { status: 400 });
  }

  const exists = await badges.findOne({ slug });
  if (exists) {
    return NextResponse.json(
      { error: `Badge "${slug}" already exists.` },
      { status: 409 }
    );
  }

  const now = new Date();
  await badges.insertOne({
    slug,
    name: parsed.data.name,
    description: parsed.data.description,
    howToEarn: parsed.data.howToEarn || "Awarded by SSE Admins.",
    icon: parsed.data.icon,
    imageUrl: parsed.data.imageUrl ? parsed.data.imageUrl : null,
    color: parsed.data.color,
    rarity: parsed.data.rarity,
    category: parsed.data.category,
    isAuto: false,
    isSystem: false,
    isLegacy: Boolean(parsed.data.isLegacy),
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ ok: true, slug }, { status: 201 });
}

export async function PATCH(req: Request) {
  const ctx = await getAuthSession();
  if (!ctx || !hasPermission(ctx, "roles:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchBadgeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid badge update." },
      { status: 400 }
    );
  }

  const { badges } = await getAuthCollections();
  const slug = normalizeBadgeSlug(parsed.data.slug);
  const existing = await badges.findOne({ slug });
  if (!existing) {
    return NextResponse.json({ error: "Badge not found." }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.description !== undefined)
    updates.description = parsed.data.description;
  if (parsed.data.howToEarn !== undefined)
    updates.howToEarn = parsed.data.howToEarn;
  if (parsed.data.icon !== undefined) updates.icon = parsed.data.icon;
  if (parsed.data.imageUrl !== undefined)
    updates.imageUrl = parsed.data.imageUrl ? parsed.data.imageUrl : null;
  if (parsed.data.color !== undefined) updates.color = parsed.data.color;
  if (parsed.data.rarity !== undefined) updates.rarity = parsed.data.rarity;
  if (parsed.data.category !== undefined) updates.category = parsed.data.category;
  if (parsed.data.isLegacy !== undefined) updates.isLegacy = parsed.data.isLegacy;

  await badges.updateOne({ slug }, { $set: updates });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const ctx = await getAuthSession();
  if (!ctx || !hasPermission(ctx, "roles:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const slug = normalizeBadgeSlug(searchParams.get("slug") || "");
  if (!slug) {
    return NextResponse.json({ error: "slug is required." }, { status: 400 });
  }

  const { badges, users } = await getAuthCollections();
  const existing = await badges.findOne({ slug });
  if (!existing) {
    return NextResponse.json({ error: "Badge not found." }, { status: 404 });
  }
  if (existing.isSystem) {
    return NextResponse.json(
      { error: "Built-in achievement badges cannot be deleted." },
      { status: 400 }
    );
  }

  await badges.deleteOne({ slug });
  await users.updateMany({}, { $pull: { badges: slug, pinnedBadges: slug } as never });
  return NextResponse.json({ ok: true });
}
