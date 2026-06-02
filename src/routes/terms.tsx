import { createFileRoute } from "@tanstack/react-router";
import { PolicyLayout, type PolicySection } from "@/components/marketing/policy-layout";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — CashBullX" },
      { name: "description", content: "The terms and conditions governing your use of the CashBullX platform." },
      { property: "og:title", content: "Terms of Service — CashBullX" },
      { property: "og:description", content: "Read the CashBullX Terms of Service." },
    ],
  }),
  component: TermsPage,
});

const SECTIONS: PolicySection[] = [
  { heading: "Acceptance of Terms", body: "By accessing or using CashBullX platform, you agree to be bound by these Terms of Service. If you do not agree, please discontinue use immediately." },
  { heading: "Eligibility", body: "You must be at least 18 years of age to use CashBullX. By registering, you confirm that you meet this requirement and that all information provided is accurate." },
  { heading: "Account Registration", body: "Users must provide valid information during registration. You are responsible for maintaining the confidentiality of your account credentials. CashBullX is not liable for any unauthorized access due to your negligence." },
  { heading: "Platform Services", body: "CashBullX provides a digital task-based earning platform where users can complete tasks, refer others, and earn USDT rewards. We reserve the right to modify, suspend, or discontinue any service at any time." },
  { heading: "Deposits & Withdrawals", body: "All deposits must be made in USDT (TRC20 or BEP20). Minimum deposit is $50 USDT. Withdrawals are processed within 24-72 business hours after admin approval. CashBullX reserves the right to hold or reverse transactions suspected of fraud." },
  { heading: "Referral Program", body: "Users may refer others to earn bonuses. Referral abuse, fake accounts, or self-referrals are strictly prohibited and will result in permanent account termination." },
  { heading: "Prohibited Activities", body: "Users may not engage in fraud, money laundering, market manipulation, creating multiple accounts, or any illegal activity on the platform." },
  { heading: "Termination", body: "CashBullX reserves the right to suspend or terminate any account at its sole discretion without prior notice if violations are detected." },
  { heading: "Limitation of Liability", body: "CashBullX shall not be liable for any indirect, incidental, or consequential damages arising from use of the platform." },
  { heading: "Changes to Terms", body: "We reserve the right to update these terms at any time. Continued use of the platform constitutes acceptance of the revised terms." },
];

function TermsPage() {
  return <PolicyLayout title="Terms of Service" effectiveDate="June 1, 2025" sections={SECTIONS} />;
}