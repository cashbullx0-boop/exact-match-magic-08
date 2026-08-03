import { Star, BadgeCheck, ArrowDownToLine, ArrowUpFromLine, TrendingUp, Users, Banknote } from "lucide-react";
import { useMemo } from "react";
import { AnimatedCounter } from "@/components/marketing/animated-counter";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

type Activity = "withdraw" | "deposit" | "trade";

type Testimonial = {
  name: string;
  handle: string;
  flag: string;
  earned: string;
  stars: number;
  quote: string;
  activity: Activity;
};

const POOL: Testimonial[] = [
  {
    name: "Ahmed Khan",
    handle: "@ahmedk",
    flag: "🇵🇰",
    earned: "$342",
    stars: 5,
    quote: "Withdrew my first $50 after just 2 weeks, process was smooth. Video tasks are the easiest way to earn daily.",
    activity: "withdraw",
  },
  {
    name: "Fatima Al-Rashid",
    handle: "@fatimaar",
    flag: "🇸🇦",
    earned: "$815",
    stars: 5,
    quote: "Referral system is great, my team is growing fast. The dashboard makes tracking everything so simple.",
    activity: "deposit",
  },
  {
    name: "Rohan Sharma",
    handle: "@rohans",
    flag: "🇮🇳",
    earned: "$267",
    stars: 4,
    quote: "Video tasks are easy, earning daily without any issues. USDT payouts arrive within minutes every time.",
    activity: "withdraw",
  },
  {
    name: "Emily Wilson",
    handle: "@emilyw",
    flag: "🇬🇧",
    earned: "$1,120",
    stars: 5,
    quote: "Best rewards platform I've used. The surveys pay well and the app install tasks are genuinely worth doing.",
    activity: "trade",
  },
  {
    name: "Hassan Ali",
    handle: "@hassana",
    flag: "🇦🇪",
    earned: "$498",
    stars: 5,
    quote: "Love the instant payouts to my wallet. Customer support is responsive and the tasks refresh every hour.",
    activity: "withdraw",
  },
  {
    name: "Aisyah Ibrahim",
    handle: "@aisyahi",
    flag: "🇲🇾",
    earned: "$189",
    stars: 4,
    quote: "Started last month and already cashed out twice. Great variety of tasks and the platform feels premium.",
    activity: "deposit",
  },
  {
    name: "Bilal Iqbal",
    handle: "@bilaliq",
    flag: "🇵🇰",
    earned: "$623",
    stars: 5,
    quote: "My 4-hour trade settled right on time and the profit hit my balance instantly. Exactly as promised.",
    activity: "trade",
  },
  {
    name: "Priya Patel",
    handle: "@priyap",
    flag: "🇮🇳",
    earned: "$401",
    stars: 5,
    quote: "Deposit was confirmed within minutes after uploading the slip. Very transparent process overall.",
    activity: "deposit",
  },
  {
    name: "Mehmet Yilmaz",
    handle: "@mehmety",
    flag: "🇹🇷",
    earned: "$277",
    stars: 4,
    quote: "Withdrew straight to my TRC20 wallet with no delay. The OTP step makes me feel my funds are safe.",
    activity: "withdraw",
  },
  {
    name: "Nusrat Jahan",
    handle: "@nusratj",
    flag: "🇧🇩",
    earned: "$158",
    stars: 5,
    quote: "Small deposit to start, and the daily trade keeps growing it steadily. Simple and honest platform.",
    activity: "deposit",
  },
  {
    name: "James Carter",
    handle: "@jamesc",
    flag: "🇺🇸",
    earned: "$1,940",
    stars: 5,
    quote: "Been trading daily for months. Payouts always land and the downline commissions are a nice bonus.",
    activity: "trade",
  },
  {
    name: "Layla Hassan",
    handle: "@laylah",
    flag: "🇦🇪",
    earned: "$712",
    stars: 5,
    quote: "Cashed out again this week without any issue. Support answered my question in under an hour.",
    activity: "withdraw",
  },
  {
    name: "Budi Santoso",
    handle: "@budis",
    flag: "🇮🇩",
    earned: "$334",
    stars: 4,
    quote: "Topped up my balance and unlocked the next level the same day. Levels make progress feel real.",
    activity: "deposit",
  },
  {
    name: "Olivia Walker",
    handle: "@oliviaw",
    flag: "🇬🇧",
    earned: "$865",
    stars: 5,
    quote: "Clean dashboard, clear numbers, and the 12-hour trade closed exactly when the timer said it would.",
    activity: "trade",
  },
];

const ACTIVITY_META: Record<Activity, { label: string; icon: typeof Star; className: string }> = {
  withdraw: { label: "Withdrawal", icon: ArrowUpFromLine, className: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20" },
  deposit: { label: "Deposit", icon: ArrowDownToLine, className: "text-sky-300 bg-sky-500/10 border-sky-500/20" },
  trade: { label: "Trade profit", icon: TrendingUp, className: "text-primary bg-primary/10 border-primary/20" },
};

// Deterministic day key so the lineup + dates change once per day (UK day boundary)
function dayIndex(): number {
  const uk = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" }));
  return Math.floor(Date.UTC(uk.getFullYear(), uk.getMonth(), uk.getDate()) / 86400000);
}

function pickDaily(): (Testimonial & { date: Date })[] {
  const d = dayIndex();
  const offset = d % POOL.length;
  return Array.from({ length: 6 }, (_, i) => {
    const t = POOL[(offset + i * 5) % POOL.length];
    const date = new Date((d - ((d + i * 3) % 5)) * 86400000);
    return { ...t, date };
  });
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// Daily-growing community stats, derived from the same day key so they tick up once per day.
function dailyStats() {
  const d = dayIndex();
  const activeEarners = 120_000 + ((d * 137) % 900) + d * 12;
  const totalPayoutUsd = 2_400_000 + ((d * 911) % 15_000) + d * 3_100;
  return { activeEarners, totalPayoutUsd };
}

function Card({ t }: { t: Testimonial & { date: Date } }) {
  const meta = ACTIVITY_META[t.activity];
  const ActivityIcon = meta.icon;
  return (
    <div className="glass rounded-2xl p-6 flex flex-col gap-4 hover:-translate-y-1 transition-transform duration-300">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center text-lg font-bold text-foreground/90">
          {t.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 font-semibold text-sm">
            {t.name} <span>{t.flag}</span>
            <BadgeCheck className="h-3.5 w-3.5 text-sky-400 fill-sky-400/20" />
          </div>
          <div className="text-xs text-muted-foreground">{t.handle}</div>
        </div>
        <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
          +{t.earned}
        </span>
      </div>
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < t.stars ? "fill-primary text-primary" : "fill-muted text-muted"
            }`}
          />
        ))}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
      <div className="mt-auto pt-2 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/15">
          <BadgeCheck className="h-3 w-3" /> Verified User
        </span>
        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${meta.className}`}>
          <ActivityIcon className="h-3 w-3" /> {meta.label}
        </span>
        <time dateTime={t.date.toISOString()} className="ml-auto text-[10px] text-muted-foreground">
          {fmtDate(t.date)}
        </time>
      </div>
    </div>
  );
}

export function Testimonials() {
  const items = useMemo(pickDaily, []);
  const stats = useMemo(dailyStats, []);
  return (
    <section id="reviews" className="py-20 md:py-28">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs text-muted-foreground mb-4">
          ⭐ Loved by 120,000+ earners worldwide
        </div>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
          What Our <span className="brand-text">Members Say</span>
        </h2>
        <p className="mt-4 text-muted-foreground">
          Fresh deposit, withdrawal and trade stories from our members — updated every day.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-12">
        <div className="glass rounded-2xl p-5 flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Users className="h-5 w-5 text-emerald-300" />
          </div>
          <div>
            <p className="text-2xl font-bold brand-text">
              <AnimatedCounter value={stats.activeEarners} suffix="+" />
            </p>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Active earners</p>
          </div>
        </div>
        <div className="glass rounded-2xl p-5 flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Banknote className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold brand-text">
              <AnimatedCounter value={stats.totalPayoutUsd} prefix="$" suffix="+" />
            </p>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total payouts</p>
          </div>
        </div>
      </div>

      <Carousel opts={{ align: "start", loop: true }} className="px-2 md:px-12">
        <CarouselContent>
          {items.map((t, i) => (
            <CarouselItem key={`${t.name}-${i}`} className="md:basis-1/2 lg:basis-1/3">
              <Card t={t} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex" />
        <CarouselNext className="hidden md:flex" />
      </Carousel>
    </section>
  );
}
