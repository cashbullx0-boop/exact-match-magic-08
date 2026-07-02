import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Gift, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/offerwall")({
  head: () => ({ meta: [{ title: "Offerwall — CashBullX" }] }),
  component: OfferwallComingSoon,
});

function OfferwallComingSoon() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <Card className="max-w-lg w-full p-10 text-center bg-card/60 backdrop-blur border-border/50 shadow-xl">
        <div className="relative mx-auto w-24 h-24 mb-6">
          <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl animate-pulse" />
          <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center">
            <Gift className="w-12 h-12 text-primary" />
            <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center shadow-lg">
              <Clock className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Offerwall Coming Soon
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          Exciting offers and rewards are on their way. Stay tuned!
        </p>
      </Card>
    </div>
  );
}