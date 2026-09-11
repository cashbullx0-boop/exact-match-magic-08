import { Card } from "@/components/ui/card";
import promoVideo from "@/assets/dashboard-promo.mp4.asset.json";
import promoVideo2 from "@/assets/dashboard-promo-2.mp4.asset.json";

export function PromoVideo({ src }: { src?: string }) {
  return (
    <Card className="glass-strong border-border p-0 overflow-hidden">
      <video
        src={src ?? promoVideo.url}
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

export function PromoVideo2() {
  return <PromoVideo src={promoVideo2.url} />;
}
