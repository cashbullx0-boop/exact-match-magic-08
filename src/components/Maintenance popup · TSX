import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";

/**
 * Non-dismissible maintenance popup.
 * No backend/Supabase calls — pure static UI so it always works,
 * even while auth/deposits are down.
 *
 * Usage: render <MaintenancePopup /> at the top of the page/layout
 * where you want it to appear (e.g. login page, dashboard layout).
 */
export function MaintenancePopup() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <Card className="glass-strong border-amber-500/40 max-w-md w-full p-8 text-center space-y-5">
        <div className="mx-auto h-16 w-16 rounded-full bg-amber-500/15 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-amber-300">
            Under Maintenance
          </h1>
          <p className="text-sm text-muted-foreground">
            Due to some technical issue, the website is currently under maintenance.
            We're working to resolve it as quickly as possible.
          </p>
          <p className="text-xs text-muted-foreground/80">
            Your balance and account data are safe. Please check back shortly.
          </p>
        </div>
      </Card>
    </div>
  );
}
