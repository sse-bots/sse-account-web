"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, Lock, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { OtpCodeInput } from "@/components/OtpCodeInput";
import { SITE_SETTINGS } from "@/lib/site-settings";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "reset" | "done">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim().toLowerCase(),
        type: "forget-password",
      });
      if (res?.error) {
        setError(res.error.message || "Could not send password reset code.");
        return;
      }
      setStep("reset");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("Enter all 6 digits from your reset email.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await authClient.emailOtp.resetPassword({
        email: email.trim().toLowerCase(),
        otp,
        password: newPassword,
      });
      if (res?.error) {
        setError(res.error.message || "Invalid code or password reset failed.");
        return;
      }
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-10 max-w-md">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-7 shadow-2xl sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-400">
            <KeyRound className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
          <p className="mt-1 text-xs text-slate-400">
            Recover your {SITE_SETTINGS.siteName} password using a 6-digit email
            verification code.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        {step === "email" && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Registered Email Address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-9 pr-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Send 6-Digit Reset Code
            </button>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <p className="text-center text-xs text-slate-400">
              Enter the 6-digit code sent to <strong className="text-white">{email}</strong>
            </p>

            <OtpCodeInput value={otp} onChange={setOtp} disabled={loading} />

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                New Password (min. 8 characters)
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Choose a new strong password"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-9 pr-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Update Password
            </button>
          </form>
        )}

        {step === "done" && (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Password Updated!</h2>
            <p className="text-xs text-slate-400">
              You can now sign in with your new password.
            </p>
            <Link
              href="/sign-in"
              className="inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500"
            >
              Go to Sign In
            </Link>
          </div>
        )}

        {step !== "done" && (
          <div className="mt-5 text-center">
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
