import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/session";
import { getAuthCollections } from "@/lib/mongodb";
import {
  AVAILABLE_PERMISSIONS,
  ensureDefaultRoles,
  hasPermission,
  listAllRoles,
  normalizeRoleSlug,
} from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createRoleSchema = z.object({
  name: z.string().trim().min(2, "Role name must be at least 2 characters.").max(48),
  slug: z.string().trim().min(2).max(40).optional(),
  description: z.string().trim().max(240).optional().default(""),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a 6-digit hex code.")
    .optional()
    .default("#6366f1"),
  priority: z.number().int().min(1).max(99).optional().default(30),
  permissions: z.array(z.string().trim().min(1).max(64)).optional().default([]),
});

const patchRoleSchema = z.object({
  slug: z.string().trim().min(1),
  name: z.string().trim().min(2).max(48).optional(),
  description: z.string().trim().max(240).optional(),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a 6-digit hex code.")
    .optional(),
  priority: z.number().int().min(1).max(100).optional(),
  permissions: z.array(z.string().trim().min(1).max(64)).optional(),
});

export async function GET() {
  const ctx = await getAuthSession();
  if (!ctx || !hasPermission(ctx, "roles:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [allRoles, { users }] = await Promise.all([
    listAllRoles(),
    getAuthCollections(),
  ]);

  const [totalUsers, roleCounts] = await Promise.all([
    users.countDocuments({}),
    users
      .aggregate([
        { $unwind: { path: "$roles", preserveNullAndEmptyArrays: false } },
        { $group: { _id: "$roles", count: { $sum: 1 } } },
      ])
      .toArray(),
  ]);

  const countMap = new Map(
    roleCounts.map((r) => [String(r._id), Number(r.count)])
  );

  return NextResponse.json({
    roles: allRoles.map((r) => ({
      ...r,
      userCount: r.slug === "member" ? totalUsers : countMap.get(r.slug) || 0,
    })),
    availablePermissions: AVAILABLE_PERMISSIONS,
  });
}

export async function POST(req: Request) {
  const ctx = await getAuthSession();
  if (!ctx || !hasPermission(ctx, "roles:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid role payload." },
      { status: 400 }
    );
  }

  await ensureDefaultRoles();
  const { roles } = await getAuthCollections();

  const slug = normalizeRoleSlug(parsed.data.slug || parsed.data.name);
  if (slug.length < 2) {
    return NextResponse.json(
      { error: "Role slug must contain at least 2 letters or numbers." },
      { status: 400 }
    );
  }

  const existing = await roles.findOne({ slug });
  if (existing) {
    return NextResponse.json(
      { error: `A role with slug "${slug}" already exists.` },
      { status: 409 }
    );
  }

  const cleanPerms = Array.from(
    new Set(
      parsed.data.permissions
        .map((p) => p.trim().toLowerCase())
        .filter((p) => p && p !== "*")
    )
  );

  const now = new Date();
  await roles.insertOne({
    slug,
    name: parsed.data.name,
    description: parsed.data.description || "",
    color: parsed.data.color,
    priority: parsed.data.priority,
    permissions: cleanPerms,
    isSystem: false,
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
  const parsed = patchRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid update payload." },
      { status: 400 }
    );
  }

  await ensureDefaultRoles();
  const { roles } = await getAuthCollections();
  const slug = normalizeRoleSlug(parsed.data.slug);
  const existing = await roles.findOne({ slug });
  if (!existing) {
    return NextResponse.json({ error: "Role not found." }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.description !== undefined)
    updates.description = parsed.data.description;
  if (parsed.data.color !== undefined) updates.color = parsed.data.color;

  const isLockedSuperRole = slug === "admin" || slug === "head";
  if (!isLockedSuperRole) {
    if (!existing.isSystem && parsed.data.priority !== undefined) {
      updates.priority = Math.min(99, Math.max(1, parsed.data.priority));
    }
    if (parsed.data.permissions !== undefined) {
      updates.permissions = Array.from(
        new Set(
          parsed.data.permissions
            .map((p) => p.trim().toLowerCase())
            .filter((p) => p && p !== "*")
        )
      );
    }
  }

  await roles.updateOne({ slug }, { $set: updates });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const ctx = await getAuthSession();
  if (!ctx || !hasPermission(ctx, "roles:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const slug = normalizeRoleSlug(searchParams.get("slug") || "");
  if (!slug) {
    return NextResponse.json({ error: "slug is required." }, { status: 400 });
  }

  const { roles, users } = await getAuthCollections();
  const existing = await roles.findOne({ slug });
  if (!existing) {
    return NextResponse.json({ error: "Role not found." }, { status: 404 });
  }
  if (existing.isSystem || slug === "head" || slug === "admin" || slug === "member") {
    return NextResponse.json(
      { error: "Built-in system roles cannot be deleted." },
      { status: 400 }
    );
  }

  await roles.deleteOne({ slug });
  await users.updateMany({}, { $pull: { roles: slug } as never });

  return NextResponse.json({ ok: true });
}
