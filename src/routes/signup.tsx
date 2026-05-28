import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  validateSearch: (s) => ({ ref: typeof s.ref === "string" ? s.ref : undefined }),
  head: () => ({ meta: [{ title: "Create account — CashBullX" }] }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { ref } = Route.useSearch();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
        data: { full_name: fullName, referral_code: ref ?? null },
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    if (ref && data.user) {
      // Attach referral after profile is created
      setTimeout(async () => {
        const { data: refProfile } = await supabase.from("profiles").select("id").eq("referral_code", ref).maybeSingle();
        if (refProfile) {
          await supabase.from("profiles").update({ referred_by: refProfile.id }).eq("id", data.user!.id);
          await supabase.from("referrals").insert({ referrer_id: refProfile.id, referred_id: data.user!.id, bonus_cents: 100 });
        }
      }, 800);
    }
    toast.success("Account created — check your email if confirmation is required.");
    navigate({ to: "/dashboard", replace: true });
  };

  const google = async () => {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (res.error) toast.error(res.error.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md glass-strong rounded-3xl p-8 animate-float-up">
        <Link to="/" className="block text-center text-2xl font-bold brand-text mb-2">CashBullX</Link>
        <h1 className="text-2xl font-bold text-center mt-4">Create your account</h1>
        <p className="text-sm text-muted-foreground text-center mt-1">Start earning in minutes</p>
        {ref && <p className="text-xs text-center text-primary mt-2">Referral code applied: {ref}</p>}

        <Button onClick={google} variant="outline" className="w-full mt-6 h-11">
          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1H12v3.2h5.35c-.23 1.4-1.7 4.1-5.35 4.1-3.22 0-5.85-2.66-5.85-5.95s2.63-5.95 5.85-5.95c1.83 0 3.06.78 3.76 1.45l2.57-2.48C16.86 3.96 14.7 3 12 3 6.95 3 2.85 7.1 2.85 12.15S6.95 21.3 12 21.3c6.92 0 9.5-4.86 9.5-7.4 0-.5-.05-.88-.15-1.3Z"/></svg>
          Continue with Google
        </Button>

        <div className="flex items-center gap-3 my-6 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or with email <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Full name</Label>
            <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 h-11" placeholder="Alex Morgan" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 h-11" placeholder="you@example.com" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Password</Label>
            <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 h-11" placeholder="At least 6 characters" />
          </div>
          <Button type="submit" disabled={loading} className="w-full h-11 btn-primary-gradient">
            {loading ? "Creating..." : "Create account →"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}