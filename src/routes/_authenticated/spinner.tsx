import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Sparkles, Rocket } from "lucide-react";
import { useEffect, useState } from "react";
import promo5 from "@/assets/promo-5.jpeg.asset.json";
import promo6 from "@/assets/promo-6.jpeg.asset.json";

const promoSlides = [
  { src: promo5.url, alt: "Special bonus — open 10 direct accounts, get $50 extra reward" },
  { src: promo6.url, alt: "Special offer — open 20 accounts in 10 days, get $150 direct bonus" },
];

function PromoFlipper() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % promoSlides.length), 4000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-border/60 shadow-lg bg-[#0a0f1e] aspect-[16/9]">
      {promoSlides.map((s, idx) => (
        <img
          key={idx}
          src={s.src}
          alt={s.alt}
          loading={idx === 0 ? "eager" : "lazy"}
          className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-700 ease-out ${idx === i ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
        {promoSlides.map((_, idx) => (
          <span
            key={idx}
            className={`h-1.5 rounded-full transition-all ${idx === i ? "w-5 bg-primary" : "w-1.5 bg-white/50"}`}
          />
        ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/spinner")({
  head: () => ({ meta: [{ title: "Lucky Spinner — CashBullX" }] }),
  component: SpinnerComingSoon,
});

// Fixed launch target — 40 days from 15 July 2026 (Europe/London midnight)
const LAUNCH_AT = new Date("2026-08-24T00:00:00+01:00").getTime();

function useCountdown(target: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return { diff, days, hours, mins, secs };
}

function SpinnerComingSoon() {
  const { diff, days, hours, mins, secs } = useCountdown(LAUNCH_AT);
  const totalMs = 40 * 86400000;
  const progress = Math.min(100, Math.max(0, ((totalMs - diff) / totalMs) * 100));
  const launched = diff === 0;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <Card className="relative max-w-xl w-full p-8 md:p-10 text-center bg-gradient-to-br from-card/80 to-card/40 backdrop-blur border-border/50 shadow-2xl overflow-hidden">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-primary/20 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-accent/20 blur-3xl animate-pulse" />

        <div className="relative">
          <div className="relative mx-auto w-24 h-24 mb-6">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl animate-pulse" />
            <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/5 border border-primary/40 flex items-center justify-center">
              {launched ? (
                <Rocket className="w-12 h-12 text-primary animate-bounce" />
              ) : (
                <Sparkles className="w-12 h-12 text-primary animate-[spin_8s_linear_infinite]" />
              )}
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs uppercase tracking-widest mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {launched ? "Live now" : "Launching in"}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            {launched ? "Lucky Spinner is LIVE!" : "Lucky Spinner"}
          </h1>
          <p className="text-muted-foreground leading-relaxed mb-6">
            {launched
              ? "Refresh the page to spin your first wheel and grab instant rewards."
              : "Daily spins & instant cash rewards unlock in:"}
          </p>

          <PromoFlipper />

          {!launched && (
            <>
              <div className="grid grid-cols-4 gap-2 md:gap-3 mb-6">
                {[
                  { v: days, l: "Days" },
                  { v: hours, l: "Hours" },
                  { v: mins, l: "Min" },
                  { v: secs, l: "Sec" },
                ].map((u) => (
                  <div
                    key={u.l}
                    className="relative rounded-xl border border-border/60 bg-background/50 backdrop-blur p-3 md:p-4 shadow-inner overflow-hidden"
                  >
                    <div className="absolute inset-x-0 top-1/2 h-px bg-border/60" />
                    <div className="text-2xl md:text-4xl font-bold tabular-nums brand-text">
                      {String(u.v).padStart(2, "0")}
                    </div>
                    <div className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground mt-1">
                      {u.l}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                <span>Day {Math.max(0, 40 - days)} / 40</span>
                <span>{progress.toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded-full bg-border/40 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary via-accent to-primary transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <p className="mt-6 text-xs text-muted-foreground">
                Unlocks on{" "}
                <span className="text-foreground font-medium">
                  {new Date(LAUNCH_AT).toLocaleDateString(undefined, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </p>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}