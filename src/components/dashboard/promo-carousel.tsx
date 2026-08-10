import { useEffect, useState } from "react";
import promoTeam from "@/assets/promo-team-1000.jpeg.asset.json";
import promoComingSoon from "@/assets/promo-coming-soon.jpeg.asset.json";
import promoOffer from "@/assets/promo-offer-7days.jpeg.asset.json";
import promo7Days10Refs from "@/assets/promo-7days-10refs.jpeg";
import promo10Days20Refs from "@/assets/promo-10days-20refs.jpeg";

const slides = [
  { src: promoTeam.url, alt: "Build a powerful 1000 people team — iPhone 17 gift and $1000 per month" },
  { src: promoComingSoon.url, alt: "CashBullX app coming soon to Google Play Store and Apple App Store" },
  { src: promoOffer.url, alt: "Special limited time offer — invest $50 and get $7 reward within 7 days" },
  { src: promo7Days10Refs, alt: "7 days referral challenge — add 10 accounts in 7 days and earn $50 reward" },
  { src: promo10Days20Refs, alt: "10 days referral challenge — add 20 accounts in 10 days and earn $100 reward" },
];

export function PromoCarousel() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % slides.length), 4500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 shadow-lg bg-[#0a0f1e] aspect-[16/10] sm:aspect-[16/9]">
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
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {slides.map((_, idx) => (
          <button
            key={idx}
            aria-label={`Go to slide ${idx + 1}`}
            onClick={() => setI(idx)}
            className={`h-1.5 rounded-full transition-all ${idx === i ? "w-6 bg-primary" : "w-1.5 bg-white/50 hover:bg-white/80"}`}
          />
        ))}
      </div>
    </div>
  );
}