import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { consumePasswordReset } from "@/lib/password-reset.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — CashBullX" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const consume = useServerFn(consumePasswordReset);

  // Read approval token from URL: /reset-password?rid=<uuid>&token=<hex>
  const { rid, token } = useMemo(() => {
    if (typeof window === "undefined") return { rid: "", token: "" };
    const p = new URLSearchParams(window.location.search);
    return { rid: p.get("rid") ?? "", token: p.get("token") ?? "" };
  }, []);
  const adminApprovedFlow = Boolean(rid && token);

  useEffect(() => {
    if (adminApprovedFlow) { setReady(true); return; }
    // Fallback: legacy Supabase recovery session (from hash).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, [adminApprovedFlow]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    setLoading(true);
    try {
      if (adminApprovedFlow) {
        await consume({ data: { requestId: rid, token, newPassword: password } });
        toast.success("Password updated. Please sign in with your new password.");
        navigate({ to: "/login", replace: true });
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success("Password updated. You're signed in.");
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Could not reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md glass-strong rounded-3xl p-8 animate-float-up">
        <Link to="/" className="block text-center text-2xl font-bold brand-text mb-2">CashBullX</Link>
        <h1 className="text-2xl font-bold text-center mt-4">Set a new password</h1>
        <p className="text-sm text-muted-foreground text-center mt-1">
          {ready ? "Enter a new password for your account." : "Validating reset link..."}
        </p>

        <form onSubmit={submit} className="space-y-4 mt-6">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">New password</Label>
            <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 h-11" placeholder="At least 6 characters" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Confirm password</Label>
            <Input type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1 h-11" placeholder="Repeat password" />
          </div>
          <Button type="submit" disabled={loading || !ready} className="w-full h-11 btn-primary-gradient">
            {loading ? "Updating..." : "Update password →"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link to="/login" className="text-primary hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}