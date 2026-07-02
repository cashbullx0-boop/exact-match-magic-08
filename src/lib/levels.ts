import { Gem, Medal, Shield, Sparkles, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type LevelTier = {
  name: string;
  range: [number, number];
  icon: LucideIcon;
  // Tailwind-friendly gradient utility classes (use inline style for the gradient itself)
  gradient: string;
  ring: string;
  textGlow: string;
  label: string;
};

export const TIERS: LevelTier[] = [
  { name: "Bronze", range: [1, 9], icon: Shield, gradient: "linear-gradient(135deg, #CD7F32, #f4a460)", ring: "ring-amber-700/40", textGlow: "text-amber-300", label: "Starter" },
  { name: "Silver", range: [10, 18], icon: Medal, gradient: "linear-gradient(135deg, #C0C0C0, #e6ecf3)", ring: "ring-slate-300/40", textGlow: "text-slate-200", label: "Climber" },
  { name: "Gold", range: [19, 27], icon: Trophy, gradient: "linear-gradient(135deg, #FFD700, #ffd86b)", ring: "ring-yellow-400/40", textGlow: "text-yellow-300", label: "Earner" },
  { name: "Platinum", range: [28, 36], icon: Sparkles, gradient: "linear-gradient(135deg, #E5E4E2, #b8e1ff)", ring: "ring-sky-300/40", textGlow: "text-sky-200", label: "Pro" },
  { name: "Diamond", range: [37, 44], icon: Gem, gradient: "linear-gradient(135deg, #B9F2FF, #6aa9ff)", ring: "ring-cyan-300/50", textGlow: "text-cyan-200", label: "Elite" },
];

export type Level = {
  level: number;
  requiredUsd: number;
  tier: LevelTier;
  benefits: string[];
  icon: LucideIcon;
};

function benefitsFor(level: number, tier: LevelTier): string[] {
  const base = [
    `${Math.round(2 + level * 0.4)}% daily task bonus`,
    `${Math.round(5 + level * 0.5)}% referral commission`,
  ];
  if (level >= 5) base.push(`+${level * 2} XP per task`);
  if (level >= 10) base.push("Priority withdrawals");
  if (level >= 16) base.push("Exclusive offerwall slots");
  if (level >= 24) base.push("VIP support");
  if (level >= 32) base.push("Private investor rooms");
  if (level >= 40) base.push("Founder rewards pool");
  base.push(`${tier.name} badge`);
  return base.slice(0, 4);
}

function tierFor(level: number): LevelTier {
  return TIERS.find((t) => level >= t.range[0] && level <= t.range[1]) ?? TIERS[0];
}

export const LEVELS: Level[] = Array.from({ length: 44 }, (_, i) => {
  const level = i + 1;
  // Smooth growth: $50 → ~$120,000 by level 44
  const required = Math.round(50 * Math.pow(1.185, level - 1));
  const tier = tierFor(level);
  return {
    level,
    requiredUsd: required,
    tier,
    benefits: benefitsFor(level, tier),
    icon: tier.icon,
  };
});

export function levelFromTotalCents(totalEarnedCents: number): Level {
  const usd = totalEarnedCents / 100;
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (usd >= l.requiredUsd) current = l;
    else break;
  }
  return current;
}

export function nextLevel(current: Level): Level | null {
  return LEVELS.find((l) => l.level === current.level + 1) ?? null;
}