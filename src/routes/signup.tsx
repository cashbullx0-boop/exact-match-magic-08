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
import { Mail, Phone, Eye, EyeOff } from "lucide-react";
import { PhoneField } from "@/components/auth/phone-field";
import { parsePhoneNumber } from "react-phone-number-input";
import { RedirectIfAuthenticated } from "@/components/auth/redirect-if-authenticated";

export const Route = createFileRoute("/signup")({
  validateSearch: (s) => ({ ref: typeof s.ref === "string" ? s.ref : undefined }),
  head: () => ({ meta: [{ title: "Create account — CashBullX" }] }),
  component: () => (
    <RedirectIfAuthenticated>
      <SignupPage />
    </RedirectIfAuthenticated>
  ),
});

function SignupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { ref: refSearch } = Route.useSearch();
  const [ref, setRef] = useState<string | undefined>(refSearch);
  useEffect(() => {
    if (refSearch) { setRef(refSearch); try { sessionStorage.setItem("cbx_ref", refSearch); } catch { } return; }
    try { const v = sessionStorage.getItem("cbx_ref"); if (v) setRef(v); } catch { }
  }, [refSearch]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [refInput, setRefInput] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneResendIn, setPhoneResendIn] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  useEffect(() => {
    if (phoneResendIn <= 0) return;
    const t = setInterval(() => setPhoneResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [phoneResendIn]);

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), [email]);
  const pwdError = password.length > 0 && password.length < 6 ? "At least 6 characters" : "";

  useEffect(() => {
    if (ref) setRefInput(ref);
  }, [ref]);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  const attachReferral = async (uid: string) => {
    if (!ref) return;
    try {
      const { data: referrer } = await supabase
        .from("profiles")
        .select("id")
        .or(`username.eq.${ref},referral_code.eq.${ref}`)
        .single();

      if (referrer?.id && referrer.id !== uid) {
        const { count } = await supabase
          .from("referrals")
          .select("*", { count: "exact", head: true })
          .eq("referrer_id", referrer.id);

        if ((count ?? 0) < 6) {
          await supabase.from("referrals").insert({
            referrer_id: referrer.id,
            referred_id: uid,
            bonus_cents: 0,
          });
        }
      }
      sessionStorage.removeItem("cbx_ref");
    } catch (err) {
      console.error("Referral attach error:", err);
    }
  };

  const sendPhoneOtp = async () => {
    const parsed = phone ? parsePhoneNumber(phone) : null;
    if (!parsed || !parsed.isValid()) { toast.error("Enter a valid phone number"); return; }
    setLoading(true);
    const { data, error } = await supabase.rpc("create_signup_phone_otp", { _phone: phone });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setPhoneOtpSent(true);
    setPhoneResendIn(45);
    toast.success(`Phone OTP sent${data ? ` (demo: ${data})` : ""}`, { duration: 8000 });
  };

  const verifyPhoneOtp = async () => {
    if (phoneOtp.length !== 6) { toast.error("Enter the 6-digit code"); return; }
    setLoading(true);
    const { data, error } = await supabase.rpc("verify_signup_phone_otp", { _phone: phone, _otp: phoneOtp });
    setLoading(false);
    if (error || !data) { toast.error("Invalid or expired OTP"); return; }
    setPhoneVerified(true);
    toast.success("Phone verified ✓");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { toast.error("Enter your full name"); return; }
    if (!emailValid) { toast.error("Enter a valid email"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    const codeTrim = refInput.trim();
    if (codeTrim) {
      try { sessionStorage.setItem("cbx_ref", codeTrim); } catch {}
      setRef(codeTrim);
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
        data: { full_name: fullName, referral_code: codeTrim || ref || null },
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
    if (data.user) await attachReferral(data.user.id);
    if (phoneVerified && phone) {
      try {
        const parsed = parsePhoneNumber(phone);
        const cc = parsed?.countryCallingCode ? `+${parsed.countryCallingCode}` : "";
        await supabase.rpc("attach_verified_phone", { _phone: phone, _country_code: cc });
      } catch { }
    }
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
          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1H12v3.2h5.35c-.23 1.4-1.7 4.1-5.35 4.1-3.22 0-5.85-2.66-5.85-5.95s2.63-5.95 5.85-5.95c1.83 0 3.06.78 3.76 1.45l2.57-2.48C16.86 3.96 14.7 3 12 3 6.95 3 2.85 7.1 2.85 12.15S6.95 21.3 12 21.3c6.92 0 9.5-4.86 9.5-7.4 0-.5-.05-.88-.15-1.3Z" /></svg>
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
              <div className="relative mt-1">
                <Input type={showPassword ? "text" : "password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 pr-10" placeholder="At least 6 characters" />
                <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {pwdError && <p className="text-xs text-destructive mt-1">{pwdError}</p>}
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Phone number (optional)</Label>
              <div className="mt-1 rounded-md border border-input bg-transparent px-3 h-11 flex items-center [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:outline-none [&_.PhoneInputInput]:text-sm [&_.PhoneInputInput]:flex-1 [&_.PhoneInputCountry]:mr-2">
                <PhoneField value={phone} onChange={(v) => { setPhone(v); setPhoneOtpSent(false); setPhoneVerified(false); setPhoneOtp(""); }} placeholder="Phone number" />
              </div>
              {!phoneVerified && (
                <div className="mt-2 space-y-2">
                  {!phoneOtpSent ? (
                    <Button type="button" variant="outline" size="sm" onClick={sendPhoneOtp} disabled={loading || !phone} className="w-full">
                      <Phone className="h-3.5 w-3.5 mr-1.5" /> Send phone OTP
                    </Button>
                  ) : (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
                      <p className="text-xs text-muted-foreground">Enter the 6-digit code sent to <span className="text-foreground font-medium">{phone}</span></p>
                      <div className="flex items-center justify-between gap-2">
                        <InputOTP maxLength={6} value={phoneOtp} onChange={setPhoneOtp} inputMode="numeric">
                          <InputOTPGroup>
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                              <InputOTPSlot key={i} index={i} className="h-10 w-8 text-base bg-white/[0.04] border-primary/30" />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                        <Button type="button" size="sm" onClick={verifyPhoneOtp} disabled={loading || phoneOtp.length !== 6} className="btn-primary-gradient">Verify</Button>
                      </div>
                      <button type="button" onClick={sendPhoneOtp} disabled={phoneResendIn > 0 || loading} className="text-xs text-primary disabled:text-muted-foreground hover:underline">
                        {phoneResendIn > 0 ? `Resend in ${phoneResendIn}s` : "Resend code"}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {phoneVerified && <p className="text-xs text-accent mt-2">✓ Phone verified</p>}
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
                  {[0, 1, 2, 3, 4, 5].map((i) => (
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