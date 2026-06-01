import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Mail } from "lucide-react";

export const Route = createFileRoute("/signup")({
  validateSearch: (s) => ({ ref: typeof s.ref === "string" ? s.ref : undefined }),
  head: () => ({ meta: [{ title: "Create account — CashBullX" }] }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { ref: refSearch } = Route.useSearch();
  const [ref, setRef] = useState<string | undefined>(refSearch);
  useEffect(() => {
    if (refSearch) { setRef(refSearch); try { sessionStorage.setItem("cbx_ref", refSearch); } catch {} return; }
    try { const v = sessionStorage.getItem("cbx_ref"); if (v) setRef(v); } catch {}
  }, [refSearch]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), [email]);
  const pwdError = password.length > 0 && password.length < 6 ? "At least 6 characters" : "";

  useEffect(() => {
    if (user) navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  const attachReferral = (uid: string) => {
    if (!ref) return;
    setTimeout(async () => {
      const { data: refId } = await supabase.rpc("get_referrer_id_by_username_or_code", { _value: ref });
      if (refId) {
        await supabase.from("profiles").update({ referred_by: refId }).eq("id", uid);
        await supabase.from("referrals").insert({ referrer_id: refId, referred_id: uid, bonus_cents: 100 });
        try { sessionStorage.removeItem("cbx_ref"); } catch {}
      }
    }, 800);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { toast.error("Enter your full name"); return; }
    if (!emailValid) { toast.error("Enter a valid email"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
        data: { full_name: fullName, referral_code: ref ?? null },
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setEmailOtpSent(true);
    setResendIn(60);
    toast.success("We sent a 6-digit code to your email");
  };

  const verifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailOtp.length !== 6) { toast.error("Enter the 6-digit code"); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({ email, token: emailOtp, type: "signup" });
    setLoading(false);
    if (error) { toast.error(error.message || "Invalid code, try again"); return; }
    if (data.user) attachReferral(data.user.id);
    toast.success("Email verified — welcome!");
    navigate({ to: "/dashboard", replace: true });
  };

  const resendEmailOtp = async () => {
    if (resendIn > 0) return;
    setLoading(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setResendIn(60);
    toast.success("New code sent");
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
          <div className="h-px flex-1 bg-border" /> or sign up with email <div className="h-px flex-1 bg-border" />
        </div>

        {!emailOtpSent ? (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Full name</Label>
              <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 h-11" placeholder="Alex Morgan" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 h-11" placeholder="you@example.com" />
              {email && !emailValid && <p className="text-xs text-destructive mt-1">Enter a valid email</p>}
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Password</Label>
              <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 h-11" placeholder="At least 6 characters" />
              {pwdError && <p className="text-xs text-destructive mt-1">{pwdError}</p>}
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 btn-primary-gradient">
              {loading ? "Creating..." : "Create account →"}
            </Button>
          </form>
        ) : (
          <form onSubmit={verifyEmailOtp} className="space-y-5">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/15 text-primary grid place-items-center shrink-0"><Mail className="h-4 w-4" /></div>
              <div className="min-w-0">
                <p className="text-sm font-medium">Verify your email</p>
                <p className="text-xs text-muted-foreground mt-0.5">We sent a 6-digit code to <span className="text-foreground font-medium break-all">{email}</span>. The code expires in 10 minutes.</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Enter verification code</Label>
              <InputOTP maxLength={6} value={emailOtp} onChange={setEmailOtp} inputMode="numeric" pattern="^[0-9]*$">
                <InputOTPGroup>
                  {[0,1,2,3,4,5].map((i) => (
                    <InputOTPSlot key={i} index={i} className="h-12 w-10 text-lg bg-white/[0.04] border-border" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button type="submit" disabled={loading || emailOtp.length !== 6} className="w-full h-11 btn-primary-gradient">
              {loading ? "Verifying..." : "Verify & continue →"}
            </Button>
            <div className="flex items-center justify-between text-xs">
              <button type="button" onClick={() => { setEmailOtpSent(false); setEmailOtp(""); }} className="text-muted-foreground hover:text-foreground">Use a different email</button>
              <button type="button" onClick={resendEmailOtp} disabled={resendIn > 0 || loading} className="text-primary disabled:text-muted-foreground disabled:cursor-not-allowed hover:underline">
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
