import { useEffect, useState } from "react";

/**
 * libphonenumber-js ships ~200KB of country metadata. Loading it eagerly on the
 * login/signup routes delays first paint for users who never touch the phone
 * tab, so the validator is imported on demand the first time a phone number is
 * typed and cached for later calls.
 */
let validate: ((value: string) => boolean) | null = null;

export function usePhoneValid(phone: string): boolean {
  const [valid, setValid] = useState(false);

  useEffect(() => {
    if (!phone) {
      setValid(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      if (!validate) {
        const mod = await import("libphonenumber-js");
        validate = (value: string) => mod.isValidPhoneNumber(value);
      }
      if (!cancelled) setValid(validate(phone));
    })();
    return () => {
      cancelled = true;
    };
  }, [phone]);

  return valid;
}
