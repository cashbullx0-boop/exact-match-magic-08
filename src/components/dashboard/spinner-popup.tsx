import { useEffect, useState } from "react";
import { X, Sparkles, Clock } from "lucide-react";

/**
 * Spinner teaser popup — shows every time the user opens the website/app
 * (and again when they return after being away).
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
      className="animate-fade-in fixed inset-0 z-[80] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Lucky Spinner coming soon"
      onClick={() => setOpen(false)}
    >
      <div
        className="animate-scale-in relative w-full max-w-sm overflow-hidden rounded-2xl border border-primary/40 bg-card p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* soft animated glow */}
        <span className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl animate-[pulse_3s_cubic-bezier(0.4,0,0.6,1)_infinite]" />

        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
          <span className="absolute inset-0 rounded-full border-2 border-dashed border-primary/50 animate-[spin_6s_linear_infinite]" />
          <Sparkles className="h-7 w-7 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
        </div>

        <h2 className="relative mt-4 text-xl font-bold text-foreground">
          Lucky Spinner — going live soon
        </h2>
        <p className="relative mt-2 text-sm text-muted-foreground">
          Big prizes are on the way. Stay tuned and don't miss the chance to earn more in less
          time.
        </p>

        <div className="relative mt-4 inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary">
          <Clock className="h-3.5 w-3.5 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
          Launching soon
        </div>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="hover-scale relative mt-5 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
