import { Star } from "lucide-react";

const TESTIMONIALS = [
  { name: "Aiden Walker", handle: "@aidenw", flag: "🇺🇸", earned: "$842", stars: 5,
    quote: "Withdrawals are fast and the dashboard is clean. Best rewards platform UI I've used." },
  { name: "Layla Hassan", handle: "@laylah", flag: "🇦🇪", earned: "$1,205", stars: 5,
    quote: "Daily check-ins plus surveys add up quickly. Streak system keeps me coming back." },
  { name: "Sofía Marín", handle: "@sofiam", flag: "🇲🇽", earned: "$417", stars: 5,
    quote: "Referral bonuses are the easiest passive earnings I've found. Super smooth UX." },
  { name: "Tomás Pereira", handle: "@tomasp", flag: "🇧🇷", earned: "$623", stars: 5,
    quote: "Tasks load instantly and payouts hit my wallet without drama. Highly recommend." },
  { name: "Anika Patel", handle: "@anikap", flag: "🇮🇳", earned: "$298", stars: 5,
    quote: "Beautiful design, transparent rewards. Feels like a premium SaaS, not a survey site." },
  { name: "Marcus Müller", handle: "@marcusm", flag: "🇩🇪", earned: "$1,011", stars: 5,
    quote: "USDT withdrawal arrived in minutes. The achievements layer makes it fun." },
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
          </div>
          <div className="text-xs text-muted-foreground">{t.handle}</div>
        </div>
        <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
          +{t.earned}
        </span>
      </div>
      <div className="flex gap-0.5">
        {Array.from({ length: t.stars }).map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-primary text-primary" />
        ))}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">"{t.quote}"</p>
    </div>
  );
}

export function Testimonials() {
  return (
    <section className="py-20 md:py-28">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs text-muted-foreground mb-4">
          ⭐ Loved by 120,000+ earners worldwide
        </div>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
          Real users. <span className="brand-text">Real payouts.</span>
        </h2>
        <p className="mt-4 text-muted-foreground">
          Hear what members are saying about CashBullX after cashing out.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {TESTIMONIALS.map((t) => <Card key={t.name} t={t} />)}
      </div>
    </section>
  );
}