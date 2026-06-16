import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform, animate } from "framer-motion";
import confetti from "canvas-confetti";
import { Trophy, Coins, Sparkles, X, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type RewardCelebrationProps = {
  isOpen: boolean;
  rewardAmount: number;
  rewardTitle: string;
  achievementTitle: string;
  onClose: () => void;
  /** Optional URL of a sound effect to play on open */
  soundUrl?: string;
  /** Currency symbol, default "$" */
  currency?: string;
  /** Show two decimal places (default true) */
  decimals?: boolean;
};

// Coins that fly outward from center
const COIN_COUNT = 22;
const RAY_COUNT = 14;
const ORBIT_COIN_COUNT = 8;

function AnimatedCounter({
  value,
  decimals = true,
  currency = "$",
  duration = 1.8,
}: {
  value: number;
  decimals?: boolean;
  currency?: string;
  duration?: number;
}) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) =>
    decimals ? v.toFixed(2) : Math.round(v).toLocaleString()
  );
  useEffect(() => {
    const controls = animate(mv, value, { duration, ease: [0.16, 1, 0.3, 1] });
    return controls.stop;
  }, [value, duration, mv]);
  return (
    <span className="tabular-nums">
      {currency}
      <motion.span>{rounded}</motion.span>
    </span>
  );
}

function fireConfetti() {
  const end = Date.now() + 1200;
  const colors = ["#FFD700", "#FFB300", "#10b981", "#34d399", "#ffffff"];
  const frame = () => {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.7 },
      colors,
      startVelocity: 55,
      scalar: 0.9,
      zIndex: 9999,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.7 },
      colors,
      startVelocity: 55,
      scalar: 0.9,
      zIndex: 9999,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  // Center burst
  confetti({
    particleCount: 140,
    spread: 100,
    origin: { x: 0.5, y: 0.5 },
    colors,
    startVelocity: 45,
    scalar: 1.1,
    zIndex: 9999,
  });
  frame();
}

export function RewardCelebration({
  isOpen,
  rewardAmount,
  rewardTitle,
  achievementTitle,
  onClose,
  soundUrl,
  currency = "$",
  decimals = true,
}: RewardCelebrationProps) {
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);
  const [vh, setVh] = useState(800);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setVh(window.innerHeight);
    setFlash(true);
    setShake(true);
    const flashT = setTimeout(() => setFlash(false), 180);
    const shakeT = setTimeout(() => setShake(false), 320);
    // Fire confetti slightly after the card appears
    const confT = setTimeout(fireConfetti, 200);
    if (soundUrl) {
      try {
        audioRef.current = new Audio(soundUrl);
        audioRef.current.volume = 0.55;
        audioRef.current.play().catch(() => {});
      } catch {}
    }
    return () => {
      clearTimeout(flashT);
      clearTimeout(shakeT);
      clearTimeout(confT);
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [isOpen, soundUrl]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="reward-overlay"
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="dialog"
          aria-modal="true"
          aria-label="Reward earned"
        >
          {/* Dark backdrop */}
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
            onClick={onClose}
          />

          {/* White flash */}
          <AnimatePresence>
            {flash && (
              <motion.div
                key="flash"
                className="pointer-events-none absolute inset-0 bg-white"
                initial={{ opacity: 0.9 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              />
            )}
          </AnimatePresence>

          {/* Shockwave ring */}
          <motion.div
            key="shockwave"
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-amber-300"
            initial={{ width: 24, height: 24, opacity: 0.9 }}
            animate={{ width: 1100, height: 1100, opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            style={{
              boxShadow:
                "0 0 60px 12px rgba(255,193,7,0.55), inset 0 0 40px rgba(255,193,7,0.4)",
            }}
          />
          {/* Secondary shockwave */}
          <motion.div
            key="shockwave2"
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-300"
            initial={{ width: 24, height: 24, opacity: 0.7 }}
            animate={{ width: 700, height: 700, opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.08 }}
          />

          {/* Glow explosion */}
          <motion.div
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            initial={{ width: 40, height: 40, opacity: 0 }}
            animate={{ width: 520, height: 520, opacity: [0, 0.9, 0] }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{
              background:
                "radial-gradient(circle, rgba(255,215,0,0.55) 0%, rgba(255,165,0,0.25) 40%, transparent 70%)",
              filter: "blur(8px)",
            }}
          />

          {/* Rotating background light rays */}
          <motion.div
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: [0, 0.55, 0.35], scale: 1, rotate: 360 }}
            transition={{
              opacity: { duration: 1.2, ease: "easeOut" },
              scale: { duration: 1.2, ease: "easeOut" },
              rotate: { duration: 28, ease: "linear", repeat: Infinity },
            }}
            style={{ width: 1400, height: 1400 }}
          >
            {Array.from({ length: RAY_COUNT }).map((_, i) => (
              <div
                key={i}
                className="absolute left-1/2 top-1/2"
                style={{
                  width: 700,
                  height: 70,
                  transform: `translate(-50%, -50%) rotate(${(i * 360) / RAY_COUNT}deg)`,
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,205,80,0.32) 40%, rgba(255,235,150,0.55) 50%, rgba(255,205,80,0.32) 60%, transparent 100%)",
                  filter: "blur(6px)",
                  mixBlendMode: "screen",
                }}
              />
            ))}
          </motion.div>

          {/* Orbiting coins around the card */}
          <motion.div
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1, rotate: 360 }}
            transition={{
              opacity: { duration: 0.5, delay: 0.35 },
              scale: { duration: 0.6, delay: 0.35, ease: "easeOut" },
              rotate: { duration: 14, ease: "linear", repeat: Infinity },
            }}
            style={{ width: 320, height: 320 }}
          >
            {Array.from({ length: ORBIT_COIN_COUNT }).map((_, i) => {
              const angle = (i / ORBIT_COIN_COUNT) * Math.PI * 2;
              const r = 160;
              const x = Math.cos(angle) * r;
              const y = Math.sin(angle) * r;
              return (
                <motion.div
                  key={i}
                  className="absolute left-1/2 top-1/2"
                  style={{ transform: `translate(${x}px, ${y}px) translate(-50%, -50%)` }}
                  animate={{ rotateY: 360 }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "linear", delay: i * 0.08 }}
                >
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-full"
                    style={{
                      background:
                        "radial-gradient(circle at 30% 30%, #FFE680 0%, #FFC107 50%, #B8860B 100%)",
                      boxShadow:
                        "0 0 14px rgba(255,193,7,0.7), inset 0 -2px 3px rgba(0,0,0,0.25)",
                    }}
                  >
                    <span className="text-[10px] font-black text-amber-900">$</span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Flying coins */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {Array.from({ length: COIN_COUNT }).map((_, i) => {
              const angle = (i / COIN_COUNT) * Math.PI * 2;
              const dist = 220 + Math.random() * 140;
              const x = Math.cos(angle) * dist;
              const y = Math.sin(angle) * dist;
              const delay = Math.random() * 0.12;
              return (
                <motion.div
                  key={i}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0.4, rotate: 0 }}
                  animate={{
                    x,
                    y: [0, y * 0.5, y + 220],
                    opacity: [0, 1, 1, 0],
                    scale: [0.4, 1, 0.9],
                    rotate: 540,
                  }}
                  transition={{
                    duration: 1.6,
                    delay,
                    ease: "easeOut",
                    times: [0, 0.4, 0.85, 1],
                  }}
                  className="absolute"
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{
                      background:
                        "radial-gradient(circle at 30% 30%, #FFE680 0%, #FFC107 50%, #B8860B 100%)",
                      boxShadow:
                        "0 0 18px rgba(255,193,7,0.65), inset 0 -2px 4px rgba(0,0,0,0.25)",
                    }}
                  >
                    <span className="text-[12px] font-black text-amber-900">$</span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Floating sparkles */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {Array.from({ length: 18 }).map((_, i) => {
              const left = `${Math.random() * 100}%`;
              const delay = Math.random() * 1.5;
              return (
                <motion.div
                  key={i}
                  className="absolute top-full"
                  style={{ left }}
                  initial={{ y: 0, opacity: 0 }}
                  animate={{ y: -(vh + 80), opacity: [0, 1, 0] }}
                  transition={{ duration: 4 + Math.random() * 2, delay, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="h-3 w-3 text-amber-300/70" />
                </motion.div>
              );
            })}
          </div>

          {/* Reward card with screen-shake wrapper */}
          <motion.div
            className="relative z-10"
            animate={
              shake
                ? { x: [0, -10, 10, -8, 8, -4, 4, 0], y: [0, 4, -4, 3, -3, 2, -2, 0] }
                : { x: 0, y: 0 }
            }
            transition={{ duration: 0.32, ease: "easeOut" }}
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.05 }}
              className={cn(
                "relative w-[min(92vw,420px)] overflow-hidden rounded-3xl border border-amber-300/30 p-6 sm:p-8",
                "shadow-[0_30px_120px_-20px_rgba(255,193,7,0.45)]"
              )}
              style={{
                background:
                  "linear-gradient(160deg, rgba(20,22,30,0.92) 0%, rgba(15,17,22,0.96) 100%)",
                backdropFilter: "blur(24px) saturate(140%)",
              }}
            >
              {/* Animated gold border glow */}
              <motion.div
                className="pointer-events-none absolute inset-0 rounded-3xl"
                animate={{ opacity: [0.4, 0.85, 0.4] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  boxShadow:
                    "inset 0 0 40px rgba(255,193,7,0.25), 0 0 60px rgba(255,193,7,0.18)",
                }}
              />

              {/* Close (X) */}
              <button
                onClick={onClose}
                aria-label="Close"
                className="absolute right-3 top-3 rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Trophy */}
              <div className="relative mx-auto mb-4 flex h-24 w-24 items-center justify-center">
                <motion.div
                  className="absolute inset-0 rounded-full"
                  animate={{ scale: [1, 1.18, 1], opacity: [0.55, 0.85, 0.55] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    background:
                      "radial-gradient(circle, rgba(255,193,7,0.55) 0%, transparent 70%)",
                    filter: "blur(6px)",
                  }}
                />
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.15 }}
                  className="relative flex h-20 w-20 items-center justify-center rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle at 30% 25%, #FFE680 0%, #FFB300 55%, #B8860B 100%)",
                    boxShadow:
                      "0 0 30px rgba(255,193,7,0.6), inset 0 -4px 8px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.4)",
                  }}
                >
                  <Trophy className="h-10 w-10 text-amber-50 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
                </motion.div>
              </div>

              {/* Achievement banner — slides in from the left */}
              <motion.div
                initial={{ opacity: 0, x: -160, scale: 0.85 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 220, damping: 18 }}
                className="mx-auto mb-3 flex w-fit items-center gap-2 rounded-full border border-amber-300/50 px-4 py-1.5"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(184,134,11,0.45) 0%, rgba(255,193,7,0.65) 50%, rgba(184,134,11,0.45) 100%)",
                  boxShadow:
                    "0 6px 20px -6px rgba(255,193,7,0.6), inset 0 1px 0 rgba(255,255,255,0.35)",
                }}
              >
                <Star className="h-3.5 w-3.5 fill-amber-100 text-amber-100 drop-shadow-[0_0_4px_rgba(255,255,255,0.6)]" />
                <span className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-amber-50">
                  {achievementTitle}
                </span>
                <Star className="h-3.5 w-3.5 fill-amber-100 text-amber-100 drop-shadow-[0_0_4px_rgba(255,255,255,0.6)]" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.4 }}
                className="text-center"
              >
                <h2
                  className="bg-gradient-to-b from-amber-100 to-amber-300 bg-clip-text text-2xl font-extrabold text-transparent sm:text-3xl"
                  style={{ textShadow: "0 2px 16px rgba(255,193,7,0.25)" }}
                >
                  {rewardTitle}
                </h2>
              </motion.div>

              {/* Counter */}
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.75, type: "spring", stiffness: 220, damping: 18 }}
                className="my-5 flex items-center justify-center gap-2"
              >
                <Coins className="h-7 w-7 text-amber-300 drop-shadow-[0_0_8px_rgba(255,193,7,0.6)]" />
                <div
                  className="font-mono text-4xl font-black sm:text-5xl"
                  style={{
                    background:
                      "linear-gradient(180deg, #FFF1B8 0%, #FFC107 60%, #B8860B 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    textShadow: "0 4px 20px rgba(255,193,7,0.35)",
                  }}
                >
                  +
                  <AnimatedCounter
                    value={rewardAmount}
                    decimals={decimals}
                    currency={currency}
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="mb-5 text-center text-sm text-white/70"
              >
                Added to your wallet balance
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.05, duration: 0.45 }}
              >
                <Button
                  onClick={onClose}
                  className="h-12 w-full rounded-xl text-base font-bold tracking-wide text-amber-950 transition-transform active:scale-[0.98]"
                  style={{
                    background:
                      "linear-gradient(180deg, #FFE680 0%, #FFC107 55%, #D97706 100%)",
                    boxShadow:
                      "0 10px 30px -10px rgba(255,193,7,0.7), inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -2px 0 rgba(0,0,0,0.2)",
                  }}
                >
                  Collect Reward
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default RewardCelebration;