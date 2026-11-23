"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Globe, ShieldCheck, Trash2 } from "lucide-react";
import { SITE_SETTINGS } from "@/lib/site-settings";

interface ConsentRow {
  id: string;
  clientId: string;
  clientName: string;
  clientUri: string | null;
  clientIcon: string | null;
  scopes: string[];
  connectionType?: "trusted" | "authorized";
  createdAt: string | null;
}

export default function AccountConnectedAppsPage() {
  const [consents, setConsents] = useState<ConsentRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/account/consents", {
        cache: "no-store",
        credentials: "include",
      });
      if (res.ok) {
        const j = await res.json();
        setConsents(j.consents || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function revokeApp(clientId: string, name: string) {
    if (
      !confirm(
        `Revoke access for ${name}? Active OAuth tokens will be invalidated immediately.`
      )
    ) {
      return;
    }
    await fetch(
      `/api/account/consents?clientId=${encodeURIComponent(clientId)}`,
      { method: "DELETE", credentials: "include" }
    );
    load();
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-400">
        Loading connected apps...
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="flex items-center gap-2">
        <Globe className="h-5 w-5 text-indigo-400" />
        <h2 className="text-base font-bold text-white">
          Connected Websites ({consents.length})
        </h2>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        Every official and third-party website you have signed into using{" "}
        {SITE_SETTINGS.siteName}. Revoking an app invalidates all active tokens
        and consents immediately.
      </p>

      {consents.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/50 p-8 text-center text-xs text-slate-400">
          You haven&apos;t signed into any connected {SITE_SETTINGS.brandPrefix}{" "}
          websites yet.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {consents.map((c) => (
            <div
              key={c.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:flex-row sm:items-center"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    {c.clientName}
                  </span>
                  {c.connectionType === "trusted" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      <ShieldCheck className="h-3 w-3" />
                      Official 1st-Party
                    </span>
                  ) : (
                    <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                      Authorized App
                    </span>
                  )}
                  {c.clientUri && (
                    <a
                      href={c.clientUri}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:underline"
                    >
                      Open
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                {c.createdAt && (
                  <div className="text-[11px] text-slate-500">
                    Last authorized: {new Date(c.createdAt).toLocaleString()}
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {c.scopes.map((s) => (
                    <span
                      key={s}
                      className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-300"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => revokeApp(c.clientId, c.clientName)}
                className="inline-flex items-center gap-1.5 self-start rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 sm:self-center"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Revoke Access
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
