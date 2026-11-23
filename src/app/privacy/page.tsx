import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { SITE_SETTINGS } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: `Privacy Policy — ${SITE_SETTINGS.siteName}`,
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-10">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-400">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Privacy Policy
          </h1>
          <p className="text-xs text-slate-400">
            Last updated: {SITE_SETTINGS.legalLastUpdated} ·{" "}
            {SITE_SETTINGS.organizationName} / {SITE_SETTINGS.siteName}
          </p>
        </div>
      </div>

      <section className="space-y-2 text-sm leading-relaxed text-slate-300">
        <h2 className="text-base font-semibold text-white">
          1. Information We Store
        </h2>
        <p>
          <strong>{SITE_SETTINGS.siteName}</strong> acts as the central identity
          provider for {SITE_SETTINGS.organizationName} websites. We store your
          display name, email address, securely hashed password (when using
          email sign-up), optional linked Discord ID and OAuth tokens, active
          session metadata, and OAuth app consents.
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed text-slate-300">
        <h2 className="text-base font-semibold text-white">
          2. How Connected Apps Access Your Data
        </h2>
        <p>
          Connected websites only receive the profile claims and scopes you
          authorize (such as <code>openid</code>, <code>profile</code>,{" "}
          <code>email</code>, or <code>sse:servers</code>). We never sell your
          personal data to third parties.
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed text-slate-300">
        <h2 className="text-base font-semibold text-white">
          3. Your Controls &amp; Contact
        </h2>
        <p>
          You can update your profile, revoke active browser sessions, or remove
          any connected website anytime from{" "}
          <Link href="/account" className="text-indigo-400 underline">
            your account center
          </Link>
          . For deletion requests, contact{" "}
          <span className="font-mono text-slate-200">
            {SITE_SETTINGS.supportEmail}
          </span>
          .
        </p>
      </section>
    </div>
  );
}
