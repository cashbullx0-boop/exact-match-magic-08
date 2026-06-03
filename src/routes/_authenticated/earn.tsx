import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, PlayCircle, Smartphone, ClipboardList } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/earn")({
  head: () => ({ meta: [{ title: "Earn — CashBullX" }] }),
  component: EarnPage,
});

function CpxOfferwall({ userId, designType, containerId }: { userId: string; designType: 1 | 2; containerId: string }) {
  useEffect(() => {
    if (!userId) return;
    // @ts-ignore
    window.CpxResearch = {
      app_id: 33442,
      ext_user_id: userId,
      secure_hash: null,
      design_type: designType,
      position_type: 1,
      div_id: containerId,
    };
    const existing = document.querySelector<HTMLScriptElement>(`script[data-cpx="${containerId}"]`);
    if (existing) existing.remove();
    const s = document.createElement("script");
    s.src = "https://cdn.cpx-research.com/assets/js/script_tag_v2.0.js";
    s.async = true;
    s.dataset.cpx = containerId;
    document.body.appendChild(s);
    return () => {
      s.remove();
    };
  }, [userId, designType, containerId]);

  return <div id={containerId} className="min-h-[600px] w-full rounded-xl overflow-hidden bg-background/40" />;
}

function EarnPage() {
  const { user } = useAuth();
  const uid = user?.id ?? "";

  return (
    <div className="space-y-6 animate-float-up">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: "var(--gradient-primary)" }}>
          💰
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Earn</h1>
          <p className="text-muted-foreground text-sm">Complete surveys, watch videos, and install apps to earn USDT.</p>
        </div>
      </header>

      <Card className="glass-strong border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <ClipboardList className="h-6 w-6 text-primary" />
          <div>
            <h2 className="font-bold text-lg">Surveys</h2>
            <p className="text-xs text-muted-foreground">Share your opinion and get rewarded instantly.</p>
          </div>
        </div>
        {uid ? <CpxOfferwall userId={uid} designType={1} containerId="cpx-surveys" /> : null}
      </Card>

      <Card className="glass-strong border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <PlayCircle className="h-6 w-6 text-primary" />
          <div>
            <h2 className="font-bold text-lg">Watch Videos</h2>
            <p className="text-xs text-muted-foreground">Earn while watching sponsored video content.</p>
          </div>
        </div>
        {uid ? <CpxOfferwall userId={uid} designType={2} containerId="cpx-videos" /> : null}
      </Card>

      <Card className="glass-strong border-border p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative flex flex-col items-center text-center py-10">
          <div className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-primary/40" style={{ background: "var(--gradient-primary)" }}>
            <Smartphone className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="font-bold text-xl flex items-center gap-2">
            App Installs <Sparkles className="h-5 w-5 text-primary" />
          </h2>
          <p className="text-muted-foreground mt-2 max-w-md">
            Install partner apps and earn even more rewards. We are integrating premium CPI providers.
          </p>
          <Badge variant="secondary" className="mt-4 bg-primary/15 text-primary border border-primary/30">
            Coming Soon 🚀
          </Badge>
        </div>
      </Card>
    </div>
  );
}