import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Users, Gift, Download, TrendingUp, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { Trophy, Flame, Sparkles } from "lucide-react";

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
  const [challenge, setChallenge] = useState<{
    total_direct_last_7d: number;
    deposited_last_7d: number;
    target: number;
    reward_cents: number;
    last_claim_at: string | null;
    next_eligible_at: string | null;
    can_claim: boolean;
  } | null>(null);
  const [claiming, setClaiming] = useState(false);

  const loadChallenge = async () => {
    const { data } = await supabase.rpc("get_weekly_referral_challenge");
    const row = Array.isArray(data) ? data[0] : data;
    if (row) setChallenge(row as any);
  };

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
    loadChallenge();
  }, [user]);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const totalEarned = refs.reduce((s, r) => s + (r.bonus_cents ?? 0), 0);
  const activeCount = refs.filter((r) => referredProfiles[r.referred_id]?.status === "active").length;

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

      {/* Weekly Referral Challenge */}
      {challenge && (
        <Card className="relative overflow-hidden border-0 p-0">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-fuchsia-500/15 to-primary/25" />
          <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-amber-400/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-fuchsia-500/25 blur-3xl" />
          <div className="relative p-6 md:p-7">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-400 to-fuchsia-500 grid place-items-center shadow-lg shadow-amber-500/30">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-amber-400" />
                    <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-amber-300">Weekly Challenge</span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold mt-1">Bring 10 depositing referrals · win <span className="brand-text">$50</span></h2>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1 max-w-lg">
                    Refer 10 friends in any 7-day window who each make a deposit — instant $50 bonus, auto-credited. Resets weekly. 🚀
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex flex-col items-start md:items-end gap-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Reward</span>
                <span className="text-3xl md:text-4xl font-black bg-gradient-to-r from-amber-300 to-fuchsia-400 bg-clip-text text-transparent">
                  +${(challenge.reward_cents / 100).toFixed(0)}
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  <span className="font-bold text-foreground">{challenge.deposited_last_7d}</span> / {challenge.target} depositing referrals · last 7 days
                </span>
                <span className="text-muted-foreground">
                  {challenge.total_direct_last_7d} signed up
                </span>
              </div>
              <div className="relative h-3 rounded-full bg-black/40 overflow-hidden ring-1 ring-white/10">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400 via-fuchsia-500 to-primary transition-all duration-700"
                  style={{ width: `${Math.min(100, (challenge.deposited_last_7d / challenge.target) * 100)}%` }}
                />
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="absolute inset-y-0 w-px bg-black/40" style={{ left: `${(i + 1) * 10}%` }} />
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
              {challenge.can_claim ? (
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-amber-400 to-fuchsia-500 hover:from-amber-300 hover:to-fuchsia-400 text-black font-bold shadow-lg shadow-amber-500/30 animate-pulse"
                  disabled={claiming}
                  onClick={async () => {
                    setClaiming(true);
                    const { data, error } = await supabase.rpc("claim_weekly_referral_bonus");
                    setClaiming(false);
                    if (error) { toast.error(error.message); return; }
                    if (data === true) {
                      toast.success("🎉 $50 credited to your wallet!");
                      loadChallenge();
                    } else {
                      toast.info("Not eligible yet — keep referring!");
                    }
                  }}
                >
                  <Sparkles className="h-4 w-4 mr-2" /> Claim $50 now
                </Button>
              ) : challenge.deposited_last_7d >= challenge.target ? (
                <div className="text-xs text-amber-300 flex items-center gap-2">
                  <Trophy className="h-4 w-4" /> Reward already claimed this week — next eligible {challenge.next_eligible_at ? new Date(challenge.next_eligible_at).toLocaleDateString() : "soon"}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  {challenge.target - challenge.deposited_last_7d} more depositing referrals to unlock the reward
                </div>
              )}
              <Button variant="outline" size="lg" onClick={() => link && copy(link)} disabled={!link}>
                <UserPlus className="h-4 w-4 mr-2" /> Share invite link
              </Button>
            </div>
          </div>
        </Card>
      )}

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