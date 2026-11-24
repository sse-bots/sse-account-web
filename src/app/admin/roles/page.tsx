"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Edit3,
  Lock,
  Plus,
  Shield,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { SITE_SETTINGS } from "@/lib/site-settings";

interface RoleRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  color: string;
  priority: number;
  permissions: string[];
  isSystem: boolean;
  userCount: number;
}

interface PermOption {
  key: string;
  label: string;
  description: string;
  group: string;
}

const COLOR_SWATCHES = [
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#06b6d4",
  "#84cc16",
  "#f97316",
];

function slugify(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [availablePerms, setAvailablePerms] = useState<PermOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [priority, setPriority] = useState(40);
  const [selectedPerms, setSelectedPerms] = useState<string[]>(["profile:edit"]);
  const [customPermInput, setCustomPermInput] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit modal state
  const [editing, setEditing] = useState<RoleRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editColor, setEditColor] = useState("#6366f1");
  const [editPriority, setEditPriority] = useState(30);
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [editCustomPerm, setEditCustomPerm] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  function flash(type: "ok" | "err", text: string) {
    setToast({ type, text });
    window.setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/roles", {
        cache: "no-store",
        credentials: "include",
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Forbidden.");
        return;
      }
      setRoles(j.roles || []);
      setAvailablePerms(j.availablePermissions || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function togglePerm(list: string[], setList: (v: string[]) => void, key: string) {
    if (list.includes(key)) {
      setList(list.filter((p) => p !== key));
    } else {
      setList([...list, key]);
    }
  }

  function addCustomPerm(
    input: string,
    setInput: (v: string) => void,
    list: string[],
    setList: (v: string[]) => void
  ) {
    const clean = input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9:_-]+/g, "");
    if (!clean || clean === "*") return;
    if (!list.includes(clean)) {
      setList([...list, clean]);
    }
    setInput("");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: slug || slugify(name),
          description,
          color,
          priority: Number(priority),
          permissions: selectedPerms,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        flash("err", j.error || "Could not create role.");
        return;
      }
      setName("");
      setSlug("");
      setSlugTouched(false);
      setDescription("");
      setColor("#6366f1");
      setPriority(40);
      setSelectedPerms(["profile:edit"]);
      setShowCreate(false);
      flash("ok", `Role "${j.slug}" created! Assign it anytime on Registered Users.`);
      await load();
    } finally {
      setCreating(false);
    }
  }

  function openEdit(r: RoleRow) {
    setEditing(r);
    setEditName(r.name);
    setEditDesc(r.description);
    setEditColor(r.color);
    setEditPriority(r.priority);
    setEditPerms([...r.permissions]);
    setEditCustomPerm("");
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSavingEdit(true);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: editing.slug,
          name: editName,
          description: editDesc,
          color: editColor,
          priority: Number(editPriority),
          permissions: editPerms,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        flash("err", j.error || "Could not update role.");
        return;
      }
      setEditing(null);
      flash("ok", "Role updated.");
      await load();
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(r: RoleRow) {
    if (
      !confirm(
        `Delete custom role "${r.name}" (${r.slug})? It will be removed from all assigned users.`
      )
    ) {
      return;
    }
    const res = await fetch(
      `/api/admin/roles?slug=${encodeURIComponent(r.slug)}`,
      { method: "DELETE", credentials: "include" }
    );
    const j = await res.json();
    if (!res.ok) {
      flash("err", j.error || "Could not delete role.");
      return;
    }
    flash("ok", `Role "${r.name}" deleted.`);
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {SITE_SETTINGS.brandPrefix} Roles &amp; Permissions
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Users matching <code>ADMIN_DISCORD_ID</code> are automatically{" "}
            <strong className="text-amber-300">Admin</strong>; everyone else
            starts as <strong className="text-emerald-300">Member</strong>.
            Define custom roles here and they sync across SSE Nexus &amp; all
            connected OAuth apps via <code>sse_roles</code> and{" "}
            <code>sse_permissions</code>.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex items-center gap-2 self-start rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 sm:self-center"
        >
          {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showCreate ? "Close Builder" : "Create Custom Role"}
        </button>
      </div>

      {toast && (
        <div
          className={`rounded-2xl border p-3.5 text-xs font-medium ${
            toast.type === "ok"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/40 bg-rose-500/10 text-rose-300"
          }`}
        >
          {toast.text}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Create Custom Role Form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="space-y-4 rounded-3xl border border-indigo-500/40 bg-slate-900/70 p-4 sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-white">
              Define New Custom Role
            </h2>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
              style={{
                backgroundColor: `${color}22`,
                color,
                border: `1px solid ${color}55`,
              }}
            >
              <Shield className="h-3.5 w-3.5" />
              {name.trim() || "Role Preview"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Role Display Name *
              </label>
              <input
                required
                minLength={2}
                maxLength={48}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
                placeholder="e.g. Developer, Moderator, VIP"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Role Key / Slug *
              </label>
              <input
                required
                minLength={2}
                maxLength={40}
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                }}
                placeholder="developer"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 font-mono text-xs text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Hierarchy Priority (1–99)
              </label>
              <input
                type="number"
                min={1}
                max={99}
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Description
              </label>
              <input
                maxLength={240}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this role unlocks across SSE websites..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Badge Color
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => setColor(swatch)}
                    className={`flex h-6 w-6 items-center justify-center rounded-full border transition ${
                      color === swatch
                        ? "scale-110 border-white ring-2 ring-indigo-400"
                        : "border-slate-700"
                    }`}
                    style={{ backgroundColor: swatch }}
                  >
                    {color === swatch && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </button>
                ))}
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-20 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 font-mono text-[11px] text-white"
                />
              </div>
            </div>
          </div>

          {/* Permissions Checklist */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-slate-300">
              Granted Permissions
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {availablePerms.map((p) => {
                const checked = selectedPerms.includes(p.key);
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() =>
                      togglePerm(selectedPerms, setSelectedPerms, p.key)
                    }
                    className={`flex items-start justify-between gap-2 rounded-xl border p-3 text-left transition ${
                      checked
                        ? "border-indigo-500 bg-indigo-500/15"
                        : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white">
                        {p.label}
                      </div>
                      <div className="font-mono text-[10px] text-indigo-300">
                        {p.key}
                      </div>
                      <div className="mt-0.5 text-[10px] text-slate-400">
                        {p.description}
                      </div>
                    </div>
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        checked
                          ? "border-indigo-500 bg-indigo-600 text-white"
                          : "border-slate-700"
                      }`}
                    >
                      {checked && <Check className="h-3 w-3" />}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Permission Input */}
            <div className="flex gap-2 pt-1">
              <input
                value={customPermInput}
                onChange={(e) => setCustomPermInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomPerm(
                      customPermInput,
                      setCustomPermInput,
                      selectedPerms,
                      setSelectedPerms
                    );
                  }
                }}
                placeholder="Add custom permission key (e.g. store:vip or beta:access)"
                className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-white"
              />
              <button
                type="button"
                onClick={() =>
                  addCustomPerm(
                    customPermInput,
                    setCustomPermInput,
                    selectedPerms,
                    setSelectedPerms
                  )
                }
                className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-700"
              >
                Add Key
              </button>
            </div>

            {selectedPerms.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedPerms.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-2.5 py-0.5 font-mono text-[11px] text-indigo-300"
                  >
                    {p}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedPerms(selectedPerms.filter((x) => x !== p))
                      }
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={creating}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {creating ? "Creating Role..." : "Save Custom Role"}
          </button>
        </form>
      )}

      {/* Existing Roles List */}
      {loading ? (
        <div className="py-10 text-center text-xs text-slate-400">
          Loading roles...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {roles.map((r) => (
            <div
              key={r.slug}
              className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-bold"
                        style={{
                          backgroundColor: `${r.color}22`,
                          color: r.color,
                          border: `1px solid ${r.color}55`,
                        }}
                      >
                        <Tag className="h-3 w-3" />
                        {r.name}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {r.slug}
                      </span>
                      {r.isSystem && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                          <Lock className="h-2.5 w-2.5" />
                          System
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      {r.description || "Custom SSE role."}
                    </p>
                  </div>

                  <div className="text-right text-[11px] text-slate-500">
                    <div>Priority {r.priority}</div>
                    <div className="font-semibold text-slate-300">
                      {r.userCount} user(s)
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {r.permissions.length === 0 ? (
                    <span className="text-[11px] text-slate-500">
                      Badge-only role (no extra permissions)
                    </span>
                  ) : (
                    r.permissions.map((perm) => (
                      <span
                        key={perm}
                        className="rounded bg-slate-950 px-2 py-0.5 font-mono text-[10px] text-indigo-300"
                      >
                        {perm === "*" ? "ALL PERMISSIONS (*)" : perm}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-slate-800/80 pt-3">
                <button
                  type="button"
                  onClick={() => openEdit(r)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-indigo-500 hover:text-white"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit Role
                </button>
                {!r.isSystem && (
                  <button
                    type="button"
                    onClick={() => handleDelete(r)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Role Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveEdit}
            className="max-h-[90dvh] w-full max-w-xl space-y-4 overflow-y-auto rounded-3xl border border-slate-700 bg-[#0b1120] p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">
                Edit Role: <span className="font-mono text-indigo-400">{editing.slug}</span>
              </h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Display Name
                </label>
                <input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>

              {!editing.isSystem && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Priority (1–99)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={editPriority}
                    onChange={(e) => setEditPriority(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Description
              </label>
              <input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Badge Color
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => setEditColor(swatch)}
                    className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                      editColor === swatch
                        ? "scale-110 border-white ring-2 ring-indigo-400"
                        : "border-slate-700"
                    }`}
                    style={{ backgroundColor: swatch }}
                  >
                    {editColor === swatch && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </button>
                ))}
                <input
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="w-20 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 font-mono text-[11px] text-white"
                />
              </div>
            </div>

            {editing.slug !== "admin" && editing.slug !== "head" && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Permissions
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {availablePerms.map((p) => {
                    const checked = editPerms.includes(p.key);
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() =>
                          togglePerm(editPerms, setEditPerms, p.key)
                        }
                        className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs ${
                          checked
                            ? "border-indigo-500 bg-indigo-500/15 text-white"
                            : "border-slate-800 bg-slate-950 text-slate-300"
                        }`}
                      >
                        <span className="truncate">{p.label}</span>
                        {checked && (
                          <Check className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <input
                    value={editCustomPerm}
                    onChange={(e) => setEditCustomPerm(e.target.value)}
                    placeholder="Add custom permission key..."
                    className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 font-mono text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      addCustomPerm(
                        editCustomPerm,
                        setEditCustomPerm,
                        editPerms,
                        setEditPerms
                      )
                    }
                    className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
