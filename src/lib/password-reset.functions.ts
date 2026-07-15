import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const emailSchema = z.object({ email: z.string().trim().email().max(255) });
const consumeSchema = z.object({
  requestId: z.string().uuid(),
  token: z.string().min(16).max(256),
  newPassword: z.string().min(6).max(128),
});

export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => emailSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("request_password_reset_by_email", { _email: data.email });
    // Always respond OK to prevent user enumeration
    return { ok: true };
  });

export const consumePasswordReset = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => consumeSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: userId, error } = await supabaseAdmin.rpc("consume_password_reset_token", {
      _request_id: data.requestId,
      _token: data.token,
    });
    if (error || !userId) throw new Error(error?.message || "Invalid or expired reset link");
    const { error: upErr } = await supabaseAdmin.auth.admin.updateUserById(userId as string, {
      password: data.newPassword,
    });
    if (upErr) throw new Error(upErr.message);
    return { ok: true };
  });