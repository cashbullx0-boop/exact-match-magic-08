import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Mail, ShieldCheck, Clock } from "lucide-react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  email?: string | null;
  phone?: string | null;
  onVerified: () => void;
};

export function WithdrawOtpModal({ open, onOpenChange, userId, email, phone, onVerified }: Props) {
  const [emailCode, setEmailCode] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const reset = () => {
    setEmailCode("");
    setExpiresAt(null); setRemaining(0);
  };

  useEffect(() => { if (!open) reset(); }, [open]);

  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => {
      const s = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setRemaining(s);
      if (s <= 0) clearInterval(t);
    }, 500);
    return () => clearInterval(t);
  }, [expiresAt]);

  const sendOtp = async () => {
    setSending(true);
    const { data, error } = await supabase.rpc("generate_withdrawal_otp", { _user_id: userId });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setExpiresAt(Date.now() + 10 * 60 * 1000);

    // Fire-and-forget the actual email delivery via Lovable Emails.
    if (data && email) {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        const res = await fetch("/lovable/email/transactional/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            templateName: "withdrawal-otp",
            recipientEmail: email,
            idempotencyKey: `withdrawal-otp-${userId}-${Date.now()}`,
            templateData: { otp: data, siteName: "CashBullX" },
          }),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          console.error("Failed to send withdrawal OTP email", res.status, body);
        }
      } catch (err) {
        console.error("Failed to send withdrawal OTP email", err);
      }
    }

    toast.success(`OTP sent to ${email ?? "your email"}`, { duration: 6000 });
  };

  useEffect(() => { if (open && !expiresAt) sendOtp(); /* eslint-disable-next-line */ }, [open]);

  const verifyStep = async () => {
    const code = emailCode;
    if (code.length !== 6) { toast.error("Enter the 6-digit code"); return; }
    if (remaining <= 0) { toast.error("OTP expired. Resend a new code."); return; }
    setVerifying(true);
    const { data, error } = await supabase.rpc("verify_withdrawal_otp", {
      _user_id: userId, _otp: code, _type: "email",
    });
    setVerifying(false);
    if (error || !data) { toast.error(error?.message ?? "Invalid code"); return; }
    toast.success("Email verified — submitting withdrawal");
    onOpenChange(false);
    onVerified();
  };

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const mask = (v?: string | null) => v ? v.replace(/(.{2}).+(.{3})/, "$1•••$2") : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-strong border-primary/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 brand-text">
            <ShieldCheck className="h-5 w-5 text-primary" /> Verify withdrawal
          </DialogTitle>
          <DialogDescription>
            Email OTP verification. Code expires in 10 minutes.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs flex items-center justify-between">
          <span className="text-muted-foreground">
            Sent to <span className="text-foreground font-medium inline-flex items-center gap-1"><Mail className="h-3 w-3" />{mask(email)}</span>
          </span>
          <span className="flex items-center gap-1 text-primary font-mono">
            <Clock className="h-3.5 w-3.5" /> {mm}:{ss}
          </span>
        </div>

        <div className="flex justify-center py-2">
          <InputOTP
            maxLength={6}
            value={emailCode}
            onChange={setEmailCode}
            inputMode="numeric"
          >
            <InputOTPGroup>
              {[0,1,2,3,4,5].map((i) => (
                <InputOTPSlot key={i} index={i} className="h-12 w-10 text-lg bg-white/[0.04] border-primary/30" />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={sendOtp} disabled={sending || remaining > 540}>
            {sending ? "Sending…" : remaining > 540 ? `Resend in ${remaining - 540}s` : "Resend code"}
          </Button>
          <Button onClick={verifyStep} disabled={verifying} className="btn-primary-gradient">
            {verifying ? "Verifying…" : "Verify & submit →"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}