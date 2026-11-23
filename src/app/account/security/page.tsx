"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Link2,
  Loader2,
  LogOut,
  Monitor,
  Trash2,
  Unlink,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useAuth } from "@/components/AuthContext";
import { SITE_SETTINGS } from "@/lib/site-settings";

interface SessionRow {
  id: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string | null;
  expiresAt: string | null;
  isCurrent: boolean;
}

function formatLinkError(code: string | null, description?: string | null): string {
  if (!code) return "";
  const normalized = code.toLowerCase();
  if (normalized === "account_already_linked_to_different_user") {
    return "This social account is already linked to a different SSE profile. Sign into that profile and unlink it first, or sign in directly using that provider.";
  }
  if (
    normalized === "email_doesn't_match" ||
    normalized === "email_does_not_match"
  ) {
    return "Email address mismatch while linking. Please re-try after redeploying with allowDifferentEmails enabled.";
  }
  if (normalized === "access_denied") {
    return "Authorization was cancelled before linking finished.";
  }
  if (normalized === "state_mismatch" || normalized === "invalid_state") {
    return "OAuth linking session expired. Please click Link again.";
  }
  if (description) return `${description} (${code})`;
  return `Could not link account: ${code.replace(/_/g, " ")}.`;
}

function SecurityPageInner() {
  const { user, providers, refreshUser } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const [linkBanner, setLinkBanner] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [linkingProvider, setLinkingProvider] = useState<
    "discord" | "github" | null
  >(null);
  const [unlinkingProvider, setUnlinkingProvider] = useState<
    "discord" | "github" | null
  >(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revokeOthers, setRevokeOthers] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [savingPwd, setSavingPwd] = useState(false);

  // Read OAuth link callback result (?linked=discord / ?linked=github / ?error=...)
  useEffect(() => {
    const errCode = searchParams.get("error");
    const errDesc = searchParams.get("error_description");
    const linked = searchParams.get("linked");

    if (errCode) {
      setLinkBanner({
        type: "err",
        text: formatLinkError(errCode, errDesc),
      });
      router.replace("/account/security");
    } else if (linked === "discord" || linked === "github") {
      setLinkBanner({
        type: "ok",
        text: `${linked === "discord" ? "Discord" : "GitHub"} account linked successfully!`,
      });
      refreshUser();
      router.replace("/account/security");
    }
  }, [searchParams, refreshUser, router]);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const sessRes = await fetch("/api/account/sessions", {
        cache: "no-store",
        credentials: "include",
      });
      if (sessRes.ok) {
        const sj = await sessRes.json();
        setSessions(sj.sessions || []);
      }
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  async function handleLinkProvider(provider: "discord" | "github") {
    if (!providers[provider]) {
      setLinkBanner({
        type: "err",
        text:
          provider === "github"
            ? "GitHub OAuth is not configured on this server yet. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in Vercel Environment Variables."
            : "Discord OAuth is not configured on this server yet. Add DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET in Vercel Environment Variables.",
      });
      return;
    }

    setLinkingProvider(provider);
    setLinkBanner(null);

    try {
      const origin = window.location.origin;
      const res = await authClient.linkSocial({
        provider,
        callbackURL: `${origin}/account/security?linked=${provider}`,
        errorCallbackURL: `${origin}/account/security`,
      });

      if (res?.error) {
        setLinkBanner({
          type: "err",
          text:
            res.error.message ||
            `Could not start ${provider === "discord" ? "Discord" : "GitHub"} linking.`,
        });
        setLinkingProvider(null);
        return;
      }

      // If client returned a redirect URL manually instead of auto-redirecting
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const url = (res?.data as any)?.url;
      if (typeof url === "string" && url) {
        window.location.assign(url);
      }
    } catch (err) {
      setLinkBanner({
        type: "err",
        text:
          err instanceof Error
            ? err.message
            : `Failed to start ${provider} linking.`,
      });
      setLinkingProvider(null);
    }
  }

  async function handleUnlinkProvider(provider: "discord" | "github") {
    const label = provider === "discord" ? "Discord" : "GitHub";
    if (!confirm(`Unlink your ${label} account from this SSE profile?`)) {
      return;
    }

    setUnlinkingProvider(provider);
    setLinkBanner(null);
    try {
      const res = await fetch("/api/account/unlink", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId: provider }),
      });
      const j = await res.json();
      if (!res.ok) {
        setLinkBanner({
          type: "err",
          text: j.error || `Could not unlink ${label}.`,
        });
        return;
      }
      setLinkBanner({
        type: "ok",
        text: `${label} account unlinked from your profile.`,
      });
      await refreshUser();
    } catch {
      setLinkBanner({
        type: "err",
        text: `Network error while unlinking ${label}.`,
      });
    } finally {
      setUnlinkingProvider(null);
    }
  }

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSavingPwd(true);
    setPwdMsg(null);
    try {
      const res = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: revokeOthers,
      });
      if (res?.error) {
        setPwdMsg({
          type: "err",
          text: res.error.message || "Could not update password.",
        });
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setPwdMsg({ type: "ok", text: "Password updated successfully." });
      await loadSessions();
    } catch (err) {
      setPwdMsg({
        type: "err",
        text: err instanceof Error ? err.message : "Password update failed.",
      });
    } finally {
      setSavingPwd(false);
    }
  }

  async function handleSetInitialPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: "err", text: "Passwords do not match." });
      return;
    }
    setSavingPwd(true);
    setPwdMsg(null);
    try {
      const res = await fetch("/api/account/set-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const j = await res.json();
      if (!res.ok) {
        setPwdMsg({
          type: "err",
          text: j.error || "Could not set password.",
        });
        return;
      }
      setNewPassword("");
      setConfirmPassword("");
      setPwdMsg({
        type: "ok",
        text: "Password created! You can now sign in with Email + Password too.",
      });
      await refreshUser();
    } catch {
      setPwdMsg({ type: "err", text: "Network error while setting password." });
    } finally {
      setSavingPwd(false);
    }
  }

  async function revokeSession(sessionId: string) {
    await fetch(
      `/api/account/sessions?sessionId=${encodeURIComponent(sessionId)}`,
      { method: "DELETE", credentials: "include" }
    );
    await loadSessions();
  }

  if (!user) return null;

  const isDiscordLinked =
    Boolean(user.discordId) || user.linkedProviders.includes("discord");
  const isGitHubLinked =
    Boolean(user.githubId) || user.linkedProviders.includes("github");
  const totalSignInMethods =
    (user.hasPassword ? 1 : 0) +
    (isDiscordLinked ? 1 : 0) +
    (isGitHubLinked ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Connected Social Accounts (Discord + GitHub) */}
      {(SITE_SETTINGS.features.enableDiscordOAuth ||
        SITE_SETTINGS.features.enableGitHubOAuth) && (
        <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <div>
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-indigo-400" />
              <h2 className="text-base font-bold text-white">
                Connected Accounts
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Link Discord and GitHub to sign in faster and sync your identity
              across all {SITE_SETTINGS.brandPrefix} websites — even if they use
              a different email address.
            </p>
          </div>

          {linkBanner && (
            <div
              className={`flex items-start gap-2.5 rounded-2xl border p-3.5 text-xs ${
                linkBanner.type === "ok"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-rose-500/40 bg-rose-500/10 text-rose-300"
              }`}
            >
              {linkBanner.type === "ok" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              )}
              <span>{linkBanner.text}</span>
            </div>
          )}

          <div className="space-y-3">
            {/* Discord Account Row */}
            {SITE_SETTINGS.features.enableDiscordOAuth && (
              <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5865F2] text-white">
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        Discord
                      </span>
                      {isDiscordLinked && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          Connected
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {isDiscordLinked
                        ? `${user.discordUsername ? `@${user.discordUsername} · ` : ""}ID: ${user.discordId}`
                        : "Required for SSE Nexus server detection, bot activation, and Discord SSO login."}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {isDiscordLinked ? (
                    <button
                      type="button"
                      disabled={
                        unlinkingProvider !== null || totalSignInMethods <= 1
                      }
                      title={
                        totalSignInMethods <= 1
                          ? "Set a password or link GitHub before unlinking Discord"
                          : "Unlink Discord"
                      }
                      onClick={() => handleUnlinkProvider("discord")}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {unlinkingProvider === "discord" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Unlink className="h-3.5 w-3.5" />
                      )}
                      Unlink
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={linkingProvider !== null}
                      onClick={() => handleLinkProvider("discord")}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#5865F2] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4752C4] disabled:opacity-60"
                    >
                      {linkingProvider === "discord" && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      )}
                      Link Discord
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* GitHub Account Row */}
            {SITE_SETTINGS.features.enableGitHubOAuth && (
              <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-white">
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        GitHub
                      </span>
                      {isGitHubLinked && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          Connected
                        </span>
                      )}
                      {!providers.github && !isGitHubLinked && (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                          Env Keys Required
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {isGitHubLinked
                        ? `${user.githubUsername ? `@${user.githubUsername} · ` : ""}ID: ${user.githubId}`
                        : "Connect your GitHub developer account for one-click sign-in and SSE developer verification."}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {isGitHubLinked ? (
                    <button
                      type="button"
                      disabled={
                        unlinkingProvider !== null || totalSignInMethods <= 1
                      }
                      title={
                        totalSignInMethods <= 1
                          ? "Set a password or link Discord before unlinking GitHub"
                          : "Unlink GitHub"
                      }
                      onClick={() => handleUnlinkProvider("github")}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {unlinkingProvider === "github" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Unlink className="h-3.5 w-3.5" />
                      )}
                      Unlink
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={linkingProvider !== null}
                      onClick={() => handleLinkProvider("github")}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:border-indigo-500 hover:bg-slate-700 disabled:opacity-60"
                    >
                      {linkingProvider === "github" && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      )}
                      Link GitHub
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Password Management */}
      {user.hasPassword ? (
        <form
          onSubmit={handlePasswordUpdate}
          className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-6"
        >
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Change Password</h2>
          </div>

          {pwdMsg && (
            <div
              className={`rounded-xl border p-3 text-xs ${
                pwdMsg.type === "ok"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-rose-500/40 bg-rose-500/10 text-rose-300"
              }`}
            >
              {pwdMsg.text}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                New Password (min. 8 chars)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={revokeOthers}
              onChange={(e) => setRevokeOthers(e.target.checked)}
              className="h-4 w-4 accent-indigo-500"
            />
            Sign out all other devices after changing password
          </label>

          <button
            type="submit"
            disabled={savingPwd}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {savingPwd ? "Updating..." : "Update Password"}
          </button>
        </form>
      ) : (
        <form
          onSubmit={handleSetInitialPassword}
          className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-6"
        >
          <div>
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-indigo-400" />
              <h2 className="text-base font-bold text-white">
                Add Email &amp; Password Login
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              You signed up via a social provider. Set a password if you also
              want to sign in using <strong>{user.email}</strong>.
            </p>
          </div>

          {pwdMsg && (
            <div
              className={`rounded-xl border p-3 text-xs ${
                pwdMsg.type === "ok"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-rose-500/40 bg-rose-500/10 text-rose-300"
              }`}
            >
              {pwdMsg.text}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                New Password (min. 8 chars)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Confirm Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingPwd}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {savingPwd ? "Saving..." : "Set Password"}
          </button>
        </form>
      )}

      {/* Active Sessions */}
      <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-indigo-400" />
            <h2 className="text-base font-bold text-white">
              Active Browser Sessions ({sessions.length})
            </h2>
          </div>

          {sessions.length > 1 && (
            <button
              type="button"
              onClick={() => revokeSession("others")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
            >
              <LogOut className="h-3.5 w-3.5" />
              Revoke All Other Sessions
            </button>
          )}
        </div>

        {loadingSessions ? (
          <div className="py-6 text-center text-xs text-slate-400">
            Loading active sessions...
          </div>
        ) : (
          <div className="space-y-2.5">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs font-semibold text-white">
                      {s.userAgent.slice(0, 80)}
                    </span>
                    {s.isCurrent && (
                      <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                        This Device
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[11px] text-slate-500">
                    IP: {s.ipAddress} · Started{" "}
                    {s.createdAt ? new Date(s.createdAt).toLocaleString() : "-"}
                  </div>
                </div>

                {!s.isCurrent && (
                  <button
                    type="button"
                    onClick={() => revokeSession(s.id)}
                    className="inline-flex items-center gap-1 self-start rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 sm:self-center"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function AccountSecurityPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-xs text-slate-400">
          Loading security settings...
        </div>
      }
    >
      <SecurityPageInner />
    </Suspense>
  );
}
