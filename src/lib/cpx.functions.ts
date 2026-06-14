import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CPX_APP_ID = 33442;

export const getCpxSecureHash = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const securityKey = process.env.CPX_SECURITY_KEY;
    if (!securityKey) throw new Error("Offerwall is not configured");
    const { createHash } = await import("node:crypto");

    const secureHash = createHash("md5")
      .update(`${CPX_APP_ID}+${context.userId}+${securityKey}`)
      .digest("hex");

    return { appId: CPX_APP_ID, userId: context.userId, secureHash };
  });