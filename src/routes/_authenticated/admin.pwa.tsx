import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Smartphone, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/pwa")({
  head: () => ({ meta: [{ title: "PWA Settings — Admin" }] }),
  component: AdminPwaPage,
});

function AdminPwaPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(true);
  const [loadingSetting, setLoadingSetting] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("Admin access required");
      navigate({ to: "/dashboard", replace: true });
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "ios_pwa_prompt")
        .maybeSingle();
      setEnabled((data?.value as any)?.enabled !== false);
      setLoadingSetting(false);
    })();
  }, [isAdmin]);

  const toggle = async (next: boolean) => {
    setSaving(true);
    setEnabled(next);
    const { error } = await supabase
      .from("app_settings")
      .upsert(
        { key: "ios_pwa_prompt", value: { enabled: next }, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    setSaving(false);
    if (error) {
      toast.error(error.message);
      setEnabled(!next);
    } else {
      toast.success(next ? "iOS install prompt enabled" : "iOS install prompt disabled");
    }
  };

  if (loading || !isAdmin) return <div className="text-muted-foreground">Checking access…</div>;

  return (
    <div className="space-y-6 animate-float-up">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">PWA Settings</h1>
        <p className="text-muted-foreground mt-1">Control how mobile users install CashBullX.</p>
      </header>

      <Card className="glass-strong border-amber-400/30 p-6 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-amber-600 text-black">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <Label htmlFor="ios-prompt" className="text-base font-semibold">
                iOS "Add to Home Screen" Banner
              </Label>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                When ON, iPhone/iPad users on Safari see the custom installation guide automatically.
                Turn OFF to hide the banner site-wide.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            {(loadingSetting || saving) && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            <Switch
              id="ios-prompt"
              checked={enabled}
              disabled={loadingSetting || saving}
              onCheckedChange={toggle}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}