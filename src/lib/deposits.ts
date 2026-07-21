import { supabase } from "@/integrations/supabase/client";

export type DepositNetwork = "USDT_TRC20" | "USDT_BEP20";

export type DepositStatus = "pending" | "confirming" | "approved" | "completed" | "failed" | "expired";

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
  enabled: boolean;
}

// Real treasury wallet for TRC20. BEP20 is disabled until a real wallet is added —
// flip `enabled: true` and replace the placeholder address once available.
export const NETWORKS: Record<DepositNetwork, NetworkConfig> = {
  USDT_TRC20: {
    id: "USDT_TRC20",
    label: "USDT (TRC20)",
    chain: "Tron Network",
    symbol: "USDT",
    address: "TB1r1QKEzatpC3QeAHTZXVi22L86So8TJh",
    minAmount: 50,
    confirmations: 19,
    estTime: "~3 min",
    fee: "~1 USDT",
    color: "from-red-500/30 to-orange-500/20",
    enabled: true,
  },
  USDT_BEP20: {
    id: "USDT_BEP20",
    label: "USDT (BEP20)",
    chain: "BNB Smart Chain",
    symbol: "USDT",
    address: "0xAbCdEf0123456789AbCdEf0123456789AbCdEf01",
    minAmount: 50,
    confirmations: 15,
    estTime: "~1 min",
    fee: "~0.3 USDT",
    color: "from-yellow-500/30 to-amber-500/20",
    enabled: false,
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
  const { error } = await supabase.rpc("submit_deposit_tx_hash", {
    _deposit_id: depositId,
    _tx_hash: txHash.trim(),
  });
  if (error) throw error;
}

export async function attachSenderAddress(depositId: string, senderAddress: string) {
  const { error } = await supabase.rpc("submit_deposit_sender_address", {
    _deposit_id: depositId,
    _sender_address: senderAddress.trim(),
  });
  if (error) throw error;
}

/**
 * Best-effort cleanup of an orphaned pending deposit row when the post-create
 * steps (sender address / slip / tx hash) fail. RLS restricts this to the
 * owner's own pending rows. Errors are swallowed and logged.
 */
export async function deleteDepositIfPending(depositId: string) {
  try {
    const { error } = await supabase
      .from("deposits")
      .delete()
      .eq("id", depositId)
      .eq("status", "pending");
    if (error) console.warn("[deposits] cleanup failed", error);
  } catch (e) {
    console.warn("[deposits] cleanup threw", e);
  }
}

export async function uploadDepositSlip(userId: string, depositId: string, file: File) {
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const path = `${userId}/${depositId}-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("deposit-slips")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (upErr) throw upErr;
  const { error } = await supabase.rpc("submit_deposit_slip", {
    _deposit_id: depositId,
    _slip_path: path,
  });
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
 *   - On 'finished'/'confirmed' status, atomically marks it approved and
 *     credits the user's balance via supabaseAdmin.
 */
export async function verifyDepositWebhook(_payload: unknown, _signature: string): Promise<boolean> {
  return false;
}
