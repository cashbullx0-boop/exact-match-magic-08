import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import logoAsset from "@/assets/cashbullx-logo.png.asset.json";

const NAV = [
  { label: "Features", href: "#features" },
  { label: "Tasks", href: "#tasks" },
  { label: "Reviews", href: "#reviews" },
  { label: "FAQ", to: "/faq" as const },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-40 transition-all duration-300 ${scrolled ? "bg-black/60 backdrop-blur-2xl border-b border-border/60" : "bg-transparent"}`}>
      <div className="container mx-auto flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 max-w-full">
        <Link to="/" className="flex items-center gap-1.5 group" aria-label="CashBullX home">
          <img
            src={logoAsset.url}
            alt=""
            aria-hidden="true"
            className="h-9 sm:h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            style={{ filter: "drop-shadow(0 0 6px rgba(245, 158, 11, 0.7)) drop-shadow(0 0 14px rgba(245, 158, 11, 0.4))" }}
          />
          <span className="font-extrabold tracking-tight text-lg sm:text-xl leading-none flex items-baseline">
            <span style={{ color: "#F59E0B" }}>CASH</span>
            <span className="text-white">BULL</span>
            <span
              style={{
                color: "#FFD24A",
                textShadow: "0 0 8px rgba(245,158,11,0.9), 0 0 18px rgba(245,158,11,0.55)",
              }}
            >
              X
            </span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((n) => (
            n.to ? (
              <Link key={n.label} to={n.to} className="px-3 py-2 text-sm text-foreground/80 hover:text-primary transition">
                {n.label}
              </Link>
            ) : (
              <a key={n.label} href={n.href} className="px-3 py-2 text-sm text-foreground/80 hover:text-primary transition">
                {n.label}
              </a>
            )
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-2">
          <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link to="/signup"><Button size="sm" className="btn-primary-gradient">Get started →</Button></Link>
        </div>
        <button onClick={() => setOpen(!open)} aria-label="Toggle menu" className="md:hidden inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md hover:bg-white/5">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-border/60 bg-black/80 backdrop-blur-2xl animate-float-up">
          <div className="container mx-auto px-6 py-4 flex flex-col gap-1">
            {NAV.map((n) => (
              n.to ? (
                <Link key={n.label} to={n.to} onClick={() => setOpen(false)} className="py-2 text-sm text-foreground/80">
                  {n.label}
                </Link>
              ) : (
                <a key={n.label} href={n.href} onClick={() => setOpen(false)} className="py-2 text-sm text-foreground/80">
                  {n.label}
                </a>
              )
            ))}
            <div className="flex gap-2 pt-3">
              <Link to="/login" className="flex-1"><Button variant="outline" className="w-full">Sign in</Button></Link>
              <Link to="/signup" className="flex-1"><Button className="w-full btn-primary-gradient">Get started</Button></Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}