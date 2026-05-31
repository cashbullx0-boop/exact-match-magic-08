import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PhoneField } from "@/components/auth/phone-field";
import { isValidPhoneNumber } from "libphonenumber-js";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — CashBullX" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), [email]);
  const phoneValid = useMemo(() => phone && isValidPhoneNumber(phone), [phone]);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid) { toast.error("Enter a valid email"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    try {
      if (remember) localStorage.setItem("cbx_remember_email", email);
      else localStorage.removeItem("cbx_remember_email");
    } catch {}
    navigate({ to: "/dashboard", replace: true });
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cbx_remember_email");
      if (saved) setEmail(saved);
    } catch {}
  }, []);

  const sendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneValid) { toast.error("Enter a valid phone number"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setOtpSent(true);
    toast.success("Code sent");
  };

  const verifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
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
        <h1 className="text-2xl font-bold text-center mt-4">Welcome back</h1>
        <p className="text-sm text-muted-foreground text-center mt-1">Sign in to your earning dashboard</p>

        <Button onClick={google} variant="outline" className="w-full mt-6 h-11">
          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1H12v3.2h5.35c-.23 1.4-1.7 4.1-5.35 4.1-3.22 0-5.85-2.66-5.85-5.95s2.63-5.95 5.85-5.95c1.83 0 3.06.78 3.76 1.45l2.57-2.48C16.86 3.96 14.7 3 12 3 6.95 3 2.85 7.1 2.85 12.15S6.95 21.3 12 21.3c6.92 0 9.5-4.86 9.5-7.4 0-.5-.05-.88-.15-1.3Z"/></svg>
          Continue with Google
        </Button>

        <div className="flex items-center gap-3 my-6 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or sign in with <div className="h-px flex-1 bg-border" />
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "email" | "phone")}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="phone">Phone</TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="mt-5">
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">Email address</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1 h-11" />
                {email && !emailValid && <p className="text-xs text-destructive mt-1">Enter a valid email</p>}
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="pwd" className="text-xs uppercase tracking-wider text-muted-foreground">Password</Label>
                  <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot?</Link>
                </div>
                <Input id="pwd" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1 h-11" />
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} /> Remember me
              </label>
              <Button type="submit" disabled={loading} className="w-full h-11 btn-primary-gradient">
                {loading ? "Signing in..." : "Sign In →"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="phone" className="mt-5">
            {!otpSent ? (
              <form onSubmit={sendPhoneOtp} className="space-y-4">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Phone number</Label>
                  <div className="mt-1"><PhoneField value={phone} onChange={setPhone} /></div>
                  {phone && !phoneValid && <p className="text-xs text-destructive mt-1">Enter a valid phone number</p>}
                </div>
                <Button type="submit" disabled={loading || !phoneValid} className="w-full h-11 btn-primary-gradient">
                  {loading ? "Sending..." : "Send code →"}
                </Button>
              </form>
            ) : (
              <form onSubmit={verifyPhoneOtp} className="space-y-4">
                <p className="text-sm text-muted-foreground">We sent a code to <span className="text-foreground font-medium">{phone}</span></p>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Verification code</Label>
                  <Input required inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} className="mt-1 h-11 tracking-[0.4em] text-center" placeholder="000000" maxLength={6} />
                </div>
                <Button type="submit" disabled={loading} className="w-full h-11 btn-primary-gradient">
                  {loading ? "Verifying..." : "Sign in →"}
                </Button>
                <button type="button" onClick={() => setOtpSent(false)} className="text-xs text-muted-foreground hover:text-foreground w-full">Use a different number</button>
              </form>
            )}
          </TabsContent>
        </Tabs>

        <p className="text-center text-sm text-muted-foreground mt-6">
          No account? <Link to="/signup" className="text-primary hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  );
}