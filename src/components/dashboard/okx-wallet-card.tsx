import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Wallet, Lock, ShieldCheck, Clock } from "lucide-react";
import { toast } from "sonner";

type WalletRequest = {
  id: string;
  new_wallet: string;
  status: string;
  otp_verified: boolean;
  approved_at: string | null;
  requested_at: string;
};

export function OkxWalletCard() {
  const { user, profile, refreshProfile } = useAuth();
  const [address, setAddress] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [req, setReq] = useState<WalletRequest | null>(null);

  const wallet = profile?.okx_wallet ?? null;
  const locked = !!profile?.okx_wallet_locked;

  const loadReq = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("wallet_change_requests")
      .select("id,new_wallet,status,otp_verified,approved_at,requested_at")
      .eq("user_id", user.id)
      .in("status", ["pending", "approved"])
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setReq((data as WalletRequest | null) ?? null);
  };

  useEffect(() => { loadReq(); }, [user?.id]);

  const saveFirst = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("set_okx_wallet", { _address: address.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("OKX wallet saved & locked");
    setAddress("");
    refreshProfile();
  };

  const requestChange = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("request_wallet_change", { _new_wallet: newAddress.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Change request submitted. Admin will review within 48 hours.");
    setNewAddress("");
    loadReq();
  };

  const confirmChange = async () => {
    if (!req) return;
    setBusy(true);
    const { error } = await supabase.rpc("confirm_wallet_change", { _request_id: req.id, _otp: otp });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Wallet updated");
    setOtp("");
    loadReq();
    refreshProfile();
  };

  return (
    <Card className="glass-strong border-border p-6 space-y-4">
      <h2 className="font-semibold flex items-center gap-2">
        <Wallet className="h-4 w-4 text-primary" /> OKX Wallet Address
      </h2>

      {!wallet && !locked && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Set your OKX wallet address (USDT). Once saved, it will be locked for security and can only be changed via an admin-approved request.
          </p>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Wallet address</Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="TRC20 / BEP20 / ERC20 address" />
          <Button onClick={saveFirst} disabled={busy || address.length < 20} className="btn-primary-gradient">
            Save & lock wallet
          </Button>
        </div>
      )}

      {wallet && (
        <div className="space-y-4">
          <div className="rounded-xl bg-white/5 border border-primary/20 p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Current wallet</p>
              <p className="text-sm font-mono break-all text-foreground">{wallet}</p>
            </div>
            <Badge variant="outline" className="border-primary/40 text-primary gap-1 shrink-0">
              <Lock className="h-3 w-3" /> Locked
            </Badge>
          </div>

          {req?.status === "pending" && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-sm">
              <div className="flex items-center gap-2 font-medium text-amber-300">
                <Clock className="h-4 w-4" /> Change request pending
              </div>
              <p className="text-xs text-muted-foreground mt-1 break-all">
                New: <span className="font-mono">{req.new_wallet}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Admin reviews KYC within 48 hours. You will receive an OTP on approval.
              </p>
            </div>
          )}

          {req?.status === "approved" && !req.otp_verified && (
            <div className="rounded-xl bg-primary/10 border border-primary/30 p-3 space-y-3">
              <div className="flex items-center gap-2 font-medium text-primary">
                <ShieldCheck className="h-4 w-4" /> Approved — enter OTP to confirm
              </div>
              <p className="text-xs text-muted-foreground">
                An OTP was sent to your email and phone. Enter it to apply the new wallet.
              </p>
              <Input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                maxLength={6}
                className="tracking-[0.4em] text-center"
              />
              <Button onClick={confirmChange} disabled={busy || otp.length !== 6} className="btn-primary-gradient w-full">
                Confirm wallet change
              </Button>
            </div>
          )}

          {(!req || req.status !== "pending") && !(req?.status === "approved" && !req.otp_verified) && (
            <div className="space-y-3 pt-2 border-t border-border">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Request change</Label>
              <Input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="New wallet address" />
              <Button onClick={requestChange} disabled={busy || newAddress.length < 20} variant="outline" className="w-full">
                Submit change request
              </Button>
              <p className="text-xs text-muted-foreground">
                Admin will review within 48 hours and send an OTP for confirmation.
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}