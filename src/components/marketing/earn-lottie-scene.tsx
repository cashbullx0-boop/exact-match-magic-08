export function EarnLottieScene() {
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

      {/* SVG bull + trader scene */}
      <div className="relative mx-auto w-full max-w-[900px]" style={{ height: 350 }}>
        <BullTraderSVG />
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
        @keyframes bull-run {
          0%, 100% { transform: translateY(0) rotate(-1deg); }
          50% { transform: translateY(-6px) rotate(1deg); }
        }
        @keyframes bull-legs-front {
          0%, 100% { transform: rotate(-12deg); }
          50% { transform: rotate(14deg); }
        }
        @keyframes bull-legs-back {
          0%, 100% { transform: rotate(14deg); }
          50% { transform: rotate(-12deg); }
        }
        @keyframes coin-spin {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        @keyframes coin-orbit {
          0% { transform: translate(0,0) rotate(0deg); }
          50% { transform: translate(0,-14px) rotate(180deg); }
          100% { transform: translate(0,0) rotate(360deg); }
        }
        @keyframes dust-puff {
          0% { transform: translateX(0) scale(1); opacity: 0.6; }
          100% { transform: translateX(-40px) scale(0.4); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="coin-float"] { animation: none !important; display: none; }
          .bull-anim, .legs-front, .legs-back, .orbit-coin, .dust { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

function BullTraderSVG() {
  return (
    <svg
      viewBox="0 0 900 350"
      className="h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Trader riding a bull holding USDT"
    >
      <defs>
        <linearGradient id="bullBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a3a44" />
          <stop offset="60%" stopColor="#1f1f25" />
          <stop offset="100%" stopColor="#0c0c10" />
        </linearGradient>
        <linearGradient id="bullHighlight" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff3c0" />
          <stop offset="50%" stopColor="#f5c43c" />
          <stop offset="100%" stopColor="#a8730a" />
        </linearGradient>
        <linearGradient id="hornGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff1b0" />
          <stop offset="60%" stopColor="#f0b933" />
          <stop offset="100%" stopColor="#8a5a04" />
        </linearGradient>
        <linearGradient id="suitGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1d2a44" />
          <stop offset="100%" stopColor="#0c1426" />
        </linearGradient>
        <linearGradient id="skinGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8c39a" />
          <stop offset="100%" stopColor="#b88a5c" />
        </linearGradient>
        <radialGradient id="coinFace" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#fff7d3" />
          <stop offset="55%" stopColor="#f5c43c" />
          <stop offset="100%" stopColor="#7a5208" />
        </radialGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
          <feOffset dx="0" dy="4" result="off" />
          <feComponentTransfer><feFuncA type="linear" slope="0.45" /></feComponentTransfer>
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* ground shadow */}
      <ellipse cx="450" cy="305" rx="260" ry="14" fill="#000" opacity="0.55" />

      {/* dust puffs */}
      <g className="dust" style={{ transformOrigin: "center" }}>
        {[0, 0.6, 1.2].map((d, i) => (
          <circle
            key={i}
            cx={250 + i * 18}
            cy={300}
            r={8 + i * 2}
            fill="#f5c43c"
            opacity="0.25"
            style={{ animation: `dust-puff 1.6s ${d}s ease-out infinite` }}
          />
        ))}
      </g>

      {/* BULL group - animated */}
      <g
        className="bull-anim"
        style={{
          transformOrigin: "450px 220px",
          animation: "bull-run 1.2s ease-in-out infinite",
        }}
      >
        {/* back legs */}
        <g
          className="legs-back"
          style={{
            transformOrigin: "560px 240px",
            animation: "bull-legs-back 0.6s ease-in-out infinite",
          }}
        >
          <rect x="548" y="238" width="18" height="62" rx="6" fill="url(#bullBody)" />
          <rect x="546" y="294" width="22" height="10" rx="3" fill="#0a0a0e" />
        </g>
        <g
          className="legs-back"
          style={{
            transformOrigin: "595px 240px",
            animation: "bull-legs-back 0.6s 0.3s ease-in-out infinite",
          }}
        >
          <rect x="585" y="238" width="18" height="62" rx="6" fill="url(#bullBody)" />
          <rect x="583" y="294" width="22" height="10" rx="3" fill="#0a0a0e" />
        </g>

        {/* body */}
        <path
          d="M310 200 Q 320 150 410 145 Q 520 138 600 160 Q 640 170 640 220 Q 640 260 590 260 L 350 260 Q 300 260 310 200 Z"
          fill="url(#bullBody)"
          filter="url(#softShadow)"
        />
        <path
          d="M320 200 Q 340 160 420 158 Q 520 152 590 175"
          fill="none"
          stroke="url(#bullHighlight)"
          strokeWidth="14"
        />

        {/* tail */}
        <path d="M640 200 Q 680 200 685 240 Q 685 252 678 252 Q 678 232 660 232 Z" fill="#1a1a1f" />
        <circle cx="685" cy="252" r="6" fill="url(#goldGrad)" />

        {/* head */}
        <path
          d="M300 200 Q 240 200 230 240 Q 226 268 256 274 Q 286 280 304 260 Q 318 244 318 222 Z"
          fill="url(#bullBody)"
        />
        {/* snout */}
        <ellipse cx="244" cy="258" rx="22" ry="14" fill="#16161a" />
        <circle cx="238" cy="256" r="2.2" fill="#0a0a0e" />
        <circle cx="252" cy="256" r="2.2" fill="#0a0a0e" />
        {/* eye */}
        <circle cx="282" cy="226" r="4" fill="#fff" />
        <circle cx="283" cy="227" r="2.2" fill="#0a0a0e" />
        {/* nose ring */}
        <circle cx="245" cy="270" r="6" fill="none" stroke="url(#goldGrad)" strokeWidth="2.2" />

        {/* horns */}
        <path d="M298 198 Q 270 168 246 176 Q 270 184 286 210 Z" fill="url(#hornGrad)" />
        <path d="M312 196 Q 332 162 360 172 Q 332 182 322 208 Z" fill="url(#hornGrad)" />

        {/* front legs */}
        <g
          className="legs-front"
          style={{
            transformOrigin: "352px 245px",
            animation: "bull-legs-front 0.6s ease-in-out infinite",
          }}
        >
          <rect x="344" y="244" width="18" height="60" rx="6" fill="url(#bullBody)" />
          <rect x="342" y="298" width="22" height="10" rx="3" fill="#0a0a0e" />
        </g>
        <g
          className="legs-front"
          style={{
            transformOrigin: "390px 245px",
            animation: "bull-legs-front 0.6s 0.3s ease-in-out infinite",
          }}
        >
          <rect x="382" y="244" width="18" height="60" rx="6" fill="url(#bullBody)" />
          <rect x="380" y="298" width="22" height="10" rx="3" fill="#0a0a0e" />
        </g>

        {/* TRADER */}
        <g transform="translate(430,60)">
          {/* legs over bull */}
          <path d="M20 110 Q 0 130 6 160 L 26 160 Q 28 138 40 124 Z" fill="url(#suitGrad)" />
          <path d="M70 108 Q 96 124 96 158 L 76 158 Q 74 134 60 122 Z" fill="url(#suitGrad)" />
          {/* shoes */}
          <rect x="0" y="156" width="32" height="10" rx="3" fill="#0a0a0e" />
          <rect x="72" y="154" width="32" height="10" rx="3" fill="#0a0a0e" />

          {/* torso */}
          <path d="M14 60 Q 14 36 50 32 Q 86 36 88 62 L 92 116 Q 50 128 10 114 Z" fill="url(#suitGrad)" />
          {/* shirt */}
          <path d="M40 56 L 50 96 L 60 56 L 55 50 L 45 50 Z" fill="#f3f4f6" />
          {/* tie */}
          <path d="M48 56 L 52 56 L 56 100 L 50 110 L 44 100 Z" fill="url(#goldGrad)" />

          {/* left arm holding coin up */}
          <path d="M14 64 Q -8 56 -18 18 L -6 14 Q 8 46 22 60 Z" fill="url(#suitGrad)" />
          <circle cx="-12" cy="14" r="8" fill="url(#skinGrad)" />

          {/* USDT coin in raised hand */}
          <g
            className="orbit-coin"
            style={{
              transformOrigin: "-12px -8px",
              animation: "coin-spin 3s linear infinite",
            }}
          >
            <circle cx="-12" cy="-8" r="22" fill="url(#coinFace)" stroke="#7a5208" strokeWidth="1.5" />
            <circle cx="-12" cy="-8" r="17" fill="none" stroke="#fff5c8" strokeOpacity="0.55" strokeWidth="1" />
            <text
              x="-12"
              y="-3"
              textAnchor="middle"
              fontFamily="ui-sans-serif, system-ui, -apple-system"
              fontWeight="800"
              fontSize="13"
              fill="#5b3a00"
            >
              USDT
            </text>
          </g>

          {/* right arm holding rein */}
          <path d="M86 64 Q 110 70 118 92 L 108 100 Q 96 84 82 76 Z" fill="url(#suitGrad)" />
          <circle cx="118" cy="92" r="7" fill="url(#skinGrad)" />

          {/* head */}
          <circle cx="50" cy="20" r="20" fill="url(#skinGrad)" />
          {/* hair */}
          <path d="M32 14 Q 36 -2 50 -2 Q 66 -2 68 14 Q 60 8 50 8 Q 40 8 32 14 Z" fill="#1d1410" />
          {/* eyes */}
          <circle cx="44" cy="22" r="1.6" fill="#0a0a0e" />
          <circle cx="56" cy="22" r="1.6" fill="#0a0a0e" />
          {/* smile */}
          <path d="M44 30 Q 50 34 56 30" stroke="#5a3a1a" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          {/* collar */}
          <path d="M36 40 L 50 56 L 64 40 Z" fill="#0a0a0e" />
        </g>

        {/* rein */}
        <path d="M548 92 Q 470 110 320 200" stroke="#5a3a1a" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>

      {/* Flying coins around scene */}
      {[
        { x: 130, y: 90, r: 18, d: 0, label: "$" },
        { x: 760, y: 80, r: 22, d: 0.5, label: "₮" },
        { x: 820, y: 200, r: 16, d: 1.0, label: "$" },
        { x: 90, y: 220, r: 20, d: 0.3, label: "₮" },
        { x: 700, y: 260, r: 14, d: 1.4, label: "$" },
        { x: 180, y: 270, r: 14, d: 0.8, label: "₮" },
      ].map((c, i) => (
        <g
          key={i}
          className="orbit-coin"
          style={{
            transformOrigin: `${c.x}px ${c.y}px`,
            animation: `coin-orbit ${3.5 + (i % 3)}s ${c.d}s ease-in-out infinite`,
          }}
        >
          <g
            style={{
              transformOrigin: `${c.x}px ${c.y}px`,
              animation: `coin-spin ${2.4 + (i % 2)}s linear infinite`,
            }}
          >
            <circle cx={c.x} cy={c.y} r={c.r} fill="url(#coinFace)" stroke="#7a5208" strokeWidth="1.2" />
            <text
              x={c.x}
              y={c.y + c.r / 3}
              textAnchor="middle"
              fontFamily="ui-sans-serif, system-ui, -apple-system"
              fontWeight="800"
              fontSize={c.r}
              fill="#5b3a00"
            >
              {c.label}
            </text>
          </g>
        </g>
      ))}
    </svg>
  );
}