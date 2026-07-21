import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/maintenance")({
  head: () => ({ meta: [{ title: "Maintenance Mode — Admin — CashBullX" }] }),
  component: AdminMaintenancePage,
});

function AdminMaintenancePage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_maintenance_status");
    if (!error) setEnabled(!!data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async () => {
    setSaving(true);
    const next = !enabled;
    const { error } = await supabase.rpc("set_maintenance_mode", { _enabled: next });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEnabled(next);
    toast.success(next ? "Maintenance mode turned ON" : "Maintenance mode turned OFF");
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        You don't have access to this page.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-float-up max-w-2xl">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-amber-400" /> Maintenance Mode
        </h1>
        <p className="text-muted-foreground mt-1">
          Temporarily pause deposits, withdrawals, trades, spins and tasks site-wide.
        </p>
      </header>

      <Card className="glass-strong border-border p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold flex items-center gap-2">
              {enabled ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <span className="text-red-300">Maintenance mode is ON</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 text-accent" />
                  <span>Site is running normally</span>
                </>
              )}
            </p>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              {enabled
                ? "All non-admin users are currently blocked from making deposits, withdrawals, opening trades, spinning, or completing tasks. A red banner is shown across the site."
                : "All features are active for everyone. Turn this on before performing updates that require pausing money movement."}
            </p>
          </div>
          <Button
            onClick={toggle}
            disabled={saving}
            className={enabled ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground shrink-0" : "btn-primary-gradient shrink-0"}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {enabled ? "Turn OFF" : "Turn ON"}
          </Button>
        </div>
      </Card>

      <p className="text-xs text-muted-foreground">
        Note: admins are never blocked — you can still test deposits, withdrawals, trades, spins and tasks while maintenance mode is active.
      </p>
    </div>
  );
}
