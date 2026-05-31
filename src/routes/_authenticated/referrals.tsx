import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Users, Gift, Download, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { QRCodeCanvas } from "qrcode.react";

export const Route = createFileRoute("/_authenticated/referrals")({
  head: () => ({ meta: [{ title: "Referrals — CashBullX" }] }),
  component: ReferralsPage,
});

function ReferralsPage() {
  const { user, profile } = useAuth();
  const [refs, setRefs] = useState<any[]>([]);
  const [referredProfiles, setReferredProfiles] = useState<Record<string, { full_name: string | null; username: string | null; avatar_url: string | null; status: string }>>({});
  const qrRef = useRef<HTMLDivElement | null>(null);

  const slug = profile?.username || profile?.referral_code || "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = useMemo(() => (slug ? `${origin}/ref/${slug}` : ""), [origin, slug]);

  useEffect(() => {
    if (!user) return;
    supabase.from("referrals").select("*").eq("referrer_id", user.id).order("created_at", { ascending: false }).then(async ({ data }) => {
      const rows = data ?? [];
      setRefs(rows);
      const ids = Array.from(new Set(rows.map((r) => r.referred_id)));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name, username, avatar_url, status").in("id", ids);
        const map: Record<string, any> = {};
        (profs ?? []).forEach((p) => { map[p.id] = p; });
        setReferredProfiles(map);
      }
    });
  }, [user]);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const totalEarned = refs.reduce((s, r) => s + (r.bonus_cents ?? 0), 0);
  const activeCount = refs.filter((r) => referredProfiles[r.referred_id]?.status === "active").length;

  const downloadQR = () => {
    const canvas = qrRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `cashbullx-referral-${slug || "qr"}.png`;
    a.click();
    toast.success("QR code downloaded");
  };

  return (
    <div className="space-y-6 animate-float-up">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">Refer & earn</h1>
        <p className="text-muted-foreground mt-1">Invite friends with your code. You both win.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-strong border-border p-5">
          <Users className="h-5 w-5 text-primary" />
          <p className="text-xs uppercase tracking-wider text-muted-foreground mt-3">Total referrals</p>
          <p className="text-3xl font-bold mt-2">{refs.length}</p>
        </Card>
        <Card className="glass-strong border-border p-5">
          <TrendingUp className="h-5 w-5 text-primary" />
          <p className="text-xs uppercase tracking-wider text-muted-foreground mt-3">Active referrals</p>
          <p className="text-3xl font-bold mt-2">{activeCount}</p>
        </Card>
        <Card className="glass-strong border-border p-5">
          <Gift className="h-5 w-5 text-accent" />
          <p className="text-xs uppercase tracking-wider text-muted-foreground mt-3">Total earnings</p>
          <p className="text-3xl font-bold mt-2 brand-text">${(totalEarned / 100).toFixed(2)}</p>
        </Card>
        <Card className="glass-strong border-border p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Your code</p>
          <div className="flex items-center gap-2 mt-2">
            <code className="text-2xl font-bold tracking-widest">{profile?.referral_code ?? "—"}</code>
            <Button variant="ghost" size="icon" onClick={() => profile && copy(profile.referral_code)}><Copy className="h-4 w-4" /></Button>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="glass-strong border-border p-6 lg:col-span-2">
          <h2 className="font-semibold">Your referral link</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Share this link. When a friend signs up, you'll get a bonus credited to your wallet.
            {!profile?.username && (
              <> Tip: <Link to="/profile" className="text-primary hover:underline">set a username</Link> for a cleaner link.</>
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <Input readOnly value={link} className="h-11 font-mono text-sm" />
            <Button onClick={() => copy(link)} className="btn-primary-gradient h-11 shrink-0"><Copy className="h-4 w-4 mr-1" />Copy link</Button>
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            Or share your code: <code className="font-mono text-foreground">{profile?.referral_code ?? "—"}</code>
          </div>
        </Card>

        <Card className="glass-strong border-border p-6 flex flex-col items-center text-center">
          <h2 className="font-semibold mb-3">Scan to join</h2>
          <div ref={qrRef} className="rounded-xl bg-white p-3">
            {link ? (
              <QRCodeCanvas value={link} size={160} bgColor="#ffffff" fgColor="#0a0a0a" level="M" includeMargin={false} />
            ) : (
              <div className="h-[160px] w-[160px] grid place-items-center text-xs text-muted-foreground">—</div>
            )}
          </div>
          <Button onClick={downloadQR} variant="outline" size="sm" className="mt-4" disabled={!link}>
            <Download className="h-4 w-4 mr-1" /> Download QR
          </Button>
        </Card>
      </div>

      <Card className="glass-strong border-border p-6">
        <h2 className="font-semibold mb-4">Referred users</h2>
        {refs.length === 0 ? (
          <p className="text-sm text-muted-foreground">You haven't referred anyone yet. Share your link to start earning.</p>
        ) : (
          <ul className="divide-y divide-border">
            {refs.map((r) => {
              const p = referredProfiles[r.referred_id];
              const name = p?.full_name || (p?.username ? `@${p.username}` : `${r.referred_id.slice(0, 8)}…`);
              const active = p?.status === "active";
              return (
                <li key={r.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${active ? "border-primary/40 text-primary bg-primary/10" : "border-border text-muted-foreground"}`}>
                    {active ? "Active" : "Pending"}
                  </span>
                  <span className="text-sm font-semibold text-accent">+${(r.bonus_cents / 100).toFixed(2)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}