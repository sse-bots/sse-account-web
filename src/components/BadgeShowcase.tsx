"use client";

import { useState } from "react";
import { Award, Lock, Pin, Sparkles } from "lucide-react";
import { BadgeIcon } from "@/components/BadgeIcon";
import type { UserBadgeItem } from "@/lib/badges";

const RARITY_LABELS: Record<string, string> = {
  staff: "STAFF",
  legendary: "LEGENDARY",
  epic: "EPIC",
  rare: "RARE",
  common: "COMMON",
};

export function BadgeShowcase({
  allBadges,
  onPinnedChange,
}: {
  allBadges: UserBadgeItem[];
  onPinnedChange?: () => Promise<void> | void;
}) {
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [showLocked, setShowLocked] = useState(true);

  const earned = allBadges.filter((b) => b.earned);
  const locked = allBadges.filter((b) => !b.earned);
  const visible = showLocked ? allBadges : earned;

  async function togglePin(badge: UserBadgeItem) {
    if (!badge.earned || busySlug) return;
    setBusySlug(badge.slug);
    try {
      const currentPinned = earned.filter((b) => b.pinned).map((b) => b.slug);
      const nextPinned = badge.pinned
        ? currentPinned.filter((s) => s !== badge.slug)
        : [...currentPinned, badge.slug].slice(0, 6);

      const res = await fetch("/api/account/badges", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinnedBadges: nextPinned }),
      });
      if (res.ok) {
        await onPinnedChange?.();
      }
    } finally {
      setBusySlug(null);
    }
  }

  return (
    <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-indigo-400" />
            <h3 className="text-base font-bold text-white">
              Profile Badges ({earned.length}/{allBadges.length})
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Earned automatically from achievements or awarded by SSE Admins. Tap
            any unlocked badge to pin it to your profile banner.
          </p>
        </div>

        {locked.length > 0 && (
          <button
            type="button"
            onClick={() => setShowLocked((v) => !v)}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:border-indigo-500 hover:text-white"
          >
            {showLocked
              ? `Hide Locked (${locked.length})`
              : `Show All (${allBadges.length})`}
          </button>
        )}
      </div>

      {/* Progress Strip */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all duration-500"
          style={{
            width: `${allBadges.length > 0 ? Math.round((earned.length / allBadges.length) * 100) : 0}%`,
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((badge) => {
          const isLocked = !badge.earned;
          return (
            <button
              key={badge.slug}
              type="button"
              disabled={isLocked || busySlug === badge.slug}
              onClick={() => togglePin(badge)}
              className={`group relative flex items-start gap-3 rounded-2xl border p-3.5 text-left transition ${
                isLocked
                  ? "cursor-default border-slate-800/70 bg-slate-950/40 opacity-55"
                  : badge.pinned
                    ? "border-indigo-500 bg-slate-950/80 shadow-[0_0_20px_var(--accent-glow)]"
                    : "border-slate-800 bg-slate-950/70 hover:border-indigo-500/60"
              }`}
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition group-hover:scale-105"
                style={{
                  backgroundColor: isLocked ? undefined : `${badge.color}20`,
                  borderColor: isLocked ? undefined : `${badge.color}55`,
                  color: isLocked ? undefined : badge.color,
                  boxShadow: isLocked
                    ? undefined
                    : `0 0 18px ${badge.color}30`,
                }}
              >
                {isLocked ? (
                  <Lock className="h-4 w-4 text-slate-500" />
                ) : (
                  <BadgeIcon name={badge.icon} className="h-5 w-5" />
                )}
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
                      className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                      style={{
                        backgroundColor: isLocked
                          ? "rgba(100,116,139,0.18)"
                          : `${badge.color}1e`,
                        color: isLocked ? "#94a3b8" : badge.color,
                      }}
                    >
                      {RARITY_LABELS[badge.rarity] || badge.rarity}
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-400">
                  {badge.description}
                </p>
                {!isLocked && (
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-indigo-400 opacity-0 transition group-hover:opacity-100">
                    <Sparkles className="h-2.5 w-2.5" />
                    {badge.pinned ? "Click to unpin" : "Click to pin to profile"}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
