import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { requestPasswordReset, confirmPasswordReset } from "@/lib/password-reset.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot password — CashBullX" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const requestReset = useServerFn(requestPasswordReset);
  const confirmReset = useServerFn(confirmPasswordReset);
  const [step, setStep] = useState<"request" | "confirm" | "done">("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await requestReset({ data: { email } });
      toast.success("Request submitted. An admin will review it shortly.");
      setStep("confirm");
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit");
    } finally {
      setLoading(false);
    }
  };

  const submitConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { toast.error("Password must be 8+ characters"); return; }
    setLoading(true);
    try {
      await confirmReset({ data: { email, otp, newPassword } });
      toast.success("Password updated. You can sign in now.");
      setStep("done");
    } catch (err: any) {
      toast.error(err?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md glass-strong rounded-3xl p-8 animate-float-up">
        <Link to="/" className="block text-center text-2xl font-bold brand-text mb-2">CashBullX</Link>
        <h1 className="text-2xl font-bold text-center mt-4">
          {step === "done" ? "Password updated" : step === "confirm" ? "Enter OTP & new password" : "Request password reset"}
        </h1>
        <p className="text-sm text-muted-foreground text-center mt-1">
          {step === "request" && "Submit a reset request. Once an admin approves, you'll receive an OTP by email and phone."}
          {step === "confirm" && "Enter the OTP from your email/phone and choose a new password."}
          {step === "done" && "Your password has been reset successfully."}
        </p>

        {step === "done" ? (
          <div className="mt-6 text-center">
            <Link to="/login" className="text-primary hover:underline">Back to sign in →</Link>
          </div>
        ) : step === "confirm" ? (
          <form onSubmit={submitConfirm} className="space-y-4 mt-6">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1 h-11" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">OTP code</Label>
              <Input required inputMode="numeric" maxLength={6} value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="000000" className="mt-1 h-11 tracking-[0.4em] text-center" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">New password</Label>
              <Input required type="password" minLength={8} maxLength={128}
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••" className="mt-1 h-11" />
            </div>
            <Button type="submit" disabled={loading || otp.length !== 6} className="w-full h-11 btn-primary-gradient">
              {loading ? "Updating..." : "Reset password →"}
            </Button>
            <button type="button" onClick={() => setStep("request")} className="text-xs text-muted-foreground hover:text-foreground w-full">
              Back
            </button>
          </form>
        ) : (
          <form onSubmit={submitRequest} className="space-y-4 mt-6">
            <div>
              <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">Email address</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1 h-11" />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 btn-primary-gradient">
              {loading ? "Submitting..." : "Request reset →"}
            </Button>
            <button type="button" onClick={() => setStep("confirm")} className="text-xs text-muted-foreground hover:text-foreground w-full">
              I already have an OTP
            </button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground mt-6">
          Remembered it? <Link to="/login" className="text-primary hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}