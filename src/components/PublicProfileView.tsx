"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Award,
  Calendar,
  ChevronRight,
  Edit3,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { BadgeArtwork } from "@/components/BadgeArtwork";
import { BadgeIcon } from "@/components/BadgeIcon";
import { BadgeShowcase } from "@/components/BadgeShowcase";
import { CopyButton } from "@/components/CopyButton";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import type { PublicUserProfile } from "@/lib/public-profile";

export function PublicProfileView({
  profile,
}: {
  profile: PublicUserProfile;
}) {
  const { user } = useAuth();
  const [profileUrl, setProfileUrl] = useState(`/u/${profile.username}`);
  const [activeTab, setActiveTab] = useState<"overview" | "badges">("overview");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setProfileUrl(`${window.location.origin}/u/${profile.username}`);
    }
  }, [profile.username]);

  const isOwnProfile = Boolean(
    user?.username &&
      user.username.toLowerCase() === profile.username.toLowerCase()
  );

  const achievements = profile.badges.filter(
    (b) => b.category === "achievement"
  );
  const highlights = profile.badges.filter((b) => b.category === "highlight");

  const joinedLabel = profile.joinedAt
    ? new Date(profile.joinedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 shadow-2xl">
        <div className="sse-profile-banner relative z-0 h-28 border-b border-slate-800/80 sm:h-36">
          <div className="absolute right-3.5 top-3.5 z-10 flex items-center gap-2 sm:right-5 sm:top-4">
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

        <div className="relative z-10 px-5 pb-6 sm:px-6 sm:pb-7">
          <div className="-mt-12 flex items-end justify-between gap-4 sm:-mt-14">
            {profile.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.image}
                alt={profile.name}
                className="h-24 w-24 shrink-0 rounded-3xl border-4 border-[#0c0f17] bg-slate-900 object-cover shadow-xl sm:h-28 sm:w-28"
              />
            ) : (
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border-4 border-[#0c0f17] bg-indigo-600 text-3xl font-extrabold text-white shadow-xl sm:h-28 sm:w-28">
                <User className="h-11 w-11" />
              </div>
            )}

            <div className="hidden flex-wrap items-center justify-end gap-2 pb-1 sm:flex">
              {profile.twoFactorEnabled && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  2FA Protected
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

          <div className="mt-3.5 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h1 className="break-words text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                {profile.name}
              </h1>
              <VerifiedBadge
                verification={profile.verification}
                accountName={profile.name}
                size="md"
              />
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
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

            <div className="mt-3 flex flex-wrap items-center gap-2 sm:hidden">
              {profile.twoFactorEnabled && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  2FA Protected
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

          {profile.bio && (
            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm leading-relaxed text-slate-300">
              {profile.bio}
            </div>
          )}
        </div>
      </section>

      {profile.showPublicBadges && (
        <nav className="flex items-center gap-1.5 rounded-2xl border border-slate-800 bg-slate-900/70 p-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "overview"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <User className="h-3.5 w-3.5" />
            Profile Overview
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("badges")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "badges"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Award className="h-3.5 w-3.5" />
            Badges &amp; Achievements
            <span className="rounded-full bg-slate-950/40 px-2 py-0.5 text-[10px]">
              {profile.badges.length}
            </span>
          </button>
        </nav>
      )}

      {activeTab === "badges" && profile.showPublicBadges ? (
        <BadgeShowcase allBadges={profile.badges} editable={false} />
      ) : (
        <div className="space-y-6">
          {(profile.socials.discord || profile.socials.github) && (
            <section className="space-y-3 rounded-3xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6">
              <h2 className="text-sm font-bold text-white">
                Connected Accounts
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                          Linked Discord
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
                          Linked GitHub
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
            </section>
          )}

          {profile.showPublicBadges && profile.badges.length > 0 && (
            <section className="space-y-5 rounded-3xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-indigo-400" />
                  <h2 className="text-sm font-bold text-white">Achievements</h2>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                    {achievements.length}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab("badges")}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:underline"
                >
                  View all badges
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {achievements.length > 0 && (
                <div className="flex flex-wrap items-center gap-3.5">
                  {achievements.slice(0, 8).map((badge) => (
                    <button
                      key={badge.slug}
                      type="button"
                      onClick={() => setActiveTab("badges")}
                      title={`${badge.name} — ${badge.description}`}
                      className="group focus:outline-none"
                    >
                      <BadgeArtwork
                        slug={badge.slug}
                        name={badge.name}
                        icon={badge.icon}
                        color={badge.color}
                        imageUrl={badge.imageUrl}
                        tier={badge.tier}
                        size="md"
                      />
                    </button>
                  ))}
                </div>
              )}

              {highlights.length > 0 && (
                <div className="space-y-2.5 border-t border-slate-800/80 pt-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    Highlights
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {highlights.map((h) => (
                      <button
                        key={h.slug}
                        type="button"
                        onClick={() => setActiveTab("badges")}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/70 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-indigo-500/60"
                      >
                        <span style={{ color: h.color }}>
                          <BadgeIcon name={h.icon} className="h-3.5 w-3.5" />
                        </span>
                        {h.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
