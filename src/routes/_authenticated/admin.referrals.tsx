import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, Gift, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/referrals")({
  head: () => ({ meta: [{ title: "Referrals — Admin" }] }),
  component: AdminReferralsPage,
});

type ProfileLite = { id: string; full_name: string | null; username: string | null; referral_code: string };

function AdminReferralsPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [q, setQ] = useState("");

  useEffect(() => { if (!loading && !isAdmin) navigate({ to: "/dashboard", replace: true }); }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data } = await supabase.from("referrals").select("*").order("created_at", { ascending: false }).limit(500);
      const refs = data ?? [];
      setRows(refs);
      const ids = Array.from(new Set(refs.flatMap((r) => [r.referrer_id, r.referred_id])));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name, username, referral_code").in("id", ids);
        const map: Record<string, ProfileLite> = {};
        (profs ?? []).forEach((p) => { map[p.id] = p as ProfileLite; });
        setProfiles(map);
      }
    })();
  }, [isAdmin]);

  if (loading || !isAdmin) return null;

  const totalBonus = rows.reduce((s, r) => s + (r.bonus_cents ?? 0), 0);
  const uniqueReferrers = new Set(rows.map((r) => r.referrer_id)).size;

  const label = (id: string) => {
    const p = profiles[id];
    if (!p) return id.slice(0, 8) + "…";
    return p.full_name || (p.username ? `@${p.username}` : p.referral_code);
  };

  const term = q.trim().toLowerCase();
  const filtered = term
    ? rows.filter((r) => label(r.referrer_id).toLowerCase().includes(term) || label(r.referred_id).toLowerCase().includes(term))
    : rows;

  return (
    <div className="space-y-6 animate-float-up">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">Referral admin</h1>
        <p className="text-muted-foreground mt-1">All referral relationships and earnings.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="glass-strong border-border p-5">
          <Users className="h-5 w-5 text-primary" />
          <p className="text-xs uppercase tracking-wider text-muted-foreground mt-3">Total referrals</p>
          <p className="text-3xl font-bold mt-2">{rows.length}</p>
        </Card>
        <Card className="glass-strong border-border p-5">
          <TrendingUp className="h-5 w-5 text-primary" />
          <p className="text-xs uppercase tracking-wider text-muted-foreground mt-3">Active referrers</p>
          <p className="text-3xl font-bold mt-2">{uniqueReferrers}</p>
        </Card>
        <Card className="glass-strong border-border p-5">
          <Gift className="h-5 w-5 text-accent" />
          <p className="text-xs uppercase tracking-wider text-muted-foreground mt-3">Bonuses paid</p>
          <p className="text-3xl font-bold mt-2 brand-text">${(totalBonus / 100).toFixed(2)}</p>
        </Card>
      </div>

      <Card className="glass-strong border-border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="font-semibold">All relationships</h2>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, username, code…" className="h-10 max-w-xs" />
        </div>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No referrals match.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4">Referrer</th>
                  <th className="text-left py-2 pr-4">Referred</th>
                  <th className="text-left py-2 pr-4">Date</th>
                  <th className="text-right py-2">Bonus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 pr-4">{label(r.referrer_id)}</td>
                    <td className="py-2 pr-4">{label(r.referred_id)}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="py-2 text-right font-semibold text-accent">+${((r.bonus_cents ?? 0) / 100).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}