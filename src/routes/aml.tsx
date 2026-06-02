import { createFileRoute } from "@tanstack/react-router";
import { PolicyLayout, type PolicySection } from "@/components/marketing/policy-layout";

export const Route = createFileRoute("/aml")({
  head: () => ({
    meta: [
      { title: "AML Policy — CashBullX" },
      { name: "description", content: "CashBullX Anti-Money Laundering policy, KYC requirements, and transaction monitoring." },
      { property: "og:title", content: "AML Policy — CashBullX" },
      { property: "og:description", content: "Read the CashBullX Anti-Money Laundering Policy." },
    ],
  }),
  component: AmlPage,
});

const SECTIONS: PolicySection[] = [
  { heading: "Our Commitment", body: "CashBullX is committed to preventing money laundering, terrorist financing, and other financial crimes. We comply with applicable AML laws and regulations." },
  {
    heading: "KYC Requirements",
    body: "All users must complete Know Your Customer (KYC) verification before making withdrawals. Required documents include:",
    bullets: [
      "Government-issued photo ID (passport, national ID, or driving license)",
      "Proof of address (utility bill or bank statement)",
      "Selfie with ID for liveness verification",
    ],
  },
  {
    heading: "Transaction Monitoring",
    body: "CashBullX actively monitors all transactions for suspicious activity including:",
    bullets: [
      "Unusually large or frequent deposits",
      "Transactions with no clear economic purpose",
      "Use of multiple accounts by the same individual",
      "Structuring transactions to avoid reporting thresholds",
    ],
  },
  {
    heading: "Suspicious Activity Reporting",
    body: "If suspicious activity is detected, CashBullX reserves the right to:",
    bullets: [
      "Freeze the account immediately",
      "Request additional verification documents",
      "Report the activity to relevant authorities",
      "Permanently terminate the account",
    ],
  },
  {
    heading: "Prohibited Users",
    body: "The following individuals/entities are prohibited from using CashBullX:",
    bullets: [
      "Persons on international sanctions lists",
      "Politically Exposed Persons (PEPs) without enhanced due diligence",
      "Residents of FATF blacklisted countries",
      "Anyone involved in illegal financial activities",
    ],
  },
  { heading: "Record Keeping", body: "CashBullX maintains transaction records and user verification data for a minimum of 5 years in compliance with AML regulations." },
  { heading: "Staff Training", body: "Our team is trained to identify and report suspicious activity in accordance with AML best practices." },
  { heading: "Contact", body: "For AML-related inquiries: compliance@cashbullx.com" },
];

function AmlPage() {
  return <PolicyLayout title="AML Policy" effectiveDate="June 1, 2025" sections={SECTIONS} />;
}