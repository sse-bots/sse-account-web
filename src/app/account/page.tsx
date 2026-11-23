"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Save, ShieldCheck, User } from "lucide-react";
import { SITE_SETTINGS } from "@/lib/site-settings";

interface ProfileUser {
  userId: string;
  name: string;
  username: string | null;
  bio: string | null;
  email: string;
  image: string | null;
  discordId: string | null;
  discordUsername: string | null;
  role: "owner" | "admin" | "user";
}

export default function AccountProfilePage() {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [image, setImage] = useState("");

  useEffect(() => {
    fetch("/api/account/profile", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user) {
          setUser(d.user);
          setName(d.user.name || "");
          setUsername(d.user.username || "");
          setEmail(d.user.email || "");
          setBio(d.user.bio || "");
          setImage(d.user.image || "");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, email, bio, image }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Could not save profile.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="py-16 text-center text-slate-400">Loading profile...</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
        <p className="text-sm text-slate-300">
          Please sign in to manage your {SITE_SETTINGS.brandPrefix} profile.
        </p>
        <Link
          href="/sign-in"
          className="mt-4 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Identity Card */}
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
                Discord: {user.discordId}
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

      {/* Editable Profile Form */}
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
