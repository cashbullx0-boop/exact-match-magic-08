import type { ComponentType } from 'react'
import { template as withdrawalOtpTemplate } from './withdrawal-otp'
import { template as passwordResetLinkTemplate } from './password-reset-link'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'withdrawal-otp': withdrawalOtpTemplate,
  'password-reset-link': passwordResetLinkTemplate,
}
