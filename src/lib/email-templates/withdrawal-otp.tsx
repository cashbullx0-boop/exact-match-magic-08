import * as React from 'react'
import {
  Body,
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
  otp?: string
  siteName?: string
}

const WithdrawalOtpEmail = ({ otp = '000000', siteName = 'CashBullX' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {siteName} withdrawal code is {otp}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🔐 Your Withdrawal OTP Code</Heading>
        <Text style={text}>
          Use the code below to confirm your withdrawal request on {siteName}.
        </Text>
        <Section style={codeBox}>
          <Text style={codeText}>{otp}</Text>
        </Section>
        <Text style={text}><strong>Valid for 10 minutes.</strong></Text>
        <Text style={warn}>
          Do not share this code with anyone. {siteName} staff will never ask
          you for this code. If you didn't request a withdrawal, please secure
          your account immediately.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WithdrawalOtpEmail,
  subject: '🔐 Your Withdrawal OTP Code',
  displayName: 'Withdrawal OTP',
  previewData: { otp: '123456', siteName: 'CashBullX' },
} satisfies TemplateEntry

export default WithdrawalOtpEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '520px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0b0b0b', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#3f434b', lineHeight: '1.6', margin: '0 0 16px' }
const codeBox = {
  background: '#0b0b0b',
  borderRadius: '10px',
  padding: '18px 20px',
  textAlign: 'center' as const,
  margin: '10px 0 20px',
}
const codeText = {
  fontSize: '30px',
  letterSpacing: '10px',
  color: '#ffd166',
  fontWeight: 'bold' as const,
  fontFamily: 'monospace',
  margin: 0,
}
const warn = { fontSize: '12px', color: '#a11a1a', lineHeight: '1.5', margin: '10px 0 0' }