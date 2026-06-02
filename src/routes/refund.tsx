import { createFileRoute } from "@tanstack/react-router";
import { PolicyLayout, type PolicySection } from "@/components/marketing/policy-layout";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [
      { title: "Refund Policy — CashBullX" },
      { name: "description", content: "CashBullX refund policy for deposits, withdrawals, and exceptional cases." },
      { property: "og:title", content: "Refund Policy — CashBullX" },
      { property: "og:description", content: "Read the CashBullX Refund Policy." },
    ],
  }),
  component: RefundPage,
});

const SECTIONS: PolicySection[] = [
  { heading: "General Policy", body: "All deposits made on CashBullX are final. Due to the nature of cryptocurrency transactions, deposits cannot be reversed once confirmed on the blockchain." },
  {
    heading: "Exceptions",
    body: "Refunds may be considered in the following cases only:",
    bullets: [
      "Duplicate deposit due to a platform technical error",
      "Deposit credited to wrong account due to platform fault",
      "Unauthorized transaction reported within 24 hours",
    ],
  },
  {
    heading: "Refund Process",
    body: "To request a refund, contact support@cashbullx.com with:",
    bullets: [
      "Your registered email",
      "Transaction ID / TX Hash",
      "Amount and date of transaction",
      "Reason for refund request",
    ],
  },
  {
    heading: "Non-Refundable Cases",
    bullets: [
      "User sent wrong amount",
      "User sent to wrong wallet address",
      "Change of mind after deposit",
      "Losses due to market fluctuations",
      "Account suspended due to policy violations",
    ],
  },
  { heading: "Withdrawal Reversals", body: "Withdrawal requests that have not yet been processed may be cancelled by contacting support. Once processed, withdrawals cannot be reversed." },
];

function RefundPage() {
  return (
    <PolicyLayout
      title="Refund Policy"
      effectiveDate="June 1, 2025"
      intro="Refund requests are reviewed within 5-7 business days. Approved refunds are processed in USDT to your original wallet address."
      sections={SECTIONS}
    />
  );
}