import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/* Resilience helpers                                                   */
/* ------------------------------------------------------------------ */

/** True for errors that are worth retrying (network blips, 5xx, timeouts). */
function isTransient(e: any): boolean {
  const msg = String(e?.message ?? e ?? "").toLowerCase();
  const status = Number(e?.status ?? e?.statusCode ?? 0);
  if (status >= 500 || status === 408 || status === 429) return true;
  // A real server rejection (RLS, validation, 4xx) must never be reported as
  // a connection problem — that message sends users on a wild goose chase.
  if (status >= 400 && status < 500) return false;
  return (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("load failed") ||
    msg.includes("connection") ||
    msg.includes("fetch failed") ||
    msg.includes("socket") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("504")
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Runs `fn`, retrying transient failures with exponential backoff.
 * Deposits are trust-critical: a flaky mobile connection must never look
 * like "deposit failed" to the user.
 */
export async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (i === attempts - 1 || !isTransient(e)) break;
      console.warn(`[deposits] ${label} attempt ${i + 1} failed, retrying`, e);
      await sleep(600 * 2 ** i);
    }
  }
  throw lastError;
}

/** Human-friendly message for anything that can go wrong in the deposit flow. */
export function depositErrorMessage(e: any): string {
  const raw = String(e?.message ?? "").trim();
  const msg = raw.toLowerCase();
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  if (offline) {
    return "You appear to be offline — your deposit was not lost. Reconnect and tap submit again.";
  }
  if (isTransient(e)) {
    return "Upload was interrupted before it finished — nothing was lost. Please tap submit again (a smaller screenshot uploads faster).";
  }
  if (msg.includes("duplicate") || msg.includes("already")) {
    return "This payment proof was already submitted. Check your deposit history below.";
  }
  if (msg.includes("row-level security") || msg.includes("permission")) {
    return "Session expired. Please refresh the page and submit again.";
  }
  if (msg.includes("payload too large") || msg.includes("exceeded the maximum")) {
    return "Your slip is too large to upload. Try a smaller screenshot or PDF.";
  }
  if (msg.includes("mime") || msg.includes("content type") || msg.includes("file type")) {
    return "This slip format is not supported. Please upload a JPG, PNG, HEIC, WebP, or PDF file.";
  }
  return raw || "Something went wrong. Please try again — nothing was charged.";
}

export type DepositNetwork = "USDT_TRC20";

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
    address: "TW4xgX1d1bJWiZtJ9gozvCHa3ZkuE3bJDd",
    minAmount: 50,
    confirmations: 19,
    estTime: "~3 min",
    fee: "~1 USDT",
    color: "from-red-500/30 to-orange-500/20",
    enabled: true,
  },
};

export interface CreateDepositInput {
  userId: string;
  amountUsd: number;
  network: DepositNetwork;
}

/**
 * Canonical receiving address, read from server-side settings.
 * Never trust the bundled constant for anything money-related — a tampered
 * bundle/CDN could swap it. The DB also overrides wallet_address on insert.
 */
export async function getDepositAddress(network: DepositNetwork): Promise<string> {
  return withRetry("getDepositAddress", async () => {
    const { data, error } = await supabase.rpc("get_deposit_address", { _network: network });
    if (error) throw error;
    if (!data) throw new Error("Deposit address unavailable. Please try again.");
    return data as string;
  }, 4);
}

/**
 * Creates a deposit request row. In a live integration this would also call
 * the payment gateway to create an invoice and return its payment id + address.
 * See createGatewayInvoice() below for the integration shape.
 */
export async function createDepositRequest(input: CreateDepositInput) {
  const address = await getDepositAddress(input.network);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  // Placeholder for gateway call — see createGatewayInvoice.
  // const invoice = await createGatewayInvoice({ ... });

  return withRetry("createDepositRequest", async () => {
    const { data, error } = await supabase
      .from("deposits")
      .insert({
        user_id: input.userId,
        amount_usd: input.amountUsd,
        network: input.network,
        wallet_address: address,
        status: "pending",
        provider: "manual",
        expires_at: expiresAt,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  });
}

export async function attachTxHash(depositId: string, txHash: string) {
  await withRetry("attachTxHash", async () => {
    const { error } = await supabase.rpc("submit_deposit_tx_hash", {
      _deposit_id: depositId,
      _tx_hash: txHash.trim(),
    });
    if (error) throw error;
  });
}

/**
 * Best-effort cleanup of an orphaned pending deposit row when the post-create
 * steps (sender address / slip / tx hash) fail. RLS restricts this to the
 * owner's own pending rows. Errors are swallowed and logged.
 */
export async function uploadDepositSlip(userId: string, depositId: string, file: File) {
  const { compressSlipIfNeeded, fileExt, isPdf } = await import("@/lib/slip-file");
  const prepared = await compressSlipIfNeeded(file);
  const ext = fileExt(prepared.name);
  const contentType =
    prepared.type && prepared.type !== "application/octet-stream"
      ? prepared.type
      : isPdf(prepared)
      ? "application/pdf"
      : `image/${ext === "jpg" ? "jpeg" : ext}`;
  const path = `${userId}/${depositId}-${Date.now()}.${ext}`;

  if (prepared.size > MAX_UPLOAD_BYTES) {
    throw new Error("Your slip is too large to upload. Try a smaller screenshot or PDF.");
  }

  await withRetry("uploadDepositSlip", async () => {
    const { error: upErr } = await supabase.storage
      .from("deposit-slips")
      .upload(path, prepared, { upsert: false, contentType });
    // A lost response can make a successful first upload look like a failure.
    // The retry then sees the same object; that means the proof is already safe.
    if (upErr && !/already exists|duplicate/i.test(upErr.message)) throw upErr;
  }, 4);

  await withRetry("submitDepositSlip", async () => {
    const { error } = await supabase.rpc("submit_deposit_slip", {
      _deposit_id: depositId,
      _slip_path: path,
    });
    if (error) throw error;
  });
  return path;
}

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export async function listUserDeposits(userId: string) {
  return withRetry("listUserDeposits", async () => {
    const { data, error } = await supabase
      .from("deposits")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  });
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
