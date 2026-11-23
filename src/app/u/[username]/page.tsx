import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Lock, UserX } from "lucide-react";
import {
  getPublicProfileByUsername,
  normalizeLookupUsername,
} from "@/lib/public-profile";
import { PublicProfileView } from "@/components/PublicProfileView";
import { SITE_SETTINGS } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const clean = normalizeLookupUsername(username);
  const result = await getPublicProfileByUsername(clean);

  if (result.status !== "ok") {
    return {
      title: `@${clean || "user"} — ${SITE_SETTINGS.siteName}`,
      description: `Public profile on ${SITE_SETTINGS.siteName}.`,
    };
  }

  const p = result.profile;
  const desc =
    p.bio ||
    `${p.name} (@${p.username}) on ${SITE_SETTINGS.siteName} · ${p.badges.length} badge(s) earned.`;

  return {
    title: `${p.name} (@${p.username}) — ${SITE_SETTINGS.siteName}`,
    description: desc,
    openGraph: {
      title: `${p.name} (@${p.username})`,
      description: desc,
      images: p.image ? [{ url: p.image }] : undefined,
    },
  };
}

export default async function PublicUserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const result = await getPublicProfileByUsername(username);

  if (result.status === "private") {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-white">Private Profile</h1>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          <span className="font-mono text-slate-200">@{result.username}</span>{" "}
          has set their {SITE_SETTINGS.brandPrefix} profile to private.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>
    );
  }

  if (result.status === "not_found") {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-400">
          <UserX className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-white">Profile Not Found</h1>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          No {SITE_SETTINGS.brandPrefix} member with username{" "}
          <span className="font-mono text-slate-200">
            @{normalizeLookupUsername(username) || username}
          </span>{" "}
          was found. Users must set a username in their Account Center to
          activate their public profile URL.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
          <Link
            href="/account"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            Claim Your Username
          </Link>
        </div>
      </div>
    );
  }

  return <PublicProfileView profile={result.profile} />;
}
