import { createFileRoute } from "@tanstack/react-router";
import { PolicyLayout, type PolicySection } from "@/components/marketing/policy-layout";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — CashBullX" },
      { name: "description", content: "How CashBullX collects, uses, and protects your personal data." },
      { property: "og:title", content: "Privacy Policy — CashBullX" },
      { property: "og:description", content: "Read the CashBullX Privacy Policy." },
    ],
  }),
  component: PrivacyPage,
});

const SECTIONS: PolicySection[] = [
  {
    heading: "Information We Collect",
    body: "We collect the following information when you use CashBullX:",
    bullets: [
      "Personal details: name, email address, username",
      "KYC documents: government-issued ID, selfie",
      "Financial data: deposit/withdrawal history, wallet addresses",
      "Technical data: IP address, device info, browser type",
    ],
  },
  {
    heading: "How We Use Your Information",
    bullets: [
      "To verify your identity and process KYC",
      "To process deposits, withdrawals, and transactions",
      "To send platform notifications and updates",
      "To detect and prevent fraud and abuse",
      "To comply with legal obligations",
    ],
  },
  {
    heading: "Data Sharing",
    body: "We do not sell your personal data to third parties. We may share data with:",
    bullets: [
      "KYC verification partners",
      "Legal authorities when required by law",
      "Payment processors for transaction verification",
    ],
  },
  { heading: "Data Security", body: "We use industry-standard encryption and security measures to protect your data. All KYC documents are stored in private, encrypted storage buckets." },
  { heading: "Cookies", body: "CashBullX uses cookies to enhance user experience and track platform analytics. You may disable cookies in your browser settings." },
  { heading: "Data Retention", body: "We retain your data for as long as your account is active or as required by law. You may request deletion of your account and data by contacting support." },
  { heading: "Your Rights", body: "You have the right to access, correct, or delete your personal data. Contact our support team to exercise these rights." },
  { heading: "Contact", body: "For privacy-related concerns, contact us at: support@cashbullx.com" },
];

function PrivacyPage() {
  return <PolicyLayout title="Privacy Policy" effectiveDate="June 1, 2025" sections={SECTIONS} />;
}