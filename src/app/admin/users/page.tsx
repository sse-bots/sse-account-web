"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Award,
  Check,
  Search,
  Shield,
  ShieldCheck,
  Tag,
  Users,
  X,
} from "lucide-react";
import { BadgeIcon } from "@/components/BadgeIcon";
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
  color: string;
  rarity: string;
  description: string;
  isAuto: boolean;
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
  role: string;
  roles: string[];
  roleDetails: RoleBadge[];
  badges: BadgeOption[];
  storedBadges: string[];
  isEnvAdmin: boolean;
  createdAt: string | null;
}

export default function AdminUsersPage() {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);
  const [availableBadges, setAvailableBadges] = useState<BadgeOption[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null);
  const [modalTab, setModalTab] = useState<"roles" | "badges">("roles");
  const [draftRoles, setDraftRoles] = useState<string[]>([]);
  const [draftBadges, setDraftBadges] = useState<string[]>([]);
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
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const t = window.setTimeout(load, 250);
    return () => window.clearTimeout(t);
  }, [load]);

  function openEditor(u: AdminUserRow, tab: "roles" | "badges") {
    setEditingUser(u);
    setModalTab(tab);
    setDraftRoles([...u.roles]);
    setDraftBadges([...u.storedBadges]);
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

  async function saveChanges() {
    if (!editingUser) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingUser.id,
          roles: draftRoles,
          badges: draftBadges,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Could not update user.");
        return;
      }
      setEditingUser(null);
      setToast(`Updated roles & badges for ${editingUser.name}.`);
      window.setTimeout(() => setToast(null), 3500);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Registered {SITE_SETTINGS.brandPrefix} Users
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Manage roles &amp; custom badges for any profile.{" "}
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
          {/* Mobile Card Layout (crisp inside Android APK & narrow phones) */}
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
                    <span
                      key={b.slug}
                      title={b.name}
                      className="inline-flex h-5 w-5 items-center justify-center rounded-md border"
                      style={{
                        backgroundColor: `${b.color}20`,
                        borderColor: `${b.color}55`,
                        color: b.color,
                      }}
                    >
                      <BadgeIcon name={b.icon} className="h-3 w-3" />
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
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditor(u, "roles")}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-white"
                    >
                      <Tag className="h-3 w-3" />
                      Roles
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditor(u, "badges")}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-white"
                    >
                      <Award className="h-3 w-3 text-amber-400" />
                      Badges
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
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
                        <span
                          key={b.slug}
                          title={b.name}
                          className="inline-flex h-5 w-5 items-center justify-center rounded-md border"
                          style={{
                            backgroundColor: `${b.color}20`,
                            borderColor: `${b.color}55`,
                            color: b.color,
                          }}
                        >
                          <BadgeIcon name={b.icon} className="h-3 w-3" />
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}

      {/* Unified Roles & Badges Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[90dvh] w-full max-w-md space-y-4 overflow-y-auto rounded-3xl border border-slate-700 bg-[#0b1120] p-5 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">
                  {editingUser.name}
                </h2>
                <p className="text-[11px] text-slate-400">{editingUser.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1 rounded-2xl border border-slate-800 bg-slate-950 p-1">
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
                Custom Badges ({draftBadges.length})
              </button>
            </div>

            {modalTab === "roles" ? (
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
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto">
                {availableBadges
                  .filter((b) => !b.isAuto)
                  .map((b) => {
                    const checked = draftBadges.includes(b.slug);
                    return (
                      <button
                        key={b.slug}
                        type="button"
                        onClick={() => toggleBadge(b.slug)}
                        className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition ${
                          checked
                            ? "border-indigo-500 bg-indigo-500/15"
                            : "border-slate-800 bg-slate-950/60"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border"
                            style={{
                              backgroundColor: `${b.color}20`,
                              borderColor: `${b.color}55`,
                              color: b.color,
                            }}
                          >
                            <BadgeIcon name={b.icon} className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-xs font-bold text-white">
                              {b.name}
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
                    );
                  })}
                {availableBadges.filter((b) => !b.isAuto).length === 0 && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 text-center text-xs text-slate-400">
                    No custom badges created yet. Create one in{" "}
                    <Link
                      href="/admin/badges"
                      className="text-indigo-400 underline"
                    >
                      Badges Studio
                    </Link>
                    !
                  </div>
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
