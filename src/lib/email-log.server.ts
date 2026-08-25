import {
  sendTemplateEmail,
  type SendTemplateEmailOptions,
  type SendTemplateEmailResult,
} from "@/lib/email-templates/send-email";

// Server-only: writes audit rows to email_send_log. Never import from client components.

/**
 * Sends a registered template through Lovable's managed email API and records
 * the outcome in email_send_log ('sent' | 'suppressed' | 'failed') so the
 * app's email audit history keeps working exactly as before. A log-write
 * failure never decides the send result.
 */
export async function sendTemplateEmailLogged(
  templateName: string,
  to: string,
  options: SendTemplateEmailOptions = {},
): Promise<SendTemplateEmailResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const messageId = crypto.randomUUID();

  try {
    const result = await sendTemplateEmail(templateName, to, options);
    const { error } = await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: to,
      status: result.sent ? "sent" : "suppressed",
    });
    if (error) {
      console.error("email_send_log insert failed", { code: error.code, message: error.message });
    }
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const { error } = await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: to,
      status: "failed",
      error_message: message.slice(0, 1000),
    });
    if (error) {
      console.error("email_send_log insert failed", { code: error.code, message: error.message });
    }
    throw err;
  }
}
