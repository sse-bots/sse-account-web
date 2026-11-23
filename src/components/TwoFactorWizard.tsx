"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  Shield,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { CopyButton } from "@/components/CopyButton";
import { OtpCodeInput } from "@/components/OtpCodeInput";
import { SITE_SETTINGS } from "@/lib/site-settings";

interface TwoFactorWizardProps {
  twoFactorEnabled: boolean;
  hasPassword: boolean;
  email: string;
  emailOtpConfigured: boolean;
  onUpdated: () => Promise<void> | void;
}

function extractSecretFromUri(uri: string): string {
  try {
    const parsed = new URL(uri);
    return parsed.searchParams.get("secret") || "";
  } catch {
    const match = uri.match(/secret=([A-Z2-7]+)/i);
    return match ? match[1] : "";
  }
}

function useTotpCountdown(): number {
  const [secs, setSecs] = useState(() => 30 - (Math.floor(Date.now() / 1000) % 30));
  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecs(30 - (Math.floor(Date.now() / 1000) % 30));
    }, 500);
    return () => window.clearInterval(timer);
  }, []);
  return secs;
}

export function TwoFactorWizard({
  twoFactorEnabled,
  hasPassword,
  email,
  emailOtpConfigured,
  onUpdated,
}: TwoFactorWizardProps) {
  const secondsLeft = useTotpCountdown();

  // Wizard state: idle -> password -> qr -> verify -> backups
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState<"password" | "scan" | "backups">("password");
  const [password, setPassword] = useState("");
  const [totpUri, setTotpUri] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [manualSecret, setManualSecret] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [otpCode, setOtpCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  // Management modals (Regenerate backup codes / Disable 2FA)
  const [modalMode, setModalMode] = useState<"regen" | "disable" | null>(null);
  const [modalPassword, setModalPassword] = useState("");
  const [regeneratedCodes, setRegeneratedCodes] = useState<string[] | null>(null);

  useEffect(() => {
    if (!totpUri) {
      setQrDataUrl("");
      return;
    }
    QRCode.toDataURL(totpUri, {
      width: 240,
      margin: 2,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(""));
  }, [totpUri]);

  function openSetupWizard() {
    setWizardOpen(true);
    setStep("password");
    setPassword("");
    setOtpCode("");
    setError(null);
    setTotpUri("");
    setManualSecret("");
    setBackupCodes([]);
  }

  async function handleStartSetup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await authClient.twoFactor.enable({
        password,
        method: "totp",
        issuer: SITE_SETTINGS.siteName,
      });
      if (res?.error) {
        setError(res.error.message || "Incorrect password or 2FA start failed.");
        return;
      }
      const data = res?.data;
      if (!data || data.method !== "totp" || !data.totpURI) {
        setError("Server did not return an authenticator setup URI.");
        return;
      }
      setTotpUri(data.totpURI);
      setManualSecret(extractSecretFromUri(data.totpURI));
      setBackupCodes(Array.isArray(data.backupCodes) ? data.backupCodes : []);
      setStep("scan");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start 2FA setup.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyEnrollment(codeOverride?: string) {
    const clean = (codeOverride ?? otpCode).replace(/\D/g, "");
    if (clean.length !== 6) {
      setError("Enter all 6 digits from your authenticator app.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await authClient.twoFactor.verifyTotp({
        code: clean,
        trustDevice: true,
      });
      if (res?.error) {
        setError(
          res.error.message || "Invalid 6-digit code. Wait for the next code and try again."
        );
        setOtpCode("");
        return;
      }
      await onUpdated();
      setStep("backups");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  }

  function downloadBackupCodes(codes: string[]) {
    const text = [
      `${SITE_SETTINGS.siteName} — Two-Step Backup Recovery Codes`,
      `Account: ${email}`,
      `Generated: ${new Date().toLocaleString()}`,
      `Each code can only be used ONCE. Store this file somewhere safe.`,
      "",
      ...codes.map((c, i) => `${String(i + 1).padStart(2, "0")}. ${c}`),
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${SITE_SETTINGS.brandPrefix.toLowerCase()}-2fa-recovery-codes.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleModalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!modalMode) return;
    setBusy(true);
    setError(null);
    try {
      if (modalMode === "disable") {
        const res = await authClient.twoFactor.disable({
          password: modalPassword,
        });
        if (res?.error) {
          setError(res.error.message || "Incorrect password.");
          return;
        }
        setModalMode(null);
        setModalPassword("");
        setBanner({
          type: "ok",
          text: "Two-Step Verification has been turned off.",
        });
        await onUpdated();
      } else if (modalMode === "regen") {
        const res = await authClient.twoFactor.generateBackupCodes({
          password: modalPassword,
        });
        if (res?.error) {
          setError(res.error.message || "Incorrect password.");
          return;
        }
        setRegeneratedCodes(res?.data?.backupCodes || []);
        setModalPassword("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-[#101525] to-indigo-950/60 p-6">
      {/* Header Row */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
              twoFactorEnabled
                ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.3)]"
                : "border-indigo-500/40 bg-indigo-500/15 text-indigo-400"
            }`}
          >
            {twoFactorEnabled ? (
              <ShieldCheck className="h-6 w-6" />
            ) : (
              <Shield className="h-6 w-6" />
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-extrabold text-white">
                Two-Step Verification (2FA Vault)
              </h2>
              {twoFactorEnabled ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  <Sparkles className="h-3 w-3" />
                  Protected
                </span>
              ) : (
                <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                  Recommended
                </span>
              )}
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
              Protect your {SITE_SETTINGS.brandPrefix} identity with an{" "}
              <strong className="text-slate-200">Authenticator App (TOTP)</strong>,{" "}
              <strong className="text-slate-200">Email OTP fallback</strong>,{" "}
              <strong className="text-slate-200">10 Recovery Codes</strong>, and{" "}
              <strong className="text-slate-200">30-day Trusted Devices</strong>.
              Enabling 2FA also unlocks the epic{" "}
              <strong className="text-cyan-300">2FA Guardian</strong> badge.
            </p>
          </div>
        </div>

        {!twoFactorEnabled && hasPassword && !wizardOpen && (
          <button
            type="button"
            onClick={openSetupWizard}
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500"
          >
            <ShieldCheck className="h-4 w-4" />
            Enable 2-Step Vault
          </button>
        )}
      </div>

      {banner && (
        <div
          className={`mt-4 rounded-2xl border p-3.5 text-xs ${
            banner.type === "ok"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/40 bg-rose-500/10 text-rose-300"
          }`}
        >
          {banner.text}
        </div>
      )}

      {/* 3 Method Status Cards */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex items-center justify-between">
            <Smartphone className="h-4 w-4 text-indigo-400" />
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                twoFactorEnabled
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {twoFactorEnabled ? "Active" : "Not Set"}
            </span>
          </div>
          <div className="mt-2.5 text-xs font-bold text-white">
            Authenticator App (TOTP)
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Google Auth, Authy, 1Password, Microsoft Authenticator.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex items-center justify-between">
            <Mail className="h-4 w-4 text-sky-400" />
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                twoFactorEnabled && emailOtpConfigured
                  ? "bg-emerald-500/15 text-emerald-300"
                  : emailOtpConfigured
                    ? "bg-sky-500/15 text-sky-300"
                    : "bg-amber-500/15 text-amber-300"
              }`}
            >
              {twoFactorEnabled && emailOtpConfigured
                ? "Ready"
                : emailOtpConfigured
                  ? "Available"
                  : "SMTP / Resend Needed"}
            </span>
          </div>
          <div className="mt-2.5 text-xs font-bold text-white">
            Email One-Time Code
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">
            6-digit security code emailed directly to {email}.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex items-center justify-between">
            <KeyRound className="h-4 w-4 text-amber-400" />
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                twoFactorEnabled
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {twoFactorEnabled ? "10 Codes Issued" : "Auto-Generated"}
            </span>
          </div>
          <div className="mt-2.5 text-xs font-bold text-white">
            Backup Recovery Codes
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Single-use emergency keys if you lose your authenticator.
          </p>
        </div>
      </div>

      {/* Prompt social-only users to set an account password first */}
      {!hasPassword && !twoFactorEnabled && (
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4 text-xs text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <span>
            You signed up with Discord/GitHub and don&apos;t have an SSE account
            password yet. Set a password in the{" "}
            <strong>Add Email &amp; Password Login</strong> section below first,
            then enable 2-Step Verification!
          </span>
        </div>
      )}

      {/* Active 2FA Action Bar */}
      {twoFactorEnabled && !wizardOpen && (
        <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-slate-800/80 pt-4">
          <button
            type="button"
            onClick={() => {
              setModalMode("regen");
              setModalPassword("");
              setRegeneratedCodes(null);
              setError(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-white hover:border-indigo-500"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Regenerate Recovery Codes
          </button>

          <button
            type="button"
            onClick={() => {
              setModalMode("disable");
              setModalPassword("");
              setError(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/35 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
          >
            <ShieldOff className="h-3.5 w-3.5" />
            Disable 2-Step Verification
          </button>
        </div>
      )}

      {/* ====================================================================
          3-Step Guided Setup Wizard
         ==================================================================== */}
      {wizardOpen && (
        <div className="animate-sheet-up mt-6 rounded-3xl border border-indigo-500/45 bg-slate-950/90 p-5 sm:p-6">
          {/* Progress Stepper */}
          <div className="mb-5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold">
              {(
                [
                  { id: "password", num: 1, label: "Confirm" },
                  { id: "scan", num: 2, label: "Scan & Verify" },
                  { id: "backups", num: 3, label: "Recovery Kit" },
                ] as const
              ).map((s, idx) => {
                const done =
                  (step === "scan" && idx === 0) ||
                  (step === "backups" && idx < 2);
                const current = step === s.id;
                return (
                  <div key={s.id} className="flex items-center gap-1.5">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-extrabold ${
                        done
                          ? "bg-emerald-600 text-white"
                          : current
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.num}
                    </span>
                    <span
                      className={`hidden sm:inline ${
                        current ? "text-white" : "text-slate-400"
                      }`}
                    >
                      {s.label}
                    </span>
                    {idx < 2 && <span className="mx-1 text-slate-600">→</span>}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setWizardOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* STEP 1: Password Confirmation */}
          {step === "password" && (
            <form onSubmit={handleStartSetup} className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  Step 1: Confirm Your Account Password
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Enter your current password to generate a unique encrypted
                  TOTP secret key and 10 single-use backup codes.
                </p>
              </div>

              <div className="relative max-w-sm">
                <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2.5 pl-9 pr-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Generate Authenticator QR
              </button>
            </form>
          )}

          {/* STEP 2: Scan QR Code + Enter 6-Digit Verification Code */}
          {step === "scan" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="flex flex-col items-center rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-center">
                <span className="mb-3 rounded-full bg-indigo-500/15 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                  Scan With Authenticator App
                </span>

                <div className="rounded-2xl border-4 border-indigo-500/40 bg-white p-3 shadow-[0_0_30px_var(--accent-glow)]">
                  {qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrDataUrl}
                      alt="2FA QR Code"
                      className="h-44 w-44"
                    />
                  ) : (
                    <div className="flex h-44 w-44 items-center justify-center text-xs text-slate-500">
                      Generating QR...
                    </div>
                  )}
                </div>

                {manualSecret && (
                  <div className="mt-4 w-full space-y-1.5 text-left">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Can&apos;t scan? Enter setup key manually:
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                      <code className="truncate font-mono text-xs font-semibold text-indigo-300">
                        {manualSecret}
                      </code>
                      <CopyButton value={manualSecret} label="Copy" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-center space-y-5">
                <div>
                  <h3 className="text-base font-bold text-white">
                    Step 2: Enter the 6-Digit Code
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Open Google Authenticator, Authy, 1Password, or Microsoft
                    Authenticator, scan the QR code, and enter the 6-digit code
                    shown.
                  </p>
                </div>

                <OtpCodeInput
                  value={otpCode}
                  onChange={setOtpCode}
                  onComplete={(c) => handleVerifyEnrollment(c)}
                  disabled={busy}
                  error={Boolean(error)}
                />

                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-3.5 py-2 text-xs text-slate-400">
                  <span>Current code refreshes in</span>
                  <span className="font-mono font-bold text-indigo-400">
                    {secondsLeft}s
                  </span>
                </div>

                <button
                  type="button"
                  disabled={busy || otpCode.length < 6}
                  onClick={() => handleVerifyEnrollment()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Verify &amp; Activate 2-Step Vault
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Save 10 Single-Use Backup Recovery Codes */}
          {step === "backups" && (
            <div className="space-y-5">
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Two-Step Verification Is Now Active!
                  </h3>
                  <p className="mt-0.5 text-xs text-emerald-200">
                    Save these 10 single-use backup codes in a safe place. Each
                    code lets you recover your account if you ever lose access
                    to your authenticator app.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 font-mono text-xs sm:grid-cols-5">
                {backupCodes.map((code, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-2 text-center font-semibold text-indigo-300"
                  >
                    {code}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <CopyButton value={backupCodes.join("\n")} label="Copy All Codes" />
                  <button
                    type="button"
                    onClick={() => downloadBackupCodes(backupCodes)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download .txt Kit
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setWizardOpen(false);
                    setBanner({
                      type: "ok",
                      text: "2FA Vault active! You also unlocked the 2FA Guardian badge.",
                    });
                  }}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  I&apos;ve Saved My Codes — Done
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Regenerate Backup Codes OR Disable 2FA */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="animate-sheet-up w-full max-w-md space-y-4 rounded-3xl border border-slate-700 bg-[#0b1120] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {modalMode === "disable"
                  ? "Disable Two-Step Verification"
                  : "Regenerate Recovery Codes"}
              </h3>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
                {error}
              </div>
            )}

            {regeneratedCodes ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-300">
                  Your old recovery codes are invalidated. Save these 10 new
                  codes now:
                </p>
                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs">
                  {regeneratedCodes.map((c, i) => (
                    <div
                      key={i}
                      className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-center text-indigo-300"
                    >
                      {c}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex gap-2">
                    <CopyButton
                      value={regeneratedCodes.join("\n")}
                      label="Copy All"
                    />
                    <button
                      type="button"
                      onClick={() => downloadBackupCodes(regeneratedCodes)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200"
                    >
                      <Download className="h-3.5 w-3.5" />
                      .txt
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalMode(null)}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleModalSubmit} className="space-y-4">
                <p className="text-xs text-slate-400">
                  {modalMode === "disable"
                    ? "Enter your password to turn off 2-Step Verification. Your account will be less secure."
                    : "Enter your password to generate 10 fresh backup codes. Any previously saved codes will stop working."}
                </p>

                <input
                  type="password"
                  required
                  autoFocus
                  value={modalPassword}
                  onChange={(e) => setModalPassword(e.target.value)}
                  placeholder="Confirm account password"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white"
                />

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalMode(null)}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className={`rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-50 ${
                      modalMode === "disable"
                        ? "bg-rose-600 hover:bg-rose-500"
                        : "bg-indigo-600 hover:bg-indigo-500"
                    }`}
                  >
                    {busy
                      ? "Processing..."
                      : modalMode === "disable"
                        ? "Disable 2FA"
                        : "Generate New Codes"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
