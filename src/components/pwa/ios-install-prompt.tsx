import { useEffect, useState } from "react";
import { Share, Plus, X } from "lucide-react";

const DISMISS_KEY = "cbx_ios_install_dismissed_at";
const DISMISS_DAYS = 7;

function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isIOS && isSafari;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export function IosInstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isIosSafari() || isStandalone()) return;
    try {
      const dismissedAt = localStorage.getItem(DISMISS_KEY);
      if (dismissedAt) {
        const days = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
        if (days < DISMISS_DAYS) return;
      }
    } catch {}
    const t = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[100] px-3 pb-[max(env(safe-area-inset-bottom),12px)] pointer-events-none"
      role="dialog"
      aria-label="Install CashBullX on iOS"
    >
      <div className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-primary/30 bg-black/80 backdrop-blur-2xl shadow-[0_20px_50px_-12px_rgba(245,158,11,0.35)] animate-float-up">
        <div className="relative p-4">
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground/70 hover:text-foreground hover:bg-white/10 transition"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3 pr-8">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-amber-600 text-black font-extrabold text-lg shadow-lg">
              X
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Install <span className="text-primary">CashBullX</span> on your iPhone
              </h3>
              <p className="text-xs text-foreground/70">Get a faster, app-like experience.</p>
            </div>
          </div>

          <ol className="mt-4 space-y-2">
            <li className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                1
              </span>
              <span className="text-xs text-foreground/90 flex-1">
                Tap the <span className="font-semibold">Share</span> button in Safari
              </span>
              <Share className="h-4 w-4 text-primary" />
            </li>
            <li className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                2
              </span>
              <span className="text-xs text-foreground/90 flex-1">
                Select <span className="font-semibold">Add to Home Screen</span>
              </span>
              <Plus className="h-4 w-4 text-primary" />
            </li>
          </ol>

          <button
            onClick={dismiss}
            className="mt-3 w-full rounded-xl bg-white/5 hover:bg-white/10 text-foreground/80 text-xs py-2 transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}