import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Coins, Gift, PlayCircle, Smartphone, Sparkles, Users, Wallet, Shield, Zap, Lock, Globe, ArrowRight, TrendingUp } from "lucide-react";
import { LiveTicker } from "@/components/marketing/live-ticker";
import { Testimonials } from "@/components/marketing/testimonials";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { AnimatedCounter } from "@/components/marketing/animated-counter";
import { Reveal } from "@/components/marketing/reveal";
import { TrustStrip } from "@/components/marketing/trust-strip";
import { FAQSection } from "@/components/marketing/faq";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CashBullX — Earn rewards for tasks" },
      { name: "description", content: "A modern rewards platform. Complete surveys, watch videos, install apps, and unlock offers to earn real money." },
      { property: "og:title", content: "CashBullX — Earn rewards for tasks" },
      { property: "og:description", content: "Complete surveys, videos, app installs and offers. Withdraw earnings to your wallet." },
    ],
  }),
  component: Index,
});

function Index() {
  const categories = [
    { icon: CheckCircle2, label: "Surveys", desc: "Share opinions, earn fast.", reward: "$0.50 – $5" },
    { icon: PlayCircle, label: "Videos", desc: "Watch and get paid.", reward: "$0.10 – $1" },
    { icon: Smartphone, label: "App installs", desc: "Try new apps for rewards.", reward: "$1 – $15" },
    { icon: Gift, label: "Offers", desc: "Exclusive deals & bonuses.", reward: "$5 – $50" },
  ];
  const stats = [
    { label: "Active earners", value: 120000, suffix: "+" },
    { label: "Paid out to users", value: 4200000, prefix: "$" },
    { label: "Tasks completed", value: 8100000, suffix: "" },
    { label: "Countries", value: 140, suffix: "+" },
  ];
  const trust = [
    { icon: Shield, label: "SSL secured" },
    { icon: Lock, label: "Encrypted wallets" },
    { icon: Zap, label: "Instant payouts" },
    { icon: Globe, label: "Global access" },
  ];
  return (
    <div className="min-h-screen text-foreground relative overflow-x-hidden scroll-smooth">
      <LiveTicker />
      <SiteHeader />

      <main className="container mx-auto px-6">
        {/* HERO */}
        <section className="relative pt-16 pb-24 md:pt-24 md:pb-32">
          {/* aurora + floating gradient blobs */}
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute inset-0 grid-bg opacity-60" />
            <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-primary/30 blur-3xl animate-aurora" />
            <div className="absolute top-20 right-10 h-80 w-80 rounded-full bg-accent/30 blur-3xl animate-aurora" style={{ animationDelay: "2s" }} />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/20 blur-[120px] animate-blob" />
            <div className="absolute top-10 left-0 h-72 w-72 rounded-full bg-cyan-500/15 blur-[100px] animate-blob" style={{ animationDelay: "5s" }} />
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left animate-float-up">
              <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs text-muted-foreground mb-6">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Task-based rewards · No investment, ever
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
                Get paid to <br className="hidden sm:inline" />
                <span className="shine-text">complete tasks</span>
              </h1>
              <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0">
                Surveys, videos, app installs and exclusive offers. Earn real rewards and cash out in <span className="text-foreground font-medium">USDT</span> — all in one beautifully simple dashboard.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3">
                <Link to="/signup"><Button size="lg" className="btn-primary-gradient btn-glow h-12 px-7 text-base rounded-xl">Start earning <ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
                <Link to="/login"><Button size="lg" variant="outline" className="h-12 px-6 text-base">I have an account</Button></Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-xs text-muted-foreground">
                {trust.map((t) => (
                  <span key={t.label} className="inline-flex items-center gap-1.5">
                    <t.icon className="h-3.5 w-3.5 text-emerald-400" /> {t.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Floating crypto cards */}
            <div className="relative h-[420px] hidden lg:block">
              <FloatCard className="top-4 left-8 w-56 -rotate-6" symbol="USDT" name="Tether" price="$1.00" change="+0.02%" color="from-emerald-400/30 to-teal-400/10" />
              <FloatCard className="top-32 right-4 w-60 rotate-3" symbol="BTC" name="Bitcoin" price="$71,240" change="+2.41%" color="from-amber-400/30 to-orange-400/10" delay="1.5s" />
              <FloatCard className="bottom-8 left-16 w-64 rotate-2" symbol="BNB" name="BNB" price="$612.18" change="+1.05%" color="from-yellow-400/30 to-amber-400/10" delay="3s" />
              <div className="absolute top-1/2 right-1/3 -translate-y-1/2 glass-strong rounded-2xl p-4 w-44 animate-float-y" style={{ animationDelay: "0.5s" }}>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> Today's earnings
                </div>
                <div className="mt-1 text-2xl font-bold brand-text">+ $87.40</div>
                <div className="text-[10px] text-muted-foreground mt-1">across 12 tasks</div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <Reveal>
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-20">
            {stats.map((s) => (
              <div key={s.label} className="glass rounded-2xl p-6 text-center hover:-translate-y-1 transition-transform">
                <div className="text-3xl md:text-4xl font-bold brand-text">
                  <AnimatedCounter value={s.value} prefix={s.prefix} suffix={s.suffix} />
                </div>
                <div className="text-xs text-muted-foreground mt-2 uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </section>
        </Reveal>

        {/* TRUST */}
        <Reveal><TrustStrip /></Reveal>

        {/* CATEGORIES */}
        <section id="tasks" className="pt-20 pb-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Four ways to <span className="brand-text">earn daily</span>
            </h2>
            <p className="mt-4 text-muted-foreground">Pick a category and start earning in seconds. New tasks added every hour.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {categories.map((c, i) => (
              <Reveal key={c.label} delay={i * 80}>
              <div className="glass rounded-2xl p-6 hover:-translate-y-1 transition-transform duration-300 group h-full">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/25 to-accent/15 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <c.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">{c.label}</h3>
                <p className="text-sm text-muted-foreground mt-1">{c.desc}</p>
                <div className="mt-4 inline-flex items-center text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                  {c.reward}
                </div>
              </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="pb-24">
          <Reveal>
            <div className="grid gap-5 md:grid-cols-3">
              <Feature icon={Wallet} title="Real wallet" body="Track every earning. Cash out to USDT (TRC20/BEP20) when you're ready." />
              <Feature icon={Users} title="Referral bonuses" body="Invite friends with your code. Earn lifetime bonuses on every task they complete." />
              <Feature icon={Coins} title="Transparent rewards" body="Clear payouts on every task. No hidden surprises, no fine print." />
            </div>
          </Reveal>
        </section>

        {/* TESTIMONIALS */}
        <div id="reviews">
          <Testimonials />
        </div>

        {/* FAQ */}
        <FAQSection />

        {/* CTA */}
        <section className="pb-24">
          <div className="relative overflow-hidden rounded-3xl glass-strong p-10 md:p-16 text-center">
            <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-primary/30 blur-3xl animate-aurora" />
            <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-accent/25 blur-3xl animate-blob" />
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight relative">
              Start earning in <span className="brand-text">under 60 seconds</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto relative">
              Join 120,000+ members earning daily rewards. Sign up free — no credit card, no commitment.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3 relative">
              <Link to="/signup"><Button size="lg" className="btn-primary-gradient btn-glow h-12 px-8 text-base rounded-xl">Create free account</Button></Link>
              <Link to="/faq"><Button size="lg" variant="outline" className="h-12 px-6 text-base">Learn more</Button></Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Feature({ icon: Icon, title, body }: { icon: typeof Wallet; title: string; body: string }) {
  return (
    <div className="glass rounded-2xl p-6 hover:-translate-y-1 transition-transform duration-300">
      <div className="h-11 w-11 rounded-xl bg-accent/15 flex items-center justify-center mb-4">
        <Icon className="h-5 w-5 text-accent" />
      </div>
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{body}</p>
    </div>
  );
}

function FloatCard({ className = "", symbol, name, price, change, color, delay = "0s" }: {
  className?: string; symbol: string; name: string; price: string; change: string; color: string; delay?: string;
}) {
  return (
    <div className={`absolute glass-strong rounded-2xl p-4 animate-float-y ${className}`} style={{ animationDelay: delay }}>
      <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-xs font-bold mb-3`}>
        {symbol.slice(0, 3)}
      </div>
      <div className="text-xs text-muted-foreground">{name}</div>
      <div className="text-lg font-bold">{price}</div>
      <div className="text-xs text-emerald-400 font-medium">{change}</div>
    </div>
  );
}
