"use client";

import { useCallback, useEffect, useState } from "react";
import { Award, Check, Lock, Plus, Trash2, X } from "lucide-react";
import { BadgeIcon } from "@/components/BadgeIcon";
import { SITE_SETTINGS } from "@/lib/site-settings";

interface BadgeRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: "common" | "rare" | "epic" | "legendary" | "staff";
  isAuto: boolean;
  isSystem: boolean;
}

const SWATCHES = [
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#f43f5e",
  "#f59e0b",
  "#84cc16",
  "#f97316",
];

const RARITIES = ["common", "rare", "epic", "legendary", "staff"] as const;

function slugify(v: string) {
  return v
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export default function AdminBadgesPage() {
  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [icons, setIcons] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("trophy");
  const [color, setColor] = useState("#f59e0b");
  const [rarity, setRarity] = useState<BadgeRow["rarity"]>("epic");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/badges", {
        cache: "no-store",
        credentials: "include",
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Forbidden.");
        return;
      }
      setBadges(j.badges || []);
      setIcons(j.iconOptions || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/badges", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: slug || slugify(name),
          description,
          icon,
          color,
          rarity,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Could not create badge.");
        return;
      }
      setName("");
      setSlug("");
      setDescription("");
      setShowCreate(false);
      setToast(`Badge "${j.slug}" created! Assign it to users on Registered Users.`);
      window.setTimeout(() => setToast(null), 4000);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(b: BadgeRow) {
    if (!confirm(`Delete custom badge "${b.name}"?`)) return;
    const res = await fetch(
      `/api/admin/badges?slug=${encodeURIComponent(b.slug)}`,
      { method: "DELETE", credentials: "include" }
    );
    if (res.ok) {
      setToast(`Deleted badge "${b.name}".`);
      window.setTimeout(() => setToast(null), 3500);
      await load();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {SITE_SETTINGS.brandPrefix} Badges Studio
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Design GitHub &amp; Discord-style achievement badges. Auto badges
            unlock automatically; custom badges can be awarded to any user on{" "}
            <strong>Registered Users</strong> and sync across SSE sites via{" "}
            <code>sse_badges</code>.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex items-center gap-2 self-start rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 sm:self-center"
        >
          {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showCreate ? "Close Studio" : "Create Custom Badge"}
        </button>
      </div>

      {toast && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
          {toast}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-300">
          {error}
        </div>
      )}

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="space-y-5 rounded-3xl border border-indigo-500/40 bg-slate-900/70 p-6"
        >
          {/* Live Badge Card Preview */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl border"
                style={{
                  backgroundColor: `${color}22`,
                  borderColor: `${color}66`,
                  color,
                  boxShadow: `0 0 22px ${color}35`,
                }}
              >
                <BadgeIcon name={icon} className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    {name.trim() || "Badge Preview"}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
                    style={{ backgroundColor: `${color}22`, color }}
                  >
                    {rarity}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">
                  {description.trim() || "Custom achievement badge description"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Badge Name *
              </label>
              <input
                required
                minLength={2}
                maxLength={40}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSlug(slugify(e.target.value));
                }}
                placeholder="e.g. Tournament Champion, Bug Hunter"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Slug *
              </label>
              <input
                required
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="tournament_champion"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 font-mono text-xs text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Rarity Tier
              </label>
              <select
                value={rarity}
                onChange={(e) =>
                  setRarity(e.target.value as BadgeRow["rarity"])
                }
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs capitalize text-white"
              >
                {RARITIES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Description
            </label>
            <input
              maxLength={180}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain how a member earns this badge..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">
                Choose Icon
              </label>
              <div className="grid grid-cols-8 gap-2">
                {icons.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    title={ic}
                    className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                      icon === ic
                        ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                        : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                    }`}
                  >
                    <BadgeIcon name={ic} className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">
                Badge Color
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {SWATCHES.map((sw) => (
                  <button
                    key={sw}
                    type="button"
                    onClick={() => setColor(sw)}
                    className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                      color === sw
                        ? "scale-110 border-white ring-2 ring-indigo-400"
                        : "border-slate-700"
                    }`}
                    style={{ backgroundColor: sw }}
                  >
                    {color === sw && <Check className="h-3.5 w-3.5 text-white" />}
                  </button>
                ))}
                <input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-20 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 font-mono text-[11px] text-white"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Publish Badge"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="py-10 text-center text-xs text-slate-400">
          Loading badges...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {badges.map((b) => (
            <div
              key={b.slug}
              className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border"
                  style={{
                    backgroundColor: `${b.color}20`,
                    borderColor: `${b.color}55`,
                    color: b.color,
                  }}
                >
                  <BadgeIcon name={b.icon} className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="truncate text-sm font-bold text-white">
                      {b.name}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
                      style={{ backgroundColor: `${b.color}20`, color: b.color }}
                    >
                      {b.rarity}
                    </span>
                  </div>
                  <div className="font-mono text-[10px] text-slate-500">
                    {b.slug}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{b.description}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-3">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                  {b.isAuto ? (
                    <>
                      <Lock className="h-3 w-3" />
                      Auto-Unlocked Achievement
                    </>
                  ) : (
                    <>
                      <Award className="h-3 w-3 text-indigo-400" />
                      Admin-Awarded Custom
                    </>
                  )}
                </span>

                {!b.isSystem && (
                  <button
                    type="button"
                    onClick={() => handleDelete(b)}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/20"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
