import { Crown } from "lucide-react";
import { levelFromTotalCents } from "@/lib/levels";

export function VipBadge({ totalCents, className = "" }: { totalCents: number; className?: string }) {
  const lvl = levelFromTotalCents(totalCents);
  const tier = lvl.tier;
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-white/20 shadow-lg shadow-black/30 ${className}`}
      style={{ background: tier.gradient, color: "rgba(0,0,0,0.85)" }}
      title={`${tier.name} · Level ${lvl.level}`}
    >
      <Crown className="h-3 w-3" />
      <span className="uppercase tracking-wider">{tier.name}</span>
    </div>
  );
}
