import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Users, Gift } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/referrals")({
  head: () => ({ meta: [{ title: "Referrals — CashBullX" }] }),
  component: ReferralsPage,
});

function ReferralsPage() {
  const { user, profile } = useAuth();
  const [refs, setRefs] = useState<any[]>([]);
  const link = profile?.referral_code ? `${typeof window !== "undefined" ? window.location.origin : ""}/signup?ref=${profile.referral_code}` : "";

  useEffect(() => {
    if (!user) return;
    supabase.from("referrals").select("*").eq("referrer_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setRefs(data ?? []));
  }, [user]);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const totalEarned = refs.reduce((s, r) => s + (r.bonus_cents ?? 0), 0);

  return (
    <div className="space-y-6 animate-float-up">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">Refer & earn</h1>
        <p className="text-muted-foreground mt-1">Invite friends with your code. You both win.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-strong border-border p-5">
          <Users className="h-5 w-5 text-primary" />
          <p className="text-xs uppercase tracking-wider text-muted-foreground mt-3">Friends invited</p>
          <p className="text-3xl font-bold mt-2">{refs.length}</p>
        </Card>
        <Card className="glass-strong border-border p-5">
          <Gift className="h-5 w-5 text-accent" />
          <p className="text-xs uppercase tracking-wider text-muted-foreground mt-3">Bonus earned</p>
          <p className="text-3xl font-bold mt-2 brand-text">${(totalEarned / 100).toFixed(2)}</p>
        </Card>
        <Card className="glass-strong border-border p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Your code</p>
          <div className="flex items-center gap-2 mt-2">
            <code className="text-2xl font-bold tracking-widest">{profile?.referral_code ?? "—"}</code>
            <Button variant="ghost" size="icon" onClick={() => profile && copy(profile.referral_code)}><Copy className="h-4 w-4" /></Button>
          </div>
        </Card>
      </div>

      <Card className="glass-strong border-border p-6">
        <h2 className="font-semibold">Your referral link</h2>
        <p className="text-sm text-muted-foreground mt-1">Share this link. When a friend signs up, you'll get a bonus credited to your wallet.</p>
        <div className="flex gap-2 mt-4">
          <Input readOnly value={link} className="h-11" />
          <Button onClick={() => copy(link)} className="btn-primary-gradient h-11"><Copy className="h-4 w-4 mr-1" />Copy</Button>
        </div>
      </Card>

      <Card className="glass-strong border-border p-6">
        <h2 className="font-semibold mb-4">Your referrals</h2>
        {refs.length === 0 ? (
          <p className="text-sm text-muted-foreground">You haven't referred anyone yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {refs.map((r) => (
              <li key={r.id} className="py-3 flex items-center justify-between">
                <span className="text-sm font-mono text-muted-foreground">{r.referred_id.slice(0, 8)}…</span>
                <span className="text-sm">{new Date(r.created_at).toLocaleDateString()}</span>
                <span className="text-sm font-semibold text-accent">+${(r.bonus_cents / 100).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}