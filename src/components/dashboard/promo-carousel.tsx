import { useEffect, useState } from "react";
import referralRewardPromo from "@/assets/referral-reward-promo.jpeg.asset.json";
import accountReferralWarning from "@/assets/account-referral-warning.jpeg.asset.json";

const slides = [
  { src: referralRewardPromo.url, alt: "Referral Reward: $10 deposit gives $5 reward — valid until September 25, 2026" },
  { src: accountReferralWarning.url, alt: "Important account and referral warning", showsCountdown: true },
];

const DEADLINE_MS = Date.parse("2026-10-02T00:00:00+05:00");

function formatCountdown(ms: number) {
  const remaining = Math.max(0, ms);
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1_000);
  return `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

export function PromoCarousel() {
  const [i, setI] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % slides.length), 4500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const referralDeadline = DEADLINE_MS;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 shadow-lg bg-background aspect-[16/10] sm:aspect-[16/9]">
      {slides.map((s, idx) => (
        <img
          key={idx}
          src={s.src}
          alt={s.alt}
          loading={idx === 0 ? "eager" : "lazy"}
          className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-700 ease-out ${idx === i ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
      {slides[i]?.showsCountdown && (
        <div className="absolute right-3 top-3 rounded-md border border-destructive/60 bg-background/95 px-3 py-2 text-center shadow-lg backdrop-blur-sm">
          <p className="text-[10px] font-semibold uppercase text-destructive">Referral deadline</p>
          <p className="mt-0.5 text-sm font-bold tabular-nums text-foreground">
            {formatCountdown(referralDeadline - now)}
          </p>
        </div>
      )}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {slides.map((_, idx) => (
          <button
            key={idx}
            aria-label={`Go to slide ${idx + 1}`}
            onClick={() => setI(idx)}
            className={`h-1.5 rounded-full transition-all ${idx === i ? "w-6 bg-primary" : "w-1.5 bg-foreground/50 hover:bg-foreground/80"}`}
          />
        ))}
      </div>
    </div>
  );
}