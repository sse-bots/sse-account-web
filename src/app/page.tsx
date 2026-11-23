import Link from "next/link";
import {
  ArrowRight,
  ExternalLink,
  Globe,
  KeyRound,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { getAuthCollections } from "@/lib/mongodb";
import { SITE_SETTINGS } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

async function getIdentityStats() {
  try {
    const { users, oauthClients } = await getAuthCollections();
    const [totalUsers, totalApps] = await Promise.all([
      users.countDocuments({}),
      oauthClients.countDocuments({}),
    ]);
    return { totalUsers, totalApps };
  } catch {
    return { totalUsers: 0, totalApps: 0 };
  }
}

export default async function HomePage() {
  const stats = await getIdentityStats();

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-[#101525] to-indigo-950/60 p-8 sm:p-12">
        <div className="max-w-3xl space-y-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-300">
            <Sparkles className="h-3.5 w-3.5" />
            {SITE_SETTINGS.siteName} · OAuth 2.1 / OIDC Identity Provider
          </span>

          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            One {SITE_SETTINGS.brandPrefix} Profile for every{" "}
            {SITE_SETTINGS.brandPrefix} website.
          </h1>

          <p className="text-base text-slate-300 sm:text-lg">
            {SITE_SETTINGS.description}
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/account"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500"
            >
              Manage My Profile
              <ArrowRight className="h-4 w-4" />
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
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800/90 bg-slate-950/60 p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-400">
              {SITE_SETTINGS.brandPrefix} Profiles
            </div>
            <div className="mt-2 text-3xl font-bold text-white">
              {stats.totalUsers}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800/90 bg-slate-950/60 p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Connected SSO Apps
            </div>
            <div className="mt-2 text-3xl font-bold text-indigo-400">
              {stats.totalApps}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800/90 bg-slate-950/60 p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Auth Standard
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-400">
              OAuth 2.1 / OIDC
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h2 className="text-base font-bold text-white">
            Email + Password &amp; Discord
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Sign up with email and password or link your Discord account once—then
            manage your display name, email, and active sessions from one place.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <Globe className="h-5 w-5" />
          </div>
          <h2 className="text-base font-bold text-white">
            Centralized Single Sign-On
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Sign in with {SITE_SETTINGS.brandPrefix} across Nexus, Tournaments,
            and future portals without creating separate accounts on every site.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
            <KeyRound className="h-5 w-5" />
          </div>
          <h2 className="text-base font-bold text-white">
            Full Privacy Control
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Review every connected website, see exactly which scopes each app can
            read, and revoke access or active browser sessions in one click.
          </p>
        </div>
      </section>

      {/* Official Ecosystem Portals */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">
          Powered by {SITE_SETTINGS.siteName}
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {SITE_SETTINGS.ecosystemApps.map((app) => (
            <div
              key={app.name}
              className="flex items-start justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{app.name}</span>
                  <span className="rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-300">
                    {app.badge}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-slate-400">{app.description}</p>
              </div>
              {app.href && (
                <a
                  href={app.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-indigo-500 hover:text-white"
                >
                  Open
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
