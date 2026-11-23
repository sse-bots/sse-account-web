"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Users } from "lucide-react";
import { SITE_SETTINGS } from "@/lib/site-settings";

interface AdminUserRow {
  id: string;
  name: string;
  username: string | null;
  email: string;
  discordId: string | null;
  role: string;
  createdAt: string | null;
}

export default function AdminUsersPage() {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/users?q=${encodeURIComponent(query)}`,
        { cache: "no-store" }
      );
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Forbidden.");
        return;
      }
      setRows(j.users || []);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const t = window.setTimeout(load, 250);
    return () => window.clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Registered {SITE_SETTINGS.brandPrefix} Users
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            All central identity profiles stored in the dedicated accounts
            database.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, Discord ID..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-8 pr-3 text-xs text-white"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-xs text-slate-400">
          Loading profiles...
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-10 text-center text-xs text-slate-400">
          <Users className="mx-auto mb-2 h-8 w-8 text-slate-500" />
          No matching accounts found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-4 py-2.5">Name / Username</th>
                <th className="px-4 py-2.5">Email</th>
                <th className="px-4 py-2.5">Linked Discord ID</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/50">
              {rows.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2.5">
                    <div className="font-semibold text-white">{u.name}</div>
                    {u.username && (
                      <div className="font-mono text-[11px] text-slate-500">
                        @{u.username}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-300">{u.email}</td>
                  <td className="px-4 py-2.5 font-mono text-indigo-300">
                    {u.discordId || "Not linked"}
                  </td>
                  <td className="px-4 py-2.5 uppercase text-slate-300">
                    {u.role}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {u.createdAt
                      ? new Date(u.createdAt).toLocaleDateString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
