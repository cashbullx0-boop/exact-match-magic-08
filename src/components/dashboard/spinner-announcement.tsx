import { Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight } from "lucide-react";

/** Dashboard announcement banner promoting the live Lucky Spinner. */
export function SpinnerAnnouncement() {
  return (
    <Link
      to="/spinner"
      className="group flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 transition-colors hover:bg-primary/15"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
        <Sparkles className="h-4.5 w-4.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">
          Lucky Spinner is active for a limited time
        </span>
        <span className="block text-xs text-muted-foreground">
          Don't miss the chance to earn more in less time — win up to $50 per spin.
        </span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
