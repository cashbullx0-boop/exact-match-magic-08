import { Link } from "@tanstack/react-router";
import { Github, Twitter, Send, MessageCircle, Mail } from "lucide-react";

const COLS = [
  {
    title: "Product",
    links: [
      { label: "Home", to: "/" as const },
      { label: "Dashboard", to: "/dashboard" as const },
      { label: "Tasks", to: "/tasks" as const },
      { label: "Wallet", to: "/wallet" as const },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/" as const },
      { label: "Leaderboard", to: "/leaderboard" as const },
      { label: "Achievements", to: "/achievements" as const },
      { label: "Referrals", to: "/referrals" as const },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "FAQ", to: "/faq" as const },
      { label: "Help center", to: "/support" as const },
      { label: "Contact", to: "/support" as const },
      { label: "Status", to: "/" as const },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", to: "/" as const },
      { label: "Terms of Service", to: "/" as const },
      { label: "Cookies", to: "/" as const },
      { label: "Disclaimer", to: "/" as const },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-24 border-t border-border/60 bg-black/30 backdrop-blur-xl">
      <div className="neon-divider" />
      <div className="container mx-auto px-6 py-14">
        <div className="grid gap-10 lg:grid-cols-6">
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="text-2xl font-bold brand-text">CashBullX</Link>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              A modern task-based rewards platform. Complete surveys, watch videos, install apps and unlock offers to earn real rewards — paid out to your wallet.
            </p>
            <div className="flex items-center gap-2 pt-1">
              {[Twitter, Send, MessageCircle, Github, Mail].map((Icon, i) => (
                <a key={i} href="#" className="h-9 w-9 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-primary hover:-translate-y-0.5 transition">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-sm text-foreground/80 hover:text-primary transition">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="neon-divider my-10" />
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} CashBullX. All rights reserved.</div>
          <div>Task-based rewards only. No investment or guaranteed returns.</div>
        </div>
      </div>
    </footer>
  );
}