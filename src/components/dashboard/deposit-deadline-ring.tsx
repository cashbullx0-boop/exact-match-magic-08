import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { AlertTriangle, ShieldOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const TOTAL_MS = 7 * 24 * 60 * 60 * 1000;

function diff(deadline: number) {
  const ms = Math.max(0, deadline - Date.now());
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return { ms, days, hours, minutes, seconds };
}

export function DepositDeadlineRing() {
  const { user, profile } = useAuth();
  const [hasDeposit, setHasDeposit] = useState<boolean | null>(null);
  const [now, setNow] = useState(Date.now());

  const deadlineISO = profile?.deposit_deadline as string | null | undefined;

  useEffect(() => {
    if (!user || !deadlineISO) return;
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from("deposits")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (!cancelled) setHasDeposit((count ?? 0) > 0);
    })();
    return () => { cancelled = true; };
  }, [user, deadlineISO]);

  useEffect(() => {
    if (!deadlineISO) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadlineISO]);

  if (!deadlineISO || hasDeposit) return null;

  const deadline = new Date(deadlineISO).getTime();
  const { ms, days, hours, minutes, seconds } = diff(deadline);
  const expired = ms <= 0;
  const pct = Math.max(0, Math.min(100, (ms / TOTAL_MS) * 100));

  // SVG ring
  const size = 132;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <Card className="glass-strong border-border p-5 md:p-6 relative overflow-hidden animate-fade-in">
      <div
        className="absolute -top-16 -right-16 h-56 w-56 rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: expired
          ? "radial-gradient(circle, oklch(0.65 0.22 25), transparent)"
          : "radial-gradient(circle, oklch(0.82 0.17 85), transparent)" }}
      />
      <div className="relative flex flex-col sm:flex-row items-center gap-5">
        {/* Ring */}
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="oklch(1 0 0 / 0.08)"
              strokeWidth={stroke}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={expired ? "oklch(0.65 0.22 25)" : "url(#goldRing)"}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 1s linear", filter: "drop-shadow(0 0 6px oklch(0.82 0.17 85 / 0.55))" }}
            />
            <defs>
              <linearGradient id="goldRing" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="oklch(0.88 0.18 90)" />
                <stop offset="100%" stopColor="oklch(0.72 0.18 60)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {expired ? (
              <>
                <ShieldOff className="h-6 w-6 text-destructive" />
                <span className="text-[10px] uppercase tracking-wider text-destructive mt-0.5">Expired</span>
              </>
            ) : (
              <>
                <span className="text-2xl font-bold brand-text leading-none">{days}d</span>
                <span className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                  {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0 text-center sm:text-left">
          {expired ? (
            <>
              <div className="flex items-center justify-center sm:justify-start gap-2 text-destructive font-semibold">
                <ShieldOff className="h-4 w-4" /> Account Suspended
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Your deposit window has closed. Contact support to reactivate your account.
              </p>
              <Link to="/support" className="inline-block mt-3">
                <Button size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10">
                  Contact Support
                </Button>
              </Link>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center sm:justify-start gap-2 text-primary font-semibold">
                <AlertTriangle className="h-4 w-4" />
                Make your first deposit within {days > 0 ? `${days} day${days === 1 ? "" : "s"}` : `${hours}h ${minutes}m`} to keep your account active
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                A small deposit unlocks withdrawals, trading, and premium tasks.
              </p>
              <Link to="/deposit" className="inline-block mt-3">
                <Button size="sm" className="btn-primary-gradient">Deposit Now</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}