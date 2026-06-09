import { useEffect, useRef } from "react";

export function CowboyBullScene() {
  const ref = useRef<HTMLDivElement>(null);
  // re-trigger keyframe loop reliability on mount
  useEffect(() => { ref.current?.classList.add("cb-mounted"); }, []);

  return (
    <div ref={ref} className="cb-scene relative w-full max-w-3xl mx-auto select-none">
      <div className="cb-stage relative aspect-[16/9] sm:aspect-[2/1] rounded-3xl overflow-hidden border border-primary/25"
           style={{
             background:
               "radial-gradient(120% 80% at 50% 20%, hsl(var(--primary)/0.18), transparent 60%)," +
               "linear-gradient(180deg, #1a1208 0%, #0e0a05 60%, #0a0703 100%)",
           }}>
        {/* Sun / spotlight */}
        <div className="absolute left-1/2 top-6 -translate-x-1/2 h-24 w-24 rounded-full blur-2xl opacity-70"
             style={{ background: "radial-gradient(circle, #ffd56b 0%, #b9802a 50%, transparent 70%)" }} />
        {/* Stars */}
        {Array.from({ length: 14 }).map((_, i) => (
          <span key={i} className="cb-star absolute rounded-full"
                style={{
                  left: `${(i * 73) % 100}%`,
                  top: `${(i * 37) % 40}%`,
                  width: 2, height: 2, background: "#ffe9a8",
                  animationDelay: `${i * 0.25}s`,
                }} />
        ))}

        {/* Ground line */}
        <div className="absolute inset-x-0 bottom-0 h-[28%]"
             style={{ background: "linear-gradient(180deg, transparent, #2a1c0a 70%, #1a1106 100%)" }} />
        <div className="absolute inset-x-0 bottom-[28%] h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        {/* Dust particles at hooves */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[20%] w-64 h-16 pointer-events-none">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className="cb-dust absolute rounded-full"
                  style={{
                    left: `${15 + i * 7}%`,
                    bottom: 0,
                    width: 6 + (i % 3) * 3,
                    height: 6 + (i % 3) * 3,
                    animationDelay: `${i * 0.18}s`,
                  }} />
          ))}
        </div>

        {/* Flying coins + $ */}
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i}
                className={`cb-coin absolute font-bold ${i % 3 === 0 ? "cb-coin--dollar" : ""}`}
                style={{
                  left: `${50 + (i % 2 === 0 ? -1 : 1) * (5 + i * 4)}%`,
                  bottom: `${30 + (i % 4) * 6}%`,
                  animationDelay: `${i * 0.35}s`,
                  animationDuration: `${3.5 + (i % 5) * 0.4}s`,
                }}>
            {i % 3 === 0 ? "$" : "●"}
          </span>
        ))}

        {/* Cowboy + Bull SVG */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[18%] w-[58%] max-w-[420px] cb-rider">
          <svg viewBox="0 0 400 260" className="w-full h-auto drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)]">
            <defs>
              <linearGradient id="goldHat" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fff3c0" />
                <stop offset="50%" stopColor="#f5c43c" />
                <stop offset="100%" stopColor="#8a5a12" />
              </linearGradient>
              <linearGradient id="bullBody" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3a2614" />
                <stop offset="100%" stopColor="#1a0f06" />
              </linearGradient>
              <linearGradient id="lasso" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f5c43c" />
                <stop offset="100%" stopColor="#b97c1a" />
              </linearGradient>
              <radialGradient id="chest" cx="50%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#ffe27a" />
                <stop offset="60%" stopColor="#c98a1c" />
                <stop offset="100%" stopColor="#5a3608" />
              </radialGradient>
            </defs>

            {/* Treasure chest (left) */}
            <g className="cb-chest" transform="translate(20,170)">
              <rect x="0" y="20" width="70" height="42" rx="4" fill="#3b2310" stroke="#8a5a12" strokeWidth="2"/>
              <path d="M0 24 Q35 -6 70 24 L70 30 L0 30 Z" fill="url(#chest)" stroke="#8a5a12" strokeWidth="2"/>
              <circle cx="35" cy="36" r="3.5" fill="#f5c43c" />
              <rect x="33" y="36" width="4" height="8" fill="#8a5a12" />
              {/* sparkle */}
              <g className="cb-sparkle">
                <circle cx="35" cy="10" r="2" fill="#fff3c0"/>
                <circle cx="55" cy="2" r="1.5" fill="#fff3c0"/>
                <circle cx="14" cy="6" r="1.5" fill="#fff3c0"/>
              </g>
            </g>

            {/* Bull */}
            <g className="cb-bull">
              {/* legs */}
              <g stroke="#1a0f06" strokeWidth="6" strokeLinecap="round">
                <line className="cb-leg cb-leg-1" x1="170" y1="200" x2="170" y2="240"/>
                <line className="cb-leg cb-leg-2" x1="200" y1="200" x2="200" y2="240"/>
                <line className="cb-leg cb-leg-3" x1="260" y1="200" x2="260" y2="240"/>
                <line className="cb-leg cb-leg-4" x1="290" y1="200" x2="290" y2="240"/>
              </g>
              {/* body */}
              <ellipse cx="230" cy="190" rx="80" ry="36" fill="url(#bullBody)" stroke="#000" strokeWidth="1.5"/>
              {/* tail */}
              <path d="M310 178 Q340 170 332 200" stroke="#1a0f06" strokeWidth="5" fill="none" strokeLinecap="round" className="cb-tail"/>
              {/* head */}
              <g transform="translate(150,170)">
                <ellipse cx="0" cy="14" rx="28" ry="22" fill="url(#bullBody)" stroke="#000" strokeWidth="1.5"/>
                {/* horns */}
                <path d="M-22 -2 Q-36 -22 -10 -10" stroke="#e9d3a2" strokeWidth="4" fill="none" strokeLinecap="round"/>
                <path d="M22 -2 Q36 -22 10 -10" stroke="#e9d3a2" strokeWidth="4" fill="none" strokeLinecap="round"/>
                {/* eye */}
                <circle cx="-10" cy="10" r="2.6" fill="#f5c43c"/>
                <circle cx="-10" cy="10" r="1.1" fill="#000"/>
                {/* nose ring */}
                <ellipse cx="0" cy="28" rx="9" ry="5" fill="#2a1808"/>
                <circle cx="0" cy="32" r="4" stroke="#f5c43c" strokeWidth="1.5" fill="none"/>
              </g>
            </g>

            {/* Cowboy */}
            <g className="cb-cowboy" transform="translate(230,110)">
              {/* lasso loop spinning above */}
              <ellipse className="cb-lasso" cx="40" cy="-50" rx="34" ry="10" fill="none" stroke="url(#lasso)" strokeWidth="2.5"/>
              <path d="M40 -40 Q30 -10 5 -2" stroke="url(#lasso)" strokeWidth="2.5" fill="none"/>

              {/* body */}
              <path d="M-6 10 L-14 60 L18 60 L10 10 Z" fill="#6b1f1f" stroke="#1a0606" strokeWidth="1.5"/>
              {/* belt */}
              <rect x="-14" y="56" width="32" height="6" fill="#3a2610"/>
              <rect x="0" y="56" width="4" height="6" fill="#f5c43c"/>
              {/* legs */}
              <path d="M-12 60 L-16 90 L-4 90 L-2 60 Z" fill="#3a2a14"/>
              <path d="M2 60 L4 90 L16 90 L14 60 Z" fill="#3a2a14"/>
              {/* boots */}
              <path d="M-18 90 L-2 90 L-2 96 L-14 100 Z" fill="#4a2a10" stroke="#1a0f06"/>
              <path d="M2 90 L18 90 L18 100 L4 96 Z" fill="#4a2a10" stroke="#1a0f06"/>
              {/* arms */}
              <path className="cb-arm-l" d="M-10 18 Q-26 28 -32 50" stroke="#6b1f1f" strokeWidth="6" fill="none" strokeLinecap="round"/>
              <path className="cb-arm-r" d="M14 18 Q30 8 38 -34" stroke="#6b1f1f" strokeWidth="6" fill="none" strokeLinecap="round"/>
              {/* head */}
              <circle cx="2" cy="0" r="10" fill="#e9c39a" stroke="#1a0f06" strokeWidth="1"/>
              <rect x="-5" y="2" width="14" height="3" fill="#5a3a1f"/>
              {/* GOLDEN HAT */}
              <g>
                <ellipse cx="2" cy="-8" rx="22" ry="4" fill="url(#goldHat)" stroke="#5a3608" strokeWidth="1"/>
                <path d="M-10 -10 Q2 -26 14 -10 Z" fill="url(#goldHat)" stroke="#5a3608" strokeWidth="1"/>
                <ellipse cx="2" cy="-11" rx="8" ry="2" fill="#5a3608" opacity="0.5"/>
              </g>
              {/* bandana */}
              <path d="M-7 8 L11 8 L9 16 L-5 16 Z" fill="#b91c1c" stroke="#1a0606"/>
            </g>
          </svg>
        </div>
      </div>

      <p className="mt-6 text-center text-lg sm:text-2xl font-extrabold tracking-tight">
        <span className="brand-text">Ride the Bull</span>
        <span className="text-foreground"> & Earn Real </span>
        <span className="brand-text">USDT Rewards!</span>
        <span className="ml-1">🤠</span>
      </p>

      <style>{`
        .cb-scene .cb-rider { animation: cb-ride 0.55s ease-in-out infinite alternate; transform-origin: 50% 100%; }
        @keyframes cb-ride {
          0%   { transform: translate(-50%, 0) rotate(-2deg); }
          100% { transform: translate(-50%, -10px) rotate(2deg); }
        }
        .cb-scene .cb-bull .cb-tail { animation: cb-tail 1.2s ease-in-out infinite; transform-origin: 310px 178px; }
        @keyframes cb-tail { 0%,100% { transform: rotate(-8deg);} 50% { transform: rotate(14deg);} }
        .cb-scene .cb-lasso { animation: cb-lasso 1.4s linear infinite; transform-origin: 40px -50px; }
        @keyframes cb-lasso { 0%{transform:rotate(0) scaleX(1);} 50%{transform:rotate(180deg) scaleX(0.5);} 100%{transform:rotate(360deg) scaleX(1);} }
        .cb-scene .cb-arm-r { animation: cb-arm 1.4s ease-in-out infinite; transform-origin: 14px 18px; }
        @keyframes cb-arm { 0%,100%{transform:rotate(-4deg);} 50%{transform:rotate(8deg);} }
        .cb-scene .cb-leg { animation: cb-leg 0.55s ease-in-out infinite alternate; transform-origin: top; }
        .cb-scene .cb-leg-2,.cb-scene .cb-leg-3 { animation-delay: 0.27s; }
        @keyframes cb-leg { 0%{transform: rotate(-10deg);} 100%{transform: rotate(10deg);} }
        .cb-scene .cb-chest { animation: cb-chest 2.2s ease-in-out infinite; transform-origin: 55px 60px; }
        @keyframes cb-chest { 0%,40%,100% { transform: rotate(0);} 50% { transform: translateY(-2px) rotate(-3deg);} 60% { transform: translateY(0) rotate(0);} }
        .cb-scene .cb-sparkle { animation: cb-sparkle 1.6s ease-in-out infinite; transform-origin: 35px 8px; }
        @keyframes cb-sparkle { 0%,100%{opacity:0; transform:scale(0.6);} 50%{opacity:1; transform:scale(1.1);} }
        .cb-scene .cb-coin {
          color:#f5c43c; font-size: 18px;
          text-shadow: 0 0 8px rgba(245,196,60,0.7);
          animation-name: cb-coin-fly; animation-iteration-count: infinite; animation-timing-function: ease-out;
          opacity: 0;
        }
        .cb-scene .cb-coin--dollar { color:#ffd56b; font-size: 22px; }
        @keyframes cb-coin-fly {
          0% { transform: translateY(0) translateX(0) rotate(0) scale(0.5); opacity: 0; }
          15% { opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translateY(-180px) translateX(var(--cb-x, 20px)) rotate(540deg) scale(1.1); opacity: 0; }
        }
        .cb-scene .cb-dust {
          background: radial-gradient(circle, rgba(212,170,90,0.6), rgba(212,170,90,0));
          animation: cb-dust 1.6s ease-out infinite; opacity: 0;
        }
        @keyframes cb-dust {
          0% { transform: translateY(0) scale(0.5); opacity: 0.8; }
          100% { transform: translateY(-22px) scale(1.6); opacity: 0; }
        }
        .cb-scene .cb-star { animation: cb-twinkle 2.4s ease-in-out infinite; }
        @keyframes cb-twinkle { 0%,100%{opacity:0.2;} 50%{opacity:1;} }
        @media (prefers-reduced-motion: reduce) {
          .cb-scene * { animation: none !important; }
        }
      `}</style>
    </div>
  );
}