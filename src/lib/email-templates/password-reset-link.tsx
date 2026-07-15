import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  resetUrl?: string
  siteName?: string
}

const PasswordResetLinkEmail = ({
  resetUrl = 'https://cashbullx.com/reset-password',
  siteName = 'CashBullX',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {siteName} password reset has been approved</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🔐 Reset your {siteName} password</Heading>
        <Text style={text}>
          Your password reset request has been approved by our admin team.
          Click the button below to set a new password. This link is valid
          for <strong>1 hour</strong> and can be used only once.
        </Text>
        <Section style={{ textAlign: 'center', margin: '24px 0' }}>
          <Button href={resetUrl} style={button}>Set a new password</Button>
        </Section>
        <Text style={small}>
          Or copy and paste this link into your browser:
        </Text>
        <Text style={link}>{resetUrl}</Text>
        <Text style={warn}>
          If you didn't request a password reset, please ignore this email
          or contact {siteName} support to secure your account.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PasswordResetLinkEmail,
  subject: '🔐 Your CashBullX password reset link',
  displayName: 'Password Reset Link',
  previewData: { resetUrl: 'https://cashbullx.com/reset-password?rid=abc&token=xyz', siteName: 'CashBullX' },
} satisfies TemplateEntry

export default PasswordResetLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '520px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0b0b0b', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#3f434b', lineHeight: '1.6', margin: '0 0 16px' }
const small = { fontSize: '12px', color: '#6b7280', lineHeight: '1.5', margin: '0 0 4px' }
const link = { fontSize: '12px', color: '#0b0b0b', wordBreak: 'break-all' as const, margin: '0 0 20px' }
const button = {
  backgroundColor: '#ffd166',
  color: '#2a1a00',
  padding: '12px 28px',
  borderRadius: '10px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
  fontSize: '15px',
}
const warn = { fontSize: '12px', color: '#a11a1a', lineHeight: '1.5', margin: '10px 0 0' }