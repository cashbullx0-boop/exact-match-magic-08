import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CPX_APP_ID = 33442;

export const getCpxSecureHash = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const securityKey = process.env.CPX_SECURITY_KEY;
    let secureHash: string | null = null;
    if (securityKey) {
      const { createHash } = await import("node:crypto");
      secureHash = createHash("md5")
        .update(`${CPX_APP_ID}+${context.userId}+${securityKey}`)
        .digest("hex");
    }
    return { appId: CPX_APP_ID, userId: context.userId, secureHash };
  });