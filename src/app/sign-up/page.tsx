"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock, Mail, User } from "lucide-react";
import { signIn, signUp } from "@/lib/auth-client";
import { useAuth } from "@/components/AuthContext";
import { SITE_SETTINGS } from "@/lib/site-settings";

function SignUpInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"email" | "discord" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasOAuthFlow = Boolean(
    searchParams.get("client_id") ||
      searchParams.get("sig") ||
      searchParams.get("oauth_query")
  );
  const queryStr = searchParams.toString();
  const callbackURL = hasOAuthFlow ? `/oauth/consent?${queryStr}` : "/account";

  useEffect(() => {
    if (!authLoading && user && !hasOAuthFlow) {
      router.replace("/account");
    }
  }, [authLoading, user, hasOAuthFlow, router]);

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setLoading("email");
    setError(null);
    try {
      const res = await signUp.email({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      if (res?.error) {
        setError(res.error.message || "Could not create account.");
        setLoading(null);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = res?.data as any;
      if (data?.redirect && data?.url) {
        window.location.assign(data.url);
        return;
      }

      window.location.assign(callbackURL);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
      setLoading(null);
    }
  }

  async function handleDiscordSignUp() {
    setLoading("discord");
    setError(null);
    try {
      const res = await signIn.social({ provider: "discord", callbackURL });
      if (res?.error) {
        setError(res.error.message || "Could not start Discord signup.");
        setLoading(null);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not start Discord signup."
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

  return (
    <div className="mx-auto mt-8 max-w-md">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-7 shadow-2xl sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-extrabold text-white shadow-lg shadow-indigo-500/25">
            {SITE_SETTINGS.shortName}
          </div>
          <h1 className="text-2xl font-bold text-white">
            Create {SITE_SETTINGS.brandPrefix} Profile
          </h1>
          <p className="mt-1.5 text-xs text-slate-400">
            One account for every {SITE_SETTINGS.brandPrefix} website. You can
            link Discord anytime from your profile.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateAccount} className="space-y-3.5">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Display Name
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                required
                autoComplete="name"
                minLength={2}
                maxLength={64}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

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
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Password (min. 8 characters)
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a strong password"
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
            Create Account
          </button>
        </form>

        {SITE_SETTINGS.features.enableDiscordOAuth && (
          <>
            <div className="my-5 flex items-center gap-3 text-[11px] text-slate-500">
              <div className="h-px flex-1 bg-slate-800" />
              <span>OR</span>
              <div className="h-px flex-1 bg-slate-800" />
            </div>

            <button
              type="button"
              disabled={loading !== null}
              onClick={handleDiscordSignUp}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#5865F2] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4752C4] disabled:opacity-60"
            >
              {loading === "discord" && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Sign up with Discord
            </button>
          </>
        )}

        <p className="mt-5 text-center text-xs text-slate-400">
          Already have an account?{" "}
          <Link
            href={queryStr ? `/sign-in?${queryStr}` : "/sign-in"}
            className="font-semibold text-indigo-400 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-slate-400">Loading...</div>
      }
    >
      <SignUpInner />
    </Suspense>
  );
}
