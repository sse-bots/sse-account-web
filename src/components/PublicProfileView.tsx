"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Award,
  BadgeCheck,
  Calendar,
  Edit3,
  ExternalLink,
  Pin,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { BadgeIcon } from "@/components/BadgeIcon";
import { CopyButton } from "@/components/CopyButton";
import { SITE_SETTINGS } from "@/lib/site-settings";
import type { PublicUserProfile } from "@/lib/public-profile";

const RARITY_LABELS: Record<string, string> = {
  staff: "STAFF",
  legendary: "LEGENDARY",
  epic: "EPIC",
  rare: "RARE",
  common: "COMMON",
};

export function PublicProfileView({
  profile,
}: {
  profile: PublicUserProfile;
}) {
  const { user } = useAuth();
  const [profileUrl, setProfileUrl] = useState(`/u/${profile.username}`);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setProfileUrl(`${window.location.origin}/u/${profile.username}`);
    }
  }, [profile.username]);

  const isOwnProfile = Boolean(
    user?.username &&
      user.username.toLowerCase() === profile.username.toLowerCase()
  );

  const pinnedBadges = profile.badges.filter((b) => b.pinned);
  const topBadges =
    pinnedBadges.length > 0 ? pinnedBadges : profile.badges.slice(0, 4);

  const joinedLabel = profile.joinedAt
    ? new Date(profile.joinedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Main Hero Identity Card */}
      <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 shadow-2xl">
        {/* Adaptive Cover Banner */}
        <div className="relative h-32 bg-gradient-to-br from-slate-900 via-[#101525] to-indigo-950/60 sm:h-40">
          <div className="absolute right-4 top-4 flex items-center gap-2">
            <CopyButton value={profileUrl} label="Share Profile" />
            {isOwnProfile && (
              <Link
                href="/account"
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-500"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit Profile
              </Link>
            )}
          </div>
        </div>

        <div className="px-6 pb-7">
          {/* Avatar + Name + Pinned Badges */}
          <div className="-mt-12 flex flex-col justify-between gap-4 sm:-mt-14 sm:flex-row sm:items-end">
            <div className="flex items-end gap-4">
              {profile.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.image}
                  alt={profile.name}
                  className="h-24 w-24 rounded-3xl border-4 border-[#0c0f17] object-cover shadow-2xl sm:h-28 sm:w-28"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl border-4 border-[#0c0f17] bg-indigo-600 text-3xl font-extrabold text-white shadow-2xl sm:h-28 sm:w-28">
                  <User className="h-11 w-11" />
                </div>
              )}

              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                    {profile.name}
                  </h1>
                  {profile.emailVerified && (
                    <span
                      title="Verified SSE Account"
                      className="inline-flex items-center text-sky-400"
                    >
                      <BadgeCheck className="h-5 w-5" />
                    </span>
                  )}
                  {topBadges.map((b) => (
                    <span
                      key={b.slug}
                      title={`${b.name} — ${b.description}`}
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

                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                  <span className="font-mono font-semibold text-indigo-400">
                    @{profile.username}
                  </span>
                  {joinedLabel && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Joined {joinedLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Roles & 2FA Pill */}
            <div className="flex flex-wrap items-center gap-2">
              {profile.twoFactorEnabled && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  2FA Verified
                </span>
              )}
              {profile.roleDetails.map((r) => (
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

          {/* Bio */}
          {profile.bio && (
            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm leading-relaxed text-slate-300">
              {profile.bio}
            </div>
          )}

          {/* Public Verified Social Connections */}
          {(profile.socials.discord || profile.socials.github) && (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {profile.socials.discord && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5865F2] text-white">
                      <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-slate-400">
                        Verified Discord
                      </div>
                      <div className="truncate font-mono text-xs font-bold text-white">
                        {profile.socials.discord.username
                          ? `@${profile.socials.discord.username}`
                          : profile.socials.discord.id}
                      </div>
                    </div>
                  </div>
                  <CopyButton
                    value={
                      profile.socials.discord.username ||
                      profile.socials.discord.id
                    }
                    label="Copy"
                  />
                </div>
              )}

              {profile.socials.github && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-white">
                      <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-slate-400">
                        Verified GitHub
                      </div>
                      <div className="truncate font-mono text-xs font-bold text-white">
                        {profile.socials.github.username
                          ? `@${profile.socials.github.username}`
                          : "Connected"}
                      </div>
                    </div>
                  </div>
                  {profile.socials.github.url && (
                    <a
                      href={profile.socials.github.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-indigo-500 hover:text-white"
                    >
                      GitHub
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Badges Trophy Case */}
      <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">
              Achievements &amp; Badges ({profile.badges.length}/
              {profile.totalBadgesCatalog})
            </h2>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-3 py-0.5 text-[11px] font-semibold text-indigo-300">
            <Sparkles className="h-3 w-3" />
            {SITE_SETTINGS.siteName} Passport
          </span>
        </div>

        {profile.badges.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-8 text-center text-xs text-slate-400">
            No badges unlocked yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {profile.badges.map((badge) => (
              <div
                key={badge.slug}
                className={`flex items-start gap-3 rounded-2xl border p-4 transition ${
                  badge.pinned
                    ? "border-indigo-500/70 bg-slate-950/80 shadow-[0_0_20px_var(--accent-glow)]"
                    : "border-slate-800 bg-slate-950/60"
                }`}
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border"
                  style={{
                    backgroundColor: `${badge.color}20`,
                    borderColor: `${badge.color}55`,
                    color: badge.color,
                    boxShadow: `0 0 18px ${badge.color}2e`,
                  }}
                >
                  <BadgeIcon name={badge.icon} className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="truncate text-xs font-bold text-white">
                      {badge.name}
                    </span>
                    {badge.pinned ? (
                      <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-bold text-indigo-300">
                        <Pin className="h-2.5 w-2.5" />
                        PINNED
                      </span>
                    ) : (
                      <span
                        className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
                        style={{
                          backgroundColor: `${badge.color}1e`,
                          color: badge.color,
                        }}
                      >
                        {RARITY_LABELS[badge.rarity] || badge.rarity}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                    {badge.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
