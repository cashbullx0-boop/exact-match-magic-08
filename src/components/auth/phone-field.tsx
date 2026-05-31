import PhoneInput, { type Country } from "react-phone-number-input";
import { useEffect, useState } from "react";

const CACHE_KEY = "cbx_geo_country";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

export function PhoneField({ value, onChange, placeholder = "Phone number" }: Props) {
  const [country, setCountry] = useState<Country | undefined>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached && /^[A-Z]{2}$/.test(cached)) return cached as Country;
      const loc = (navigator.language || "en-US").split("-")[1];
      if (loc && /^[A-Z]{2}$/i.test(loc)) return loc.toUpperCase() as Country;
    } catch {}
    return undefined;
  });

  useEffect(() => {
    let cancelled = false;
    const tryFetch = async (url: string, pick: (d: any) => string | undefined) => {
      try {
        const r = await fetch(url, { cache: "no-store" });
        if (!r.ok) return undefined;
        const d = await r.json();
        return pick(d);
      } catch { return undefined; }
    };
    (async () => {
      // Try ipapi.co first, fall back to ipwho.is (both free, no key)
      let cc = await tryFetch("https://ipapi.co/json/", (d) => d?.country_code);
      if (!cc) cc = await tryFetch("https://ipwho.is/", (d) => d?.success && d?.country_code);
      if (!cancelled && cc && /^[A-Z]{2}$/i.test(cc)) {
        const upper = cc.toUpperCase() as Country;
        setCountry(upper);
        try { localStorage.setItem(CACHE_KEY, upper); } catch {}
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Remount PhoneInput once country is detected so defaultCountry takes effect
  // (only matters when the user hasn't typed anything yet).
  return (
    <PhoneInput
      key={value ? "typed" : country ?? "none"}
      international
      defaultCountry={country}
      countryCallingCodeEditable={false}
      value={value}
      onChange={(v) => onChange(v ?? "")}
      placeholder={placeholder}
    />
  );
}