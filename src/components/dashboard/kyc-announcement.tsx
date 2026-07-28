import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowRight, AlertTriangle } from "lucide-react";

export function KycAnnouncement({ status }: { status: "unverified" | "pending" | "verified" | "rejected" | null }) {
  if (status === "verified") return null;

  const isPending = status === "pending";
  const isRejected = status === "rejected";
  const title = isPending
    ? "KYC verification is under review"
    : isRejected
      ? "KYC rejected — action required"
      : "KYC verification required";

  return (
    <Card className="relative overflow-hidden border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent p-5 md:p-6">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <AlertTriangle className="h-24 w-24 text-amber-400" />
      </div>
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="shrink-0 w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
          <ShieldAlert className="h-6 w-6 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-amber-100 text-base md:text-lg">{title}</h3>
          <p className="text-sm text-amber-100/80 mt-1 leading-relaxed">
            KYC is very important. If your KYC is not approved, you will not receive any reward, referral commission, or any reward.
          </p>
        </div>
        <div className="shrink-0">
          {isPending ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Under review
            </span>
          ) : (
            <Link to="/kyc">
              <Button className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-semibold gap-2 group">
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
