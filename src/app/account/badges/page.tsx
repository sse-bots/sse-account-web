"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { BadgeShowcase } from "@/components/BadgeShowcase";
import { VerifiedBadge } from "@/components/VerifiedBadge";

export default function AccountBadgesPage() {
  const { user, refreshUser } = useAuth();
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  if (!user) return null;

  async function togglePublicBadges() {
    if (!user || savingPrivacy) return;
    setSavingPrivacy(true);
    try {
      await fetch("/api/account/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user.name,
          username: user.username || "",
          email: user.email,
          bio: user.bio || "",
          image: user.image || "",
          isPublicProfile: user.isPublicProfile,
          showPublicSocials: user.showPublicSocials,
          showPublicBadges: !user.showPublicBadges,
        }),
      });
      await refreshUser();
    } finally {
      setSavingPrivacy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 rounded-3xl border border-slate-800 bg-slate-900/60 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-bold text-white">{user.name}</span>
            <VerifiedBadge
              verification={user.verification}
              accountName={user.name}
              size="sm"
            />
            {!user.verification?.isVerified && (
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                Verification granted by Admins &amp; Heads
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Manage your pinned GitHub-style achievements, inspect unlock rules,
            and control public badge visibility.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={savingPrivacy}
            onClick={togglePublicBadges}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs font-semibold text-white hover:border-indigo-500 disabled:opacity-50"
          >
            {user.showPublicBadges ? (
              <>
                <Eye className="h-3.5 w-3.5 text-emerald-400" />
                Public Badges On
              </>
            ) : (
              <>
                <EyeOff className="h-3.5 w-3.5 text-amber-400" />
                Public Badges Hidden
              </>
            )}
          </button>

          {user.username && (
            <Link
              href={`/u/${user.username}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              Public Profile
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      <BadgeShowcase
        allBadges={user.allBadges}
        editable
        onPinnedChange={async () => {
          await refreshUser();
        }}
      />
    </div>
  );
}
