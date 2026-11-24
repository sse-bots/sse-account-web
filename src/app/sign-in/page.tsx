"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Loader2, Lock, Mail, Send } from "lucide-react";
import { authClient, signIn } from "@/lib/auth-client";
import { useAuth } from "@/components/AuthContext";
import { OtpCodeInput } from "@/components/OtpCodeInput";
import { SITE_SETTINGS } from "@/lib/site-settings";

function SignInInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, providers, loading: authLoading } = useAuth();

  const [tab, setTab] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [loading, setLoading] = useState<
    "email" | "otp-send" | "otp-verify" | "discord" | "github" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const hasOAuthFlow = Boolean(
    searchParams.get("client_id") ||
      searchParams.get("sig") ||
      searchParams.get("oauth_query")
  );

  const queryStr = searchParams.toString();
  const nextParam = searchParams.get("next");
  const safeNext =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/account";
  const callbackURL = hasOAuthFlow ? `/oauth/consent?${queryStr}` : safeNext;

  useEffect(() => {
    const err = searchParams.get("error");
    const desc = searchParams.get("error_description");
    if (err) {
      setError(desc || `Sign-in failed: ${err.replace(/_/g, " ")}`);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && user && !hasOAuthFlow) {
      router.replace(safeNext);
    }
  }, [authLoading, user, hasOAuthFlow, router, safeNext]);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const t = window.setTimeout(() => setOtpCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [otpCooldown]);

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading("email");
    setError(null);
    try {
      const res = await signIn.email({
        email: email.trim().toLowerCase(),
        password,
        rememberMe: true,
      });
      if (res?.error) {
        setError(res.error.message || "Invalid email or password.");
        setLoading(null);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = res?.data as any;
      if (data?.twoFactorRedirect) {
        window.location.assign(
          `/two-factor?next=${encodeURIComponent(callbackURL)}`
        );
        return;
      }

      if (data?.redirect && data?.url) {
        window.location.assign(data.url);
        return;
      }

      window.location.assign(callbackURL);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
      setLoading(null);
    }
  }

  async function handleSendLoginOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading("otp-send");
    setError(null);
    try {
      const res = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim().toLowerCase(),
        type: "sign-in",
      });
      if (res?.error) {
        setError(res.error.message || "Could not send sign-in code.");
        return;
      }
      setOtpSent(true);
      setOtpCooldown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code.");
    } finally {
      setLoading(null);
    }
  }

  async function handleVerifyLoginOtp(codeOverride?: string) {
    const clean = (codeOverride ?? otpCode).replace(/\D/g, "");
    if (clean.length !== 6) return;
    setLoading("otp-verify");
    setError(null);
    try {
      const res = await authClient.signIn.emailOtp({
        email: email.trim().toLowerCase(),
        otp: clean,
      });
      if (res?.error) {
        setError(res.error.message || "Invalid or expired 6-digit code.");
        setOtpCode("");
        setLoading(null);
        return;
      }
      window.location.assign(callbackURL);
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP sign-in failed.");
      setLoading(null);
    }
  }

  async function handleSocialSignIn(provider: "discord" | "github") {
    if (!providers[provider]) {
      setError(
        `${provider === "github" ? "GitHub" : "Discord"} sign-in is not configured yet.`
      );
      return;
    }
    setLoading(provider);
    setError(null);
    try {
      const origin = window.location.origin;
      const res = await signIn.social({
        provider,
        callbackURL: callbackURL.startsWith("http")
          ? callbackURL
          : `${origin}${callbackURL}`,
        errorCallbackURL: `${origin}/sign-in`,
      });
      if (res?.error) {
        setError(
          res.error.message ||
            `Could not start ${provider === "github" ? "GitHub" : "Discord"} login.`
        );
        setLoading(null);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not start social login."
      );
      setLoading(null);
    }
  }

  if (!authLoading && user && !hasOAuthFlow) {
    return (
      <div className="py-20 text-center text-sm text-slate-400">
        Already signed in — opening your account...
      </div>
    );
  }

  const showSocialDivider =
    SITE_SETTINGS.features.enableEmailPassword &&
    (SITE_SETTINGS.features.enableDiscordOAuth ||
      SITE_SETTINGS.features.enableGitHubOAuth);

  return (
    <div className="mx-auto mt-2 max-w-md sm:mt-8">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-extrabold text-white shadow-lg shadow-indigo-500/25">
            {SITE_SETTINGS.shortName}
          </div>
          <h1 className="text-2xl font-bold text-white">
            {hasOAuthFlow
              ? `Sign in with ${SITE_SETTINGS.brandPrefix}`
              : `Sign in to ${SITE_SETTINGS.siteName}`}
          </h1>
          <p className="mt-1.5 text-xs text-slate-400">
            {hasOAuthFlow
              ? `Authenticate with your ${SITE_SETTINGS.brandPrefix} profile to continue to the requesting application.`
              : `Protected by Two-Step Verification, Email OTP, Discord, and GitHub.`}
          </p>
        </div>

        {/* Password vs Email Code Tabs */}
        {SITE_SETTINGS.features.enableEmailPassword &&
          SITE_SETTINGS.features.enableEmailOtpSignIn && (
            <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl border border-slate-800 bg-slate-950 p-1">
              <button
                type="button"
                onClick={() => {
                  setTab("password");
                  setError(null);
                }}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
                  tab === "password"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Lock className="h-3.5 w-3.5" />
                Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab("otp");
                  setError(null);
                }}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
                  tab === "otp"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <KeyRound className="h-3.5 w-3.5" />
                Email Code
              </button>
            </div>
          )}

        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Password Sign-In Form */}
        {SITE_SETTINGS.features.enableEmailPassword && tab === "password" && (
          <form onSubmit={handleEmailSignIn} className="space-y-3.5">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Email Address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-semibold text-indigo-400 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading !== null}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
            >
              {loading === "email" && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Sign In
            </button>
          </form>
        )}

        {/* Passwordless 6-Digit Email OTP Sign-In */}
        {SITE_SETTINGS.features.enableEmailOtpSignIn && tab === "otp" && (
          <div className="space-y-4">
            <form onSubmit={handleSendLoginOtp} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading !== null || otpCooldown > 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-4 py-2.5 text-xs font-bold text-indigo-300 transition hover:bg-indigo-500/25 disabled:opacity-60"
              >
                {loading === "otp-send" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                {otpCooldown > 0
                  ? `Resend Code in ${otpCooldown}s`
                  : otpSent
                    ? "Resend 6-Digit Code"
                    : "Send 6-Digit Sign-In Code"}
              </button>
            </form>

            {otpSent && (
              <div className="space-y-4 border-t border-slate-800 pt-4">
                <OtpCodeInput
                  value={otpCode}
                  onChange={setOtpCode}
                  onComplete={(c) => handleVerifyLoginOtp(c)}
                  disabled={loading !== null}
                  error={Boolean(error)}
                />
                <button
                  type="button"
                  disabled={loading !== null || otpCode.length < 6}
                  onClick={() => handleVerifyLoginOtp()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {loading === "otp-verify" && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Verify &amp; Sign In
                </button>
              </div>
            )}
          </div>
        )}

        {showSocialDivider && (
          <div className="my-5 flex items-center gap-3 text-[11px] text-slate-500">
            <div className="h-px flex-1 bg-slate-800" />
            <span>OR</span>
            <div className="h-px flex-1 bg-slate-800" />
          </div>
        )}

        <div className="space-y-2.5">
          {SITE_SETTINGS.features.enableDiscordOAuth && (
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => handleSocialSignIn("discord")}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#5865F2] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4752C4] disabled:opacity-60"
            >
              {loading === "discord" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028z" />
                </svg>
              )}
              Continue with Discord
            </button>
          )}

          {SITE_SETTINGS.features.enableGitHubOAuth && (
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => handleSocialSignIn("github")}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-indigo-500 hover:bg-slate-700 disabled:opacity-60"
            >
              {loading === "github" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
              )}
              Continue with GitHub
            </button>
          )}
        </div>

        {SITE_SETTINGS.features.enablePublicSignUp && (
          <p className="mt-5 text-center text-xs text-slate-400">
            Don&apos;t have an {SITE_SETTINGS.brandPrefix} profile?{" "}
            <Link
              href={queryStr ? `/sign-up?${queryStr}` : "/sign-up"}
              className="font-semibold text-indigo-400 hover:underline"
            >
              Create one
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-slate-400">Loading...</div>
      }
    >
      <SignInInner />
    </Suspense>
  );
}
