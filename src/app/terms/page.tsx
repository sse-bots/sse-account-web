import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { SITE_SETTINGS } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: `Terms of Service — ${SITE_SETTINGS.siteName}`,
};

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-10">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-400">
          <FileText className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Terms of Service
          </h1>
          <p className="text-xs text-slate-400">
            Last updated: {SITE_SETTINGS.legalLastUpdated} ·{" "}
            {SITE_SETTINGS.organizationName} / {SITE_SETTINGS.siteName}
          </p>
        </div>
      </div>

      <section className="space-y-2 text-sm leading-relaxed text-slate-300">
        <h2 className="text-base font-semibold text-white">
          1. Account Responsibility
        </h2>
        <p>
          By creating or signing into an account on{" "}
          <strong>{SITE_SETTINGS.siteName}</strong>, you agree to keep your
          credentials secure and abide by {SITE_SETTINGS.organizationName} rules
          across all connected websites.
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed text-slate-300">
        <h2 className="text-base font-semibold text-white">
          2. Acceptable Use
        </h2>
        <p>
          Automated account creation, credential stuffing, token abuse, or
          attempts to bypass OAuth restrictions are prohibited and may result in
          immediate suspension across all connected{" "}
          {SITE_SETTINGS.brandPrefix} services.
        </p>
      </section>

      <div className="border-t border-slate-800 pt-4 text-xs text-slate-500">
        See also our{" "}
        <Link href="/privacy" className="text-indigo-400 hover:underline">
          Privacy Policy
        </Link>
        .
      </div>
    </div>
  );
}
