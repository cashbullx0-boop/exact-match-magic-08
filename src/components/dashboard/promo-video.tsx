import { Card } from "@/components/ui/card";
import promoVideo from "@/assets/dashboard-promo.mp4.asset.json";

export function PromoVideo() {
  return (
    <Card className="glass-strong border-border p-0 overflow-hidden">
      <video
        src={promoVideo.url}
        controls
        playsInline
        loop
        muted
        autoPlay
        preload="metadata"
        className="w-full h-auto block bg-black"
      />
    </Card>
  );
}
