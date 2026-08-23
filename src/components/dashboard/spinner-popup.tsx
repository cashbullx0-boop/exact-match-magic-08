import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X, Sparkles, Zap } from "lucide-react";

/**
 * Spinner promo popup — shows every time the user opens the website/app
 * (and again when they return to the tab after being away).
 */
export function SpinnerPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setOpen(true), 800);

    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
      } else if (hiddenAt && Date.now() - hiddenAt > 15_000) {
        hiddenAt = 0;
        setOpen(true);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearTimeout(t);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Lucky Spinner is live"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-primary/40 bg-card p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="h-7 w-7" />
        </div>

        <h2 className="mt-4 text-xl font-bold text-foreground">Lucky Spinner is live!</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          For a limited time only — spin and win up to <strong>$50</strong>. Don't miss the chance
          to earn more in less time.
        </p>

        <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs font-medium text-foreground">
          <Zap className="h-3.5 w-3.5 text-primary" />
          $1 · $2 · $5 spins available now
        </div>

        <Link
          to="/spinner"
          onClick={() => setOpen(false)}
          className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Spin now
        </Link>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
