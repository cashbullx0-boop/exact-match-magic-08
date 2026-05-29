import { useEffect, useRef, useState } from "react";

export function AnimatedCounter({ value, prefix = "", suffix = "", duration = 1800 }: {
  value: number; prefix?: string; suffix?: string; duration?: number;
}) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const step = (t: number) => {
          const p = Math.min(1, (t - start) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          setN(Math.round(value * eased));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.3 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [value, duration]);

  const formatted = n >= 1000 ? n.toLocaleString() : String(n);
  return <span ref={ref}>{prefix}{formatted}{suffix}</span>;
}