import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle2, PlayCircle, Smartphone, Gift, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/offerwall")({
  head: () => ({ meta: [{ title: "Offerwall — CashBullX" }] }),
  component: OfferwallPage,
});

const CATEGORIES = [
  { key: "survey", title: "Surveys", desc: "Share opinions, earn quickly.", icon: CheckCircle2, color: "from-amber-500/20 to-amber-700/10" },
  { key: "video", title: "Videos", desc: "Watch sponsored content.", icon: PlayCircle, color: "from-emerald-500/20 to-emerald-700/10" },
  { key: "app_install", title: "App installs", desc: "Try new mobile apps.", icon: Smartphone, color: "from-sky-500/20 to-sky-700/10" },
  { key: "offer", title: "Special offers", desc: "Premium CPA deals.", icon: Gift, color: "from-fuchsia-500/20 to-fuchsia-700/10" },
] as const;

const PROVIDERS = [
  { name: "OfferToro", desc: "Global offerwall — surveys, app installs, signups.", status: "Coming soon", env: "OFFERTORO_API_KEY" },
  { name: "Lootably", desc: "Premium offers and surveys with high payouts.", status: "Coming soon", env: "LOOTABLY_API_KEY" },
  { name: "CPAGrip", desc: "CPA offers, content-locker integrations.", status: "Coming soon", env: "CPAGRIP_API_KEY" },
];

function OfferwallPage() {
  return (
    <div className="space-y-6 animate-float-up">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
          <Sparkles className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Offerwall</h1>
          <p className="text-muted-foreground text-sm">Explore tasks by category, or connect external offerwalls.</p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {CATEGORIES.map((c) => (
          <Link key={c.key} to="/tasks" className="group">
            <Card className={`glass-strong border-border p-6 h-full bg-gradient-to-br ${c.color} transition-all group-hover:-translate-y-1 group-hover:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.5)]`}>
              <c.icon className="h-8 w-8 text-primary" />
              <h3 className="mt-4 font-bold text-lg">{c.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{c.desc}</p>
              <p className="text-xs text-primary mt-4 flex items-center gap-1">Browse tasks <ExternalLink className="h-3 w-3" /></p>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="glass-strong border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold">External offerwall providers</h2>
            <p className="text-xs text-muted-foreground">Plug in third-party offerwalls to expand inventory. API keys can be added in backend settings.</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {PROVIDERS.map((p) => (
            <Card key={p.name} className="glass border-border p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{p.name}</h3>
                <Badge variant="secondary">{p.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{p.desc}</p>
              <p className="text-[10px] font-mono text-muted-foreground mt-3">env: {p.env}</p>
              <Button variant="outline" size="sm" className="w-full mt-3" disabled>Configure</Button>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}