import { useEffect, useState } from "react";
import { X, Gift, Star } from "lucide-react";

const SESSION_KEY = "pk-independence-2026-shown";

/** Pakistan-only heuristic: IANA timezone / locale region. No backend call. */
function isPakistaniVisitor() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    if (tz === "Asia/Karachi") return true;
    const langs = [navigator.language, ...(navigator.languages ?? [])].filter(Boolean);
    return langs.some((l) => /(-|_)PK$/i.test(l) || /^ur\b/i.test(l));
  } catch {
    return false;
  }
}

export function IndependenceDayPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isPakistaniVisitor()) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    const t = window.setTimeout(() => setOpen(true), 600);
    return () => window.clearTimeout(t);
  }, []);

  const close = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Happy Independence Day announcement"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-emerald-400/40 shadow-2xl animate-in zoom-in-95 duration-300"
        style={{ background: "linear-gradient(160deg, #01411C 0%, #046A38 55%, #01411C 100%)" }}
      >
        <button
          onClick={close}
          aria-label="Close announcement"
          className="absolute right-3 top-3 z-10 rounded-full bg-white/15 p-1.5 text-white hover:bg-white/25 transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Pakistani flag */}
        <div className="flex justify-center pt-7">
          <div className="flex h-16 w-24 overflow-hidden rounded-md shadow-lg ring-1 ring-white/30">
            <div className="w-1/4 bg-white" />
            <div className="relative flex-1 bg-[#01411C]">
              <div className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
              <div className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-[38%] -translate-y-1/2 rounded-full bg-[#01411C]" />
              <Star className="absolute right-2 top-3 h-3.5 w-3.5 fill-white text-white" />
            </div>
          </div>
        </div>

        <div className="px-6 pb-7 pt-4 text-center">
          <p className="text-[11px] uppercase tracking-[0.25em] text-emerald-200/90">14 August</p>
          <h2 className="mt-1 text-2xl font-bold text-white">Happy Independence Day 🇵🇰</h2>
          <p className="mt-2 text-sm text-emerald-100/90">
            Pakistan Zindabad! Celebrating with a special reward for our Pakistani members.
          </p>

          <div className="mt-5 rounded-2xl border border-white/25 bg-white/10 p-4">
            <div className="flex items-center justify-center gap-2 text-emerald-100">
              <Gift className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider">Limited time offer</span>
            </div>
            <p className="mt-2 text-white">
              <span className="text-lg line-through opacity-60">$5</span>
              <span className="mx-2 text-3xl font-extrabold text-yellow-300">$7</span>
            </p>
            <p className="text-sm text-emerald-50">reward on deposit — instead of $5</p>
          </div>

          <button
            onClick={close}
            className="mt-5 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#01411C] hover:bg-emerald-50 transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}