"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Award,
  BadgeCheck,
  Check,
  Search,
  Shield,
  ShieldCheck,
  Tag,
  Users,
  X,
} from "lucide-react";
import { BadgeArtwork } from "@/components/BadgeArtwork";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import {
  VERIFICATION_KINDS,
  type AccountVerification,
  type BadgeCategory,
  type BadgeTier,
  type VerificationKind,
} from "@/lib/badges";
import { SITE_SETTINGS } from "@/lib/site-settings";

interface RoleBadge {
  slug: string;
  name: string;
  color: string;
  priority: number;
  isSystem: boolean;
}

interface RoleOption {
  slug: string;
  name: string;
  color: string;
  description: string;
  isSystem: boolean;
}

interface BadgeOption {
  slug: string;
  name: string;
  icon: string;
  imageUrl?: string | null;
  color: string;
  rarity: string;
  category?: BadgeCategory;
  description: string;
  isAuto: boolean;
  tier?: BadgeTier;
}

interface AdminUserRow {
  id: string;
  name: string;
  username: string | null;
  email: string;
  discordId: string | null;
  discordUsername: string | null;
  githubId: string | null;
  githubUsername: string | null;
  twoFactorEnabled: boolean;
  verification: AccountVerification;
  role: string;
  roles: string[];
  roleDetails: RoleBadge[];
  badges: BadgeOption[];
  storedBadges: string[];
  badgeTiers: Record<string, BadgeTier>;
  isEnvAdmin: boolean;
  createdAt: string | null;
}

export default function AdminUsersPage() {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);
  const [availableBadges, setAvailableBadges] = useState<BadgeOption[]>([]);
  const [canVerify, setCanVerify] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null);
  const [modalTab, setModalTab] = useState<"roles" | "badges" | "verification">(
    "roles"
  );
  const [draftRoles, setDraftRoles] = useState<string[]>([]);
  const [draftBadges, setDraftBadges] = useState<string[]>([]);
  const [draftTiers, setDraftTiers] = useState<Record<string, BadgeTier>>({});
  const [draftVerified, setDraftVerified] = useState(false);
  const [draftVerifyKind, setDraftVerifyKind] =
    useState<VerificationKind>("official");
  const [draftVerifyLabel, setDraftVerifyLabel] = useState("");
  const [draftVerifyNote, setDraftVerifyNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/users?q=${encodeURIComponent(query)}`,
        { cache: "no-store", credentials: "include" }
      );
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Forbidden.");
        return;
      }
      setRows(j.users || []);
      setAvailableRoles(j.availableRoles || []);
      setAvailableBadges(j.availableBadges || []);
      setCanVerify(Boolean(j.canVerify));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const t = window.setTimeout(load, 250);
    return () => window.clearTimeout(t);
  }, [load]);

  function openEditor(
    u: AdminUserRow,
    tab: "roles" | "badges" | "verification"
  ) {
    setEditingUser(u);
    setModalTab(tab);
    setDraftRoles([...u.roles]);
    setDraftBadges([...u.storedBadges]);
    setDraftTiers({ ...(u.badgeTiers || {}) });
    setDraftVerified(Boolean(u.verification?.isVerified));
    setDraftVerifyKind(u.verification?.kind || "official");
    setDraftVerifyLabel(u.verification?.label || "");
    setDraftVerifyNote(u.verification?.note || "");
  }

  function toggleRole(slug: string) {
    if (slug === "member") return;
    setDraftRoles((prev) =>
      prev.includes(slug) ? prev.filter((r) => r !== slug) : [...prev, slug]
    );
  }

  function toggleBadge(slug: string) {
    setDraftBadges((prev) =>
      prev.includes(slug) ? prev.filter((b) => b !== slug) : [...prev, slug]
    );
  }

  function setBadgeTier(slug: string, tier: BadgeTier) {
    setDraftTiers((prev) => {
      const next = { ...prev };
      if (tier === 1) {
        delete next[slug];
      } else {
        next[slug] = tier;
      }
      return next;
    });
  }

  async function saveChanges() {
    if (!editingUser) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        userId: editingUser.id,
        roles: draftRoles,
        badges: draftBadges,
        badgeTiers: draftTiers,
      };
      if (canVerify) {
        payload.verification = {
          isVerified: draftVerified,
          kind: draftVerifyKind,
          label: draftVerifyLabel.trim() || null,
          note: draftVerifyNote.trim() || null,
        };
      }

      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Could not update user.");
        return;
      }
      setEditingUser(null);
      setToast(`Updated profile settings for ${editingUser.name}.`);
      window.setTimeout(() => setToast(null), 3500);
      await load();
    } finally {
      setSaving(false);
    }
  }

  const previewVerification: AccountVerification = {
    isVerified: draftVerified,
    kind: draftVerifyKind,
    label: draftVerifyLabel.trim() || null,
    note: draftVerifyNote.trim() || null,
    verifiedAt: editingUser?.verification?.verifiedAt || new Date().toISOString(),
    verifiedBy: null,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Registered {SITE_SETTINGS.brandPrefix} Users
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Manage roles, GitHub-style badges, tiers &amp; Admin/Head
            verification.{" "}
            <Link
              href="/admin/roles"
              className="font-semibold text-indigo-400 underline"
            >
              Roles
            </Link>{" "}
            ·{" "}
            <Link
              href="/admin/badges"
              className="font-semibold text-indigo-400 underline"
            >
              Badges Studio
            </Link>
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, Discord ID..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-8 pr-3 text-xs text-white"
          />
        </div>
      </div>

      {toast && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-300">
          {toast}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-xs text-slate-400">
          Loading profiles...
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-10 text-center text-xs text-slate-400">
          <Users className="mx-auto mb-2 h-8 w-8 text-slate-500" />
          No matching accounts found.
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {rows.map((u) => (
              <div
                key={u.id}
                className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-bold text-white">
                      <span className="truncate">{u.name}</span>
                      <VerifiedBadge
                        verification={u.verification}
                        accountName={u.name}
                        size="sm"
                      />
                      {u.twoFactorEnabled && (
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      )}
                    </div>
                    <div className="break-all text-[11px] text-slate-400">
                      {u.email}
                    </div>
                    {u.username && (
                      <Link
                        href={`/u/${u.username}`}
                        className="mt-0.5 inline-block font-mono text-[11px] text-indigo-400 hover:underline"
                      >
                        /u/{u.username}
                      </Link>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {u.roleDetails.map((r) => (
                    <span
                      key={r.slug}
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{
                        backgroundColor: `${r.color}22`,
                        color: r.color,
                        border: `1px solid ${r.color}55`,
                      }}
                    >
                      {r.name}
                    </span>
                  ))}
                  {u.badges.slice(0, 5).map((b) => (
                    <span key={b.slug} title={b.name}>
                      <BadgeArtwork
                        slug={b.slug}
                        name={b.name}
                        icon={b.icon}
                        color={b.color}
                        imageUrl={b.imageUrl}
                        size="xs"
                      />
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5">
                  <div className="min-w-0 font-mono text-[10px] text-slate-400">
                    <div>
                      DC:{" "}
                      {u.discordUsername
                        ? `@${u.discordUsername}`
                        : u.discordId || "—"}
                    </div>
                    <div>
                      GH:{" "}
                      {u.githubUsername
                        ? `@${u.githubUsername}`
                        : u.githubId || "—"}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditor(u, "roles")}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-white"
                    >
                      <Tag className="h-3 w-3" />
                      Roles
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditor(u, "badges")}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-white"
                    >
                      <Award className="h-3 w-3 text-amber-400" />
                      Badges
                    </button>
                    {canVerify && (
                      <button
                        type="button"
                        onClick={() => openEditor(u, "verification")}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-white"
                      >
                        <BadgeCheck className="h-3 w-3 text-sky-400" />
                        Verify
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-2xl border border-slate-800 md:block">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="px-4 py-2.5">User</th>
                  <th className="px-4 py-2.5">Connections</th>
                  <th className="px-4 py-2.5">Roles &amp; Badges</th>
                  <th className="px-4 py-2.5 text-right">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/50">
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-semibold text-white">
                        <span>{u.name}</span>
                        <VerifiedBadge
                          verification={u.verification}
                          accountName={u.name}
                          size="sm"
                        />
                        {u.twoFactorEnabled && (
                          <span title="2-Step Verification Active">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                        <span>{u.email}</span>
                        {u.username && (
                          <Link
                            href={`/u/${u.username}`}
                            className="font-mono text-indigo-400 hover:underline"
                          >
                            /u/{u.username}
                          </Link>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 font-mono text-[11px]">
                      <div className="text-indigo-300">
                        DC:{" "}
                        {u.discordUsername
                          ? `@${u.discordUsername}`
                          : u.discordId || "—"}
                      </div>
                      <div className="text-slate-400">
                        GH:{" "}
                        {u.githubUsername
                          ? `@${u.githubUsername}`
                          : u.githubId || "—"}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {u.roleDetails.map((r) => (
                          <span
                            key={r.slug}
                            className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                            style={{
                              backgroundColor: `${r.color}22`,
                              color: r.color,
                              border: `1px solid ${r.color}55`,
                            }}
                          >
                            {r.name}
                          </span>
                        ))}
                        {u.badges.slice(0, 5).map((b) => (
                          <span key={b.slug} title={b.name}>
                            <BadgeArtwork
                              slug={b.slug}
                              name={b.name}
                              icon={b.icon}
                              color={b.color}
                              imageUrl={b.imageUrl}
                              size="xs"
                            />
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditor(u, "roles")}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:border-indigo-500"
                        >
                          <Tag className="h-3 w-3" />
                          Roles
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditor(u, "badges")}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:border-indigo-500"
                        >
                          <Award className="h-3 w-3 text-amber-400" />
                          Badges
                        </button>
                        {canVerify && (
                          <button
                            type="button"
                            onClick={() => openEditor(u, "verification")}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:border-sky-500"
                          >
                            <BadgeCheck className="h-3 w-3 text-sky-400" />
                            Verify
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[90dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-3xl border border-slate-700 bg-[#0b1120] p-5 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-base font-bold text-white">
                    {editingUser.name}
                  </h2>
                  <VerifiedBadge
                    verification={previewVerification}
                    accountName={editingUser.name}
                    size="sm"
                    interactive={false}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  {editingUser.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div
              className={`grid gap-1 rounded-2xl border border-slate-800 bg-slate-950 p-1 ${
                canVerify ? "grid-cols-3" : "grid-cols-2"
              }`}
            >
              <button
                type="button"
                onClick={() => setModalTab("roles")}
                className={`rounded-xl py-1.5 text-xs font-bold ${
                  modalTab === "roles"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400"
                }`}
              >
                Roles ({draftRoles.length})
              </button>
              <button
                type="button"
                onClick={() => setModalTab("badges")}
                className={`rounded-xl py-1.5 text-xs font-bold ${
                  modalTab === "badges"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400"
                }`}
              >
                Badges ({draftBadges.length})
              </button>
              {canVerify && (
                <button
                  type="button"
                  onClick={() => setModalTab("verification")}
                  className={`rounded-xl py-1.5 text-xs font-bold ${
                    modalTab === "verification"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400"
                  }`}
                >
                  Verify {draftVerified ? "✓" : ""}
                </button>
              )}
            </div>

            {modalTab === "roles" && (
              <div className="max-h-72 space-y-2 overflow-y-auto">
                {availableRoles.map((r) => {
                  const locked =
                    r.slug === "member" ||
                    (r.slug === "admin" && editingUser.isEnvAdmin);
                  const checked = locked || draftRoles.includes(r.slug);
                  return (
                    <button
                      key={r.slug}
                      type="button"
                      disabled={locked}
                      onClick={() => toggleRole(r.slug)}
                      className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition ${
                        checked
                          ? "border-indigo-500 bg-indigo-500/15"
                          : "border-slate-800 bg-slate-950/60"
                      } ${locked ? "opacity-75" : ""}`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: r.color }}
                          />
                          <span className="text-xs font-bold text-white">
                            {r.name}
                          </span>
                        </div>
                        {r.description && (
                          <p className="mt-0.5 truncate text-[11px] text-slate-400">
                            {r.description}
                          </p>
                        )}
                      </div>
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                          checked
                            ? "border-indigo-500 bg-indigo-600 text-white"
                            : "border-slate-700"
                        }`}
                      >
                        {checked && <Check className="h-3.5 w-3.5" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {modalTab === "badges" && (
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {availableBadges
                  .filter((b) => !b.isAuto)
                  .map((b) => {
                    const checked = draftBadges.includes(b.slug);
                    const currentTier: BadgeTier = draftTiers[b.slug] || 1;
                    return (
                      <div
                        key={b.slug}
                        className={`rounded-2xl border p-3 transition ${
                          checked
                            ? "border-indigo-500 bg-indigo-500/15"
                            : "border-slate-800 bg-slate-950/60"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleBadge(b.slug)}
                          className="flex w-full items-center justify-between gap-3 text-left"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <BadgeArtwork
                              slug={b.slug}
                              name={b.name}
                              icon={b.icon}
                              color={b.color}
                              imageUrl={b.imageUrl}
                              tier={checked ? currentTier : 1}
                              size="xs"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate text-xs font-bold text-white">
                                  {b.name}
                                </span>
                                {b.category === "highlight" && (
                                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-300">
                                    Highlight
                                  </span>
                                )}
                              </div>
                              <div className="truncate text-[10px] text-slate-400">
                                {b.description}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                              checked
                                ? "border-indigo-500 bg-indigo-600 text-white"
                                : "border-slate-700"
                            }`}
                          >
                            {checked && <Check className="h-3.5 w-3.5" />}
                          </span>
                        </button>

                        {checked && b.category !== "highlight" && (
                          <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-800/70 pt-2">
                            <span className="text-[10px] font-semibold text-slate-400">
                              Medallion Tier:
                            </span>
                            <div className="flex items-center gap-1">
                              {([1, 2, 3, 4] as BadgeTier[]).map((t) => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => setBadgeTier(b.slug, t)}
                                  className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition ${
                                    currentTier === t
                                      ? "bg-indigo-600 text-white"
                                      : "bg-slate-900 text-slate-400 hover:text-white"
                                  }`}
                                >
                                  {t === 1 ? "x1" : `x${t}`}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}

            {modalTab === "verification" && canVerify && (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <div>
                    <div className="text-xs font-bold text-white">
                      Verified Checkmark Badge
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Displays a clickable Meta-style Verified seal beside{" "}
                      {editingUser.name}&apos;s profile name.
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={draftVerified}
                      onChange={(e) => setDraftVerified(e.target.checked)}
                      className="h-5 w-5 accent-sky-500"
                    />
                  </label>
                </div>

                {draftVerified && (
                  <>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Live Profile Name Preview (Click tick to test popover)
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="text-lg font-extrabold text-white">
                          {editingUser.name}
                        </span>
                        <VerifiedBadge
                          verification={previewVerification}
                          accountName={editingUser.name}
                          size="md"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-300">
                        Verification Type
                      </label>
                      <select
                        value={draftVerifyKind}
                        onChange={(e) =>
                          setDraftVerifyKind(e.target.value as VerificationKind)
                        }
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white"
                      >
                        {VERIFICATION_KINDS.map((k) => (
                          <option key={k.value} value={k.value}>
                            {k.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-300">
                        Custom Subtitle (Optional)
                      </label>
                      <input
                        maxLength={48}
                        value={draftVerifyLabel}
                        onChange={(e) => setDraftVerifyLabel(e.target.value)}
                        placeholder="e.g. Official SSE Founder"
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-300">
                        Verification Note (Optional)
                      </label>
                      <textarea
                        rows={2}
                        maxLength={180}
                        value={draftVerifyNote}
                        onChange={(e) => setDraftVerifyNote(e.target.value)}
                        placeholder="Shown when visitors click the Verified checkmark..."
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                onClick={saveChanges}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                <Shield className="h-3.5 w-3.5" />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
