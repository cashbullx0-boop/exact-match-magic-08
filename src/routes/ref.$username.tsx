import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Gift, Sparkles, ArrowRight } from "lucide-react";
import { RedirectIfAuthenticated } from "@/components/auth/redirect-if-authenticated";

export const Route = createFileRoute("/ref/$username")({
  head: ({ params }) => ({ meta: [{ title: `Join via @${params.username} — CashBullX` }] }),
  component: () => (
    <RedirectIfAuthenticated>
      <RefLanding />
    </RedirectIfAuthenticated>
  ),
});

function RefLanding() {
  const { username } = Route.useParams();
  const navigate = useNavigate();
  const [info, setInfo] = useState<{ username: string | null; full_name: string | null; avatar_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try { sessionStorage.setItem("cbx_ref", username); } catch {}
    try { localStorage.setItem("pendingReferralCode", username); } catch {}
    supabase.rpc("get_referrer_public_info", { _value: username })
      .then(({ data }) => { setInfo(Array.isArray(data) ? data[0] ?? null : null); setLoading(false); });
  }, [username]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <Card className="glass-strong border-border w-full max-w-md p-8 animate-float-up text-center">
        <Link to="/" className="block text-2xl font-bold brand-text mb-6">CashBullX</Link>

        {loading ? (
          <p className="text-muted-foreground text-sm py-8">Loading invitation…</p>
        ) : info ? (
          <>
            <div className="flex flex-col items-center gap-3">
              <Avatar className="h-20 w-20 ring-2 ring-primary/40">
                <AvatarImage src={info.avatar_url ?? undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-xl">
                  {(info.full_name ?? info.username ?? username).slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> You've been invited by
              </p>
              <p className="text-xl font-bold">{info.full_name ?? info.username ?? username}</p>
              {info.username && <p className="text-xs text-muted-foreground">@{info.username}</p>}
            </div>

            <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-left">
              <p className="text-sm font-semibold flex items-center gap-2"><Gift className="h-4 w-4 text-accent" /> Sign-up bonus</p>
              <p className="text-xs text-muted-foreground mt-1">Create your account using this invite to unlock a starter bonus credited to your wallet.</p>
            </div>

            <Button onClick={() => navigate({ to: "/signup", search: { ref: username } })} className="btn-primary-gradient w-full h-11 mt-6">
              Create your account <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
            <Link to="/login" className="block text-xs text-muted-foreground hover:text-foreground mt-3">Already have an account? Sign in</Link>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold">Invite not found</p>
            <p className="text-sm text-muted-foreground mt-2">We couldn't find a user matching <span className="font-mono">{username}</span>. You can still sign up below.</p>
            <Button onClick={() => navigate({ to: "/signup" })} className="btn-primary-gradient w-full h-11 mt-6">Create account</Button>
          </>
        )}
      </Card>
    </div>
  );
}