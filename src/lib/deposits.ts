import { supabase } from "@/integrations/supabase/client";

export type DepositNetwork = "USDT_TRC20" | "USDT_BEP20";

export type DepositStatus = "pending" | "confirming" | "completed" | "failed" | "expired";

export interface NetworkConfig {
  id: DepositNetwork;
  label: string;
  chain: string;
  symbol: string;
  address: string;
  minAmount: number;
  confirmations: number;
  estTime: string;
  fee: string;
  color: string;
}

// Placeholder receiving addresses. Replace with real treasury wallets per network
// or fetch from your payment provider (NOWPayments / CoinPayments) at deposit time.
export const NETWORKS: Record<DepositNetwork, NetworkConfig> = {
  USDT_TRC20: {
    id: "USDT_TRC20",
    label: "USDT (TRC20)",
    chain: "Tron Network",
    symbol: "USDT",
    address: "TXYZaBcDeFgHiJkLmNoPqRsTuVwXyZ1234",
    minAmount: 50,
    confirmations: 19,
    estTime: "~3 min",
    fee: "~1 USDT",
    color: "from-red-500/30 to-orange-500/20",
  },
  USDT_BEP20: {
    id: "USDT_BEP20",
    label: "USDT (BEP20)",
    chain: "BNB Smart Chain",
    symbol: "USDT",
    address: "0xAbCdEf0123456789AbCdEf0123456789AbCdEf01",
    minAmount: 10,
    confirmations: 15,
    estTime: "~1 min",
    fee: "~0.3 USDT",
    color: "from-yellow-500/30 to-amber-500/20",
  },
};

export interface CreateDepositInput {
  userId: string;
  amountUsd: number;
  network: DepositNetwork;
}

/**
 * Creates a deposit request row. In a live integration this would also call
 * the payment gateway to create an invoice and return its payment id + address.
 * See createGatewayInvoice() below for the integration shape.
 */
export async function createDepositRequest(input: CreateDepositInput) {
  const net = NETWORKS[input.network];
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  // Placeholder for gateway call — see createGatewayInvoice.
  // const invoice = await createGatewayInvoice({ ... });

  const { data, error } = await supabase
    .from("deposits")
    .insert({
      user_id: input.userId,
      amount_usd: input.amountUsd,
      network: input.network,
      wallet_address: net.address,
      status: "pending",
      provider: "manual",
      expires_at: expiresAt,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function attachTxHash(depositId: string, txHash: string) {
  const { error } = await supabase
    .from("deposits")
    .update({ tx_hash: txHash.trim(), status: "confirming" })
    .eq("id", depositId);
  if (error) throw error;
}

export async function uploadDepositSlip(userId: string, depositId: string, file: File) {
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const path = `${userId}/${depositId}-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("deposit-slips")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (upErr) throw upErr;
  const { error } = await supabase
    .from("deposits")
    .update({ slip_path: path })
    .eq("id", depositId);
  if (error) throw error;
  return path;
}

export async function listUserDeposits(userId: string) {
  const { data, error } = await supabase
    .from("deposits")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

/* ------------------------------------------------------------------ */
/* Payment gateway integration placeholders                            */
/* ------------------------------------------------------------------ */

/**
 * Placeholder for NOWPayments / CoinPayments invoice creation.
 * In production this MUST run server-side (createServerFn) using a secret
 * API key so the key never reaches the browser. Wire it up by:
 *   1. Storing NOWPAYMENTS_API_KEY (or COINPAYMENTS_KEY/SECRET) via Lovable Cloud secrets.
 *   2. Implementing a createServerFn that POSTs to the gateway and returns
 *      { paymentId, payAddress, amount, expiresAt }.
 *   3. Calling that server fn from createDepositRequest above instead of the
 *      hardcoded treasury address.
 */
export async function createGatewayInvoice(_args: {
  provider: "nowpayments" | "coinpayments";
  amountUsd: number;
  network: DepositNetwork;
  userId: string;
}): Promise<{ paymentId: string; payAddress: string; amount: number; expiresAt: string }> {
  throw new Error("Gateway integration not configured. Add API keys and implement server fn.");
}

/**
 * Placeholder for webhook-driven payment verification.
 * In production, expose a server route at /api/public/webhooks/deposits that:
 *   - Verifies the gateway's HMAC signature (NOWPayments: x-nowpayments-sig,
 *     CoinPayments: HMAC header) using the shared secret.
 *   - Looks up the deposit by provider_payment_id.
 *   - On 'finished'/'confirmed' status, atomically marks it completed and
 *     credits the user's balance via supabaseAdmin.
 */
export async function verifyDepositWebhook(_payload: unknown, _signature: string): Promise<boolean> {
  return false;
}