import PhoneInput, { type Country } from "react-phone-number-input";
import { useEffect, useState } from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

export function PhoneField({ value, onChange, placeholder = "Phone number" }: Props) {
  const [country, setCountry] = useState<Country | undefined>(undefined);

  useEffect(() => {
    // Detect country via locale, then upgrade with IP geolocation
    try {
      const loc = (navigator.language || "en-US").split("-")[1] as Country | undefined;
      if (loc) setCountry(loc);
    } catch {}
    fetch("https://ipapi.co/json/")
      .then((r) => r.json())
      .then((d) => d?.country_code && setCountry(d.country_code as Country))
      .catch(() => {});
  }, []);

  return (
    <PhoneInput
      international
      defaultCountry={country}
      countryCallingCodeEditable={false}
      value={value}
      onChange={(v) => onChange(v ?? "")}
      placeholder={placeholder}
    />
  );
}