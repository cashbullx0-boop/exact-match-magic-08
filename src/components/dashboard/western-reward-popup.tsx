import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export type WesternRewardType =
  | "first_deposit"
  | "level_up"
  | "daily_checkin"
  | "referral_milestone"
  | "withdrawal_approved"
  | "generic";

export interface WesternRewardPayload {
  type?: WesternRewardType;
  title: string;
  subtitle?: string;
  amount?: string;
  emoji?: string;
  autoDismissMs?: number;
}

interface Ctx {
  show: (p: WesternRewardPayload) => void;
}

const RewardCtx = createContext<Ctx | null>(null);

export function useWesternReward() {
  const ctx = useContext(RewardCtx);
  if (!ctx) throw new Error("useWesternReward must be used inside <WesternRewardProvider>");
  return ctx;
}

export function WesternRewardProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<WesternRewardPayload | null>(null);
  const [closing, setClosing] = useState(false);

  const dismiss = useCallback(() => {
    setClosing(true);
    window.setTimeout(() => {
      setPayload(null);
      setClosing(false);
    }, 900);
  }, []);

  const show = useCallback((p: WesternRewardPayload) => {
    setClosing(false);
    setPayload(p);
  }, []);

  useEffect(() => {
    if (!payload) return;
    const ms = payload.autoDismissMs ?? 4000;
    const t = window.setTimeout(dismiss, ms);
    return () => window.clearTimeout(t);
  }, [payload, dismiss]);

  return (
    <RewardCtx.Provider value={{ show }}>
      {children}
      {payload && <WesternRewardPopup payload={payload} closing={closing} onDismiss={dismiss} />}
    </RewardCtx.Provider>
  );
}

function rewardIcon(type?: WesternRewardType) {
  // emoji of the reward held up by cowboy
  switch (type) {
    case "first_deposit": return "💰";
    case "level_up": return "🏆";
    case "daily_checkin": return "🔥";
    case "referral_milestone": return "🎯";
    case "withdrawal_approved": return "💸";
    default: return "🎁";
  }
}

function WesternRewardPopup({
  payload,
  closing,
  onDismiss,
}: {
  payload: WesternRewardPayload;
  closing: boolean;
  onDismiss: () => void;
}) {
  const icon = rewardIcon(payload.type);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm ${
        closing ? "wr-overlay-out" : "wr-overlay-in"
      }`}
      onClick={onDismiss}
    >
      <style>{wrCss}</style>

      <div
        className="relative w-full max-w-md rounded-3xl border border-amber-500/30 overflow-hidden shadow-2xl"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, rgba(245,196,60,0.18), rgba(20,12,6,0.95) 60%), linear-gradient(180deg, #1a1208 0%, #0c0805 100%)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* desert horizon */}
        <div className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
             style={{
               background:
                 "linear-gradient(180deg, transparent, rgba(120,70,20,0.45) 60%, rgba(60,30,8,0.9))",
             }}
        />
        {/* sun glow */}
        <div className="absolute left-1/2 top-10 -translate-x-1/2 h-32 w-32 rounded-full blur-2xl opacity-50"
             style={{ background: "radial-gradient(circle, #ffd770, transparent 70%)" }} />

        {/* twinkle stars */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="absolute wr-star"
              style={{
                left: `${(i * 37) % 95 + 2}%`,
                top: `${(i * 53) % 60 + 5}%`,
                animationDelay: `${(i % 6) * 0.25}s`,
              }}
            >★</span>
          ))}
        </div>

        {/* SCENE */}
        <div className="relative h-56 sm:h-64 overflow-hidden">
          {/* coin/star burst */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            {Array.from({ length: 14 }).map((_, i) => {
              const angle = (i / 14) * Math.PI * 2;
              const dx = Math.cos(angle) * 140;
              const dy = Math.sin(angle) * 90;
              return (
                <span
                  key={i}
                  className="absolute wr-burst"
                  style={{
                    // @ts-expect-error css vars
                    "--dx": `${dx}px`,
                    "--dy": `${dy}px`,
                    animationDelay: `${1.0 + (i % 5) * 0.05}s`,
                  } as React.CSSProperties}
                >
                  {i % 2 === 0 ? "🪙" : "✨"}
                </span>
              );
            })}
          </div>

          {/* cowboy on bull */}
          <div className="absolute bottom-6 left-0 wr-ride">
            <CowboyOnBull rewardEmoji={icon} />
            {/* dust */}
            <div className="absolute -bottom-1 left-6 flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="wr-dust block h-2 w-2 rounded-full bg-amber-200/60"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* COPY */}
        <div className="relative px-6 pb-6 pt-2 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(180deg, #fff3c0 0%, #f5c43c 55%, #a8730a 100%)" }}>
            {payload.title}
          </h2>
          {payload.amount && (
            <p className="mt-2 text-4xl sm:text-5xl font-black bg-clip-text text-transparent drop-shadow"
               style={{ backgroundImage: "linear-gradient(180deg, #fff3c0, #f5c43c, #a8730a)" }}>
              {payload.amount}
            </p>
          )}
          {payload.subtitle && (
            <p className="mt-2 text-sm text-amber-100/80">{payload.subtitle}</p>
          )}

          <Button
            onClick={onDismiss}
            className="mt-5 w-full h-11 font-bold text-base text-amber-950 border-0 hover:opacity-95"
            style={{ background: "linear-gradient(180deg, #fff1b0, #f5c43c 55%, #b8830a)" }}
          >
            Claim Reward 🤠
          </Button>
        </div>
      </div>
    </div>
  );
}

/* SVG cowboy riding a bull, with a hat-tip + reward-present animation */
function CowboyOnBull({ rewardEmoji }: { rewardEmoji: string }) {
  return (
    <div className="relative">
      <svg width="200" height="150" viewBox="0 0 200 150" className="wr-bob">
        <defs>
          <linearGradient id="wrHorn" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#fff1b0" />
            <stop offset="100%" stopColor="#8a5a04" />
          </linearGradient>
          <linearGradient id="wrBull" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#4a2f1a" />
            <stop offset="100%" stopColor="#1a0e06" />
          </linearGradient>
          <linearGradient id="wrHat" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ffe27a" />
            <stop offset="100%" stopColor="#a8730a" />
          </linearGradient>
        </defs>

        {/* bull body */}
        <ellipse cx="100" cy="105" rx="55" ry="22" fill="url(#wrBull)" />
        {/* legs */}
        <rect x="65" y="118" width="7" height="22" fill="#1a0e06" className="wr-leg-a" />
        <rect x="85" y="118" width="7" height="22" fill="#1a0e06" className="wr-leg-b" />
        <rect x="108" y="118" width="7" height="22" fill="#1a0e06" className="wr-leg-b" />
        <rect x="128" y="118" width="7" height="22" fill="#1a0e06" className="wr-leg-a" />
        {/* tail */}
        <path d="M45 100 q-12 4 -10 18" stroke="#fff1b0" strokeWidth="2" fill="none" className="wr-tail" />
        {/* head */}
        <ellipse cx="155" cy="92" rx="20" ry="16" fill="url(#wrBull)" />
        {/* horns */}
        <path d="M148 80 q-6 -14 -18 -10" stroke="url(#wrHorn)" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M162 80 q6 -14 18 -10" stroke="url(#wrHorn)" strokeWidth="4" fill="none" strokeLinecap="round" />
        {/* eye + nostril */}
        <circle cx="160" cy="90" r="1.8" fill="#fff" />
        <circle cx="170" cy="96" r="1.4" fill="#000" opacity="0.7" />

        {/* cowboy body */}
        <ellipse cx="95" cy="78" rx="11" ry="13" fill="#1d2a44" />
        {/* legs */}
        <rect x="88" y="85" width="6" height="14" fill="#0c1426" />
        <rect x="98" y="85" width="6" height="14" fill="#0c1426" />
        {/* head */}
        <circle cx="95" cy="62" r="8" fill="#f1c69b" />
        {/* hat — tipped via animation */}
        <g className="wr-hat" style={{ transformOrigin: "95px 58px" }}>
          <ellipse cx="95" cy="56" rx="16" ry="3" fill="url(#wrHat)" />
          <path d="M86 56 q9 -16 18 0 Z" fill="url(#wrHat)" />
          <rect x="86" y="55" width="18" height="2" fill="#6b4a08" opacity="0.6" />
        </g>
        {/* right arm holding reward up */}
        <g className="wr-arm-reward" style={{ transformOrigin: "100px 75px" }}>
          <rect x="100" y="72" width="4" height="14" fill="#1d2a44" />
          <g className="wr-reward" style={{ transformOrigin: "104px 70px" }}>
            <text x="104" y="72" fontSize="18" textAnchor="middle">{rewardEmoji}</text>
          </g>
        </g>
        {/* left arm holding rein */}
        <path d="M88 76 Q80 80 78 90" stroke="#1d2a44" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}

const wrCss = `
@keyframes wrOverlayIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes wrOverlayOut { from { opacity: 1 } to { opacity: 0 } }
.wr-overlay-in { animation: wrOverlayIn .25s ease-out both; }
.wr-overlay-out { animation: wrOverlayOut .35s ease-in both; }

@keyframes wrRide {
  0%   { transform: translateX(110%); }
  30%  { transform: translateX(28%); }
  55%  { transform: translateX(28%); }
  100% { transform: translateX(-130%); }
}
.wr-ride { animation: wrRide 4s cubic-bezier(.4,.0,.2,1) forwards; }

@keyframes wrBob {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50%      { transform: translateY(-3px) rotate(-1deg); }
}
.wr-bob { animation: wrBob .45s ease-in-out infinite; }

@keyframes wrLegA { 0%,100%{transform: translateY(0)} 50%{transform: translateY(-4px)} }
@keyframes wrLegB { 0%,100%{transform: translateY(-4px)} 50%{transform: translateY(0)} }
.wr-leg-a { animation: wrLegA .3s linear infinite; transform-origin: center; }
.wr-leg-b { animation: wrLegB .3s linear infinite; transform-origin: center; }

@keyframes wrTail { 0%,100%{transform: rotate(-6deg)} 50%{transform: rotate(8deg)} }
.wr-tail { transform-origin: 45px 100px; animation: wrTail .6s ease-in-out infinite; }

@keyframes wrHatTip {
  0%, 35%   { transform: translateY(0) rotate(0deg); }
  45%       { transform: translateY(-6px) rotate(-18deg); }
  60%       { transform: translateY(-6px) rotate(-18deg); }
  72%, 100% { transform: translateY(0) rotate(0deg); }
}
.wr-hat { animation: wrHatTip 4s ease-in-out forwards; }

@keyframes wrArmReward {
  0%, 40%   { transform: rotate(0deg); }
  55%, 80%  { transform: rotate(-55deg); }
  100%      { transform: rotate(0deg); }
}
.wr-arm-reward { animation: wrArmReward 4s ease-in-out forwards; }

@keyframes wrRewardPulse {
  0%, 50%   { transform: scale(1); }
  60%       { transform: scale(1.7); }
  80%       { transform: scale(1.3); }
  100%      { transform: scale(1); }
}
.wr-reward { animation: wrRewardPulse 4s ease-in-out forwards; }

@keyframes wrBurst {
  0%   { opacity: 0; transform: translate(0,0) scale(.4); }
  20%  { opacity: 1; }
  100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(1.1) rotate(180deg); }
}
.wr-burst { position: absolute; font-size: 18px; animation: wrBurst 1.6s ease-out forwards; }

@keyframes wrDust {
  0%   { opacity: .8; transform: translate(0,0) scale(1); }
  100% { opacity: 0;  transform: translate(-14px,-6px) scale(2); }
}
.wr-dust { animation: wrDust .8s ease-out infinite; }

@keyframes wrTwinkle { 0%,100%{opacity:.2; transform: scale(.8)} 50%{opacity:1; transform: scale(1.2)} }
.wr-star { color: #ffe27a; font-size: 10px; animation: wrTwinkle 2.4s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .wr-ride, .wr-bob, .wr-leg-a, .wr-leg-b, .wr-tail, .wr-hat,
  .wr-arm-reward, .wr-reward, .wr-burst, .wr-dust, .wr-star {
    animation: none !important;
  }
  .wr-ride { transform: translateX(28%); }
}
`;