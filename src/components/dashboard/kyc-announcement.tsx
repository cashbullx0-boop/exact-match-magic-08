import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowRight, AlertTriangle, X } from "lucide-react";
import { useEffect, useState } from "react";

const LOCAL_STORAGE_KEY = "kyc_alert_dismissed_at";

const REMIND_AFTER_MS = 5 * 60 * 1000;

export function KycAnnouncement({ status }: { status: "unverified" | "pending" | "verified" | "rejected" | null }) {
  const [visible, setVisible] = useState(false);
  const [animate, setAnimate] = useState(true);

  // A remount must not resurrect a banner the user just dismissed, so the
  // dismissal timestamp is read from storage (client-only) before showing.
  useEffect(() => {
    if (status === null || status === "verified") return;
    let dismissedAt = 0;
    try { dismissedAt = Number(localStorage.getItem(LOCAL_STORAGE_KEY) ?? "0"); } catch {}
    if (Date.now() - dismissedAt > REMIND_AFTER_MS) setVisible(true);
  }, [status]);

  useEffect(() => {
    if (status === "verified") return;

    // Re-show the red alert popup every 5 minutes if the user hasn't completed KYC,
    // so it keeps coming back even after dismissal.
    const interval = setInterval(() => {
      const dismissedAt = Number(localStorage.getItem(LOCAL_STORAGE_KEY) ?? "0");
      if (Date.now() - dismissedAt > REMIND_AFTER_MS) {
        setVisible(true);
        setAnimate(true);
        setTimeout(() => setAnimate(false), 600);
      }
    }, 60 * 1000);

    const t = setTimeout(() => setAnimate(false), 600);
    return () => {
      clearInterval(interval);
      clearTimeout(t);
    };
  }, [status]);

  // status === null means the dashboard hasn't finished loading the real KYC
  // status from the database yet. Never render the alert during that gap —
  // otherwise every user (including already-verified ones) briefly sees a
  // "not verified" flash until the real status arrives a moment later.
  if (status === null) return null;

  if (status === "verified" || !visible) return null;

  const isPending = status === "pending";
  const isRejected = status === "rejected";
  const title = isPending
    ? "KYC verification is under review"
    : isRejected
      ? "KYC rejected — action required"
      : "KYC verification required";

  const handleDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, String(Date.now()));
    } catch {}
  };

  return (
    <Card
      className={[
        "relative overflow-hidden border-2 border-destructive/60",
        "bg-gradient-to-r from-destructive/25 via-destructive/15 to-transparent",
        "p-5 md:p-6 shadow-[0_0_40px_-12px_var(--color-destructive)]",
        animate ? "scale-[1.02]" : "scale-100",
        "transition-transform duration-300 ease-out",
      ].join(" ")}
    >
      {/* Pulsing red background ring */}
      <div className="absolute -top-1/2 -right-1/2 h-full w-full animate-pulse opacity-20 pointer-events-none">
        <div className="h-full w-full rounded-full bg-destructive blur-3xl" />
      </div>

      <div className="absolute top-0 right-0 p-4 opacity-10">
        <AlertTriangle className="h-24 w-24 text-destructive" />
      </div>

      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 z-10 p-1 rounded-full text-destructive-foreground/60 hover:text-destructive-foreground hover:bg-destructive/20 transition"
        aria-label="Dismiss alert"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="shrink-0 w-12 h-12 rounded-2xl bg-destructive/20 border border-destructive/50 flex items-center justify-center animate-pulse-dot">
          <ShieldAlert className="h-6 w-6 text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-destructive-foreground text-base md:text-lg">{title}</h3>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground font-bold border border-destructive-foreground/30">
              Alert
            </span>
          </div>
          <p className="text-sm text-destructive-foreground/90 leading-relaxed">
            KYC is very important. If your KYC is not approved, you will not receive any reward, referral commission, or any reward.
          </p>
        </div>
        <div className="shrink-0">
          {isPending ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-destructive/20 text-destructive-foreground border border-destructive/50">
              Under review
            </span>
          ) : (
            <Link to="/kyc">
              <Button className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold gap-2 group shadow-lg shadow-destructive/30">
                Complete KYC
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
