import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { DotsLoader } from "@/components/dashboard/dots-loader";

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

  useEffect(() => {
    if (!loading && user) {
      navigate({ to, replace: true });
    }
  }, [user, loading, navigate, to]);

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <DotsLoader label="Loading" />
      </div>
    );
  }

  return <>{children}</>;
}