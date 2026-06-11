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
      <div className="relative mx-auto w-full max-w-[640px]">
        <div className="relative mx-auto h-[240px] sm:h-[300px] md:h-[340px] w-full overflow-hidden">
          {/* gold glow */}
          <div
            aria-hidden
            className="absolute inset-0 blur-3xl pointer-events-none"
            style={{
              background:
                "radial-gradient(60% 55% at 50% 60%, rgba(245,196,60,0.45), rgba(245,196,60,0.12) 50%, transparent 75%)",
            }}
          />

          {/* running cowboy traveling across the scene */}
          <div className="cowboy-run absolute bottom-2 left-0 will-change-transform">
            <div className="cowboy-bounce relative">
              <img
                src={cowboyAsset.url}
                alt="Cowboy riding a bull"
                loading="lazy"
                className="h-[200px] sm:h-[250px] md:h-[290px] w-auto object-contain drop-shadow-[0_18px_30px_rgba(245,196,60,0.4)]"
                style={{ background: "transparent" }}
              />
              {/* dust particles at bull's feet */}
              <div aria-hidden className="pointer-events-none absolute bottom-1 left-2 right-2 h-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <span
                    key={i}
                    className="dust-puff absolute bottom-0 block rounded-full"
                    style={{
                      left: `${10 + i * 12}%`,
                      width: 10 + (i % 3) * 4,
                      height: 10 + (i % 3) * 4,
                      background:
                        "radial-gradient(circle at 30% 30%, rgba(255,236,180,0.85), rgba(180,140,60,0.25) 60%, transparent 75%)",
                      animationDelay: `${i * 0.12}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
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
          0%, 100% { transform: translateY(0) rotate(-1.5deg); }
          50% { transform: translateY(-10px) rotate(1.5deg); }
        }
        .cowboy-bounce { animation: cowboy-bounce 0.45s ease-in-out infinite; will-change: transform; }

        /* Enter from RIGHT → pause at CENTER → exit to LEFT → loop */
        @keyframes cowboy-run {
          0%   { transform: translateX(110%) scaleX(-1); }
          25%  { transform: translateX(0%)   scaleX(-1); }
          55%  { transform: translateX(0%)   scaleX(-1); }
          100% { transform: translateX(-130%) scaleX(-1); }
        }
        .cowboy-run {
          left: 50%;
          margin-left: -145px;
          animation: cowboy-run 6s cubic-bezier(.45,.05,.4,1) infinite;
        }

        @keyframes dust-puff {
          0%   { opacity: 0; transform: translate(0, 0) scale(0.6); }
          30%  { opacity: 0.9; }
          100% { opacity: 0; transform: translate(20px, -14px) scale(1.8); }
        }
        .dust-puff { animation: dust-puff 0.7s ease-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          [style*="coin-float"] { animation: none !important; display: none; }
          .cowboy-bounce, .cowboy-run, .dust-puff { animation: none !important; }
          .cowboy-run { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}