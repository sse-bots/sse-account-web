"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  KeyRound,
  Link2,
  LogOut,
  Monitor,
  Trash2,
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

export default function AccountSecurityPage() {
  const { user, refreshUser } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revokeOthers, setRevokeOthers] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [savingPwd, setSavingPwd] = useState(false);

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

  async function linkDiscord() {
    await authClient.linkSocial({
      provider: "discord",
      callbackURL: "/account/security",
    });
  }

  async function revokeSession(sessionId: string) {
    await fetch(
      `/api/account/sessions?sessionId=${encodeURIComponent(sessionId)}`,
      { method: "DELETE", credentials: "include" }
    );
    await loadSessions();
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Linked Discord Account */}
      {SITE_SETTINGS.features.enableDiscordOAuth && (
        <section className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-indigo-400" />
              <h2 className="text-base font-bold text-white">
                Linked Discord Account
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              {user.discordId
                ? `Connected to Discord ID ${user.discordId}. Required for SSE Nexus server detection and Discord SSO login.`
                : "Link your Discord account so SSE Nexus and Tournament portals can recognize your servers."}
            </p>
          </div>

          {user.discordId ? (
            <span className="inline-flex items-center gap-1.5 self-start rounded-xl bg-emerald-500/15 px-3.5 py-2 text-xs font-semibold text-emerald-300 sm:self-center">
              <CheckCircle2 className="h-4 w-4" />
              Discord Linked
            </span>
          ) : (
            <button
              type="button"
              onClick={linkDiscord}
              className="inline-flex items-center gap-2 self-start rounded-xl bg-[#5865F2] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4752C4] sm:self-center"
            >
              Link Discord Account
            </button>
          )}
        </section>
      )}

      {/* Password Management (Change Password OR Set Initial Password for Discord-only accounts) */}
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
              You signed up via Discord. Set a password if you also want to sign
              in using <strong>{user.email}</strong>.
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
