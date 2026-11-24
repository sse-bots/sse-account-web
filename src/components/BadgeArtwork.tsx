"use client";

import React from "react";
import type { BadgeTier } from "@/lib/badges";

export interface BadgeArtworkProps {
  slug?: string;
  name: string;
  icon: string;
  color: string;
  imageUrl?: string | null;
  tier?: BadgeTier;
  size?: "xs" | "sm" | "md" | "lg";
  locked?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<BadgeArtworkProps["size"]>, string> = {
  xs: "h-7 w-7 border-[2px]",
  sm: "h-11 w-11 border-[2.5px]",
  md: "h-16 w-16 border-[3px]",
  lg: "h-28 w-28 border-[4px]",
};

const TIER_STYLES: Record<
  BadgeTier,
  { label: string; bg: string; text: string; border: string }
> = {
  1: { label: "", bg: "", text: "", border: "" },
  2: {
    label: "x2",
    bg: "linear-gradient(135deg, #d97706, #92400e)",
    text: "#ffffff",
    border: "#fef3c7",
  },
  3: {
    label: "x3",
    bg: "linear-gradient(135deg, #f8fafc, #94a3b8)",
    text: "#0f172a",
    border: "#ffffff",
  },
  4: {
    label: "x4",
    bg: "linear-gradient(135deg, #fef08a, #f59e0b)",
    text: "#451a03",
    border: "#fef9c3",
  },
};

function getGradientPalette(
  icon: string,
  color: string,
  slug?: string
): [string, string, string] {
  if (slug === "pull_shark") return ["#60a5fa", "#2563eb", "#172554"];
  if (slug === "galaxy_brain") return ["#d8b4fe", "#7c3aed", "#2e1065"];
  if (slug === "heart_on_sleeve") return ["#fbcfe8", "#ec4899", "#831843"];
  const map: Record<string, [string, string, string]> = {
    crown: ["#fef08a", "#f59e0b", "#78350f"],
    trophy: ["#fde68a", "#ea580c", "#7c2d12"],
    "shield-check": ["#67e8f9", "#0284c7", "#1e3a8a"],
    code: ["#f5d0fe", "#9333ea", "#4c1d95"],
    sparkles: ["#c4b5fd", "#7c3aed", "#2e1065"],
    rocket: ["#6ee7b7", "#059669", "#064e3b"],
    bug: ["#fda4af", "#e11d48", "#881337"],
    heart: ["#f9a8d4", "#db2777", "#831843"],
    star: ["#fde047", "#f97316", "#9a3412"],
    zap: ["#60a5fa", "#2563eb", "#172554"],
    flame: ["#fdba74", "#ef4444", "#7f1d1d"],
    award: ["#d8b4fe", "#9333ea", "#3b0764"],
    "message-square": ["#a5b4fc", "#5865F2", "#1e1b4b"],
    "badge-check": ["#7dd3fc", "#0284c7", "#0c4a6e"],
    gem: ["#f472b6", "#a855f7", "#3b0764"],
    lock: ["#6ee7b7", "#10b981", "#064e3b"],
  };
  return map[icon] || [color, color, "#0f172a"];
}

function MedallionIllustration({ icon, slug }: { icon: string; slug?: string }) {
  if (slug === "pull_shark") {
    return (
      <g>
        <path
          d="M50 18C53 26 53 32 51 35C63 37 73 46 76 59C70 55 64 56 62 60C57 52 43 52 38 60C36 56 30 55 24 59C27 46 37 37 49 35C47 32 47 26 50 18Z"
          fill="#E0F2FE"
          stroke="#1E3A8A"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />
        <circle cx="40" cy="46" r="2.6" fill="#0F172A" />
        <circle cx="60" cy="46" r="2.6" fill="#0F172A" />
        <rect x="39" y="55" width="22" height="24" rx="4" fill="#FFFFFF" stroke="#1E3A8A" strokeWidth="2.4" />
        <path d="M45 62V72M45 62C50 62 55 64 55 69V72" fill="none" stroke="#1D4ED8" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="45" cy="61" r="2.3" fill="#2563EB" />
        <circle cx="45" cy="73" r="2.3" fill="#2563EB" />
        <circle cx="55" cy="73" r="2.3" fill="#2563EB" />
      </g>
    );
  }
  switch (icon) {
    case "crown":
      return (
        <g>
          <path d="M22 61L28 34L42 47L50 27L58 47L72 34L78 61H22Z" fill="#FFFBEB" stroke="#78350F" strokeWidth="3" strokeLinejoin="round" />
          <rect x="24" y="63" width="52" height="9" rx="4.5" fill="#FDE68A" stroke="#78350F" strokeWidth="2.5" />
          <circle cx="50" cy="25" r="4.5" fill="#FFFFFF" />
          <circle cx="27" cy="32" r="3.2" fill="#FEF08A" />
          <circle cx="73" cy="32" r="3.2" fill="#FEF08A" />
        </g>
      );
    case "trophy":
      return (
        <g>
          <path d="M33 25H67V43C67 53 59.5 60 50 60C40.5 60 33 53 33 43V25Z" fill="#FEF3C7" stroke="#7C2D12" strokeWidth="3" />
          <path d="M33 32H23C23 42 27 48 34 48M67 32H77C77 42 73 48 66 48" fill="none" stroke="#FDE68A" strokeWidth="4" strokeLinecap="round" />
          <rect x="45" y="60" width="10" height="10" fill="#FDE68A" stroke="#7C2D12" strokeWidth="2.5" />
          <rect x="34" y="70" width="32" height="8" rx="4" fill="#FBBF24" stroke="#7C2D12" strokeWidth="2.5" />
          <path d="M50 32L52.6 37.8L58.5 38.5L54 42.6L55.2 48.5L50 45.6L44.8 48.5L46 42.6L41.5 38.5L47.4 37.8L50 32Z" fill="#EA580C" />
        </g>
      );
    case "code":
      return (
        <g>
          <path d="M50 18L66 54H34L50 18Z" fill="#FAE8FF" stroke="#581C87" strokeWidth="3" strokeLinejoin="round" />
          <ellipse cx="50" cy="56" rx="30" ry="8.5" fill="#E879F9" stroke="#581C87" strokeWidth="3" />
          <path d="M38 74L31 69L38 64M62 74L69 69L62 64M52 63L48 75" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="50" cy="36" r="3.5" fill="#FEF08A" />
        </g>
      );
    case "shield-check":
      return (
        <g>
          <path d="M50 19L76 30V49C76 66 64.5 78.5 50 84C35.5 78.5 24 66 24 49V30L50 19Z" fill="#ECFEFF" stroke="#1E3A8A" strokeWidth="3" strokeLinejoin="round" />
          <path d="M38 51L46.5 59.5L63 42" fill="none" stroke="#0284C7" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    case "rocket":
      return (
        <g>
          <path d="M50 18C62 28 66 44 62 60H38C34 44 38 28 50 18Z" fill="#ECFDF5" stroke="#064E3B" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="50" cy="40" r="7" fill="#34D399" stroke="#064E3B" strokeWidth="2.5" />
          <path d="M38 52L27 64L39 62M62 52L73 64L61 62" fill="#A7F3D0" stroke="#064E3B" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M44 64L50 80L56 64" fill="#FDE047" />
        </g>
      );
    case "sparkles":
      return (
        <g>
          <circle cx="50" cy="50" r="22" fill="#EDE9FE" fillOpacity="0.25" stroke="#EDE9FE" strokeWidth="2.5" />
          <ellipse cx="50" cy="50" rx="31" ry="11" transform="rotate(-24 50 50)" fill="none" stroke="#FFFFFF" strokeWidth="3" />
          <circle cx="50" cy="50" r="13" fill="#F5F3FF" />
          <circle cx="71" cy="34" r="4" fill="#FDE047" />
          <circle cx="28" cy="64" r="3" fill="#38BDF8" />
        </g>
      );
    case "bug":
      return (
        <g>
          <ellipse cx="50" cy="55" rx="17" ry="20" fill="#FFE4E6" stroke="#881337" strokeWidth="3" />
          <circle cx="50" cy="33" r="9" fill="#881337" />
          <path d="M50 35V75M26 44L34 48M24 56H33M27 68L35 63M74 44L66 48M76 56H67M73 68L65 63" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="43" cy="50" r="2.8" fill="#E11D48" />
          <circle cx="57" cy="58" r="2.8" fill="#E11D48" />
        </g>
      );
    case "heart":
      return (
        <path d="M50 77C50 77 22 59 22 40C22 30.5 30 23.5 39 23.5C44.5 23.5 48.2 26.8 50 30.5C51.8 26.8 55.5 23.5 61 23.5C70 23.5 78 30.5 78 40C78 59 50 77 50 77Z" fill="#FCE7F3" stroke="#831843" strokeWidth="3" strokeLinejoin="round" />
      );
    case "flame":
      return (
        <path d="M52 19C52 19 72 34 72 54C72 68 62 78 50 78C38 78 28 68 28 54C28 43 36 34 39 31C39 37 43 41 45 41C43 32 48 24 52 19Z" fill="#FEF3C7" stroke="#991B1B" strokeWidth="3" strokeLinejoin="round" />
      );
    case "zap":
      return (
        <path d="M55 18L29 53H48L44 82L71 45H52L55 18Z" fill="#FEF9C3" stroke="#1E3A8A" strokeWidth="3" strokeLinejoin="round" />
      );
    case "gem":
      return (
        <g>
          <path d="M32 28H68L78 44L50 76L22 44L32 28Z" fill="#FCE7F3" stroke="#581C87" strokeWidth="3" strokeLinejoin="round" />
          <path d="M22 44H78M32 28L41 44L50 76L59 44L68 28" fill="none" stroke="#A855F7" strokeWidth="2.5" strokeLinejoin="round" />
        </g>
      );
    case "badge-check":
      return (
        <g>
          <circle cx="50" cy="50" r="26" fill="#E0F2FE" stroke="#0C4A6E" strokeWidth="3" />
          <path d="M38 51L46 59L63 42" fill="none" stroke="#0284C7" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    case "message-square":
      return (
        <g>
          <rect x="24" y="28" width="52" height="36" rx="12" fill="#EEF2FF" stroke="#312E81" strokeWidth="3" />
          <path d="M38 64L30 75V64" fill="#EEF2FF" stroke="#312E81" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="40" cy="46" r="4" fill="#5865F2" />
          <circle cx="60" cy="46" r="4" fill="#5865F2" />
        </g>
      );
    case "lock":
      return (
        <g>
          <path d="M36 45V36C36 28 42 23 50 23C58 23 64 28 64 36V45" fill="none" stroke="#ECFDF5" strokeWidth="6" strokeLinecap="round" />
          <rect x="28" y="45" width="44" height="32" rx="9" fill="#ECFDF5" stroke="#064E3B" strokeWidth="3" />
          <circle cx="50" cy="59" r="4.5" fill="#059669" />
          <rect x="48" y="61" width="4" height="8" rx="2" fill="#059669" />
        </g>
      );
    case "award":
      return (
        <g>
          <path d="M39 58L33 80L50 72L67 80L61 58" fill="#FDE68A" stroke="#581C87" strokeWidth="2.8" strokeLinejoin="round" />
          <circle cx="50" cy="43" r="20" fill="#FAF5FF" stroke="#581C87" strokeWidth="3" />
          <path d="M50 31L53 38L60 39L55 44L56.5 51L50 47.5L43.5 51L45 44L40 39L47 38L50 31Z" fill="#A855F7" />
        </g>
      );
    default:
      return (
        <path d="M50 20L58.8 38.2L79 41L64.3 55L67.8 75L50 65.5L32.2 75L35.7 55L21 41L41.2 38.2L50 20Z" fill="#FEF9C3" stroke="#9A3412" strokeWidth="3" strokeLinejoin="round" />
      );
  }
}

export function BadgeArtwork({
  slug,
  name,
  icon,
  color,
  imageUrl,
  tier = 1,
  size = "md",
  locked = false,
  className = "",
}: BadgeArtworkProps) {
  const uid = React.useId().replace(/:/g, "");
  const [c1, c2, c3] = getGradientPalette(icon, color, slug);
  const tierMeta = TIER_STYLES[tier];

  return (
    <div
      className={`relative inline-flex shrink-0 select-none items-center justify-center rounded-full shadow-lg transition-transform duration-200 group-hover:scale-105 ${SIZE_CLASSES[size]} ${
        locked ? "opacity-45 grayscale" : ""
      } ${className}`}
      style={{
        borderColor: "rgba(255, 255, 255, 0.94)",
        boxShadow: locked ? undefined : `0 8px 20px -6px ${color}66`,
      }}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={name}
          className="h-full w-full rounded-full object-cover"
          loading="lazy"
        />
      ) : (
        <svg viewBox="0 0 100 100" className="h-full w-full overflow-hidden rounded-full">
          <defs>
            <radialGradient id={`g-${uid}`} cx="35%" cy="22%" r="82%">
              <stop offset="0%" stopColor={c1} />
              <stop offset="56%" stopColor={c2} />
              <stop offset="100%" stopColor={c3} />
            </radialGradient>
            <linearGradient id={`s-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
              <stop offset="65%" stopColor="#FFFFFF" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="50" fill={`url(#g-${uid})`} />
          <circle cx="22" cy="26" r="2.3" fill="#FFFFFF" fillOpacity="0.65" />
          <circle cx="79" cy="29" r="1.9" fill="#FFFFFF" fillOpacity="0.55" />
          <circle cx="76" cy="75" r="2.2" fill="#FFFFFF" fillOpacity="0.45" />
          <MedallionIllustration icon={icon} slug={slug} />
          <ellipse cx="50" cy="18" rx="38" ry="18" fill={`url(#s-${uid})`} />
        </svg>
      )}

      {tier > 1 && !locked && size !== "xs" && (
        <span
          className="absolute -bottom-1 -right-1 rounded-full border px-1.5 py-0.5 text-[10px] font-extrabold leading-none shadow-sm"
          style={{
            background: tierMeta.bg,
            color: tierMeta.text,
            borderColor: tierMeta.border,
          }}
        >
          {tierMeta.label}
        </span>
      )}
    </div>
  );
}
