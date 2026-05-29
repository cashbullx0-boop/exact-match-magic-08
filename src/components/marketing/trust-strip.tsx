const LOGOS = ["BINANCE", "COINBASE", "TRUSTPILOT", "WEB3", "POLYGON", "TRON", "TETHER", "PRODUCT HUNT"];

export function TrustStrip() {
  return (
    <section className="py-12 border-y border-border/40">
      <div className="text-center text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-6">
        Trusted by earners across 140+ countries
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-6 items-center opacity-70">
        {LOGOS.map((l) => (
          <div key={l} className="text-center text-sm font-bold tracking-widest text-foreground/60 hover:text-foreground transition">
            {l}
          </div>
        ))}
      </div>
    </section>
  );
}