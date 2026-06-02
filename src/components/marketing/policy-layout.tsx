import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

export type PolicySection = {
  heading: string;
  body?: ReactNode;
  bullets?: string[];
};

export function PolicyLayout({
  title,
  intro,
  effectiveDate,
  sections,
}: {
  title: string;
  intro?: string;
  effectiveDate: string;
  sections: PolicySection[];
}) {
  return (
    <div className="min-h-screen">
      <header className="container mx-auto flex items-center justify-between px-6 py-6">
        <Link to="/" className="text-2xl font-bold brand-text">CashBullX</Link>
        <Link to="/signup"><Button className="btn-primary-gradient">Get started</Button></Link>
      </header>
      <main className="container mx-auto px-6 py-10 max-w-3xl">
        <p className="text-xs uppercase tracking-wider text-primary mb-3">Legal</p>
        <h1 className="text-4xl md:text-5xl font-bold mb-3">{title}</h1>
        <p className="text-sm text-muted-foreground mb-8">Effective Date: {effectiveDate}</p>
        {intro && <p className="text-foreground/80 mb-8 leading-relaxed">{intro}</p>}
        <div className="glass-strong rounded-2xl p-6 md:p-8 space-y-8">
          {sections.map((s, i) => (
            <section key={i}>
              <h2 className="text-lg md:text-xl font-semibold mb-3">
                <span className="text-primary mr-2">{i + 1}.</span>
                {s.heading}
              </h2>
              {s.body && (
                <div className="text-sm md:text-base text-muted-foreground leading-relaxed space-y-3">
                  {typeof s.body === "string" ? <p>{s.body}</p> : s.body}
                </div>
              )}
              {s.bullets && s.bullets.length > 0 && (
                <ul className="mt-3 space-y-2 text-sm md:text-base text-muted-foreground">
                  {s.bullets.map((b, j) => (
                    <li key={j} className="flex gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition">← Back to home</Link>
        </div>
      </main>
    </div>
  );
}