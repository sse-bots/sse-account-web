"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ShieldCheck, X } from "lucide-react";
import {
  VERIFICATION_KINDS,
  type AccountVerification,
} from "@/lib/badge-constants";

export interface VerifiedBadgeProps {
  verification?: AccountVerification | null;
  accountName?: string;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
}

const SIZE_MAP = {
  sm: "h-[1.05em] w-[1.05em] min-h-4 min-w-4",
  md: "h-[0.95em] w-[0.95em] min-h-5 min-w-5",
  lg: "h-6 w-6",
};

export function VerifiedBadge({
  verification,
  accountName,
  size = "md",
  interactive = true,
}: VerifiedBadgeProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!verification?.isVerified) return null;

  const meta =
    VERIFICATION_KINDS.find((k) => k.value === verification.kind) ||
    VERIFICATION_KINDS[0];

  const verifiedDate = verification.verifiedAt
    ? new Date(verification.verifiedAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const sealSvg = (className: string) => (
    <svg
      viewBox="0 0 24 24"
      className={`block shrink-0 ${className}`}
      aria-hidden="true"
    >
      <path
        fill={meta.color}
        d="M12 1.75l2.33 1.98 3.04-.26.94 2.9 2.66 1.5-.62 2.99 1.62 2.6-1.98 2.33.26 3.04-2.9.94-1.5 2.66-2.99-.62-2.6 1.62-2.33-1.98-3.04.26-.94-2.9-2.66-1.5.62-2.99-1.62-2.6 1.98-2.33-.26-3.04 2.9-.94 1.5-2.66 2.99.62L12 1.75z"
      />
      <path
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.5 12.2l2.3 2.3 4.8-5"
      />
    </svg>
  );

  if (!interactive) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center align-middle leading-none"
        title={verification.label || meta.title}
      >
        {sealSvg(SIZE_MAP[size])}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={`Verified account${accountName ? `: ${accountName}` : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Verified — Tap for details"
        className="inline-flex shrink-0 translate-y-[0.04em] items-center justify-center rounded-full align-middle leading-none transition-transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
      >
        {sealSvg(SIZE_MAP[size])}
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Verified account details"
            className="animate-backdrop-in fixed inset-0 z-[80] flex items-end justify-center bg-black/65 p-3 backdrop-blur-xs sm:items-center sm:p-4"
            onClick={() => setOpen(false)}
          >
            <div
              className="animate-sheet-up w-full max-w-sm overflow-hidden rounded-3xl border border-slate-700 bg-[#0b1120] p-5 text-left shadow-2xl sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag indicator for mobile sheet feel */}
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-700 sm:hidden" />

              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border"
                    style={{
                      backgroundColor: `${meta.color}1a`,
                      borderColor: `${meta.color}44`,
                    }}
                  >
                    {sealSvg("h-6 w-6")}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-extrabold text-white">
                        Verified
                      </span>
                    </div>
                    <div
                      className="truncate text-xs font-semibold"
                      style={{ color: meta.color }}
                    >
                      {verification.label || meta.title}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="shrink-0 rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {accountName && (
                <div className="mt-4 flex items-center gap-1.5 rounded-2xl border border-slate-800 bg-slate-950/70 px-3.5 py-2.5 text-xs">
                  <span className="truncate font-bold text-white">
                    {accountName}
                  </span>
                  {sealSvg("h-4 w-4")}
                </div>
              )}

              <p className="mt-3.5 text-xs leading-relaxed text-slate-300">
                {verification.note || meta.defaultNote}
              </p>

              <div className="mt-4 space-y-2 border-t border-slate-800 pt-3.5 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <span>Confirmed by SSE Accounts Admins &amp; Heads</span>
                </div>
                {verifiedDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                    <span>Verified since {verifiedDate}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-5 w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500"
              >
                Got it
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
