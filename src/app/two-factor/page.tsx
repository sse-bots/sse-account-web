"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  Send,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { OtpCodeInput } from "@/components/OtpCodeInput";
import { SITE_SETTINGS } from "@/lib/site-settings";

type MethodTab = "totp" | "email" | "backup";

function TwoFactorChallengeInner() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const safeNext =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/account";

  const [method, setMethod] = useState<MethodTab>("totp");
  const [code, setCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [totpSeconds, setTotpSeconds] = useState(
    () => 30 - (Math.floor(Date.now() / 1000) % 30)
  );

  useEffect(() => {
    const t = window.setInterval(() => {
      setTotpSeconds(30 - (Math.floor(Date.now() / 1000) % 30));
    }, 500);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  function switchMethod(next: MethodTab) {
    setMethod(next);
    setCode("");
    setBackupCode("");
    setError(null);
  }

  async function handleSendEmailOtp() {
    setSendingEmail(true);
    setError(null);
    try {
      const res = await authClient.twoFactor.sendOtp();
      if (res?.error) {
        setError(
          res.error.message ||
            "Could not send email code. Ensure email delivery is configured or use your Authenticator App."
        );
        return;
      }
      setEmailSent(true);
      setCooldown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email code.");
    } finally {
      setSendingEmail(false);
    }
  }

  async function verifyCode(codeOverride?: string) {
    setSubmitting(true);
    setError(null);
    try {
      if (method === "totp") {
        const clean = (codeOverride ?? code).replace(/\D/g, "");
        if (clean.length !== 6) {
          setError("Enter all 6 digits from your authenticator app.");
          setSubmitting(false);
          return;
        }
        const res = await authClient.twoFactor.verifyTotp({
          code: clean,
          trustDevice,
        });
        if (res?.error) {
          setError(res.error.message || "Invalid authenticator code.");
          setCode("");
          setSubmitting(false);
          return;
        }
        window.location.assign(safeNext);
      } else if (method === "email") {
        const clean = (codeOverride ?? code).replace(/\D/g, "");
        if (clean.length !== 6) {
          setError("Enter all 6 digits sent to your email.");
          setSubmitting(false);
          return;
        }
        const res = await authClient.twoFactor.verifyOtp({
          code: clean,
          trustDevice,
        });
        if (res?.error) {
          setError(res.error.message || "Invalid or expired email code.");
          setCode("");
          setSubmitting(false);
          return;
        }
        window.location.assign(safeNext);
      } else {
        const clean = backupCode.trim();
        if (!clean) {
          setError("Enter one of your backup recovery codes.");
          setSubmitting(false);
          return;
        }
        const res = await authClient.twoFactor.verifyBackupCode({
          code: clean,
          trustDevice,
        });
        if (res?.error) {
          setError(res.error.message || "Invalid or already used backup code.");
          setSubmitting(false);
          return;
        }
        window.location.assign(safeNext);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
      setSubmitting(false);
    }
  }

  // Circular SVG countdown ring for TOTP (radius 13 -> circumference ~81.68)
  const circumference = 2 * Math.PI * 13;
  const strokeDashoffset = circumference * (1 - totpSeconds / 30);

  return (
    <div className="mx-auto mt-2 max-w-md sm:mt-10">
      <div className="relative overflow-hidden rounded-3xl border border-indigo-500/35 bg-gradient-to-br from-slate-900 via-[#101525] to-indigo-950/60 p-5 shadow-2xl sm:p-8">
        {/* Vault Shield Hero */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="animate-vault-float mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-xl shadow-indigo-500/25">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <span className="rounded-full border border-indigo-500/35 bg-indigo-500/15 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-indigo-300">
            {SITE_SETTINGS.siteName} · 2-Step Vault
          </span>
          <h1 className="mt-2.5 text-2xl font-extrabold text-white">
            Verify It&apos;s You
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Complete the second verification step to unlock your{" "}
            {SITE_SETTINGS.brandPrefix} session.
          </p>
        </div>

        {/* 3-Method Segmented Pill Switcher */}
        <div className="mb-6 grid grid-cols-3 gap-1.5 rounded-2xl border border-slate-800 bg-slate-950/90 p-1.5">
          {(
            [
              { id: "totp", label: "Authenticator", icon: Smartphone },
              { id: "email", label: "Email OTP", icon: Mail },
              { id: "backup", label: "Backup Key", icon: KeyRound },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = method === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => switchMethod(t.id)}
                className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-[10px] font-bold transition sm:px-2 sm:text-[11px] ${
                  active
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-center text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* METHOD 1: TOTP Authenticator */}
        {method === "totp" && (
          <div className="space-y-5">
            <OtpCodeInput
              value={code}
              onChange={setCode}
              onComplete={(c) => verifyCode(c)}
              disabled={submitting}
              error={Boolean(error)}
            />

            <div className="flex items-center justify-center gap-2.5 text-xs text-slate-400">
              <svg className="h-8 w-8 -rotate-90" viewBox="0 0 32 32">
                <circle
                  cx="16"
                  cy="16"
                  r="13"
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity="0.18"
                  strokeWidth="3"
                />
                <circle
                  cx="16"
                  cy="16"
                  r="13"
                  fill="none"
                  stroke="var(--accent-500)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500"
                />
              </svg>
              <span>
                Code rotates in{" "}
                <strong className="font-mono text-white">{totpSeconds}s</strong>
              </span>
            </div>
          </div>
        )}

        {/* METHOD 2: Email One-Time Code */}
        {method === "email" && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-center">
              <p className="text-xs text-slate-300">
                {emailSent
                  ? "We sent a 6-digit verification code to your account email."
                  : "Send a 6-digit verification code to your registered email address."}
              </p>
              <button
                type="button"
                disabled={sendingEmail || cooldown > 0}
                onClick={handleSendEmailOtp}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-4 py-2 text-xs font-bold text-indigo-300 transition hover:bg-indigo-500/25 disabled:opacity-50"
              >
                {sendingEmail ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                {cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : emailSent
                    ? "Resend Email Code"
                    : "Send 6-Digit Email Code"}
              </button>
            </div>

            {emailSent && (
              <OtpCodeInput
                value={code}
                onChange={setCode}
                onComplete={(c) => verifyCode(c)}
                disabled={submitting}
                error={Boolean(error)}
              />
            )}
          </div>
        )}

        {/* METHOD 3: Backup Recovery Code */}
        {method === "backup" && (
          <div className="space-y-3">
            <label className="block text-xs font-medium text-slate-300">
              Enter a 10-character Backup Recovery Code
            </label>
            <input
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value)}
              placeholder="e.g. a1b2c-d3e4f"
              autoFocus
              className="w-full rounded-2xl border-2 border-slate-800 bg-slate-950 px-4 py-3 text-center font-mono text-base font-bold tracking-widest text-white placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
            />
            <p className="text-center text-[11px] text-slate-400">
              Each recovery code works once and is permanently consumed after
              sign-in.
            </p>
          </div>
        )}

        {/* Trust Device Toggle + Verify Button */}
        <div className="mt-6 space-y-4">
          <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-xs text-slate-300">
            <span className="flex items-center gap-2">
              <CheckCircle2
                className={`h-4 w-4 ${
                  trustDevice ? "text-emerald-400" : "text-slate-600"
                }`}
              />
              Trust this device for 30 days
            </span>
            <input
              type="checkbox"
              checked={trustDevice}
              onChange={(e) => setTrustDevice(e.target.checked)}
              className="h-4 w-4 accent-indigo-500"
            />
          </label>

          <button
            type="button"
            disabled={
              submitting ||
              (method === "totp" && code.length < 6) ||
              (method === "email" && (!emailSent || code.length < 6)) ||
              (method === "backup" && !backupCode.trim())
            }
            onClick={() => verifyCode()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Verify &amp; Continue
          </button>

          <div className="text-center">
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TwoFactorPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-slate-400">
          Loading 2-Step Vault...
        </div>
      }
    >
      <TwoFactorChallengeInner />
    </Suspense>
  );
}
