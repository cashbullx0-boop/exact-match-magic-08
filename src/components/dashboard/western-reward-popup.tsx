import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import cowboyAsset from "@/assets/cowboy-bull.png.asset.json";

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

        {/* falling confetti coins in background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 18 }).map((_, i) => (
            <span
              key={i}
              className="absolute wr-confetti"
              style={{
                left: `${(i * 17) % 100}%`,
                top: `-10%`,
                animationDelay: `${(i % 9) * 0.3}s`,
                animationDuration: `${3 + (i % 4) * 0.6}s`,
              }}
            >{i % 3 === 0 ? "🪙" : i % 3 === 1 ? "✨" : "💰"}</span>
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
                    ["--dx" as never]: `${dx}px`,
                    ["--dy" as never]: `${dy}px`,
                    animationDelay: `${2.2 + (i % 5) * 0.05}s`,
                  } as React.CSSProperties}
                >
                  {i % 2 === 0 ? "🪙" : "✨"}
                </span>
              );
            })}
          </div>

          {/* gift flying toward user */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 wr-gift pointer-events-none text-5xl">
            🎁
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
            <p className="mt-2 text-4xl sm:text-5xl font-black bg-clip-text text-transparent drop-shadow wr-amount"
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
            Awesome! 🤠
          </Button>
        </div>
      </div>
    </div>
  );
}

function CowboyOnBull({ rewardEmoji }: { rewardEmoji: string }) {
  return (
    <div className="relative wr-bob">
      <img
        src={cowboyAsset.url}
        alt="Cowboy riding a bull"
        className="h-36 w-auto sm:h-44 drop-shadow-[0_10px_20px_rgba(245,196,60,0.45)]"
      />
      <span
        className="wr-reward absolute -top-2 right-2 grid h-9 w-9 place-items-center rounded-full text-xl"
        style={{
          background: "radial-gradient(circle at 30% 30%, #fff3c0, #f5c43c 55%, #b8860b)",
          boxShadow: "0 0 16px rgba(245,196,60,0.8)",
        }}
      >
        {rewardEmoji}
      </span>
    </div>
  );
}

const wrCss = `
@keyframes wrOverlayIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes wrOverlayOut { from { opacity: 1 } to { opacity: 0 } }
.wr-overlay-in { animation: wrOverlayIn .25s ease-out both; }
.wr-overlay-out { animation: wrOverlayOut .35s ease-in both; }

@keyframes wrRide {
  0%   { transform: translateX(110%) scaleX(1); }
  20%  { transform: translateX(28%) scaleX(1); }
  70%  { transform: translateX(28%) scaleX(1); }
  75%  { transform: translateX(28%) scaleX(1); }
  100% { transform: translateX(-130%) scaleX(1); }
}
.wr-ride { animation: wrRide 5.5s cubic-bezier(.4,.0,.2,1) forwards; }

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
  0%, 25%   { transform: translateY(0) rotate(0deg); }
  32%       { transform: translateY(-6px) rotate(-18deg); }
  45%       { transform: translateY(-6px) rotate(-18deg); }
  55%, 100% { transform: translateY(0) rotate(0deg); }
}
.wr-hat { animation: wrHatTip 5.5s ease-in-out forwards; }

@keyframes wrArmReward {
  0%, 30%   { transform: rotate(0deg); }
  40%, 60%  { transform: rotate(-55deg); }
  70%, 100% { transform: rotate(0deg); }
}
.wr-arm-reward { animation: wrArmReward 5.5s ease-in-out forwards; }

@keyframes wrRewardPulse {
  0%, 35%   { transform: scale(1); }
  45%       { transform: scale(1.7); }
  60%       { transform: scale(1.3); }
  100%      { transform: scale(1); }
}
.wr-reward { animation: wrRewardPulse 5.5s ease-in-out forwards; }

@keyframes wrGift {
  0%, 38%   { opacity: 0; transform: translate(-50%, -50%) scale(.2); }
  45%       { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  60%       { opacity: 1; transform: translate(-50%, -120%) scale(1.6) rotate(20deg); }
  72%, 100% { opacity: 0; transform: translate(-50%, -250%) scale(3) rotate(45deg); }
}
.wr-gift { animation: wrGift 5.5s ease-out forwards; }

@keyframes wrAmountPop {
  0%, 40% { transform: scale(.6); opacity: 0; }
  55%     { transform: scale(1.25); opacity: 1; }
  70%     { transform: scale(1); }
  100%    { transform: scale(1); opacity: 1; }
}
.wr-amount { animation: wrAmountPop 2.4s cubic-bezier(.34,1.56,.64,1) forwards; display: inline-block; }

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

@keyframes wrConfettiFall {
  0%   { transform: translateY(-20px) rotate(0deg); opacity: 0; }
  10%  { opacity: 1; }
  100% { transform: translateY(420px) rotate(540deg); opacity: 0; }
}
.wr-confetti { font-size: 16px; animation: wrConfettiFall linear infinite; }

@media (prefers-reduced-motion: reduce) {
  .wr-ride, .wr-bob, .wr-leg-a, .wr-leg-b, .wr-tail, .wr-hat,
  .wr-arm-reward, .wr-reward, .wr-burst, .wr-dust, .wr-confetti, .wr-gift, .wr-amount {
    animation: none !important;
  }
  .wr-ride { transform: translateX(28%); }
}
`;