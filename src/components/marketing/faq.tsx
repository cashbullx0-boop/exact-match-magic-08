import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQS = [
  { q: "Is CashBullX really free to use?", a: "Yes — sign-up is 100% free. No subscription, no hidden fees. You only earn, never pay to participate." },
  { q: "How fast are withdrawals?", a: "Most USDT withdrawals (TRC20 / BEP20) are processed within minutes once you meet the minimum payout threshold." },
  { q: "What kinds of tasks can I do?", a: "Surveys, watching short videos, app installs, and exclusive offers from our partner network. New tasks are added every hour." },
  { q: "Is this an investment platform?", a: "No. CashBullX is a task-based rewards platform only. We never offer investments, staking, or guaranteed returns." },
  { q: "How does the referral program work?", a: "Share your referral code. You earn a lifetime percentage bonus on every task your invited friends complete — paid into your wallet automatically." },
  { q: "Which countries are supported?", a: "CashBullX works in 140+ countries. Task availability can vary by region based on advertiser targeting." },
];

export function FAQSection() {
  return (
    <section id="faq" className="py-20 md:py-28">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs text-muted-foreground mb-4">
          ❓ Frequently asked
        </div>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
          Questions? <span className="brand-text">We've got answers.</span>
        </h2>
      </div>
      <div className="max-w-3xl mx-auto glass rounded-3xl p-2 md:p-4">
        <Accordion type="single" collapsible className="w-full">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-border/50 px-4">
              <AccordionTrigger className="text-left text-base md:text-lg font-medium hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed text-sm md:text-base">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}