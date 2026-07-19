import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Gift, Clock, Sparkles, TrendingUp, Users, Wallet, Zap, Flame, Crown, Rocket, Star, Trophy, Gem, HandCoins } from "lucide-react";
import offerTeam1000 from "@/assets/offer-team-1000.jpeg.asset.json";

type Offer = {
  title: string;
  desc: string;
  reward: string;
  icon: any;
  gradient: string;
  image?: string;
};

// Pool of offers — 6 rotate per day (one every 4h), pool reshuffles daily.
const OFFER_POOL: Offer[] = [
  { title: "Build Your Team — $1000 Reward", desc: "Invite 100 accounts within one month and receive a $1000 reward.", reward: "+$1000", icon: Trophy, gradient: "from-yellow-500/30 to-amber-600/10", image: offerTeam1000.url },
  { title: "Deposit Boost", desc: "Get 10% bonus on your first deposit — auto credited.", reward: "+10%", icon: Wallet, gradient: "from-amber-400/30 to-orange-500/10" },
  { title: "Refer & Earn", desc: "Invite a friend and earn a flat $5 on their first deposit.", reward: "+$5", icon: Users, gradient: "from-emerald-400/30 to-teal-500/10" },
  { title: "Daily Trade ROI", desc: "Open a trade today and earn a fixed 2% ROI.", reward: "2% ROI", icon: TrendingUp, gradient: "from-sky-400/30 to-indigo-500/10" },
  { title: "Level Up Reward", desc: "Reach the next investment tier for bigger daily profit.", reward: "Bronze → Diamond", icon: Zap, gradient: "from-fuchsia-400/30 to-purple-500/10" },
  { title: "Downline Commission", desc: "Earn up to 6 levels deep on every trade your referrals settle.", reward: "6 Levels", icon: Sparkles, gradient: "from-rose-400/30 to-pink-500/10" },
  { title: "Hot Streak", desc: "Trade every day and stack consistent 2% daily returns.", reward: "🔥 Streak", icon: Flame, gradient: "from-red-400/30 to-orange-500/10" },
  { title: "VIP Perks", desc: "Unlock premium perks as your lifetime earnings grow.", reward: "VIP", icon: Crown, gradient: "from-yellow-400/30 to-amber-500/10" },
  { title: "Fast Start", desc: "Complete your first deposit within 7 days to keep bonuses.", reward: "7 Days", icon: Rocket, gradient: "from-cyan-400/30 to-blue-500/10" },
  { title: "Star Investor", desc: "Grow your balance and climb the Investment Levels.", reward: "5 Tiers", icon: Star, gradient: "from-indigo-400/30 to-violet-500/10" },
  { title: "Weekly Challenge", desc: "10 active referrals in 7 days = $50 bonus.", reward: "+$50", icon: Trophy, gradient: "from-lime-400/30 to-green-500/10" },
  { title: "Diamond Club", desc: "Hit $10,000 balance and unlock the Diamond tier.", reward: "Diamond", icon: Gem, gradient: "from-teal-400/30 to-cyan-500/10" },
  { title: "Instant Rewards", desc: "Trade profits credit automatically at settlement.", reward: "Auto", icon: HandCoins, gradient: "from-orange-400/30 to-rose-500/10" },
];

const CYCLE_MS = 4 * 60 * 60 * 1000; // 4 hours
const SLOTS_PER_DAY = 6;

// Deterministic PRNG for daily shuffle so all clients see the same order.
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dailyOffers(dayIndex: number): Offer[] {
  const rand = mulberry32(dayIndex * 2654435761);
  const arr = [...OFFER_POOL];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, SLOTS_PER_DAY);
}

function getSlot(now: number) {
  const dayIndex = Math.floor(now / 86400000);
  const msIntoDay = now - dayIndex * 86400000;
  const slotIdx = Math.floor(msIntoDay / CYCLE_MS); // 0..5
  const nextAt = dayIndex * 86400000 + (slotIdx + 1) * CYCLE_MS;
  return { dayIndex, slotIdx, nextAt };
}

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function OffersSection() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const { dayIndex, slotIdx, nextAt } = useMemo(() => getSlot(now), [now]);
  const todays = useMemo(() => dailyOffers(dayIndex), [dayIndex]);
  const offer = todays[slotIdx];
  const nextOffer = todays[(slotIdx + 1) % todays.length];
  const remaining = nextAt - now;
  const pct = Math.max(0, Math.min(100, ((CYCLE_MS - remaining) / CYCLE_MS) * 100));
  const Icon = offer.icon;

  return (
    <Card className="glass-strong border-border p-5 md:p-6 relative overflow-hidden">
      <div className={`pointer-events-none absolute inset-0 opacity-60 bg-gradient-to-br ${offer.gradient}`} />
      <div className="relative">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Offers</h2>
            <span className="ml-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
              Live
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
            <Clock className="h-3.5 w-3.5" />
            <span>Next in {fmt(remaining)}</span>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/25 to-primary/5 border border-primary/30 flex items-center justify-center">
            <Icon className="h-7 w-7 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-base truncate">{offer.title}</h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30">
                {offer.reward}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{offer.desc}</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent transition-[width] duration-1000 ease-linear"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
            <span>New offer every 4 hours</span>
            <span>Up next: <span className="text-foreground/80">{nextOffer.title}</span></span>
          </div>
        </div>
      </div>
    </Card>
  );
}