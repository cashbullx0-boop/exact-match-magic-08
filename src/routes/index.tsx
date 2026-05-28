import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Coins, Gift, PlayCircle, Smartphone, Sparkles, Users, Wallet } from "lucide-react";

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
    { icon: CheckCircle2, label: "Surveys", desc: "Share opinions, earn fast." },
    { icon: PlayCircle, label: "Videos", desc: "Watch and get paid." },
    { icon: Smartphone, label: "App installs", desc: "Try new apps for rewards." },
    { icon: Gift, label: "Offers", desc: "Exclusive deals & bonuses." },
  ];
  return (
    <div className="min-h-screen text-foreground">
      <header className="container mx-auto flex items-center justify-between px-6 py-6">
        <Link to="/" className="text-2xl font-bold brand-text">CashBullX</Link>
        <nav className="flex items-center gap-3">
          <Link to="/login"><Button variant="ghost">Sign in</Button></Link>
          <Link to="/signup"><Button className="btn-primary-gradient">Get started</Button></Link>
        </nav>
      </header>

      <main className="container mx-auto px-6">
        <section className="py-20 md:py-28 text-center max-w-3xl mx-auto animate-float-up">
          <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs text-muted-foreground mb-6">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Task-based rewards — no investment, ever
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Get paid to <span className="brand-text">complete tasks</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Surveys, videos, app installs, and exclusive offers. Earn real rewards and cash out from your wallet — all in one beautifully simple dashboard.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link to="/signup"><Button size="lg" className="btn-primary-gradient">Start earning</Button></Link>
            <Link to="/login"><Button size="lg" variant="outline">I have an account</Button></Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4 pb-16">
          {categories.map((c) => (
            <div key={c.label} className="glass rounded-2xl p-6 animate-float-up">
              <c.icon className="h-7 w-7 text-primary" />
              <h3 className="mt-4 font-semibold text-lg">{c.label}</h3>
              <p className="text-sm text-muted-foreground mt-1">{c.desc}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-3 pb-24">
          <Feature icon={Wallet} title="Real wallet" body="Track every earning. Cash out when you're ready." />
          <Feature icon={Users} title="Referral bonuses" body="Invite friends with your code and earn together." />
          <Feature icon={Coins} title="Transparent rewards" body="Clear payouts on every task. No hidden surprises." />
        </section>
      </main>

      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} CashBullX — A task-based rewards platform.
      </footer>
    </div>
  );
}

function Feature({ icon: Icon, title, body }: { icon: typeof Wallet; title: string; body: string }) {
  return (
    <div className="glass rounded-2xl p-6">
      <Icon className="h-6 w-6 text-accent" />
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{body}</p>
    </div>
  );
}
