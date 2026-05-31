import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, ListChecks, Wallet, Users, Shield, LogOut, Menu, X, Trophy, Bell, Award, User as UserIcon, LifeBuoy, Sparkles, ArrowDownToLine, Crown, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FloatingSupport } from "@/components/dashboard/floating-support";
import { LiveNotificationPopup } from "@/components/dashboard/live-notification-popup";
import { DotsLoader } from "@/components/dashboard/dots-loader";
import { VipBadge } from "@/components/dashboard/vip-badge";

export const Route = createFileRoute("/_authenticated")({
  component: AuthedLayout,
});

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/offerwall", label: "Offerwall", icon: Sparkles },
  { to: "/levels", label: "Levels", icon: Crown },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/achievements", label: "Achievements", icon: Award },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/deposit", label: "Deposit", icon: ArrowDownToLine },
  { to: "/referrals", label: "Referrals", icon: Users },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profile", icon: UserIcon },
  { to: "/kyc", label: "KYC", icon: ShieldCheck },
  { to: "/support", label: "Support", icon: LifeBuoy },
] as const;

function AuthedLayout() {
  const { user, loading, isAdmin, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = () => supabase.from("notifications").select("*", { count: "exact", head: true })
      .eq("user_id", user.id).eq("read", false).then(({ count }) => setUnread(count ?? 0));
    load();
    const ch = supabase.channel(`notif:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <DotsLoader label="Loading your dashboard" />
      </div>
    );
  }

  const SidebarInner = () => (
    <>
      <Link to="/dashboard" className="text-xl font-bold brand-text px-2 py-4 block">CashBullX</Link>
      <div className="flex items-center gap-3 px-2 pb-4 mb-2 border-b border-border">
        <Avatar className="h-10 w-10 ring-2 ring-primary/30">
          <AvatarImage src={profile?.avatar_url ?? undefined} />
          <AvatarFallback className="bg-primary/20 text-primary text-sm">
            {(profile?.full_name ?? user.email ?? "U").slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{profile?.full_name ?? "User"}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <VipBadge totalCents={profile?.total_earned_cents ?? 0} />
            <span className="text-[10px] text-muted-foreground">{profile?.xp ?? 0} XP</span>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {navItems.map((i) => {
          const active = pathname === i.to;
          const isNotif = i.to === "/notifications";
          return (
            <Link key={i.to} to={i.to} onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all hover:translate-x-0.5 ${active ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px] shadow-primary/20" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}>
              <i.icon className="h-4 w-4" />
              <span className="flex-1">{i.label}</span>
              {isNotif && unread > 0 && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground">{unread}</span>
              )}
            </Link>
          );
        })}
        {isAdmin && (
          <>
            <Link to="/admin" onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${pathname === "/admin" ? "bg-accent/15 text-accent" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}>
              <Shield className="h-4 w-4" />Admin
            </Link>
            <Link to="/admin/kyc" onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${pathname === "/admin/kyc" ? "bg-accent/15 text-accent" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}>
              <ShieldCheck className="h-4 w-4" />KYC Review
            </Link>
          </>
        )}
      </nav>
      <div className="border-t border-border pt-4 mt-4">
        <div className="px-2 py-2">
          <p className="text-sm font-medium truncate">{profile?.full_name ?? user.email}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start text-muted-foreground">
          <LogOut className="h-4 w-4 mr-2" />Sign out
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex w-full max-w-full overflow-x-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col p-4 glass-strong border-r border-border">
        <SidebarInner />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 glass-strong border-b border-border px-4 py-3 flex items-center justify-between max-w-full">
        <Link to="/dashboard" className="text-lg font-bold brand-text">CashBullX</Link>
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></Button>
      </div>

      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[85vw] max-w-xs p-4 glass-strong border-r border-border flex flex-col overflow-y-auto animate-float-up">
            <div className="flex justify-end"><Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="h-5 w-5" /></Button></div>
            <SidebarInner />
          </aside>
        </div>
      )}

      <main className="flex-1 min-w-0 max-w-full overflow-x-hidden px-4 sm:px-6 md:px-8 py-6 md:py-10 pt-20 md:pt-10 pb-24 md:pb-10">
        <Outlet />
      </main>

      <LiveNotificationPopup />
      <FloatingSupport />

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass-strong border-t border-border px-2 py-2 flex items-center justify-around max-w-full">
        {[
          { to: "/dashboard", label: "Home", icon: LayoutDashboard },
          { to: "/tasks", label: "Tasks", icon: ListChecks },
          { to: "/levels", label: "Levels", icon: Crown },
          { to: "/wallet", label: "Wallet", icon: Wallet },
          { to: "/profile", label: "Me", icon: UserIcon },
        ].map((i) => {
          const active = pathname === i.to;
          return (
            <Link key={i.to} to={i.to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
              <i.icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
              <span>{i.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}