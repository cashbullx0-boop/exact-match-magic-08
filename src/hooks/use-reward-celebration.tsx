import { useCallback, useState } from "react";
import { RewardCelebration } from "@/components/reward-celebration";

type CelebrationConfig = {
  amount: number;
  title: string;
  achievement: string;
  decimals?: boolean;
  currency?: string;
  soundUrl?: string;
};

/**
 * Easy-to-use hook for showing the premium reward celebration anywhere.
 *
 * Usage:
 *   const { celebrate, RewardModal } = useRewardCelebration();
 *   celebrate({ amount: 25, title: "Survey Completed!", achievement: "Daily Bonus" });
 *   // render <RewardModal /> once in your component
 */
export function useRewardCelebration() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<CelebrationConfig>({
    amount: 0,
    title: "",
    achievement: "",
  });

  const celebrate = useCallback((cfg: CelebrationConfig) => {
    setConfig(cfg);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const RewardModal = useCallback(
    () => (
      <RewardCelebration
        isOpen={open}
        rewardAmount={config.amount}
        rewardTitle={config.title}
        achievementTitle={config.achievement}
        decimals={config.decimals}
        currency={config.currency}
        soundUrl={config.soundUrl}
        onClose={close}
      />
    ),
    [open, config, close]
  );

  return { celebrate, close, RewardModal };
}