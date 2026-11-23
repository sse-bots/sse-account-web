import { getAuthCollections, serializeDoc } from "./mongodb";

export type BadgeRarity = "common" | "rare" | "epic" | "legendary" | "staff";

export interface BadgeDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: BadgeRarity;
  isAuto: boolean;
  isSystem: boolean;
  createdAt: string | null;
}

export interface UserBadgeItem {
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: BadgeRarity;
  isAuto: boolean;
  earned: boolean;
  pinned: boolean;
}

export const BADGE_ICON_OPTIONS = [
  "shield-check",
  "crown",
  "badge-check",
  "sparkles",
  "code",
  "trophy",
  "flame",
  "star",
  "award",
  "gem",
  "zap",
  "rocket",
  "heart",
  "bug",
  "message-square",
  "lock",
] as const;

export const SYSTEM_AUTO_BADGES: Array<
  Omit<BadgeDefinition, "id" | "createdAt">
> = [
  {
    slug: "early_adopter",
    name: "Early Adopter",
    description: "Created a unified SSE Account during the launch era.",
    icon: "sparkles",
    color: "#10b981",
    rarity: "common",
    isAuto: true,
    isSystem: true,
  },
  {
    slug: "two_factor_guardian",
    name: "2FA Guardian",
    description: "Secured account with Two-Step Verification (TOTP / Email OTP).",
    icon: "shield-check",
    color: "#06b6d4",
    rarity: "epic",
    isAuto: true,
    isSystem: true,
  },
  {
    slug: "verified_email",
    name: "Verified Email",
    description: "Confirmed primary email ownership via 6-digit verification.",
    icon: "badge-check",
    color: "#38bdf8",
    rarity: "rare",
    isAuto: true,
    isSystem: true,
  },
  {
    slug: "discord_linked",
    name: "Discord Connected",
    description: "Linked a Discord account for SSE Nexus & community sync.",
    icon: "message-square",
    color: "#5865F2",
    rarity: "common",
    isAuto: true,
    isSystem: true,
  },
  {
    slug: "github_dev",
    name: "GitHub Developer",
    description: "Connected a GitHub developer profile to SSE Accounts.",
    icon: "code",
    color: "#a855f7",
    rarity: "rare",
    isAuto: true,
    isSystem: true,
  },
  {
    slug: "sse_staff",
    name: "SSE Admin",
    description: "Official administrator of the SSE ecosystem.",
    icon: "crown",
    color: "#f59e0b",
    rarity: "staff",
    isAuto: true,
    isSystem: true,
  },
];

export function normalizeBadgeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

let defaultBadgesSeeded = false;

export async function ensureDefaultBadges(): Promise<void> {
  if (defaultBadgesSeeded) return;
  const { badges } = await getAuthCollections();
  const now = new Date();
  for (const b of SYSTEM_AUTO_BADGES) {
    await badges.updateOne(
      { slug: b.slug },
      {
        $setOnInsert: {
          slug: b.slug,
          name: b.name,
          description: b.description,
          icon: b.icon,
          color: b.color,
          rarity: b.rarity,
          isAuto: b.isAuto,
          isSystem: b.isSystem,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true }
    );
  }
  defaultBadgesSeeded = true;
}

const RARITY_ORDER: Record<BadgeRarity, number> = {
  staff: 5,
  legendary: 4,
  epic: 3,
  rare: 2,
  common: 1,
};

export async function listAllBadges(): Promise<BadgeDefinition[]> {
  await ensureDefaultBadges();
  const { badges } = await getAuthCollections();
  const docs = await badges.find({}).sort({ createdAt: 1 }).toArray();
  return docs
    .map((d) =>
      serializeDoc({
        id: String(d._id),
        slug: String(d.slug),
        name: String(d.name || d.slug),
        description: String(d.description || ""),
        icon: String(d.icon || "award"),
        color: String(d.color || "#6366f1"),
        rarity: (["common", "rare", "epic", "legendary", "staff"].includes(
          String(d.rarity)
        )
          ? String(d.rarity)
          : "rare") as BadgeRarity,
        isAuto: Boolean(d.isAuto),
        isSystem: Boolean(d.isSystem),
        createdAt: d.createdAt
          ? new Date(d.createdAt as string | Date).toISOString()
          : null,
      })
    )
    .sort(
      (a, b) =>
        (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0) ||
        a.name.localeCompare(b.name)
    );
}

export async function resolveUserBadges(input: {
  storedBadges?: unknown;
  pinnedBadges?: unknown;
  twoFactorEnabled: boolean;
  emailVerified: boolean;
  discordLinked: boolean;
  githubLinked: boolean;
  isAdmin: boolean;
}): Promise<{
  earnedBadges: UserBadgeItem[];
  allBadges: UserBadgeItem[];
  badgeSlugs: string[];
}> {
  const catalog = await listAllBadges();

  const manualSet = new Set<string>();
  if (Array.isArray(input.storedBadges)) {
    for (const s of input.storedBadges) {
      const slug = normalizeBadgeSlug(String(s || ""));
      if (slug) manualSet.add(slug);
    }
  }

  const pinnedSet = new Set<string>();
  if (Array.isArray(input.pinnedBadges)) {
    for (const s of input.pinnedBadges) {
      const slug = normalizeBadgeSlug(String(s || ""));
      if (slug) pinnedSet.add(slug);
    }
  }

  const autoEarned = new Set<string>(["early_adopter"]);
  if (input.twoFactorEnabled) autoEarned.add("two_factor_guardian");
  if (input.emailVerified) autoEarned.add("verified_email");
  if (input.discordLinked) autoEarned.add("discord_linked");
  if (input.githubLinked) autoEarned.add("github_dev");
  if (input.isAdmin) autoEarned.add("sse_staff");

  const allBadges: UserBadgeItem[] = catalog
    .map((b) => {
      const earned = b.isAuto
        ? autoEarned.has(b.slug) || manualSet.has(b.slug)
        : manualSet.has(b.slug);
      return {
        slug: b.slug,
        name: b.name,
        description: b.description,
        icon: b.icon,
        color: b.color,
        rarity: b.rarity,
        isAuto: b.isAuto,
        earned,
        pinned: earned && pinnedSet.has(b.slug),
      };
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.earned !== b.earned) return a.earned ? -1 : 1;
      return (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0);
    });

  const earnedBadges = allBadges.filter((b) => b.earned);
  return {
    earnedBadges,
    allBadges,
    badgeSlugs: earnedBadges.map((b) => b.slug),
  };
}
