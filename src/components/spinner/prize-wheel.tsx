import { useMemo } from "react";

type Seg = { cents: number };

const PALETTE = [
  ["#f7b733", "#c47f10"],
  ["#111827", "#0b1220"],
  ["#22c55e", "#14803c"],
  ["#111827", "#0b1220"],
  ["#3b82f6", "#1d4ed8"],
  ["#111827", "#0b1220"],
  ["#ef4444", "#991b1b"],
  ["#111827", "#0b1220"],
  ["#a855f7", "#6b21a8"],
  ["#111827", "#0b1220"],
  ["#14b8a6", "#0d7d72"],
  ["#111827", "#0b1220"],
];

const SIZE = 400;
const C = SIZE / 2;
const R = 178; // face radius

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const;
}

function wedgePath(start: number, end: number, r: number) {
  const [x1, y1] = polar(C, C, r, start);
  const [x2, y2] = polar(C, C, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${C} ${C} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

const usd = (cents: number) => (cents / 100).toFixed(2);

/** Photoreal casino-style prize wheel rendered in SVG. */
export function PrizeWheel({
  segments,
  rotation,
  spinning,
}: {
  segments: Seg[];
  rotation: number;
  spinning: boolean;
}) {
  const n = Math.max(segments.length, 1);
  const segAngle = 360 / n;

  const bulbs = useMemo(() => Array.from({ length: 24 }, (_, i) => (i * 360) / 24), []);

  return (
    <div className="relative mx-auto w-full max-w-[360px]">
      {/* ambient glow under the wheel */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 blur-3xl"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 55%, rgba(247,183,51,0.35), transparent 70%)",
        }}
      />

      {/* pointer */}
      <div className="pointer-events-none absolute left-1/2 top-[-6px] z-20 -translate-x-1/2">
        <svg width="46" height="58" viewBox="0 0 46 58">
          <defs>
            <linearGradient id="pw-ptr" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fff6d0" />
              <stop offset="35%" stopColor="#f7b733" />
              <stop offset="70%" stopColor="#b8801a" />
              <stop offset="100%" stopColor="#7a5210" />
            </linearGradient>
          </defs>
          <path
            d="M23 56 L6 16 A18 18 0 1 1 40 16 Z"
            fill="url(#pw-ptr)"
            stroke="#5c3c08"
            strokeWidth="1.5"
            style={{ filter: "drop-shadow(0 6px 10px rgba(0,0,0,.55))" }}
          />
          <circle cx="23" cy="16" r="6" fill="#3b2606" opacity="0.85" />
          <circle cx="19" cy="11" r="3" fill="#fff8dc" opacity="0.7" />
        </svg>
      </div>

      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full drop-shadow-[0_25px_45px_rgba(0,0,0,0.65)]"
        role="img"
        aria-label="Prize wheel"
      >
        <defs>
          <linearGradient id="pw-rim" x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stopColor="#fff3c4" />
            <stop offset="18%" stopColor="#f7d67a" />
            <stop offset="38%" stopColor="#c58f22" />
            <stop offset="55%" stopColor="#8a5f10" />
            <stop offset="72%" stopColor="#e6be58" />
            <stop offset="100%" stopColor="#7a5210" />
          </linearGradient>
          <radialGradient id="pw-face-shade" cx="50%" cy="35%" r="75%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
            <stop offset="55%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.45" />
          </radialGradient>
          <radialGradient id="pw-hub" cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#fffbe8" />
            <stop offset="35%" stopColor="#f0c килограм" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="pw-hub2" x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0%" stopColor="#fff6d0" />
            <stop offset="40%" stopColor="#e0ac31" />
            <stop offset="75%" stopColor="#8a5f10" />
            <stop offset="100%" stopColor="#f3d580" />
          </linearGradient>
          {segments.map((_, i) => {
            const [a, b] = PALETTE[i % PALETTE.length];
            return (
              <radialGradient key={i} id={`pw-seg-${i}`} cx="50%" cy="50%" r="72%">
                <stop offset="0%" stopColor={b} />
                <stop offset="62%" stopColor={a} />
                <stop offset="100%" stopColor={b} />
              </radialGradient>
            );
          })}
          <filter id="pw-inner" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* outer gold rim */}
        <circle cx={C} cy={C} r={196} fill="url(#pw-rim)" />
        <circle cx={C} cy={C} r={196} fill="none" stroke="#4a3208" strokeWidth="2" />
        <circle cx={C} cy={C} r={182} fill="#1a1206" />

        {/* bulbs */}
        {bulbs.map((deg, i) => {
          const [x, y] = polar(C, C, 189, deg);
          return (
            <g key={deg}>
              <circle cx={x} cy={y} r="5.5" fill="#6b4a0e" />
              <circle
                cx={x}
                cy={y}
                r="4"
                fill="#fff3c0"
                opacity={spinning ? 1 : 0.75}
                style={{
                  filter: "drop-shadow(0 0 5px rgba(255,224,130,0.95))",
                  animation: spinning
                    ? `pw-bulb 0.5s ${(i % 3) * 0.16}s linear infinite`
                    : undefined,
                }}
              />
            </g>
          );
        })}

        {/* rotating face */}
        <g
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: "50% 50%",
            transition: "transform 4s cubic-bezier(0.15, 0.9, 0.2, 1)",
          }}
        >
          {segments.map((s, i) => {
            const start = i * segAngle - segAngle / 2;
            const end = start + segAngle;
            const mid = start + segAngle / 2;
            const [tx, ty] = polar(C, C, R * 0.66, mid);
            const dark = i % 2 === 1;
            return (
              <g key={i}>
                <path
                  d={wedgePath(start, end, R)}
                  fill={`url(#pw-seg-${i})`}
                  stroke="rgba(0,0,0,0.35)"
                  strokeWidth="1"
                />
                <g transform={`translate(${tx} ${ty}) rotate(${mid})`}>
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={s.cents === 0 ? 15 : 19}
                    fontWeight={900}
                    fill={dark ? "#ffe9a8" : "#ffffff"}
                    style={{
                      paintOrder: "stroke",
                      stroke: "rgba(0,0,0,0.55)",
                      strokeWidth: 3,
                      letterSpacing: "0.5px",
                    }}
                  >
                    {s.cents === 0 ? "TRY AGAIN" : `$${usd(s.cents)}`}
                  </text>
                </g>
              </g>
            );
          })}

          {/* spokes / separators */}
          {segments.map((_, i) => {
            const a = i * segAngle - segAngle / 2;
            const [x, y] = polar(C, C, R, a);
            return (
              <line
                key={`sp-${i}`}
                x1={C}
                y1={C}
                x2={x}
                y2={y}
                stroke="#f5dfa0"
                strokeOpacity="0.35"
                strokeWidth="1.5"
              />
            );
          })}
        </g>

        {/* glass shading over the face */}
        <circle cx={C} cy={C} r={R} fill="url(#pw-face-shade)" pointerEvents="none" />
        <ellipse
          cx={C}
          cy={C - 70}
          rx={140}
          ry={72}
          fill="#ffffff"
          opacity="0.07"
          pointerEvents="none"
        />
        <circle cx={C} cy={C} r={R} fill="none" stroke="#e9c979" strokeWidth="3" opacity="0.8" />

        {/* hub */}
        <circle cx={C} cy={C} r="42" fill="url(#pw-hub2)" filter="url(#pw-inner)" />
        <circle cx={C} cy={C} r="31" fill="#14100a" />
        <circle cx={C} cy={C} r="31" fill="none" stroke="#f0d27f" strokeWidth="1.5" opacity="0.7" />
        <text
          x={C}
          y={C + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="16"
          fontWeight={900}
          fill="#f7d67a"
          letterSpacing="1"
        >
          CBX
        </text>
        <circle cx={C - 14} cy={C - 16} r="6" fill="#ffffff" opacity="0.35" />
      </svg>

      <style>{`
        @keyframes pw-bulb { 0%,100% { opacity: 1 } 50% { opacity: 0.25 } }
      `}</style>
    </div>
  );
}
