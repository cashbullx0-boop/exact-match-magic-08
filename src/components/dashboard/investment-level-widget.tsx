import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowRight, Crown } from "lucide-react";

type UserLevel = {
  level: number;
  name: string;
  tier: string;
  min_deposit_cents: number;
  daily_profit_cents: number;
  color: string;
  icon: string;
  next_level_deposit: number;
};

export function InvestmentLevelWidget() {
  const { user, profile } = useAuth();
  const [lvl, setLvl] = useState<UserLevel | null>(null);
  const balance = (profile as { balance_cents?: number } | null)?.balance_cents ?? 0;

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.rpc("get_user_level", { _user_id: user.id });
      if (data && data.length) setLvl(data[0] as UserLevel);
    })();
  }, [user]);

  if (!lvl) {
    return (
      <Card className="glass-strong border-border p-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Crown className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wider">Investment level</span>
          </div>
          <p className="text-xl font-bold mt-1">Not unlocked yet</p>
          <p className="text-xs text-muted-foreground mt-1">Get a $50 balance to unlock Bronze</p>
        </div>
        <Link to="/levels"><Button variant="outline" size="sm">View levels <ArrowRight className="h-4 w-4 ml-1" /></Button></Link>
      </Card>
    );
  }

  const nextCents = lvl.next_level_deposit;
  const isMax = nextCents <= lvl.min_deposit_cents;
  const progress = isMax
    ? 100
    : Math.min(100, ((balance - lvl.min_deposit_cents) / (nextCents - lvl.min_deposit_cents)) * 100);

  return (
    <Card className="glass-strong border-border p-6 relative overflow-hidden">
      <div
        className="absolute -top-16 -right-16 h-56 w-56 rounded-full opacity-25 blur-3xl pointer-events-none"
        style={{ background: lvl.color }}
      />
      <div className="relative flex flex-col md:flex-row md:items-center gap-5">
        <div className="flex items-center gap-4">
          <div
            className="h-16 w-16 rounded-2xl flex items-center justify-center text-3xl shadow-xl ring-2 ring-white/10 shrink-0"
            style={{ background: `linear-gradient(135deg, ${lvl.color}, ${lvl.color}99)` }}
          >
            <span>{lvl.icon}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Investment level</span>
            </div>
            <p className="text-xl font-bold mt-0.5">{lvl.name}</p>
            <p className="text-xs text-muted-foreground">
              ${((balance * 0.02) / 100).toFixed(2)} daily profit (2% of balance)
            </p>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-xs mb-1.5 text-muted-foreground">
            <span>${(balance / 100).toLocaleString()} balance</span>
            {isMax
              ? <span>Max level 👑</span>
              : <span>Next: ${(nextCents / 100).toLocaleString()}</span>}
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        <Link to="/levels" className="shrink-0">
          <Button variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary/10">
            All levels <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}