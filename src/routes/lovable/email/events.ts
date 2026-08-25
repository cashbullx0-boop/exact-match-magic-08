import { createEmailWebhookHandler } from '@lovable.dev/email-js'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute("/lovable/email/events")({
  server: {
    handlers: {
      POST: ({ request }) => {
        const apiKey = process.env['LOVABLE_API_KEY']
        if (!apiKey) {
          console.error('Missing required environment variables')
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }
        const handler = createEmailWebhookHandler({
          apiKey,
          on: {
            // Keep the app's own audit/suppression records in sync with
            // terminal delivery outcomes. Notification-only: Lovable already
            // enforces suppression at send time. Throw on failure so the
            // delivery is retried; upserts make redeliveries idempotent.
            'email.bounced': async (event) => {
              const recipient = event.data.recipient.toLowerCase().trim()
              const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
              const { error: supErr } = await supabaseAdmin.from('suppressed_emails').upsert(
                { email: recipient, reason: 'bounce', metadata: null },
                { onConflict: 'email' },
              )
              if (supErr) {
                console.error('Suppression upsert failed', { event_id: event.event_id, code: supErr.code, message: supErr.message })
                throw new Error(supErr.message)
              }
              const { error: logErr } = await supabaseAdmin.from('email_send_log').insert({
                message_id: event.data.message_id ?? null,
                template_name: 'system',
                recipient_email: recipient,
                status: 'bounced',
                error_message: 'Permanent bounce — email address is invalid or rejected',
              })
              if (logErr) {
                console.error('Send log insert failed', { event_id: event.event_id, code: logErr.code, message: logErr.message })
                throw new Error(logErr.message)
              }
            },
            'email.complaint': async (event) => {
              const recipient = event.data.recipient.toLowerCase().trim()
              const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
              const { error: supErr } = await supabaseAdmin.from('suppressed_emails').upsert(
                { email: recipient, reason: 'complaint', metadata: null },
                { onConflict: 'email' },
              )
              if (supErr) {
                console.error('Suppression upsert failed', { event_id: event.event_id, code: supErr.code, message: supErr.message })
                throw new Error(supErr.message)
              }
              const { error: logErr } = await supabaseAdmin.from('email_send_log').insert({
                message_id: event.data.message_id ?? null,
                template_name: 'system',
                recipient_email: recipient,
                status: 'complained',
                error_message: 'Spam complaint — recipient marked email as spam',
              })
              if (logErr) {
                console.error('Send log insert failed', { event_id: event.event_id, code: logErr.code, message: logErr.message })
                throw new Error(logErr.message)
              }
            },
            'email.unsubscribed': async (event) => {
              const recipient = event.data.recipient.toLowerCase().trim()
              const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
              const { error: supErr } = await supabaseAdmin.from('suppressed_emails').upsert(
                { email: recipient, reason: 'unsubscribe', metadata: null },
                { onConflict: 'email' },
              )
              if (supErr) {
                console.error('Suppression upsert failed', { event_id: event.event_id, code: supErr.code, message: supErr.message })
                throw new Error(supErr.message)
              }
              const { error: logErr } = await supabaseAdmin.from('email_send_log').insert({
                message_id: event.data.message_id ?? null,
                template_name: 'system',
                recipient_email: recipient,
                status: 'suppressed',
                error_message: 'Recipient unsubscribed',
              })
              if (logErr) {
                console.error('Send log insert failed', { event_id: event.event_id, code: logErr.code, message: logErr.message })
                throw new Error(logErr.message)
              }
            },
          },
        })
        return handler(request)
      },
    },
  },
})
