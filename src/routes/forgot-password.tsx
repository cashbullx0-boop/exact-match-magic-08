import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { requestPasswordReset } from "@/lib/password-reset.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot password — CashBullX" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const submitReset = useServerFn(requestPasswordReset);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await submitReset({ data: { email: email.trim() } });
      setSent(true);
      toast.success("Request submitted");
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md glass-strong rounded-3xl p-8 animate-float-up">
        <Link to="/" className="block text-center text-2xl font-bold brand-text mb-2">CashBullX</Link>
        <h1 className="text-2xl font-bold text-center mt-4">
          {sent ? "Request submitted" : "Reset your password"}
        </h1>
        <p className="text-sm text-muted-foreground text-center mt-1">
          {sent
            ? `Your reset request has been sent to the admin for approval. Once approved, a secure reset link will be emailed to ${email}. Please wait — this usually happens shortly.`
            : "Enter your account email. Your request will be reviewed by admin, and a reset link will be emailed to you once approved."}
        </p>

        {sent ? (
          <div className="mt-6 space-y-3 text-center">
            <p className="text-xs text-muted-foreground">
              Didn't get it? Check spam, or{" "}
              <button onClick={() => setSent(false)} className="text-primary hover:underline">try again</button>.
            </p>
            <Link to="/login" className="text-primary hover:underline text-sm block">Back to sign in →</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 mt-6">
            <div>
              <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">Email address</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1 h-11" />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 btn-primary-gradient">
              {loading ? "Sending..." : "Send reset link →"}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground mt-6">
          Remembered it? <Link to="/login" className="text-primary hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}