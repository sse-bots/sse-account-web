import { getAuthCollections, serializeDoc } from "./mongodb";

export interface RoleDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  color: string;
  priority: number;
  permissions: string[];
  isSystem: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface RoleBadge {
  slug: string;
  name: string;
  color: string;
  priority: number;
  isSystem: boolean;
}

export interface ResolvedRoleState {
  primaryRole: string;
  roles: string[];
  roleDetails: RoleBadge[];
  permissions: string[];
  isEnvAdmin: boolean;
  isOwner: boolean;
  isAdmin: boolean;
}

export const AVAILABLE_PERMISSIONS: Array<{
  key: string;
  label: string;
  description: string;
  group: "Accounts" | "Ecosystem";
}> = [
  {
    key: "accounts:admin",
    label: "Accounts Admin",
    description: "Access the central SSE Accounts Admin panel.",
    group: "Accounts",
  },
  {
    key: "roles:manage",
    label: "Manage Roles",
    description: "Create, edit, delete custom roles and edit permissions.",
    group: "Accounts",
  },
  {
    key: "users:manage",
    label: "Manage Users",
    description: "Search registered SSE profiles and assign/remove roles.",
    group: "Accounts",
  },
  {
    key: "oauth:manage",
    label: "Manage SSO / OAuth Apps",
    description: "Register and configure connected SSE websites.",
    group: "Accounts",
  },
  {
    key: "nexus:admin",
    label: "SSE Nexus Admin",
    description: "Full admin privileges across SSE Nexus.",
    group: "Ecosystem",
  },
  {
    key: "nexus:staff",
    label: "SSE Nexus Staff / Mod",
    description: "Review and approve/reject bot activation requests in SSE Nexus.",
    group: "Ecosystem",
  },
  {
    key: "tournaments:manage",
    label: "Tournament Manager",
    description: "Create and manage tournaments on SSE Tournament Web.",
    group: "Ecosystem",
  },
  {
    key: "developer:access",
    label: "SSE Developer",
    description: "Developer badge and sandbox/API access across SSE sites.",
    group: "Ecosystem",
  },
  {
    key: "profile:edit",
    label: "Edit Own Profile",
    description: "Update display name, email, avatar, and bio.",
    group: "Accounts",
  },
];

export const SYSTEM_DEFAULT_ROLES: Array<
  Omit<RoleDefinition, "id" | "createdAt" | "updatedAt">
> = [
  {
    slug: "admin",
    name: "Admin",
    description:
      "Full administrative access across SSE Accounts, custom roles, OAuth apps, and connected SSE websites.",
    color: "#f59e0b",
    priority: 100,
    permissions: ["*"],
    isSystem: true,
  },
  {
    slug: "member",
    name: "Member",
    description: "Default role assigned to every registered SSE user.",
    color: "#10b981",
    priority: 10,
    permissions: ["profile:edit"],
    isSystem: true,
  },
];

function parseIdList(...rawValues: Array<string | undefined>): Set<string> {
  const out = new Set<string>();
  for (const raw of rawValues) {
    if (!raw) continue;
    for (const part of raw.split(",")) {
      const cleaned = part.trim();
      if (cleaned) out.add(cleaned);
    }
  }
  return out;
}

export function getEnvRoleConfig() {
  const ownerDiscordIds = parseIdList(
    process.env.OWNER_DISCORD_ID,
    process.env.HUB_OWNER_ID
  );
  const adminDiscordIds = parseIdList(
    process.env.ADMIN_DISCORD_ID,
    process.env.ADMIN_DISCORD_IDS,
    process.env.OWNER_DISCORD_ID,
    process.env.HUB_OWNER_ID
  );
  const adminEmails = new Set(
    (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
  return { ownerDiscordIds, adminDiscordIds, adminEmails };
}

export function isEnvOwnerDiscordId(
  discordId: string | null | undefined
): boolean {
  if (!discordId) return false;
  const { ownerDiscordIds, adminDiscordIds } = getEnvRoleConfig();
  if (ownerDiscordIds.size > 0) {
    return ownerDiscordIds.has(String(discordId).trim());
  }
  // If OWNER_DISCORD_ID isn't set separately, treat ADMIN_DISCORD_ID as owner-level admin too
  return adminDiscordIds.has(String(discordId).trim());
}

export function isEnvAdminMatch(
  discordId: string | null | undefined,
  email: string | null | undefined
): boolean {
  const { adminDiscordIds, adminEmails } = getEnvRoleConfig();
  if (discordId && adminDiscordIds.has(String(discordId).trim())) {
    return true;
  }
  if (email && adminEmails.has(email.trim().toLowerCase())) {
    return true;
  }
  return false;
}

export function normalizeRoleSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

let defaultRolesSeeded = false;

export async function ensureDefaultRoles(): Promise<void> {
  if (defaultRolesSeeded) return;
  const { roles } = await getAuthCollections();
  const now = new Date();
  for (const def of SYSTEM_DEFAULT_ROLES) {
    await roles.updateOne(
      { slug: def.slug },
      {
        $setOnInsert: {
          slug: def.slug,
          name: def.name,
          description: def.description,
          color: def.color,
          priority: def.priority,
          permissions: def.permissions,
          isSystem: true,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true }
    );
  }
  defaultRolesSeeded = true;
}

export async function listAllRoles(): Promise<RoleDefinition[]> {
  await ensureDefaultRoles();
  const { roles } = await getAuthCollections();
  const docs = await roles
    .find({})
    .sort({ priority: -1, name: 1 })
    .toArray();

  return docs.map((d) =>
    serializeDoc({
      id: String(d._id),
      slug: String(d.slug),
      name: String(d.name || d.slug),
      description: String(d.description || ""),
      color: String(d.color || "#6366f1"),
      priority: Number(d.priority ?? 20),
      permissions: Array.isArray(d.permissions)
        ? d.permissions.map(String)
        : [],
      isSystem: Boolean(d.isSystem),
      createdAt: d.createdAt
        ? new Date(d.createdAt as string | Date).toISOString()
        : null,
      updatedAt: d.updatedAt
        ? new Date(d.updatedAt as string | Date).toISOString()
        : null,
    })
  );
}

export async function resolveUserRolesAndPermissions(input: {
  storedRoles?: unknown;
  discordId?: string | null;
  email?: string | null;
}): Promise<ResolvedRoleState> {
  const allRoles = await listAllRoles();
  const roleMap = new Map(allRoles.map((r) => [r.slug, r]));

  const envAdmin = isEnvAdminMatch(input.discordId, input.email);
  const envOwner = isEnvOwnerDiscordId(input.discordId);

  const assigned = new Set<string>();
  assigned.add("member");

  if (Array.isArray(input.storedRoles)) {
    for (const raw of input.storedRoles) {
      const slug = normalizeRoleSlug(String(raw || ""));
      if (slug && roleMap.has(slug)) {
        assigned.add(slug);
      }
    }
  }

  if (envAdmin) {
    assigned.add("admin");
  }

  const roleDetails: RoleBadge[] = Array.from(assigned)
    .map((slug) => {
      const def = roleMap.get(slug);
      return {
        slug,
        name: def?.name || slug,
        color: def?.color || "#6366f1",
        priority: def?.priority ?? 10,
        isSystem: Boolean(def?.isSystem),
      };
    })
    .sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));

  const permSet = new Set<string>();
  for (const r of roleDetails) {
    const def = roleMap.get(r.slug);
    for (const p of def?.permissions || []) {
      permSet.add(p);
    }
  }

  const isAdmin =
    envAdmin ||
    assigned.has("admin") ||
    permSet.has("*") ||
    permSet.has("accounts:admin");

  const primaryRole = isAdmin
    ? "admin"
    : roleDetails.find((r) => r.slug !== "member")?.slug || "member";

  return {
    primaryRole,
    roles: roleDetails.map((r) => r.slug),
    roleDetails,
    permissions: Array.from(permSet),
    isEnvAdmin: envAdmin,
    isOwner: envOwner,
    isAdmin,
  };
}

export function hasRole(
  user: { roles?: string[]; role?: string } | null | undefined,
  roleSlug: string
): boolean {
  if (!user) return false;
  const target = normalizeRoleSlug(roleSlug);
  if (Array.isArray(user.roles) && user.roles.includes(target)) return true;
  return user.role === target;
}

export function hasPermission(
  user:
    | { permissions?: string[]; isAdmin?: boolean; isOwner?: boolean }
    | null
    | undefined,
  permission: string
): boolean {
  if (!user) return false;
  if (user.isOwner || user.isAdmin) return true;
  if (!Array.isArray(user.permissions)) return false;
  return user.permissions.includes("*") || user.permissions.includes(permission);
}
