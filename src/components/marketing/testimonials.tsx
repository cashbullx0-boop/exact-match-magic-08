import { Star, BadgeCheck } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

const TESTIMONIALS = [
  {
    name: "Ahmed Khan",
    handle: "@ahmedk",
    flag: "🇵🇰",
    earned: "$342",
    stars: 5,
    quote: "Withdrew my first $50 after just 2 weeks, process was smooth. Video tasks are the easiest way to earn daily.",
  },
  {
    name: "Fatima Al-Rashid",
    handle: "@fatimaar",
    flag: "🇸🇦",
    earned: "$815",
    stars: 5,
    quote: "Referral system is great, my team is growing fast. The dashboard makes tracking everything so simple.",
  },
  {
    name: "Rohan Sharma",
    handle: "@rohans",
    flag: "🇮🇳",
    earned: "$267",
    stars: 4,
    quote: "Video tasks are easy, earning daily without any issues. USDT payouts arrive within minutes every time.",
  },
  {
    name: "Emily Wilson",
    handle: "@emilyw",
    flag: "🇬🇧",
    earned: "$1,120",
    stars: 5,
    quote: "Best rewards platform I've used. The surveys pay well and the app install tasks are genuinely worth doing.",
  },
  {
    name: "Hassan Ali",
    handle: "@hassana",
    flag: "🇦🇪",
    earned: "$498",
    stars: 5,
    quote: "Love the instant payouts to my wallet. Customer support is responsive and the tasks refresh every hour.",
  },
  {
    name: "Aisyah Ibrahim",
    handle: "@aisyahi",
    flag: "🇲🇾",
    earned: "$189",
    stars: 4,
    quote: "Started last month and already cashed out twice. Great variety of tasks and the platform feels premium.",
  },
];

function Card({ t }: { t: (typeof TESTIMONIALS)[number] }) {
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
      <div className="mt-auto pt-2 flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/15">
          <BadgeCheck className="h-3 w-3" /> Verified User
        </span>
      </div>
    </div>
  );
}

export function Testimonials() {
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
          Hear what real users are saying about earning on CashBullX every day.
        </p>
      </div>
      <Carousel opts={{ align: "start", loop: true }} className="px-2 md:px-12">
        <CarouselContent>
          {TESTIMONIALS.map((t) => (
            <CarouselItem key={t.name} className="md:basis-1/2 lg:basis-1/3">
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
