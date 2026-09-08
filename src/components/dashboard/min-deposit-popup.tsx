import { useEffect, useState } from "react";
import { X, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const SESSION_KEY = "cbx_min_deposit_10_shown_v1";

/**
 * Announcement shown once per app/site open (per tab session):
 * minimum deposit is now $10.
 */
export function MinDepositPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    const t = setTimeout(() => setOpen(true), 700);
    return () => clearTimeout(t);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <Card className="glass-strong border-emerald-500/40 max-w-sm w-full p-6 text-center space-y-4 relative animate-float-up">
        <button
          onClick={() => setOpen(false)}
          aria-label="Close announcement"
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto h-14 w-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
          <Sparkles className="h-7 w-7 text-emerald-400" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-emerald-300">Minimum deposit is now $10</h2>
          <p className="text-sm text-muted-foreground">
            Good news! You can now start with just <span className="font-semibold text-foreground">$10 USDT</span>{" "}
            instead of $50. Deposits still go in multiples of $10.
          </p>
        </div>

        <Button className="w-full" onClick={() => setOpen(false)}>
          Got it
        </Button>
      </Card>
    </div>
  );
}
