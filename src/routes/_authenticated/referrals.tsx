import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Users, Gift, Download, TrendingUp, UserPlus, Wallet as WalletIcon, ArrowDownToLine } from "lucide-react";
import { toast } from "sonner";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";

const BONUS_PERCENT = 10;

type DownlineRow = {
  slot: number;
  referred_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  country: string | null;
  balance_cents: number | null;
  total_deposit_cents: number | null;
  joined_at: string;
  status: string | null;
  bonus_cents: number | null;
};

function countryFlag(code: string | null | undefined) {
  if (!code) return "🌐";
  const c = code.trim().toUpperCase();
  if (c.length !== 2 || !/^[A-Z]{2}$/.test(c)) return "🌐";
  return String.fromCodePoint(...c.split("").map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

export const Route = createFileRoute("/_authenticated/referrals")({
  head: () => ({ meta: [{ title: "Referrals — CashBullX" }] }),
  component: ReferralsPage,
});

function ReferralsPage() {
  const { user, profile } = useAuth();
  const [refs, setRefs] = useState<any[]>([]);
  const [referredProfiles, setReferredProfiles] = useState<Record<string, { full_name: string | null; username: string | null; avatar_url: string | null; status: string }>>({});
  const [downline, setDownline] = useState<DownlineRow[]>([]);
  const qrRef = useRef<HTMLDivElement | null>(null);

  const slug = profile?.username || profile?.referral_code || user?.id || "";
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);
  const link = useMemo(() => (slug && origin ? `${origin}/ref/${slug}` : ""), [origin, slug]);

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
    supabase.rpc("get_my_downline").then(({ data }) => {
      setDownline(((data ?? []) as DownlineRow[]).sort((a, b) => a.slot - b.slot));
    });
  }, [user]);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const totalEarned = refs.reduce((s, r) => s + (r.bonus_cents ?? 0), 0);
  const activeCount = refs.filter((r) => referredProfiles[r.referred_id]?.status === "active").length;

  const downlineDepositCents = downline.reduce((s, d) => s + Number(d.total_deposit_cents ?? 0), 0);
  const downlineBalanceCents = downline.reduce((s, d) => s + Number(d.balance_cents ?? 0), 0);
  const downlineEarningsCents = Math.round((downlineDepositCents * BONUS_PERCENT) / 100);
  const slotsFilled = downline.length;
  const slots: (DownlineRow | null)[] = Array.from({ length: 6 }, (_, i) => downline.find((d) => d.slot === i + 1) ?? null);

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
          <div ref={qrRef} className="rounded-xl bg-white p-4 inline-block">
            {link ? (
              <>
                {/* Visible SVG QR — reliable rendering across browsers */}
                <QRCodeSVG
                  value={link}
                  size={180}
                  bgColor="#ffffff"
                  fgColor="#0a0a0a"
                  level="M"
                  marginSize={2}
                />
                {/* Hidden canvas used for PNG download */}
                <QRCodeCanvas
                  value={link}
                  size={512}
                  bgColor="#ffffff"
                  fgColor="#0a0a0a"
                  level="M"
                  marginSize={2}
                  style={{ display: "none" }}
                />
              </>
            ) : (
              <div className="h-[180px] w-[180px] grid place-items-center text-xs text-muted-foreground">Loading…</div>
            )}
          </div>
          <Button onClick={downloadQR} variant="outline" size="sm" className="mt-4" disabled={!link}>
            <Download className="h-4 w-4 mr-1" /> Download QR
          </Button>
        </Card>
      </div>

      <Card className="glass-strong border-border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Your downline · {slotsFilled}/6</h2>
            <p className="text-xs text-muted-foreground mt-1">Earn <span className="text-primary font-semibold">{BONUS_PERCENT}%</span> on every deposit your first 6 direct referrals make.</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-4">
          {[
            { label: "Downline members", value: `${slotsFilled}/6`, icon: Users, accent: "text-primary" },
            { label: "Downline deposits", value: `$${(downlineDepositCents / 100).toFixed(2)}`, icon: ArrowDownToLine, accent: "text-primary" },
            { label: "Downline balance", value: `$${(downlineBalanceCents / 100).toFixed(2)}`, icon: WalletIcon, accent: "text-foreground" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground"><s.icon className={`h-3.5 w-3.5 ${s.accent}`} /> {s.label}</div>
              <p className="text-xl font-bold mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Gift className="h-4 w-4 text-accent" />
            Your downline earnings ({BONUS_PERCENT}% of deposits)
          </div>
          <p className="text-2xl font-bold brand-text">${(downlineEarningsCents / 100).toFixed(2)}</p>
        </div>

        <ul className="mt-5 space-y-2">
          {slots.map((d, i) => {
            const slotNum = i + 1;
            if (!d) {
              return (
                <li key={`empty-${slotNum}`} className="rounded-xl border border-dashed border-border/70 p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-muted/30 grid place-items-center text-muted-foreground text-xs font-bold">{slotNum}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Empty slot</p>
                      <p className="text-xs text-muted-foreground">Invite a friend to fill slot {slotNum}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => link && copy(link)} disabled={!link}>
                    <UserPlus className="h-4 w-4 mr-1" /> Invite
                  </Button>
                </li>
              );
            }
            const name = d.full_name || (d.username ? `@${d.username}` : `${d.referred_id.slice(0, 8)}…`);
            const isActive = d.status === "active";
            const memberBonus = Math.round((Number(d.total_deposit_cents ?? 0) * BONUS_PERCENT) / 100);
            return (
              <li key={d.referred_id} className="rounded-xl border border-border bg-white/[0.02] p-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-10 w-10 rounded-full bg-primary/15 text-primary grid place-items-center text-xs font-bold ring-1 ring-primary/30">{slotNum}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate flex items-center gap-1.5">
                      <span className="text-base leading-none">{countryFlag(d.country)}</span>
                      <span className="truncate">{name}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">Joined {new Date(d.joined_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Balance</span>
                  <span className="text-sm font-semibold">${((d.balance_cents ?? 0) / 100).toFixed(2)}</span>
                </div>
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Deposits</span>
                  <span className="text-sm font-semibold">${(Number(d.total_deposit_cents ?? 0) / 100).toFixed(2)}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Your bonus</span>
                  <span className="text-sm font-semibold text-accent">+${(memberBonus / 100).toFixed(2)}</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${isActive ? "border-primary/40 text-primary bg-primary/10" : "border-border text-muted-foreground"}`}>
                  {isActive ? "Active" : "Inactive"}
                </span>
                <div className="w-full sm:hidden flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50 mt-1">
                  <span>Balance ${((d.balance_cents ?? 0) / 100).toFixed(2)}</span>
                  <span>Deposits ${(Number(d.total_deposit_cents ?? 0) / 100).toFixed(2)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="glass-strong border-border p-6">
        <h2 className="font-semibold mb-4">All referred users</h2>
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