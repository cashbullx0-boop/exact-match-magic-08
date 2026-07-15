import { useEffect, useState } from "react";
import promo1 from "@/assets/promo-1.jpeg.asset.json";
import promo2 from "@/assets/promo-2.jpeg.asset.json";
import promo3 from "@/assets/promo-3.jpeg.asset.json";
import promo4 from "@/assets/promo-4.jpeg.asset.json";
import promo5 from "@/assets/promo-5.jpeg.asset.json";
import promo6 from "@/assets/promo-6.jpeg.asset.json";

const slides = [
  { src: promo1.url, alt: "CashBullX $50 first deposit, $5 welcome reward, up to $1 daily" },
  { src: promo2.url, alt: "Learn how CashBullX works before joining" },
  { src: promo3.url, alt: "+$1.00 daily profit celebration" },
  { src: promo4.url, alt: "Earn $55+ with CashBullX rewards" },
  { src: promo5.url, alt: "Special bonus — open 10 direct accounts, get $50 extra reward" },
  { src: promo6.url, alt: "Special offer — open 20 accounts in 10 days, get $150 direct bonus" },
];

export function PromoCarousel() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % slides.length), 4500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 shadow-lg bg-card/40 aspect-[16/9]">
      {slides.map((s, idx) => (
        <img
          key={idx}
          src={s.src}
          alt={s.alt}
          loading={idx === 0 ? "eager" : "lazy"}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out ${idx === i ? "opacity-100" : "opacity-0"}`}
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