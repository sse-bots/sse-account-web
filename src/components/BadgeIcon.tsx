"use client";

import {
  Award,
  BadgeCheck,
  Bug,
  Code2,
  Crown,
  Flame,
  Gem,
  Heart,
  Lock,
  MessageSquare,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Zap,
} from "lucide-react";

const ICON_MAP: Record<string, typeof Award> = {
  "shield-check": ShieldCheck,
  crown: Crown,
  "badge-check": BadgeCheck,
  sparkles: Sparkles,
  code: Code2,
  trophy: Trophy,
  flame: Flame,
  star: Star,
  award: Award,
  gem: Gem,
  zap: Zap,
  rocket: Rocket,
  heart: Heart,
  bug: Bug,
  "message-square": MessageSquare,
  lock: Lock,
};

export function BadgeIcon({
  name,
  className = "h-4 w-4",
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICON_MAP[name] || Award;
  return <Icon className={className} />;
}
