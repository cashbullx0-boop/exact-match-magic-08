import { useEffect, useState } from "react";
import { AlertTriangle, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

/** Detects Facebook / Instagram / WhatsApp / TikTok style in-app webviews. */
function isInAppBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|FB_IAB|Instagram|Line\/|WhatsApp|Snapchat|TikTok|Twitter|Messenger|WebView|; wv\)/i.test(ua);
}

export function InAppBrowserNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(isInAppBrowser());
  }, []);

  if (!show) return null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied — paste it in Chrome or Safari");
    } catch {
      toast.error("Could not copy the link");
    }
  };

  return (
    <div className="mt-5 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-left">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <div className="space-y-2">
          <p className="text-sm font-semibold text-amber-200">Open in Chrome or Safari</p>
          <p className="text-xs text-muted-foreground">
            You are using an in-app browser. Google sign-in can fail here with
            &quot;State verification failed&quot;. Tap the menu (⋮ or ···) and choose
            &quot;Open in browser&quot;, or copy the link below.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-400/10"
            >
              <Copy className="h-3.5 w-3.5" /> Copy link
            </button>
            <a
              href={typeof window !== "undefined" ? window.location.href : "/"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-400/10"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Try opening browser
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}