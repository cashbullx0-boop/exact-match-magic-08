import { useEffect, useState } from "react";
import Lottie from "lottie-react";

const LOTTIE_URL = "https://assets5.lottiefiles.com/packages/lf20_qp1q7mct.json";
const FALLBACK_URL = "https://assets2.lottiefiles.com/packages/lf20_touohxv0.json";

export function EarnLottieScene() {
  const [data, setData] = useState<unknown | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      for (const url of [LOTTIE_URL, FALLBACK_URL]) {
        try {
          const r = await fetch(url);
          if (!r.ok) continue;
          const j = await r.json();
          if (!cancelled) {
            setData(j);
            return;
          }
        } catch {
          /* try next */
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const coins = Array.from({ length: 10 });

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black px-4 py-10 md:py-14">
      {/* gold glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 45%, rgba(245,196,60,0.22), transparent 70%), radial-gradient(40% 30% at 50% 100%, rgba(245,196,60,0.12), transparent 70%)",
        }}
      />

      {/* floating coins */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {coins.map((_, i) => {
          const left = (i * 9 + 5) % 95;
          const delay = (i * 0.7) % 6;
          const dur = 7 + ((i * 1.3) % 6);
          const size = 14 + ((i * 5) % 18);
          return (
            <span
              key={i}
              className="absolute block rounded-full"
              style={{
                left: `${left}%`,
                bottom: `-40px`,
                width: size,
                height: size,
                background:
                  "radial-gradient(circle at 30% 30%, #fff3c0, #f5c43c 55%, #b8860b)",
                boxShadow: "0 0 12px rgba(245,196,60,0.55)",
                animation: `coin-float ${dur}s linear ${delay}s infinite`,
                opacity: 0.85,
              }}
            >
              <span
                className="absolute inset-0 grid place-items-center text-[10px] font-bold"
                style={{ color: "#5b3a00" }}
              >
                $
              </span>
            </span>
          );
        })}
      </div>

      {/* lottie */}
      <div className="relative mx-auto flex h-[280px] w-full max-w-[520px] items-center justify-center sm:h-[340px] md:h-[400px]">
        {data ? (
          <Lottie animationData={data} loop autoplay style={{ height: "100%", width: "100%" }} />
        ) : (
          <div className="h-full w-full animate-pulse rounded-2xl bg-amber-500/5" />
        )}
      </div>

      {/* tagline */}
      <h3 className="relative mt-6 text-center text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl">
        <span
          className="bg-clip-text text-transparent"
          style={{
            backgroundImage:
              "linear-gradient(90deg, #fff3c0, #f5c43c 40%, #ffd166 60%, #b8860b)",
          }}
        >
          Complete Tasks &amp; Earn Real USDT Daily 💰
        </span>
      </h3>

      {/* feature pills */}
      <div className="relative mt-6 flex flex-wrap items-center justify-center gap-3">
        {[
          { label: "Surveys", icon: "📋" },
          { label: "Videos", icon: "🎬" },
          { label: "App Installs", icon: "📱" },
        ].map((p) => (
          <span
            key={p.label}
            className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-sm font-semibold text-amber-200 shadow-[0_0_18px_-6px_rgba(245,196,60,0.6)] backdrop-blur"
          >
            <span>{p.icon}</span>
            {p.label}
          </span>
        ))}
      </div>

      <style>{`
        @keyframes coin-float {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: 0.9; }
          90% { opacity: 0.9; }
          100% { transform: translateY(-520px) rotate(360deg); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="coin-float"] { animation: none !important; display: none; }
        }
      `}</style>
    </div>
  );
}