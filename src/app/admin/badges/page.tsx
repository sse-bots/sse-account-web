"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Award,
  Check,
  Edit3,
  Image as ImageIcon,
  Lock,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { BadgeArtwork } from "@/components/BadgeArtwork";
import { BadgeIcon } from "@/components/BadgeIcon";
import { SITE_SETTINGS } from "@/lib/site-settings";
import type { BadgeCategory, BadgeRarity } from "@/lib/badges";

interface BadgeRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  howToEarn: string;
  icon: string;
  imageUrl: string | null;
  color: string;
  rarity: BadgeRarity;
  category: BadgeCategory;
  isAuto: boolean;
  isSystem: boolean;
  isLegacy: boolean;
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

const RARITIES: BadgeRarity[] = [
  "common",
  "rare",
  "epic",
  "legendary",
  "staff",
];

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

  const [studioOpen, setStudioOpen] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [howToEarn, setHowToEarn] = useState("");
  const [icon, setIcon] = useState("trophy");
  const [imageUrl, setImageUrl] = useState("");
  const [color, setColor] = useState("#f59e0b");
  const [rarity, setRarity] = useState<BadgeRarity>("epic");
  const [category, setCategory] = useState<BadgeCategory>("achievement");
  const [isLegacy, setIsLegacy] = useState(false);
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

  function openCreate() {
    setEditingSlug(null);
    setName("");
    setSlug("");
    setDescription("");
    setHowToEarn("");
    setIcon("trophy");
    setImageUrl("");
    setColor("#f59e0b");
    setRarity("epic");
    setCategory("achievement");
    setIsLegacy(false);
    setStudioOpen(true);
  }

  function openEdit(b: BadgeRow) {
    setEditingSlug(b.slug);
    setName(b.name);
    setSlug(b.slug);
    setDescription(b.description);
    setHowToEarn(b.howToEarn || "");
    setIcon(b.icon);
    setImageUrl(b.imageUrl || "");
    setColor(b.color);
    setRarity(b.rarity);
    setCategory(b.category);
    setIsLegacy(Boolean(b.isLegacy));
    setStudioOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const isEditing = Boolean(editingSlug);
      const res = await fetch("/api/admin/badges", {
        method: isEditing ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: isEditing ? editingSlug : slug || slugify(name),
          description,
          howToEarn,
          icon,
          imageUrl: imageUrl.trim(),
          color,
          rarity,
          category,
          isLegacy,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Could not save badge.");
        return;
      }
      setStudioOpen(false);
      setEditingSlug(null);
      setToast(
        isEditing
          ? `Updated badge "${name}".`
          : `Badge "${j.slug}" published! Assign it on Registered Users.`
      );
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
            Design GitHub-style circular achievement medallions &amp; Highlights
            badges. Supports animated PNG/GIF artwork URLs and syncs across SSE
            sites via <code>sse_badges</code>.
          </p>
        </div>

        <button
          type="button"
          onClick={() => (studioOpen ? setStudioOpen(false) : openCreate())}
          className="inline-flex items-center gap-2 self-start rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 sm:self-center"
        >
          {studioOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {studioOpen ? "Close Studio" : "Create Custom Badge"}
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

      {studioOpen && (
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-3xl border border-indigo-500/40 bg-slate-900/70 p-4 sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex items-center gap-4">
              <BadgeArtwork
                slug={slug || "preview"}
                name={name.trim() || "Badge Preview"}
                icon={icon}
                color={color}
                imageUrl={imageUrl.trim() || null}
                tier={1}
                size="md"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    {name.trim() || "Badge Preview"}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
                    style={{ backgroundColor: `${color}22`, color }}
                  >
                    {rarity}
                  </span>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-300">
                    {category}
                  </span>
                  {isLegacy && (
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-300">
                      Legacy
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {description.trim() || "Custom achievement badge description"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                  if (!editingSlug) setSlug(slugify(e.target.value));
                }}
                placeholder="e.g. Arena Champion"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Slug *
              </label>
              <input
                required
                disabled={Boolean(editingSlug)}
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="arena_champion"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 font-mono text-xs text-white disabled:opacity-60"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as BadgeCategory)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white"
              >
                <option value="achievement">Achievement (Circular Medallion)</option>
                <option value="highlight">Highlight (Sidebar List Badge)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Rarity Tier
              </label>
              <select
                value={rarity}
                onChange={(e) => setRarity(e.target.value as BadgeRarity)}
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Description
              </label>
              <input
                maxLength={180}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short summary shown in the badge card..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                How to Earn
              </label>
              <input
                maxLength={200}
                value={howToEarn}
                onChange={(e) => setHowToEarn(e.target.value)}
                placeholder="Explain how a member unlocks this badge..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-300">
                <ImageIcon className="h-3.5 w-3.5 text-indigo-400" />
                Custom Artwork URL (Optional PNG / GIF / WebP)
              </label>
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://... (leave empty for built-in GitHub vector medallion)"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white"
              />
            </div>

            <div className="flex items-end pb-1">
              <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-950/70 px-3.5 py-2.5 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={isLegacy}
                  onChange={(e) => setIsLegacy(e.target.checked)}
                  className="h-4 w-4 accent-indigo-500"
                />
                <span>
                  Mark as <strong className="text-white">Legacy / Limited</strong>{" "}
                  badge
                </span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">
                Medallion Emblem
              </label>
              <div className="grid grid-cols-4 gap-2 min-[360px]:grid-cols-6 sm:grid-cols-8">
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
                Accent Color
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

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editingSlug
                  ? "Save Badge Changes"
                  : "Publish Badge"}
            </button>
            <button
              type="button"
              onClick={() => setStudioOpen(false)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200"
            >
              Cancel
            </button>
          </div>
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
              className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
            >
              <div className="flex items-start gap-3.5">
                {b.category === "highlight" ? (
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border"
                    style={{
                      backgroundColor: `${b.color}20`,
                      borderColor: `${b.color}55`,
                      color: b.color,
                    }}
                  >
                    <BadgeIcon name={b.icon} className="h-5 w-5" />
                  </div>
                ) : (
                  <BadgeArtwork
                    slug={b.slug}
                    name={b.name}
                    icon={b.icon}
                    color={b.color}
                    imageUrl={b.imageUrl}
                    size="sm"
                  />
                )}

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
                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
                    <span>{b.slug}</span>
                    <span>·</span>
                    <span className="capitalize">{b.category}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{b.description}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-800/80 pt-3">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                  {b.isAuto ? (
                    <>
                      <Lock className="h-3 w-3" />
                      Auto-Unlocked
                    </>
                  ) : b.category === "highlight" ? (
                    <>
                      <Sparkles className="h-3 w-3 text-amber-400" />
                      Highlight Badge
                    </>
                  ) : (
                    <>
                      <Award className="h-3 w-3 text-indigo-400" />
                      {b.isSystem ? "Built-In Award" : "Custom Award"}
                    </>
                  )}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEdit(b)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:border-indigo-500 hover:text-white"
                  >
                    <Edit3 className="h-3 w-3" />
                    Edit
                  </button>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
