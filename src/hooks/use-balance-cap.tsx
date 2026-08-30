import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type BalanceCapStatus = {
  balance_cents: number;
  cap_cents: number;
  required_referrals: number;
  active_referrals: number;
  unlocked: boolean;
};

/**
 * $150 balance cap rule: a user cannot deposit past a $150 balance and cannot
 * withdraw once at/above $150 until they have 10 direct referrals who deposited.
 */
export function useBalanceCap() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["balance-cap", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<BalanceCapStatus | null> => {
      const { data, error } = await supabase.rpc("get_balance_cap_status");
      if (error) throw error;
      const row = (data as BalanceCapStatus[] | null)?.[0] ?? null;
      return row;
    },
  });

  const status = data ?? null;
  const capUsd = (status?.cap_cents ?? 15000) / 100;
  const balanceUsd = (status?.balance_cents ?? 0) / 100;
  const required = status?.required_referrals ?? 10;
  const active = status?.active_referrals ?? 0;
  const unlocked = status?.unlocked ?? false;

  return {
    loading: isLoading,
    status,
    capUsd,
    balanceUsd,
    required,
    active,
    unlocked,
    // At or above the cap and still missing referrals → deposits + withdrawals locked
    locked: !unlocked && balanceUsd >= capUsd,
    // Getting close, worth warning early
    nearCap: !unlocked && balanceUsd >= capUsd * 0.6,
    remainingUsd: Math.max(0, capUsd - balanceUsd),
    remainingReferrals: Math.max(0, required - active),
  };
}
