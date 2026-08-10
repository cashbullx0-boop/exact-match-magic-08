import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PlayCircle, Sparkles } from "lucide-react";
import depositAsset from "@/assets/deposit-tutorial.mp4.asset.json";
import withdrawAsset from "@/assets/withdraw-tutorial.mp4.asset.json";

type Kind = "deposit" | "withdraw";

const CONFIG: Record<Kind, { url: string; seenKey: string; title: string; blurb: string; firstTitle: string }> = {
  deposit: {
    url: depositAsset.url,
    seenKey: "cbx.depositTutorialSeen",
    title: "How to deposit — video tutorial",
    blurb: "Watch this short guide before sending USDT to avoid mistakes.",
    firstTitle: "First deposit? Watch this first",
  },
  withdraw: {
    url: withdrawAsset.url,
    seenKey: "cbx.withdrawTutorialSeen",
    title: "How to withdraw — video tutorial",
    blurb: "Watch this short guide before requesting your first payout.",
    firstTitle: "First withdrawal? Watch this first",
  },
};

function VideoPlayer({ src, autoPlay }: { src: string; autoPlay?: boolean }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (autoPlay && ref.current) ref.current.play().catch(() => {});
  }, [autoPlay]);
  return (
    <video
      ref={ref}
      src={src}
      controls
      playsInline
      preload="metadata"
      className="w-full max-h-[62vh] rounded-xl bg-black object-contain"
    />
  );
}

/**
 * Tutorial video. Always available as a card on the page, and shown once
 * automatically as a popup to users doing this action for the first time.
 */
export function VideoTutorial({ kind, firstTime }: { kind: Kind; firstTime: boolean }) {
  const cfg = CONFIG[kind];
  const [open, setOpen] = useState(false);
  const autoShown = useRef(false);

  useEffect(() => {
    if (!firstTime || autoShown.current) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(cfg.seenKey) === "1") return;
    autoShown.current = true;
    localStorage.setItem(cfg.seenKey, "1");
    const t = window.setTimeout(() => setOpen(true), 500);
    return () => window.clearTimeout(t);
  }, [firstTime, cfg.seenKey]);

  return (
    <>
      <Card className="glass p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/15 text-primary shrink-0">
            <PlayCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-sm sm:text-base">{cfg.title}</h2>
            <p className="text-xs text-muted-foreground">{cfg.blurb}</p>
          </div>
          <Button size="sm" onClick={() => setOpen(true)} className="shrink-0">
            Watch
          </Button>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {firstTime ? cfg.firstTitle : cfg.title}
            </DialogTitle>
            <DialogDescription>A step-by-step walkthrough.</DialogDescription>
          </DialogHeader>
          <VideoPlayer src={cfg.url} autoPlay={open} />
          <Button className="w-full" onClick={() => setOpen(false)}>
            Got it, continue
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
