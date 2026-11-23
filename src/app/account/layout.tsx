"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, KeyRound, User } from "lucide-react";
import { SITE_SETTINGS } from "@/lib/site-settings";

const ACCOUNT_TABS = [
  { href: "/account", label: "Profile Details", icon: User, exact: true },
  { href: "/account/security", label: "Security & Links", icon: KeyRound, exact: false },
  { href: "/account/apps", label: "Connected Apps", icon: Globe, exact: false },
];

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

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

      <nav className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/70 p-1.5">
        {ACCOUNT_TABS.map((t) => {
          const Icon = t.icon;
          const active = t.exact
            ? pathname === t.href
            : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
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
