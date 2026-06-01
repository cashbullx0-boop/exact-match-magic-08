import { Shield, Lock, Zap, Clock, Users, BadgeCheck } from "lucide-react";

const BADGES = [
  { icon: Shield, label: "SSL Secured", description: "End-to-end encryption" },
  { icon: Lock, label: "256-bit Encryption", description: "Bank-grade security" },
  { icon: Zap, label: "Instant USDT Payouts", description: "Withdraw in minutes" },
  { icon: Clock, label: "24/7 Support", description: "Always here to help" },
  { icon: Users, label: "50,000+ Active Members", description: "Global community" },
  { icon: BadgeCheck, label: "Verified Platform", description: "Trusted & audited" },
];

export function TrustBadges() {
  return (
    <section className="py-10 md:py-14 border-y border-border/40">
      <div className="container mx-auto px-4 sm:px-6 max-w-full">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 md:gap-6">
          {BADGES.map((b) => (
            <div
              key={b.label}
              className="flex flex-col items-center text-center gap-2.5 p-4 rounded-2xl transition-colors hover:bg-white/[0.03]"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <b.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{b.label}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{b.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
