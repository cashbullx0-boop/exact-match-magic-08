import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Mail, Phone, ShieldCheck, Clock } from "lucide-react";
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
  const [step, setStep] = useState<"email" | "phone">("email");
  const [emailCode, setEmailCode] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const reset = () => {
    setStep("email"); setEmailCode(""); setPhoneCode("");
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
    toast.success(
      `OTP sent to your email and phone${data ? ` (demo code: ${data})` : ""}`,
      { duration: 8000 },
    );
  };

  useEffect(() => { if (open && !expiresAt) sendOtp(); /* eslint-disable-next-line */ }, [open]);

  const verifyStep = async () => {
    const code = step === "email" ? emailCode : phoneCode;
    if (code.length !== 6) { toast.error("Enter the 6-digit code"); return; }
    if (remaining <= 0) { toast.error("OTP expired. Resend a new code."); return; }
    setVerifying(true);
    const { data, error } = await supabase.rpc("verify_withdrawal_otp", {
      _user_id: userId, _otp: code, _type: step,
    });
    setVerifying(false);
    if (error || !data) { toast.error(error?.message ?? "Invalid code"); return; }
    if (step === "email") { toast.success("Email verified — now verify phone"); setStep("phone"); }
    else {
      toast.success("Both verified — submitting withdrawal");
      onOpenChange(false);
      onVerified();
    }
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
            Two-step OTP verification. Both codes expire in 10 minutes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between text-xs">
          <div className={`flex items-center gap-1.5 ${step === "email" ? "text-primary" : "text-accent"}`}>
            <Mail className="h-3.5 w-3.5" /> Email {step !== "email" && "✓"}
          </div>
          <div className="h-px flex-1 mx-3 bg-border" />
          <div className={`flex items-center gap-1.5 ${step === "phone" ? "text-primary" : "text-muted-foreground"}`}>
            <Phone className="h-3.5 w-3.5" /> Phone
          </div>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs flex items-center justify-between">
          <span className="text-muted-foreground">
            Sent to <span className="text-foreground font-medium">{step === "email" ? mask(email) : mask(phone) || "your phone"}</span>
          </span>
          <span className="flex items-center gap-1 text-primary font-mono">
            <Clock className="h-3.5 w-3.5" /> {mm}:{ss}
          </span>
        </div>

        <div className="flex justify-center py-2">
          <InputOTP
            maxLength={6}
            value={step === "email" ? emailCode : phoneCode}
            onChange={(v) => step === "email" ? setEmailCode(v) : setPhoneCode(v)}
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
            {verifying ? "Verifying…" : step === "email" ? "Verify email →" : "Verify phone & submit →"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}