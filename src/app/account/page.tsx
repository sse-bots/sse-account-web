"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Award,
  CheckCircle2,
  ExternalLink,
  Globe,
  Link2,
  Save,
  ShieldCheck,
  User,
} from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { BadgeIcon } from "@/components/BadgeIcon";
import { BadgeShowcase } from "@/components/BadgeShowcase";
import { CopyButton } from "@/components/CopyButton";
import { SITE_SETTINGS } from "@/lib/site-settings";

interface ConnectedAppRow {
  id: string;
  clientId: string;
  clientName: string;
  clientUri: string | null;
  scopes: string[];
  connectionType?: "trusted" | "authorized";
  createdAt: string | null;
}

export default function AccountProfilePage() {
  const { user, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectedApps, setConnectedApps] = useState<ConnectedAppRow[]>([]);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [image, setImage] = useState("");
  const [isPublicProfile, setIsPublicProfile] = useState(true);
  const [showPublicSocials, setShowPublicSocials] = useState(true);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (!user) return;
    setName(user.name || "");
    setUsername(user.username || "");
    setEmail(user.email || "");
    setBio(user.bio || "");
    setImage(user.image || "");
    setIsPublicProfile(user.isPublicProfile !== false);
    setShowPublicSocials(user.showPublicSocials !== false);
    if (typeof window !== "undefined") setOrigin(window.location.origin);

    fetch("/api/account/consents", {
      cache: "no-store",
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.consents) setConnectedApps(d.consents);
      })
      .catch(() => {});
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, email, bio, image, isPublicProfile, showPublicSocials }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Could not save profile.");
        return;
      }
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch {
      setError("Network error while saving profile.");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  const pinnedOrTopBadges =
    user.badges.filter((b) => b.pinned).length > 0
      ? user.badges.filter((b) => b.pinned)
      : user.badges.slice(0, 4);

  const isDiscordLinked =
    Boolean(user.discordId) || user.linkedProviders.includes("discord");
  const isGitHubLinked =
    Boolean(user.githubId) || user.linkedProviders.includes("github");

  return (
    <div className="space-y-6">
      {/* Discord/GitHub-Style Profile Banner Card */}
      <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
        {/* Accent Cover Strip */}
        <div className="sse-profile-banner relative z-0 h-24 border-b border-slate-800/80 sm:h-28" />

        <div className="relative z-10 px-5 pb-6 sm:px-6">
          {/* Avatar + Desktop Roles Row */}
          <div className="-mt-11 flex items-end justify-between gap-4 sm:-mt-12">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt={name}
                className="h-20 w-20 shrink-0 rounded-2xl border-4 border-[#0c0f17] bg-slate-900 object-cover shadow-xl sm:h-24 sm:w-24"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-4 border-[#0c0f17] bg-indigo-600 text-2xl font-extrabold text-white shadow-xl sm:h-24 sm:w-24">
                <User className="h-9 w-9" />
              </div>
            )}

            <div className="hidden flex-wrap items-center justify-end gap-2 pb-1 sm:flex">
              {user.twoFactorEnabled ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  2-Step Protected
                </span>
              ) : (
                <Link
                  href="/account/security"
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300 hover:bg-amber-500/25"
                >
                  Enable 2-Step →
                </Link>
              )}

              {(user.roleDetails && user.roleDetails.length > 0
                ? user.roleDetails
                : [{ slug: user.role || "member", name: user.role || "Member", color: "#10b981" }]
              ).map((r) => (
                <span
                  key={r.slug}
                  className="rounded-full px-3 py-1 text-xs font-bold"
                  style={{
                    backgroundColor: `${r.color}22`,
                    color: r.color,
                    border: `1px solid ${r.color}55`,
                  }}
                >
                  {r.name}
                </span>
              ))}
            </div>
          </div>

          {/* Name, Pinned Badges & Email — cleanly below cover banner */}
          <div className="mt-3.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="break-words text-xl font-extrabold text-white sm:text-2xl">
                {name || user.name}
              </h2>
              {pinnedOrTopBadges.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {pinnedOrTopBadges.map((b) => (
                    <span
                      key={b.slug}
                      title={`${b.name}: ${b.description}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-xl border"
                      style={{
                        backgroundColor: `${b.color}20`,
                        borderColor: `${b.color}55`,
                        color: b.color,
                      }}
                    >
                      <BadgeIcon name={b.icon} className="h-3.5 w-3.5" />
                    </span>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-1 truncate text-xs text-slate-400">
              {user.username ? `@${user.username} · ` : ""}
              {email || user.email}
            </p>

            {/* Mobile Roles & 2FA Pill */}
            <div className="mt-3 flex flex-wrap items-center gap-2 sm:hidden">
              {user.twoFactorEnabled ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  2-Step Protected
                </span>
              ) : (
                <Link
                  href="/account/security"
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300 hover:bg-amber-500/25"
                >
                  Enable 2-Step →
                </Link>
              )}

              {(user.roleDetails && user.roleDetails.length > 0
                ? user.roleDetails
                : [{ slug: user.role || "member", name: user.role || "Member", color: "#10b981" }]
              ).map((r) => (
                <span
                  key={r.slug}
                  className="rounded-full px-3 py-1 text-xs font-bold"
                  style={{
                    backgroundColor: `${r.color}22`,
                    color: r.color,
                    border: `1px solid ${r.color}55`,
                  }}
                >
                  {r.name}
                </span>
              ))}
            </div>
          </div>

          {bio && (
            <p className="mt-4 max-w-2xl text-xs leading-relaxed text-slate-300">
              {bio}
            </p>
          )}

          {/* Public Profile URL Bar */}
          <div className="mt-4 flex flex-col justify-between gap-2.5 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 sm:flex-row sm:items-center">
            {user.username ? (
              <>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Your Public Profile URL{" "}
                    {!user.isPublicProfile && (
                      <span className="ml-1 text-amber-400">(Private)</span>
                    )}
                  </div>
                  <code className="block truncate font-mono text-xs text-indigo-300">
                    {origin ? `${origin}/u/${user.username}` : `/u/${user.username}`}
                  </code>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <CopyButton
                    value={origin ? `${origin}/u/${user.username}` : `/u/${user.username}`}
                    label="Copy URL"
                  />
                  <Link
                    href={`/u/${user.username}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                  >
                    View Profile
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-400">
                Set an <strong className="text-white">{SITE_SETTINGS.brandPrefix} Username</strong>{" "}
                in Personal Information below to activate your public profile page at{" "}
                <code className="text-indigo-300">/u/your-username</code>.
              </div>
            )}
          </div>

          {/* 3 Quick-Stat Tiles (2-up + 1-wide on mobile so labels never overflow!) */}
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
            <Link
              href="/account/security"
              className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 transition hover:border-indigo-500/60"
            >
              <div className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Security Score
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5 whitespace-nowrap">
                <span className="text-xl font-extrabold text-indigo-400">
                  {user.securityScore}%
                </span>
                <span className="text-[11px] text-slate-400">
                  {user.twoFactorEnabled ? "Strong" : "Boost"}
                </span>
              </div>
            </Link>

            <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5">
              <div className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Badges Earned
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 whitespace-nowrap">
                <Award className="h-4 w-4 shrink-0 text-amber-400" />
                <span className="text-xl font-extrabold text-white">
                  {user.badges.length}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  / {user.allBadges.length}
                </span>
              </div>
            </div>

            <Link
              href="/account/apps"
              className="col-span-2 min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 transition hover:border-indigo-500/60 sm:col-span-1"
            >
              <div className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Connections
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5 whitespace-nowrap">
                <span className="text-xl font-extrabold text-emerald-400">
                  {user.linkedAccounts.length + connectedApps.length}
                </span>
                <span className="text-[11px] text-slate-400">
                  Active
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Dedicated Connections Section (Fixes missing connections on /account!) */}
      <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-indigo-400" />
              <h3 className="text-base font-bold text-white">
                Your Connections &amp; Signed-In Apps
              </h3>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Social sign-in accounts and {SITE_SETTINGS.brandPrefix} websites
              actively connected to your profile.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/account/security"
              className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:border-indigo-500"
            >
              Manage Socials
            </Link>
            <Link
              href="/account/apps"
              className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:border-indigo-500"
            >
              Manage Apps
            </Link>
          </div>
        </div>

        {/* Social Connections Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5865F2] text-white">
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028z" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white">Discord</div>
                <div className="truncate font-mono text-[11px] text-slate-400">
                  {isDiscordLinked
                    ? user.discordUsername
                      ? `@${user.discordUsername} · ${user.discordId}`
                      : `ID: ${user.discordId}`
                    : "Not connected"}
                </div>
              </div>
            </div>
            {isDiscordLinked ? (
              <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                Connected
              </span>
            ) : (
              <Link
                href="/account/security"
                className="shrink-0 rounded-xl bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white"
              >
                Link
              </Link>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-white">
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white">GitHub</div>
                <div className="truncate font-mono text-[11px] text-slate-400">
                  {isGitHubLinked
                    ? user.githubUsername
                      ? `@${user.githubUsername} · ${user.githubId}`
                      : `ID: ${user.githubId}`
                    : "Not connected"}
                </div>
              </div>
            </div>
            {isGitHubLinked ? (
              <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                Connected
              </span>
            ) : (
              <Link
                href="/account/security"
                className="shrink-0 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-white"
              >
                Link
              </Link>
            )}
          </div>
        </div>

        {/* Connected SSE Apps Preview */}
        {connectedApps.length > 0 && (
          <div className="space-y-2 border-t border-slate-800/80 pt-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Signed-In {SITE_SETTINGS.brandPrefix} Websites ({connectedApps.length})
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {connectedApps.map((app) => (
                <div
                  key={app.clientId}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Globe className="h-4 w-4 shrink-0 text-indigo-400" />
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold text-white">
                        {app.clientName}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {app.connectionType === "trusted"
                          ? "Official 1st-Party App"
                          : "Authorized OAuth App"}
                      </div>
                    </div>
                  </div>
                  {app.clientUri && (
                    <a
                      href={app.clientUri}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-300 hover:border-indigo-500 hover:text-white"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* GitHub/Discord-Style Badges Showcase */}
      {SITE_SETTINGS.features.enableBadges && user.allBadges.length > 0 && (
        <BadgeShowcase
          allBadges={user.allBadges}
          onPinnedChange={async () => {
            await refreshUser();
          }}
        />
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Personal Information Form */}
      <form
        onSubmit={handleSave}
        className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6"
      >
        <h3 className="text-base font-bold text-white">Personal Information</h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Display Name *
            </label>
            <input
              required
              minLength={2}
              maxLength={64}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              {SITE_SETTINGS.brandPrefix} Username (optional)
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. shashikant.sse"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Primary Email *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Avatar Image URL (optional)
            </label>
            <input
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-300">
            Short Bio (optional)
          </label>
          <textarea
            rows={3}
            maxLength={240}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell SSE communities a little about yourself..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-2.5 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={isPublicProfile}
              onChange={(e) => setIsPublicProfile(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-indigo-500"
            />
            <span>
              <strong className="block text-white">Public Profile Page</strong>
              Allow anyone to view your badges &amp; roles at{" "}
              <code className="text-indigo-300">/u/{username || "username"}</code>.
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-2.5 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={showPublicSocials}
              onChange={(e) => setShowPublicSocials(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-indigo-500"
            />
            <span>
              <strong className="block text-white">Show Linked Socials</strong>
              Display your Discord handle &amp; GitHub link on your public profile.
            </span>
          </label>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Profile Changes"}
          </button>

          {saved && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Profile updated!
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
