import { Sparkles, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

/** Dashboard banner announcing the live Lucky Spinner. */
export function SpinnerAnnouncement() {
  return (
    <Link
      to="/spinner"
      className="animate-fade-in group relative block overflow-hidden rounded-xl border border-primary/40 bg-primary/10 px-4 py-3"
    >
      {/* animated shimmer sweep */}
      <span className="pointer-events-none absolute inset-y-0 -left-full w-1/2 animate-[slide-in-right_2.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-primary/15 to-transparent" />

      <div className="relative flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
          <Sparkles className="h-4 w-4 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Lucky Spinner is LIVE now</p>
          <p className="text-xs text-muted-foreground">
            Spin today and win instant cash rewards straight to your wallet.
          </p>
        </div>
        <span className="hidden shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary sm:inline-flex">
          Spin now
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
