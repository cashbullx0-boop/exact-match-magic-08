import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, ListChecks, Wallet, Users, Shield, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthedLayout,
});

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/referrals", label: "Referrals", icon: Users },
] as const;

function AuthedLayout() {
  const { user, loading, isAdmin, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  const SidebarInner = () => (
    <>
      <Link to="/dashboard" className="text-xl font-bold brand-text px-2 py-4 block">CashBullX</Link>
      <nav className="flex-1 space-y-1">
        {navItems.map((i) => {
          const active = pathname === i.to;
          return (
            <Link key={i.to} to={i.to} onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}>
              <i.icon className="h-4 w-4" />{i.label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link to="/admin" onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${pathname === "/admin" ? "bg-accent/15 text-accent" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}>
            <Shield className="h-4 w-4" />Admin
          </Link>
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
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col p-4 glass-strong border-r border-border">
        <SidebarInner />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 glass-strong border-b border-border px-4 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="text-lg font-bold brand-text">CashBullX</Link>
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></Button>
      </div>

      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 p-4 glass-strong border-r border-border flex flex-col">
            <div className="flex justify-end"><Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="h-5 w-5" /></Button></div>
            <SidebarInner />
          </aside>
        </div>
      )}

      <main className="flex-1 px-4 md:px-8 py-6 md:py-10 pt-20 md:pt-10">
        <Outlet />
      </main>
    </div>
  );
}