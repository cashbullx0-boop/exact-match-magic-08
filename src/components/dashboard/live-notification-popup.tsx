import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Notif = { id: string; title: string; body: string | null; type: string; link: string | null };

export function LiveNotificationPopup() {
  const { user } = useAuth();
  const [notif, setNotif] = useState<Notif | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif-pop:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Notif;
          setNotif(n);
          if (timer.current) window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setNotif(null), 6500);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [user]);

  if (!notif) return null;

  return (
    <div className="fixed top-20 md:top-6 right-4 md:right-6 z-[60] w-[min(360px,calc(100vw-2rem))] animate-float-up">
      <div className="glass-strong border border-primary/30 rounded-2xl p-4 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full opacity-30 blur-2xl"
             style={{ background: "var(--gradient-primary)" }} />
        <div className="flex items-start gap-3 relative">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
               style={{ background: "var(--gradient-primary)" }}>
            <Bell className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{notif.title}</p>
            {notif.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>}
            <Link
              to={notif.link ?? "/notifications"}
              onClick={() => setNotif(null)}
              className="inline-block mt-2 text-xs font-medium text-primary hover:underline"
            >
              View details →
            </Link>
          </div>
          <button
            onClick={() => setNotif(null)}
            className="text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
