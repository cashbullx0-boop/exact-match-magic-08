import cowboyAsset from "@/assets/cowboy-bull.png.asset.json";

export function EarnLottieScene() {
  // Fewer particles on mobile reduce paint cost; CSS hides extras via media query below.
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
              className={`absolute block rounded-full coin-particle ${i >= 5 ? "hidden md:block" : ""}`}
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

      {/* SVG bull + trader scene */}
      <div className="relative mx-auto w-full max-w-[520px]">
        <div className="relative mx-auto aspect-square w-[260px] sm:w-[340px] md:w-[400px]">
          {/* gold glow behind character */}
          <div
            aria-hidden
            className="absolute inset-0 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle at 50% 55%, rgba(245,196,60,0.55), rgba(245,196,60,0.18) 45%, transparent 70%)",
            }}
          />
          {/* orbiting coins */}
          {[
            { top: "8%", left: "12%", d: 0, dur: 3.2 },
            { top: "18%", right: "8%", d: 0.6, dur: 3.6 },
            { bottom: "22%", left: "4%", d: 1.0, dur: 3.4 },
            { bottom: "10%", right: "10%", d: 0.3, dur: 4.0 },
            { top: "44%", left: "-2%", d: 1.4, dur: 3.8 },
            { top: "50%", right: "-2%", d: 0.9, dur: 3.5 },
          ].map((c, i) => (
            <span
              key={i}
              className="absolute grid place-items-center rounded-full text-[11px] font-extrabold coin-orbit"
              style={{
                top: c.top as string | undefined,
                left: c.left as string | undefined,
                right: c.right as string | undefined,
                bottom: c.bottom as string | undefined,
                width: 28,
                height: 28,
                color: "#5b3a00",
                background:
                  "radial-gradient(circle at 30% 30%, #fff3c0, #f5c43c 55%, #b8860b)",
                boxShadow: "0 0 14px rgba(245,196,60,0.7)",
                animation: `coin-orbit ${c.dur}s ease-in-out ${c.d}s infinite`,
              }}
            >
              $
            </span>
          ))}
          {/* cowboy character with bounce */}
          <img
            src={cowboyAsset.url}
            alt="Cowboy riding a bull"
            loading="lazy"
            className="relative z-10 h-full w-full object-contain cowboy-bounce drop-shadow-[0_18px_30px_rgba(245,196,60,0.35)]"
          />
        </div>
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
        @keyframes cowboy-bounce {
          0%, 100% { transform: translateY(0) rotate(-1deg); }
          50% { transform: translateY(-14px) rotate(1deg); }
        }
        .cowboy-bounce { animation: cowboy-bounce 2.6s ease-in-out infinite; will-change: transform; }
        @keyframes coin-orbit {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(180deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="coin-float"] { animation: none !important; display: none; }
          .cowboy-bounce, [class*="coin-orbit"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}