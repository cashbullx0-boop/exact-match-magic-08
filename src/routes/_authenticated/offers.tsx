import { createFileRoute } from "@tanstack/react-router";
import { OffersSection } from "@/components/dashboard/offers-section";
import { Card } from "@/components/ui/card";
import { Gift } from "lucide-react";

export const Route = createFileRoute("/_authenticated/offers")({
  head: () => ({
    meta: [
      { title: "Offers — CashBullX" },
      { name: "description", content: "Live rotating offers and rewards on CashBullX. New offer every 4 hours." },
    ],
  }),
  component: OffersPage,
});

function OffersPage() {
  return (
    <div className="space-y-6 animate-float-up">
      <header className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/25 to-accent/10 border border-primary/30 flex items-center justify-center">
          <Gift className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Offers</h1>
          <p className="text-muted-foreground text-sm">A fresh offer drops every 4 hours — don't miss out.</p>
        </div>
      </header>

      <OffersSection />

      <Card className="glass-strong border-border p-5">
        <h2 className="font-semibold mb-2">How offers work</h2>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
          <li>Six offers rotate every day — one becomes active every 4 hours.</li>
          <li>The lineup reshuffles daily, so check back often.</li>
          <li>Rewards credit automatically when you meet an offer's conditions.</li>
        </ul>
      </Card>
    </div>
  );
}