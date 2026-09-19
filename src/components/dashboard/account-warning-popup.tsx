import { useEffect, useState } from "react";
import { AlertTriangle, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";

const SESSION_KEY = "cbx_account_referral_warning_shown_v1";
const REFERRAL_WINDOW_MS = 15 * 24 * 60 * 60 * 1000;

function getRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    minutes: Math.floor((total % 3_600) / 60),
    seconds: total % 60,
  };
}

export function AccountWarningPopup() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!user?.id) return;
    const key = `${SESSION_KEY}:${user.id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* Continue when browser storage is unavailable. */
    }
    setOpen(true);
  }, [user?.id]);

  useEffect(() => {
    if (!open) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [open]);

  if (!open) return null;

  const signupTime = user?.created_at ? new Date(user.created_at).getTime() : now;
  const deadline = Number.isFinite(signupTime) ? signupTime + REFERRAL_WINDOW_MS : now;
  const remaining = getRemaining(deadline - now);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-warning-title"
      className="fixed inset-0 z-[110] flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm"
    >
      <Card className="relative w-full max-w-md overflow-hidden border-destructive/50 bg-card p-5 shadow-2xl animate-float-up sm:p-6">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setOpen(false)}
          aria-label="Close account warning"
          className="absolute right-2 top-2 text-muted-foreground"
        >
          <X className="h-5 w-5" />
        </Button>

        <div className="pr-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-destructive/40 bg-destructive/15">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <h2 id="account-warning-title" className="mt-3 text-xl font-bold text-destructive">
            Important Account Warning
          </h2>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-md border border-accent/30 bg-accent/10 p-3 text-center">
            <p className="text-xs font-semibold text-accent">1st Withdrawal</p>
            <p className="mt-1 text-sm font-bold">Free under $50</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-center">
            <p className="text-xs font-semibold text-primary">2nd Withdrawal</p>
            <p className="mt-1 text-sm font-bold">5 direct accounts</p>
          </div>
        </div>

        <div className="mt-4 rounded-md border border-destructive/35 bg-destructive/10 p-4">
          <p className="text-sm font-bold text-destructive">Referral Warning</p>
          <p className="mt-1 text-sm text-foreground">
            If you do not add a referral within 15 days, your account will be automatically suspended.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Once the referral is added, your account will be automatically activated again.
          </p>
        </div>

        <div className="mt-4 rounded-md border border-border bg-muted/40 p-3">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
            <Clock className="h-4 w-4" /> Referral deadline
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2 text-center">
            {[
              [remaining.days, "Days"],
              [remaining.hours, "Hours"],
              [remaining.minutes, "Min"],
              [remaining.seconds, "Sec"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-md bg-background py-2">
                <p className="text-lg font-bold tabular-nums text-primary">{String(value).padStart(2, "0")}</p>
                <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Please complete your referral within 15 days to avoid account suspension.
        </p>
        <Button className="mt-4 w-full" onClick={() => setOpen(false)}>I understand</Button>
      </Card>
    </div>
  );
}