import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PlayCircle, Sparkles } from "lucide-react";
import tutorialAsset from "@/assets/deposit-tutorial.mp4.asset.json";

const SEEN_KEY = "cbx.depositTutorialSeen";

function VideoPlayer({ autoPlay }: { autoPlay?: boolean }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (autoPlay && ref.current) ref.current.play().catch(() => {});
  }, [autoPlay]);
  return (
    <video
      ref={ref}
      src={tutorialAsset.url}
      controls
      playsInline
      preload="metadata"
      className="w-full max-h-[62vh] rounded-xl bg-black object-contain"
    />
  );
}

/**
 * Deposit tutorial. Always available as a card on the deposit page, and
 * shown once automatically as a popup to users who have never deposited.
 */
export function DepositTutorial({ firstTime }: { firstTime: boolean }) {
  const [open, setOpen] = useState(false);
  const autoShown = useRef(false);

  useEffect(() => {
    if (!firstTime || autoShown.current) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(SEEN_KEY) === "1") return;
    autoShown.current = true;
    localStorage.setItem(SEEN_KEY, "1");
    const t = window.setTimeout(() => setOpen(true), 500);
    return () => window.clearTimeout(t);
  }, [firstTime]);

  return (
    <>
      <Card className="glass p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/15 text-primary shrink-0">
            <PlayCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-sm sm:text-base">How to deposit — video tutorial</h2>
            <p className="text-xs text-muted-foreground">
              Watch this short guide before sending USDT to avoid mistakes.
            </p>
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
              {firstTime ? "First deposit? Watch this first" : "Deposit tutorial"}
            </DialogTitle>
            <DialogDescription>
              A step-by-step walkthrough of the deposit process.
            </DialogDescription>
          </DialogHeader>
          <VideoPlayer autoPlay={open} />
          <Button className="w-full" onClick={() => setOpen(false)}>
            Got it, continue to deposit
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
