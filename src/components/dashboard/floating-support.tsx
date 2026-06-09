import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { LifeBuoy, X, MessageSquare, BookOpen } from "lucide-react";

const FAB_SIZE = 56;
const STORAGE_KEY = "support-fab-pos";

export function FloatingSupport() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const startRef = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p?.x === "number" && typeof p?.y === "number") {
          setPos(clamp(p.x, p.y));
          return;
        }
      }
    } catch {}
    // default: bottom-right, matching previous layout
    const isMobile = window.innerWidth < 768;
    const x = window.innerWidth - FAB_SIZE - (isMobile ? 16 : 24);
    const y = window.innerHeight - FAB_SIZE - (isMobile ? 96 : 24);
    setPos({ x, y });
  }, []);

  function clamp(x: number, y: number) {
    if (typeof window === "undefined") return { x, y };
    const maxX = window.innerWidth - FAB_SIZE - 4;
    const maxY = window.innerHeight - FAB_SIZE - 4;
    return { x: Math.max(4, Math.min(maxX, x)), y: Math.max(4, Math.min(maxY, y)) };
  }

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pos) return;
    draggingRef.current = true;
    movedRef.current = false;
    startRef.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggingRef.current || !startRef.current) return;
    const dx = e.clientX - startRef.current.px;
    const dy = e.clientY - startRef.current.py;
    if (!movedRef.current && Math.hypot(dx, dy) > 5) movedRef.current = true;
    if (movedRef.current) {
      setPos(clamp(startRef.current.x + dx, startRef.current.y + dy));
    }
  };
  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    draggingRef.current = false;
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    if (movedRef.current && pos) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pos)); } catch {}
    } else {
      setOpen((v) => !v);
    }
  };

  if (!pos) return null;

  // Position popup near button; flip sides if button is near edges
  const popupW = 288;
  const popupH = 180;
  const popupLeft = Math.max(8, Math.min(window.innerWidth - popupW - 8, pos.x + FAB_SIZE / 2 - popupW / 2));
  const popupTop = pos.y - popupH - 12 > 8 ? pos.y - popupH - 12 : pos.y + FAB_SIZE + 12;

  return (
    <>
      {open && (
        <div
          className="fixed z-50 w-72 glass-strong border border-border rounded-2xl p-4 shadow-2xl animate-float-up"
          style={{ left: popupLeft, top: popupTop }}
        >
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
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="fixed z-50 h-14 w-14 rounded-full flex items-center justify-center btn-primary-gradient btn-glow shadow-2xl touch-none select-none"
        style={{ left: pos.x, top: pos.y, cursor: draggingRef.current ? "grabbing" : "grab" }}
      >
        {open ? <X className="h-5 w-5 text-primary-foreground" /> : <LifeBuoy className="h-6 w-6 text-primary-foreground" />}
      </button>
    </>
  );
}
