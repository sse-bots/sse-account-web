"use client";

import { useState } from "react";
import { Award, Lock, Pin, Sparkles, X } from "lucide-react";
import { BadgeArtwork } from "@/components/BadgeArtwork";
import { BadgeIcon } from "@/components/BadgeIcon";
import type { UserBadgeItem } from "@/lib/badges";

const RARITY_LABELS: Record<string, string> = {
  staff: "STAFF",
  legendary: "LEGENDARY",
  epic: "EPIC",
  rare: "RARE",
  common: "COMMON",
};

const TIER_NAMES: Record<number, string> = {
  1: "Default",
  2: "Bronze (x2)",
  3: "Silver (x3)",
  4: "Gold (x4)",
};

export function BadgeShowcase({
  allBadges,
  editable = true,
  onPinnedChange,
}: {
  allBadges: UserBadgeItem[];
  editable?: boolean;
  onPinnedChange?: () => Promise<void> | void;
}) {
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    "all" | "achievements" | "highlights" | "locked"
  >("all");
  const [selected, setSelected] = useState<UserBadgeItem | null>(null);

  const earned = allBadges.filter((b) => b.earned);
  const lockedCount = allBadges.length - earned.length;
  const achievements = allBadges.filter((b) => b.category === "achievement");
  const highlights = allBadges.filter((b) => b.category === "highlight");

  const visibleAchievements =
    filter === "locked"
      ? achievements.filter((b) => !b.earned)
      : filter === "highlights"
        ? []
        : achievements;

  const visibleHighlights =
    filter === "locked"
      ? highlights.filter((b) => !b.earned)
      : filter === "achievements"
        ? []
        : highlights;

  async function togglePin(badge: UserBadgeItem) {
    if (!editable || !badge.earned || busySlug) return;
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
        setSelected((prev) =>
          prev && prev.slug === badge.slug
            ? { ...prev, pinned: !prev.pinned }
            : prev
        );
      }
    } finally {
      setBusySlug(null);
    }
  }

  const pct =
    allBadges.length > 0
      ? Math.round((earned.length / allBadges.length) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <section className="space-y-5 rounded-3xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white">
                Achievements &amp; Highlights ({earned.length}/{allBadges.length})
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Tap any GitHub-style medallion to inspect unlock rules, tier
              progress{editable ? ", or pin up to 6 favourites" : ""}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-slate-800 bg-slate-950 p-1">
            {(
              [
                { id: "all", label: "All" },
                { id: "achievements", label: "Achievements" },
                { id: "highlights", label: "Highlights" },
                ...(lockedCount > 0 ? [{ id: "locked", label: "Locked" }] : []),
              ] as Array<{
                id: "all" | "achievements" | "highlights" | "locked";
                label: string;
              }>
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`rounded-xl px-3 py-1.5 text-[11px] font-bold transition ${
                  filter === tab.id
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Collection Progress</span>
            <span className="font-bold text-indigo-400">{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {visibleAchievements.length > 0 && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Achievements
              </h3>
              <span className="text-[11px] text-slate-500">
                {visibleAchievements.filter((b) => b.earned).length} unlocked
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {visibleAchievements.map((badge) => (
                <button
                  key={badge.slug}
                  type="button"
                  onClick={() => setSelected(badge)}
                  className={`group relative flex flex-col items-center rounded-2xl border p-4 text-center transition ${
                    !badge.earned
                      ? "border-slate-800/70 bg-slate-950/40 hover:border-slate-700"
                      : badge.pinned
                        ? "border-indigo-500 bg-slate-950/80 shadow-[0_0_20px_var(--accent-glow)]"
                        : "border-slate-800 bg-slate-950/70 hover:border-indigo-500/60"
                  }`}
                >
                  {badge.pinned && (
                    <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-0.5 rounded-full bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-bold text-indigo-300">
                      <Pin className="h-2.5 w-2.5" />
                    </span>
                  )}

                  <BadgeArtwork
                    slug={badge.slug}
                    name={badge.name}
                    icon={badge.icon}
                    color={badge.color}
                    imageUrl={badge.imageUrl}
                    tier={badge.tier}
                    size="md"
                    locked={!badge.earned}
                  />

                  <span className="mt-3 line-clamp-1 text-xs font-bold text-white">
                    {badge.name}
                  </span>
                  <span
                    className="mt-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: badge.earned
                        ? `${badge.color}20`
                        : "rgba(100,116,139,0.16)",
                      color: badge.earned ? badge.color : "#94a3b8",
                    }}
                  >
                    {badge.earned
                      ? RARITY_LABELS[badge.rarity] || badge.rarity
                      : "Locked"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {visibleHighlights.length > 0 && (
          <div className="space-y-3 border-t border-slate-800/80 pt-5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Highlights
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {visibleHighlights.map((badge) => (
                <button
                  key={badge.slug}
                  type="button"
                  onClick={() => setSelected(badge)}
                  className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                    badge.earned
                      ? "border-slate-800 bg-slate-950/70 hover:border-indigo-500/60"
                      : "border-slate-800/70 bg-slate-950/40 opacity-65 hover:opacity-85"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border"
                      style={{
                        backgroundColor: badge.earned
                          ? `${badge.color}20`
                          : undefined,
                        borderColor: badge.earned
                          ? `${badge.color}55`
                          : undefined,
                        color: badge.earned ? badge.color : "#94a3b8",
                      }}
                    >
                      {badge.earned ? (
                        <BadgeIcon name={badge.icon} className="h-4 w-4" />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold text-white">
                        {badge.name}
                      </div>
                      <div className="truncate text-[11px] text-slate-400">
                        {badge.description}
                      </div>
                    </div>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
                    style={{
                      backgroundColor: badge.earned
                        ? `${badge.color}20`
                        : "rgba(100,116,139,0.16)",
                      color: badge.earned ? badge.color : "#94a3b8",
                    }}
                  >
                    {badge.earned ? "Active" : "Locked"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {visibleAchievements.length === 0 && visibleHighlights.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-8 text-center text-xs text-slate-400">
            No badges match this filter.
          </div>
        )}
      </section>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-700 bg-[#0b1120] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="relative flex flex-col items-center justify-center px-6 py-8"
              style={{
                background: `radial-gradient(circle at 50% 30%, ${selected.color}38, transparent 75%)`,
              }}
            >
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

              <BadgeArtwork
                slug={selected.slug}
                name={selected.name}
                icon={selected.icon}
                color={selected.color}
                imageUrl={selected.imageUrl}
                tier={selected.tier}
                size="lg"
                locked={!selected.earned}
              />
            </div>

            <div className="space-y-3 p-6 text-center">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <h3 className="text-lg font-extrabold text-white">
                  {selected.name}
                </h3>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                  style={{
                    backgroundColor: `${selected.color}24`,
                    color: selected.color,
                  }}
                >
                  {RARITY_LABELS[selected.rarity] || selected.rarity}
                </span>
              </div>

              {selected.isLegacy && (
                <p className="text-[11px] font-semibold text-amber-400">
                  Legacy Achievement · Launch Era Edition
                </p>
              )}

              <p className="text-xs leading-relaxed text-slate-300">
                {selected.description}
              </p>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-left text-[11px] text-slate-400">
                <div className="font-bold text-slate-200">How to earn</div>
                <p className="mt-0.5">{selected.howToEarn}</p>
                {selected.earned && selected.tier > 1 && (
                  <p className="mt-1.5 font-semibold text-amber-300">
                    Tier: {TIER_NAMES[selected.tier]}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-2">
                {editable && selected.earned ? (
                  <button
                    type="button"
                    disabled={busySlug === selected.slug}
                    onClick={() => togglePin(selected)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    <Pin className="h-3.5 w-3.5" />
                    {selected.pinned ? "Unpin Badge" : "Pin Badge"}
                  </button>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-400">
                    {selected.earned ? "Unlocked" : "Not unlocked yet"}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-white"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
