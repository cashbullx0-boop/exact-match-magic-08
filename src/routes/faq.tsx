import { createFileRoute, Link } from "@tanstack/react-router";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — CashBullX" },
      { name: "description", content: "Frequently asked questions about earning rewards on CashBullX." },
      { property: "og:title", content: "FAQ — CashBullX" },
      { property: "og:description", content: "Common questions about tasks, withdrawals, referrals, and security." },
    ],
  }),
  component: FaqPage,
});

const FAQS = [
  { q: "How does CashBullX work?", a: "Complete tasks like surveys, videos, app installs, or special offers. Each task pays a reward credited to your wallet — withdraw whenever you reach the minimum." },
  { q: "What is the minimum withdrawal?", a: "$5.00. Payouts are reviewed and processed within 1-3 business days." },
  { q: "Is this an investment platform?", a: "No. CashBullX is a 100% task-based rewards platform. We never ask you to deposit money — you only earn by completing real tasks." },
  { q: "How do referrals work?", a: "Share your unique code. When friends sign up and complete tasks, you both earn bonuses credited automatically." },
  { q: "Are my earnings safe?", a: "Yes. All transactions are recorded on an immutable ledger. Your account is protected by encrypted authentication and optional 2FA." },
  { q: "What payment methods are supported?", a: "PayPal, crypto wallets, and bank transfers in select regions. More are coming soon." },
  { q: "What if a task doesn't credit?", a: "Open a support ticket from your dashboard — our team responds within 24 hours." },
];

function FaqPage() {
  return (
    <div className="min-h-screen">
      <header className="container mx-auto flex items-center justify-between px-6 py-6">
        <Link to="/" className="text-2xl font-bold brand-text">CashBullX</Link>
        <Link to="/signup"><Button className="btn-primary-gradient">Get started</Button></Link>
      </header>
      <main className="container mx-auto px-6 py-12 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Frequently asked questions</h1>
        <p className="text-muted-foreground mb-8">Everything you need to know about earning with CashBullX.</p>
        <div className="glass-strong rounded-2xl p-2">
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="px-4">
                <AccordionTrigger className="text-left font-medium">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </main>
    </div>
  );
}