"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, KeyRound, LogIn, User } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { SITE_SETTINGS } from "@/lib/site-settings";

const ACCOUNT_TABS = [
  { href: "/account", label: "Profile Details", icon: User, exact: true },
  {
    href: "/account/security",
    label: "Security & Links",
    icon: KeyRound,
    exact: false,
  },
  { href: "/account/apps", label: "Connected Apps", icon: Globe, exact: false },
];

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="space-y-4 py-8">
        <div className="h-10 w-56 animate-pulse rounded-xl bg-slate-800/70" />
        <div className="h-12 animate-pulse rounded-2xl bg-slate-900/60" />
        <div className="h-48 animate-pulse rounded-3xl bg-slate-900/60" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto mt-12 max-w-md rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center">
        <h1 className="text-xl font-bold text-white">Sign in required</h1>
        <p className="mt-2 text-xs text-slate-400">
          Please sign in to manage your {SITE_SETTINGS.brandPrefix} profile,
          security settings, and connected websites.
        </p>
        <Link
          href={`/sign-in?next=${encodeURIComponent(pathname || "/account")}`}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500"
        >
          <LogIn className="h-4 w-4" />
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">
          {SITE_SETTINGS.brandPrefix} Account Center
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Changes here sync automatically across all websites connected to{" "}
          {SITE_SETTINGS.siteName}.
        </p>
      </div>

      <nav className="no-scrollbar flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/70 p-1.5 sm:gap-2">
        {ACCOUNT_TABS.map((t) => {
          const Icon = t.icon;
          const active = t.exact
            ? pathname === t.href
            : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap transition sm:gap-2 sm:px-4 ${
                active
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div>{children}</div>
    </div>
  );
}
