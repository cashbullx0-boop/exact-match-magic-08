import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { LifeBuoy, X, MessageSquare, BookOpen } from "lucide-react";

export function FloatingSupport() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && (
        <div className="fixed bottom-40 md:bottom-28 right-4 md:right-6 z-50 w-72 glass-strong border border-border rounded-2xl p-4 shadow-2xl animate-float-up">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold">Need help?</p>
              <p className="text-[11px] text-muted-foreground">We typically reply in under 1 hour</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="space-y-2">
            <Link to="/support" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl p-3 bg-primary/10 hover:bg-primary/15 transition-colors">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-sm">Open a ticket</span>
            </Link>
            <Link to="/faq" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl p-3 bg-white/5 hover:bg-white/10 transition-colors">
              <BookOpen className="h-4 w-4 text-accent" />
              <span className="text-sm">Browse FAQ</span>
            </Link>
          </div>
        </div>
      )}
      <button
        aria-label="Support"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 h-14 w-14 rounded-full flex items-center justify-center btn-primary-gradient btn-glow shadow-2xl transition-transform hover:scale-110"
      >
        {open ? <X className="h-5 w-5 text-primary-foreground" /> : <LifeBuoy className="h-6 w-6 text-primary-foreground" />}
      </button>
    </>
  );
}
