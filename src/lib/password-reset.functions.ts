import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const emailSchema = z.object({ email: z.string().trim().email().max(255) });
const confirmSchema = z.object({
  email: z.string().trim().email().max(255),
  otp: z.string().regex(/^\d{6}$/),
  newPassword: z.string().min(8).max(128),
});

export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => emailSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("request_password_reset_by_email", { _email: data.email });
    // Always respond OK to prevent user enumeration
    return { ok: true };
  });

export const confirmPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => confirmSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: userId, error } = await supabaseAdmin.rpc("verify_password_reset_otp", {
      _email: data.email,
      _otp: data.otp,
    });
    if (error || !userId) throw new Error(error?.message || "Invalid OTP");
    const { error: upErr } = await supabaseAdmin.auth.admin.updateUserById(userId as string, {
      password: data.newPassword,
    });
    if (upErr) throw new Error(upErr.message);
    return { ok: true };
  });