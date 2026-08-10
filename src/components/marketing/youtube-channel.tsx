import { ExternalLink, PlayCircle } from "lucide-react";

export const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@CashBullx";

export function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M23.498 6.186a2.996 2.996 0 0 0-2.116-2.116C19.68 3.5 12 3.5 12 3.5s-7.68 0-9.382.57A2.996 2.996 0 0 0 .502 6.186C0 7.888 0 12 0 12s0 4.112.502 5.814a2.996 2.996 0 0 0 2.116 2.116C4.32 20.5 12 20.5 12 20.5s7.68 0 9.382-.57a2.996 2.996 0 0 0 2.116-2.116C24 16.112 24 12 24 12s0-4.112-.502-5.814ZM9.545 15.5V8.5l6.273 3.5-6.273 3.5Z" />
    </svg>
  );
}

export function YouTubeChannelButton({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-8 px-3 text-xs gap-1.5",
    md: "h-10 px-4 text-sm gap-2",
    lg: "h-12 px-6 text-base gap-2.5",
  };
  return (
    <a
      href={YOUTUBE_CHANNEL_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center rounded-full bg-[#FF0000] text-white font-semibold hover:bg-[#cc0000] transition shadow-lg hover:shadow-red-500/30 ${sizeClasses[size]}`}
    >
      <YouTubeIcon className="h-4 w-4 fill-white" />
      <span>Watch on YouTube</span>
      <ExternalLink className="h-3.5 w-3.5 opacity-80" />
    </a>
  );
}

export function YouTubeChannelCard({ className = "" }: { className?: string }) {
  return (
    <a
      href={YOUTUBE_CHANNEL_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`group block relative overflow-hidden rounded-2xl border border-[#FF0000]/30 bg-gradient-to-br from-[#FF0000]/10 to-[#FF0000]/5 p-4 sm:p-5 hover:-translate-y-0.5 transition-transform ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#FF0000]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative flex items-center gap-4">
        <div className="shrink-0 w-12 h-12 rounded-2xl bg-[#FF0000] text-white flex items-center justify-center shadow-lg shadow-red-500/20">
          <PlayCircle className="h-6 w-6 fill-white/20" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">CashBullX YouTube</h3>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FF0000]/15 text-white border border-[#FF0000]/30">Official</span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visit our channel first to see latest updates, tutorials & payment proofs.
          </p>
        </div>
        <ExternalLink className="h-5 w-5 text-muted-foreground group-hover:text-white transition" />
      </div>
    </a>
  );
}

export function YouTubeHeroBanner({ className = "" }: { className?: string }) {
  return (
    <a
      href={YOUTUBE_CHANNEL_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`group inline-flex items-center gap-2 sm:gap-3 rounded-full bg-[#FF0000]/10 border border-[#FF0000]/30 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-[#FF0000]/20 transition ${className}`}
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF0000] opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF0000]" />
      </span>
      <YouTubeIcon className="h-4 w-4 fill-[#FF0000]" />
      <span className="truncate">New users: visit our YouTube channel first</span>
      <ExternalLink className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 transition" />
    </a>
  );
}
