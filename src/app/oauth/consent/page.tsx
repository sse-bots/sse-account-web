"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeftRight,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Globe,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Tag,
  User,
  XCircle,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useAuth } from "@/components/AuthContext";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { SITE_SETTINGS } from "@/lib/site-settings";

interface ResolvedClientMeta {
  name: string | null;
  uri: string | null;
  domain: string | null;
  icon: string | null;
  trusted: boolean;
}

const SCOPE_META: Record<
  string,
  { title: string; icon: typeof ShieldCheck }
> = {
  openid: { title: "SSE Identity", icon: ShieldCheck },
  profile: { title: "Profile, Avatar & Badges", icon: User },
  email: { title: "Email Address", icon: Mail },
  offline_access: { title: "Keep You Signed In", icon: RefreshCw },
  "sse:servers": { title: "Linked Discord Servers", icon: Server },
  "sse:activations": { title: "SSE Bot Activations", icon: KeyRound },
  "sse:roles": { title: "Roles & Permissions", icon: Tag },
};

function ConsentInner() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const clientId = searchParams.get("client_id") || "";
  const rawScope = searchParams.get("scope") || "openid profile email";
  const scopes = rawScope.split(/\s+/).filter(Boolean);

  const [clientMeta, setClientMeta] = useState<ResolvedClientMeta | null>(null);
  const [loadingClient, setLoadingClient] = useState(Boolean(clientId));
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [submitting, setSubmitting] = useState<"accept" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    setLoadingClient(true);

    async function loadClient() {
      try {
        // Primary: direct public lookup from MongoDB oauthClient collection
        const res = await fetch(
          `/api/oauth/client-info?client_id=${encodeURIComponent(clientId)}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && (data?.name || data?.domain || data?.icon)) {
            setClientMeta({
              name: data.name || null,
              uri: data.uri || null,
              domain: data.domain || null,
              icon: data.icon || null,
              trusted: Boolean(data.trusted),
            });
            return;
          }
        }
      } catch {
        // fallback below
      }

      try {
        // Fallback: Better Auth public-client endpoint
        const res = await fetch(
          `/api/auth/oauth2/public-client?client_id=${encodeURIComponent(clientId)}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          const name = data?.name || data?.client_name || null;
          const uri = data?.uri || data?.client_uri || null;
          const icon = data?.icon || data?.logo_uri || null;
          let domain: string | null = null;
          if (typeof uri === "string" && uri) {
            try {
              domain = new URL(uri).hostname;
            } catch {
              domain = null;
            }
          }
          if (!cancelled && (name || domain || icon)) {
            setClientMeta({ name, uri, domain, icon, trusted: false });
          }
        }
      } catch {
        // leave default fallback label
      } finally {
        if (!cancelled) setLoadingClient(false);
      }
    }

    loadClient().finally(() => {
      if (!cancelled) setLoadingClient(false);
    });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  async function handleDecision(accept: boolean) {
    setSubmitting(accept ? "accept" : "deny");
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const oauth2 = (authClient as any).oauth2;
      if (!oauth2?.consent) {
        throw new Error("OAuth Provider client plugin is not initialized.");
      }
      const res = await oauth2.consent({ accept });
      if (res?.error) {
        setError(res.error.message || "Could not process authorization.");
        setSubmitting(null);
        return;
      }
      if (res?.data?.redirect && res?.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authorization failed.");
      setSubmitting(null);
    }
  }

  if (!clientId) {
    return (
      <div className="mx-auto mt-12 max-w-md rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center shadow-xl">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-bold text-white">Invalid OAuth Request</h1>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          This consent page can only be opened through an application&apos;s
          &ldquo;Sign in with {SITE_SETTINGS.brandPrefix}&rdquo; login link.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
        >
          Back to {SITE_SETTINGS.siteName}
        </Link>
      </div>
    );
  }

  const displayAppName =
    clientMeta?.name ||
    clientMeta?.domain ||
    `${SITE_SETTINGS.brandPrefix} Connected App`;
  const appInitials = displayAppName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("") || "AP";

  return (
    <div className="mx-auto mt-2 max-w-lg pb-8 sm:mt-8">
      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 shadow-2xl">
        {/* Top Branded Hero Connection Strip */}
        <div className="sse-profile-banner border-b border-slate-800/80 px-5 py-6 text-center sm:px-8 sm:py-7">
          <div className="mx-auto flex items-center justify-center gap-3.5">
            {/* Requesting App Emblem */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-lg">
              {clientMeta?.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={clientMeta.icon}
                  alt={displayAppName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-base font-extrabold text-indigo-400">
                  {loadingClient ? (
                    <Globe className="h-6 w-6 animate-pulse" />
                  ) : (
                    appInitials
                  )}
                </span>
              )}
            </div>

            {/* Connection Bridge */}
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="h-px w-4 bg-slate-700 sm:w-6" />
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700/80 bg-slate-900/90 text-indigo-400 shadow-sm">
                <ArrowLeftRight className="h-3.5 w-3.5" />
              </span>
              <span className="h-px w-4 bg-slate-700 sm:w-6" />
            </div>

            {/* SSE Identity Emblem */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-extrabold text-white shadow-lg shadow-indigo-500/25">
              {SITE_SETTINGS.shortName}
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            {loadingClient ? (
              <div className="mx-auto h-7 w-48 animate-pulse rounded-xl bg-slate-800/80" />
            ) : (
              <h1 className="break-words text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                Sign in to {displayAppName}
              </h1>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
              {clientMeta?.domain && (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-700/80 bg-slate-950/70 px-2.5 py-0.5 font-mono text-[11px] text-slate-300">
                  <Lock className="h-3 w-3 text-emerald-400" />
                  {clientMeta.domain}
                </span>
              )}
              {clientMeta?.trusted && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                  <ShieldCheck className="h-3 w-3" />
                  Official {SITE_SETTINGS.brandPrefix} App
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Main Body */}
        <div className="space-y-5 p-5 sm:p-7">
          {/* Active Signed-In User Strip */}
          {user && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-3.5 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt={user.name}
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-extrabold text-white">
                    {user.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1 text-xs font-bold text-white">
                    <span className="truncate">{user.name}</span>
                    <VerifiedBadge
                      verification={user.verification}
                      accountName={user.name}
                      size="sm"
                      interactive={false}
                    />
                  </div>
                  <div className="truncate text-[11px] text-slate-400">
                    {user.username ? `@${user.username} · ` : ""}
                    {user.email}
                  </div>
                </div>
              </div>

              <span className="shrink-0 rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-[10px] font-bold text-indigo-300">
                Active
              </span>
            </div>
          )}

          {/* Requested Permissions List */}
          <div>
            <p className="mb-2.5 text-xs font-semibold text-slate-300">
              <strong className="text-white">{displayAppName}</strong> is
              requesting permission to access your {SITE_SETTINGS.brandPrefix}{" "}
              Account:
            </p>

            <ul className="divide-y divide-slate-800 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/65">
              {scopes.map((scope) => {
                const meta = SCOPE_META[scope];
                const ScopeIcon = meta?.icon || CheckCircle2;
                const title = meta?.title || scope;
                const description =
                  SITE_SETTINGS.oauth.scopeLabels[scope] ||
                  "Access requested account scope";

                return (
                  <li
                    key={scope}
                    className="flex items-start gap-3 px-4 py-3 text-left"
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
                      <ScopeIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="text-xs font-bold text-white">
                          {title}
                        </span>
                        <span className="rounded-md border border-slate-800 bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                          {scope}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                        {description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Expandable App Technical Info (keeps raw Client ID hidden unless inspected) */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 px-3.5 py-2.5">
            <button
              type="button"
              onClick={() => setShowTechDetails((v) => !v)}
              className="flex w-full items-center justify-between gap-2 text-[11px] font-semibold text-slate-400 hover:text-white"
            >
              <span>Application verification details</span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${
                  showTechDetails ? "rotate-180" : ""
                }`}
              />
            </button>

            {showTechDetails && (
              <div className="mt-2.5 space-y-1.5 border-t border-slate-800/80 pt-2.5 text-[11px] text-slate-400">
                <div className="flex items-start justify-between gap-3">
                  <span className="shrink-0">Client ID</span>
                  <code className="break-all text-right font-mono text-[10px] text-slate-300">
                    {clientId}
                  </code>
                </div>
                {clientMeta?.uri && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="shrink-0">Website</span>
                    <a
                      href={clientMeta.uri}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-w-0 items-center gap-1 truncate text-indigo-400 hover:underline"
                    >
                      <span className="truncate">{clientMeta.uri}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 gap-2.5 min-[360px]:grid-cols-2 sm:gap-3">
            <button
              type="button"
              disabled={submitting !== null}
              onClick={() => handleDecision(false)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-xs font-bold text-slate-200 transition hover:bg-slate-700 disabled:opacity-50 sm:text-sm"
            >
              {submitting === "deny" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 text-rose-400" />
              )}
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting !== null}
              onClick={() => handleDecision(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 disabled:opacity-50 sm:text-sm"
            >
              {submitting === "accept" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Allow &amp; Continue
            </button>
          </div>

          {/* Trust Footer */}
          <p className="text-center text-[11px] leading-relaxed text-slate-400">
            You can revoke access anytime from{" "}
            <Link
              href="/account/apps"
              className="font-semibold text-indigo-400 hover:underline"
            >
              Connected Apps
            </Link>
            . Protected by{" "}
            <Link href="/privacy" className="hover:underline">
              Privacy Policy
            </Link>{" "}
            &amp;{" "}
            <Link href="/terms" className="hover:underline">
              Terms
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

export default function OAuthConsentPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-xs text-slate-400">
          Loading authorization request...
        </div>
      }
    >
      <ConsentInner />
    </Suspense>
  );
}
