import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) throw redirect({ to: "/login", replace: true });
    const { data: isAdmin, error } = await supabase.rpc("has_role", {
      _user_id: uid,
      _role: "admin",
    });
    if (error || !isAdmin) {
      throw redirect({ to: "/dashboard", replace: true });
    }
  },
  component: () => <Outlet />,
});