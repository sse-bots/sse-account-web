"use client";

import Link from "next/link";
import { ArrowRight, KeyRound, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { SITE_SETTINGS } from "@/lib/site-settings";

export function HomeHeroActions() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-wrap gap-3 pt-2">
        <div className="h-11 w-40 animate-pulse rounded-xl bg-slate-800/70" />
        <div className="h-11 w-40 animate-pulse rounded-xl bg-slate-800/50" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex flex-wrap gap-3 pt-2">
        <Link
          href="/account"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500"
        >
          Manage My Profile
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/account/security"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-indigo-500 hover:bg-slate-800"
        >
          <KeyRound className="h-4 w-4" />
          Security &amp; Discord Link
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3 pt-2">
      <Link
        href="/sign-in"
        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500"
      >
        <LogIn className="h-4 w-4" />
        Sign In
      </Link>
      {SITE_SETTINGS.features.enablePublicSignUp && (
        <Link
          href="/sign-up"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-indigo-500 hover:bg-slate-800"
        >
          <UserPlus className="h-4 w-4" />
          Create {SITE_SETTINGS.brandPrefix} Account
        </Link>
      )}
    </div>
  );
}
