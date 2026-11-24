import { getAuthCollections, serializeDoc } from "./mongodb";

export type BadgeRarity = "common" | "rare" | "epic" | "legendary" | "staff";
export type BadgeCategory = "achievement" | "highlight";
export type BadgeTier = 1 | 2 | 3 | 4;
export type VerificationKind =
  | "official"
  | "head"
  | "staff"
  | "creator"
  | "partner";

export interface AccountVerification {
  isVerified: boolean;
  kind: VerificationKind;
  label: string | null;
  note: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
}

export interface BadgeDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  howToEarn: string;
  icon: string;
  imageUrl: string | null;
  color: string;
  rarity: BadgeRarity;
  category: BadgeCategory;
  isAuto: boolean;
  isSystem: boolean;
  isLegacy: boolean;
  createdAt: string | null;
}

export interface UserBadgeItem {
  slug: string;
  name: string;
  description: string;
  howToEarn: string;
  icon: string;
  imageUrl: string | null;
  color: string;
  rarity: BadgeRarity;
  category: BadgeCategory;
  isAuto: boolean;
  isLegacy: boolean;
  tier: BadgeTier;
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

export const VERIFICATION_KINDS: Array<{
  value: VerificationKind;
  title: string;
  color: string;
  defaultNote: string;
}> = [
  {
    value: "official",
    title: "Official Verified Account",
    color: "#1D9BF0",
    defaultNote:
      "This account is verified because it is an authentic, notable identity confirmed by SSE Admins & Heads.",
  },
  {
    value: "head",
    title: "Verified SSE Head",
    color: "#F59E0B",
    defaultNote: "Verified Head & Founder of SSE World.",
  },
  {
    value: "staff",
    title: "Verified SSE Staff",
    color: "#10B981",
    defaultNote:
      "Verified official administrator or staff member across SSE services.",
  },
  {
    value: "creator",
    title: "Verified Creator",
    color: "#1D9BF0",
    defaultNote:
      "Verified tournament host, bot developer, or community creator in SSE World.",
  },
  {
    value: "partner",
    title: "Verified Partner",
    color: "#8B5CF6",
    defaultNote: "Verified official partner community or collaborator.",
  },
];

export function resolveAccountVerification(raw: unknown): AccountVerification {
  if (!raw || typeof raw !== "object") {
    return {
      isVerified: false,
      kind: "official",
      label: null,
      note: null,
      verifiedAt: null,
      verifiedBy: null,
    };
  }
  const obj = raw as Record<string, unknown>;
  const validKinds: VerificationKind[] = [
    "official",
    "head",
    "staff",
    "creator",
    "partner",
  ];
  const kind = validKinds.includes(obj.kind as VerificationKind)
    ? (obj.kind as VerificationKind)
    : "official";

  return {
    isVerified: Boolean(obj.isVerified),
    kind,
    label:
      typeof obj.label === "string" && obj.label.trim()
        ? obj.label.trim()
        : null,
    note:
      typeof obj.note === "string" && obj.note.trim() ? obj.note.trim() : null,
    verifiedAt: obj.verifiedAt
      ? new Date(obj.verifiedAt as string | Date).toISOString()
      : null,
    verifiedBy: typeof obj.verifiedBy === "string" ? obj.verifiedBy : null,
  };
}

export const SYSTEM_AUTO_BADGES: Array<
  Omit<BadgeDefinition, "id" | "createdAt">
> = [
  {
    slug: "early_adopter",
    name: "Early Pioneer",
    description: "Created a unified SSE Account during the launch era.",
    howToEarn: "Register an SSE Account during the launch period.",
    icon: "rocket",
    imageUrl: null,
    color: "#10b981",
    rarity: "legendary",
    category: "achievement",
    isAuto: true,
    isSystem: true,
    isLegacy: true,
  },
  {
    slug: "two_factor_guardian",
    name: "Vault Guardian",
    description: "Secured account with Two-Step Verification (TOTP / Email OTP).",
    howToEarn: "Enable 2-Step Verification in Security & Links.",
    icon: "shield-check",
    imageUrl: null,
    color: "#06b6d4",
    rarity: "epic",
    category: "achievement",
    isAuto: true,
    isSystem: true,
    isLegacy: false,
  },
  {
    slug: "verified_email",
    name: "Confirmed Email",
    description: "Confirmed primary email ownership via 6-digit verification.",
    howToEarn: "Complete email verification on your SSE Account.",
    icon: "badge-check",
    imageUrl: null,
    color: "#38bdf8",
    rarity: "common",
    category: "achievement",
    isAuto: true,
    isSystem: true,
    isLegacy: false,
  },
  {
    slug: "discord_linked",
    name: "Discord Synced",
    description: "Linked a Discord account for SSE Nexus & community sync.",
    howToEarn: "Link your Discord account in Security & Links.",
    icon: "message-square",
    imageUrl: null,
    color: "#5865F2",
    rarity: "common",
    category: "achievement",
    isAuto: true,
    isSystem: true,
    isLegacy: false,
  },
  {
    slug: "github_dev",
    name: "Open Sourcerer",
    description: "Connected a GitHub developer profile to SSE Accounts.",
    howToEarn: "Link your GitHub account in Security & Links.",
    icon: "code",
    imageUrl: null,
    color: "#a855f7",
    rarity: "rare",
    category: "achievement",
    isAuto: true,
    isSystem: true,
    isLegacy: false,
  },
  {
    slug: "sse_staff",
    name: "SSE Architect",
    description: "Official Head or Administrator of the SSE ecosystem.",
    howToEarn: "Assigned automatically to official SSE Admins & Heads.",
    icon: "crown",
    imageUrl: null,
    color: "#f59e0b",
    rarity: "staff",
    category: "achievement",
    isAuto: true,
    isSystem: true,
    isLegacy: false,
  },
  {
    slug: "sse_founder",
    name: "SSE Founder",
    description: "Core creator and founding architect of SSE World.",
    howToEarn: "Awarded exclusively by SSE Heads.",
    icon: "crown",
    imageUrl: null,
    color: "#eab308",
    rarity: "legendary",
    category: "achievement",
    isAuto: false,
    isSystem: true,
    isLegacy: false,
  },
  {
    slug: "tournament_champion",
    name: "Arena Champion",
    description: "Won an official SSE World community tournament.",
    howToEarn:
      "Place #1 in an official Mech Arena, Free Fire, or Minecraft SSE tournament.",
    icon: "trophy",
    imageUrl: null,
    color: "#f59e0b",
    rarity: "legendary",
    category: "achievement",
    isAuto: false,
    isSystem: true,
    isLegacy: false,
  },
  {
    slug: "pull_shark",
    name: "Code Shark",
    description: "Shipped merged code, features, or bots into SSE projects.",
    howToEarn: "Have a pull request or feature merged into an SSE project.",
    icon: "zap",
    imageUrl: null,
    color: "#2563eb",
    rarity: "epic",
    category: "achievement",
    isAuto: false,
    isSystem: true,
    isLegacy: false,
  },
  {
    slug: "bug_hunter",
    name: "Bug Squasher",
    description: "Discovered and reported a valid bug or security vulnerability.",
    howToEarn: "Report a confirmed bug in any SSE bot or website.",
    icon: "bug",
    imageUrl: null,
    color: "#f43f5e",
    rarity: "epic",
    category: "achievement",
    isAuto: false,
    isSystem: true,
    isLegacy: false,
  },
  {
    slug: "galaxy_brain",
    name: "Galaxy Brain",
    description: "Regularly answers questions and helps members in support.",
    howToEarn: "Consistently help members solve problems in SSE Bot Hub support.",
    icon: "sparkles",
    imageUrl: null,
    color: "#8b5cf6",
    rarity: "epic",
    category: "achievement",
    isAuto: false,
    isSystem: true,
    isLegacy: false,
  },
  {
    slug: "starstruck",
    name: "Starstruck",
    description: "Earned standout community recognition across SSE World.",
    howToEarn: "Reach a standout milestone in events, servers, or bot usage.",
    icon: "star",
    imageUrl: null,
    color: "#f97316",
    rarity: "rare",
    category: "achievement",
    isAuto: false,
    isSystem: true,
    isLegacy: false,
  },
  {
    slug: "heart_on_sleeve",
    name: "Heart On Your Sleeve",
    description: "Valued community supporter spreading positivity in SSE.",
    howToEarn: "Awarded by SSE Staff to standout supportive members.",
    icon: "heart",
    imageUrl: null,
    color: "#ec4899",
    rarity: "rare",
    category: "achievement",
    isAuto: false,
    isSystem: true,
    isLegacy: false,
  },
  {
    slug: "streak_master",
    name: "Streak Master",
    description: "Kept an active streak across SSE events and giveaways.",
    howToEarn: "Participate consistently across multiple SSE World events.",
    icon: "flame",
    imageUrl: null,
    color: "#ef4444",
    rarity: "rare",
    category: "achievement",
    isAuto: false,
    isSystem: true,
    isLegacy: false,
  },
  {
    slug: "hall_of_fame",
    name: "Hall of Fame",
    description: "Inducted for lasting impact and excellence across SSE World.",
    howToEarn: "Awarded by SSE Admins & Heads for exceptional long-term impact.",
    icon: "award",
    imageUrl: null,
    color: "#a855f7",
    rarity: "legendary",
    category: "achievement",
    isAuto: false,
    isSystem: true,
    isLegacy: false,
  },
  {
    slug: "highlight_pro",
    name: "SSE Pro",
    description: "Active SSE Pro supporter with premium ecosystem perks.",
    howToEarn: "Granted to SSE Pro supporters and top server boosters.",
    icon: "star",
    imageUrl: null,
    color: "#a855f7",
    rarity: "epic",
    category: "highlight",
    isAuto: false,
    isSystem: true,
    isLegacy: false,
  },
  {
    slug: "highlight_dev_program",
    name: "SSE Developer Program",
    description: "Registered developer building on SSE OAuth or bot APIs.",
    howToEarn: "Register an approved app or bot in the SSE Developer Program.",
    icon: "code",
    imageUrl: null,
    color: "#3b82f6",
    rarity: "epic",
    category: "highlight",
    isAuto: false,
    isSystem: true,
    isLegacy: false,
  },
  {
    slug: "highlight_security_hunter",
    name: "Security Bug Bounty Hunter",
    description: "Helped hunt down security vulnerabilities across SSE.",
    howToEarn: "Responsibly disclose a valid security finding to SSE Security.",
    icon: "lock",
    imageUrl: null,
    color: "#10b981",
    rarity: "legendary",
    category: "highlight",
    isAuto: false,
    isSystem: true,
    isLegacy: false,
  },
  {
    slug: "highlight_partner",
    name: "Official SSE Partner",
    description: "Recognised partner community, creator, or server owner.",
    howToEarn: "Partner officially with SSE World.",
    icon: "gem",
    imageUrl: null,
    color: "#ec4899",
    rarity: "legendary",
    category: "highlight",
    isAuto: false,
    isSystem: true,
    isLegacy: false,
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
          howToEarn: b.howToEarn,
          icon: b.icon,
          imageUrl: b.imageUrl,
          color: b.color,
          rarity: b.rarity,
          category: b.category,
          isAuto: b.isAuto,
          isSystem: b.isSystem,
          isLegacy: b.isLegacy,
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
  const defaultsMap = new Map(SYSTEM_AUTO_BADGES.map((b) => [b.slug, b]));

  return docs
    .map((d) => {
      const slug = String(d.slug);
      const fallback = defaultsMap.get(slug);
      return serializeDoc({
        id: String(d._id),
        slug,
        name: String(d.name || slug),
        description: String(d.description || ""),
        howToEarn: String(
          d.howToEarn || fallback?.howToEarn || "Awarded by SSE Admins."
        ),
        icon: String(d.icon || "award"),
        imageUrl:
          typeof d.imageUrl === "string" && d.imageUrl.trim()
            ? d.imageUrl.trim()
            : null,
        color: String(d.color || "#6366f1"),
        rarity: (["common", "rare", "epic", "legendary", "staff"].includes(
          String(d.rarity)
        )
          ? String(d.rarity)
          : "rare") as BadgeRarity,
        category: (d.category === "highlight" ||
        fallback?.category === "highlight"
          ? "highlight"
          : "achievement") as BadgeCategory,
        isAuto: Boolean(d.isAuto),
        isSystem: Boolean(d.isSystem),
        isLegacy: Boolean(d.isLegacy ?? fallback?.isLegacy),
        createdAt: d.createdAt
          ? new Date(d.createdAt as string | Date).toISOString()
          : null,
      });
    })
    .sort(
      (a, b) =>
        (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0) ||
        a.name.localeCompare(b.name)
    );
}

export async function resolveUserBadges(input: {
  storedBadges?: unknown;
  badgeTiers?: unknown;
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

  const tierMap = new Map<string, BadgeTier>();
  if (input.badgeTiers && typeof input.badgeTiers === "object") {
    for (const [k, v] of Object.entries(
      input.badgeTiers as Record<string, unknown>
    )) {
      const n = Number(v);
      if (n === 2 || n === 3 || n === 4) {
        tierMap.set(normalizeBadgeSlug(k), n);
      }
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
        howToEarn: b.howToEarn,
        icon: b.icon,
        imageUrl: b.imageUrl,
        color: b.color,
        rarity: b.rarity,
        category: b.category,
        isAuto: b.isAuto,
        isLegacy: b.isLegacy,
        tier: tierMap.get(b.slug) ?? 1,
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
