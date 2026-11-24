"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { VERIFICATION_KINDS, type AccountVerification } from "@/lib/badges";

export interface VerifiedBadgeProps {
  verification?: AccountVerification | null;
  accountName?: string;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
}

const SIZE_MAP = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function VerifiedBadge({
  verification,
  accountName,
  size = "md",
  interactive = true,
}: VerifiedBadgeProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
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
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
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
        className="inline-flex shrink-0 items-center align-middle"
        title={verification.label || meta.title}
      >
        {sealSvg(SIZE_MAP[size])}
      </span>
    );
  }

  return (
    <span
      ref={wrapRef}
      className="relative inline-flex shrink-0 items-center align-middle"
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label={`Verified account${accountName ? `: ${accountName}` : ""}`}
        aria-expanded={open}
        title="Verified — Click for details"
        className="inline-flex items-center justify-center rounded-full p-0.5 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
      >
        {sealSvg(SIZE_MAP[size])}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Verified account details"
          className="absolute left-0 top-full z-50 mt-2 w-72 max-w-[85vw] rounded-2xl border border-slate-700 bg-[#0b1120] p-4 text-left shadow-2xl"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="shrink-0">{sealSvg("h-6 w-6")}</span>
              <div>
                <div className="text-sm font-extrabold text-white">Verified</div>
                <div
                  className="text-[11px] font-semibold"
                  style={{ color: meta.color }}
                >
                  {verification.label || meta.title}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="mt-2.5 text-xs leading-relaxed text-slate-300">
            {verification.note || meta.defaultNote}
          </p>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-800 pt-2.5 text-[10px] font-medium text-slate-400">
            <span>Verified by SSE Admins &amp; Heads</span>
            {verifiedDate && <span className="shrink-0">Since {verifiedDate}</span>}
          </div>
        </div>
      )}
    </span>
  );
}
