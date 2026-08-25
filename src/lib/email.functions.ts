import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const otpSchema = z.object({ otp: z.string().regex(/^\d{6}$/) });
const resetLinkSchema = z.object({
  requestId: z.string().uuid(),
  recipientEmail: z.string().trim().email().max(255),
  resetUrl: z.string().url().max(2048),
});

/** Authenticated user sends the 6-digit withdrawal OTP to their OWN account email. */
export const sendWithdrawalOtpEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => otpSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: userData, error } = await context.supabase.auth.getUser();
    const email = userData?.user?.email;
    if (error || !email) throw new Error("Could not resolve your account email");
    const { sendTemplateEmailLogged } = await import("./email-log.server");
    return sendTemplateEmailLogged("withdrawal-otp", email, {
      templateData: { otp: data.otp, siteName: "CashBullX" },
      idempotencyKey: `withdrawal-otp-${context.userId}-${Date.now()}`,
    });
  });

/** Admin-only: email an approved password-reset link to the requesting user. */
export const sendPasswordResetLinkEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => resetLinkSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!roles?.some((r) => r.role === "admin")) throw new Error("Forbidden: admin only");

    const { sendTemplateEmailLogged } = await import("./email-log.server");
    return sendTemplateEmailLogged("password-reset-link", data.recipientEmail, {
      templateData: { resetUrl: data.resetUrl, siteName: "CashBullX" },
      idempotencyKey: `pwd-reset-link-${data.requestId}`,
    });
  });
