"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Save, ShieldCheck, User } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { SITE_SETTINGS } from "@/lib/site-settings";

export default function AccountProfilePage() {
  const { user, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [image, setImage] = useState("");

  useEffect(() => {
    if (!user) return;
    setName(user.name || "");
    setUsername(user.username || "");
    setEmail(user.email || "");
    setBio(user.bio || "");
    setImage(user.image || "");
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, email, bio, image }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Could not save profile.");
        return;
      }
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch {
      setError("Network error while saving profile.");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={name}
            className="h-16 w-16 rounded-2xl object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white">
            <User className="h-8 w-8" />
          </div>
        )}

        <div>
          <h2 className="text-xl font-bold text-white">{name || user.name}</h2>
          <p className="text-xs text-slate-400">{email || user.email}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-semibold text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              {SITE_SETTINGS.brandPrefix} ID Active
            </span>
            {user.discordId && (
              <span className="rounded-full bg-indigo-500/15 px-2.5 py-0.5 font-mono text-indigo-300">
                Discord: {user.discordUsername ? `@${user.discordUsername}` : user.discordId}
              </span>
            )}
            {user.githubId && (
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 font-mono text-slate-200">
                GitHub: {user.githubUsername ? `@${user.githubUsername}` : user.githubId}
              </span>
            )}
            {user.role !== "user" && (
              <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 font-bold uppercase text-amber-300">
                {user.role}
              </span>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-300">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-6"
      >
        <h3 className="text-base font-bold text-white">Personal Information</h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Display Name *
            </label>
            <input
              required
              minLength={2}
              maxLength={64}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              {SITE_SETTINGS.brandPrefix} Username (optional)
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. shashikant.sse"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Primary Email *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Avatar Image URL (optional)
            </label>
            <input
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-300">
            Short Bio (optional)
          </label>
          <textarea
            rows={3}
            maxLength={240}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell SSE communities a little about yourself..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Profile Changes"}
          </button>

          {saved && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Profile updated!
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
