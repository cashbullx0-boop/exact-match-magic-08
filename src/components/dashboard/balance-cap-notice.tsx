import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Users, ShieldAlert, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useBalanceCap } from "@/hooks/use-balance-cap";

const ACK_KEY = "cbx_balance_cap_ack_v1";

function Rules({ capUsd, required }: { capUsd: number; required: number }) {
  return (
    <ul className="space-y-2 text-sm">
      <li className="flex gap-2">
        <span className="text-destructive font-bold">1.</span>
        <span>
          Your account balance limit is <b>${capUsd}</b>. Deposits are blocked once your balance
          reaches this limit.
        </span>
      </li>
      <li className="flex gap-2">
        <span className="text-destructive font-bold">2.</span>
        <span>
          To go above <b>${capUsd}</b>, you must have <b>{required} direct referrals</b> who have
          each completed a deposit.
        </span>
      </li>
      <li className="flex gap-2">
        <span className="text-destructive font-bold">3.</span>
        <span>
          If your balance is <b>${capUsd} or more</b> and you do not have {required} depositing
          direct referrals, <b>withdrawals stay locked</b> until you complete the team requirement.
        </span>
      </li>
      <li className="flex gap-2">
        <span className="text-destructive font-bold">4.</span>
        <span>
          Cannot build a team? Simply keep your balance <b>below ${capUsd}</b> — everything works
          normally, including withdrawals.
        </span>
      </li>
    </ul>
  );
}

/** Inline red alert for the dashboard. */
export function BalanceCapAlert() {
  const { loading, unlocked, nearCap, locked, capUsd, balanceUsd, required, active, remainingReferrals } =
    useBalanceCap();

  if (loading || unlocked || (!nearCap && !locked)) return null;

  const progress = Math.min(100, (active / required) * 100);

  return (
    <Card className="border-destructive/50 bg-destructive/10 p-4 sm:p-5 space-y-3 animate-float-up">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-destructive/20 text-destructive shrink-0">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-destructive flex items-center gap-2">
            Most important note
            <span className="text-[10px] uppercase tracking-wider rounded-full bg-destructive px-2 py-0.5 text-destructive-foreground">
              Required
            </span>
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {locked
              ? `Your balance is $${balanceUsd.toLocaleString()} — deposits and withdrawals are locked until you have ${required} depositing direct referrals.`
              : `Your balance is $${balanceUsd.toLocaleString()}. The account limit is $${capUsd} without ${required} depositing direct referrals.`}
          </p>
        </div>
      </div>

      <Rules capUsd={capUsd} required={required} />

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Depositing direct referrals
          </span>
          <span className="font-semibold text-foreground">
            {active} / {required}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        {remainingReferrals > 0 && (
          <p className="text-[11px] text-muted-foreground">
            {remainingReferrals} more needed to unlock the limit.
          </p>
        )}
      </div>

      <Link to="/referrals">
        <Button size="sm" className="btn-primary-gradient">
          Invite referrals <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </Link>
    </Card>
  );
}

/** One-time popup (until acknowledged) shown when the user hits the cap zone. */
export function BalanceCapPopup() {
  const { loading, unlocked, nearCap, locked, capUsd, required, active } = useBalanceCap();
  const [open, setOpen] = useState(false);

  const shouldShow = !loading && !unlocked && (nearCap || locked);

  useEffect(() => {
    if (!shouldShow) return;
    let acked = false;
    try {
      acked = localStorage.getItem(ACK_KEY) === "1";
    } catch {
      /* storage unavailable */
    }
    if (!acked) setOpen(true);
  }, [shouldShow]);

  const acknowledge = () => {
    try {
      localStorage.setItem(ACK_KEY, "1");
    } catch {
      /* storage unavailable */
    }
    setOpen(false);
  };

  if (!shouldShow) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : acknowledge())}>
      <DialogContent className="max-w-lg border-destructive/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Most important note — please read
          </DialogTitle>
          <DialogDescription>
            New account rule for balances at or above ${capUsd}.
          </DialogDescription>
        </DialogHeader>

        <Rules capUsd={capUsd} required={required} />

        <p className="text-xs text-muted-foreground">
          You currently have <b className="text-foreground">{active}</b> of {required} depositing
          direct referrals.
        </p>

        <div className="flex flex-col sm:flex-row gap-2">
          <Link to="/referrals" className="flex-1" onClick={acknowledge}>
            <Button className="btn-primary-gradient w-full">Invite referrals</Button>
          </Link>
          <Button variant="outline" className="flex-1" onClick={acknowledge}>
            I understand
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
