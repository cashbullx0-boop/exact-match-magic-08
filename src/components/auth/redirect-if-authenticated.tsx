import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { DotsLoader } from "@/components/dashboard/dots-loader";

/**
 * True only when a Supabase auth token is already persisted for this browser.
 * Signed-out visitors (the vast majority of marketing traffic) can therefore
 * paint the page immediately instead of waiting for the auth round-trip.
 */
function hasStoredSession(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && /^sb-.*-auth-token$/.test(key)) return true;
    }
  } catch {
    // Storage access can throw in private/embedded contexts — assume signed out.
  }
  return false;
}

/**
 * Wrap any PUBLIC page with this guard. If a valid Supabase session exists,
 * the user is redirected to /dashboard (replace: true) so the back button
 * cannot return them to the public surface. Otherwise the children render.
 */
export function RedirectIfAuthenticated({
  children,
  to = "/dashboard",
}: {
  children: ReactNode;
  to?: string;
}) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [maybeSignedIn, setMaybeSignedIn] = useState(false);

  useEffect(() => {
    setMaybeSignedIn(hasStoredSession());
  }, []);

  useEffect(() => {
    if (!loading && user) {
      navigate({ to, replace: true });
    }
  }, [user, loading, navigate, to]);

  // Never block the first paint for signed-out visitors: the spinner is only
  // used once we know this browser actually carries a session.
  if (user || (loading && maybeSignedIn)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <DotsLoader label="Loading" />
      </div>
    );
  }

  return <>{children}</>;
}
