import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@/common/api/supabase";
import { getUserRole, isStaffRole } from "@/common/auth/roles";
import { useAuthStore } from "@/common/auth/authStore";
import { LoadingScreen } from "@/common/components/loading-screen";

export function AuthGuardLayout() {
  const isAuthReady = useAuthStore((state) => state.isAuthReady);
  const session = useAuthStore((state) => state.session);
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const userId = user?.id ?? null;
  const role = getUserRole(user);

  // Only fetch profile for staff roles — they're the only ones that can have
  // must_change_password = true. Team users are never redirected to /change-password.
  const profileQuery = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => getProfile(userId!),
    enabled: Boolean(userId) && isStaffRole(role),
    staleTime: 60_000,
  });

  if (!isAuthReady) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (isStaffRole(role)) {
    if (profileQuery.isPending) {
      return <LoadingScreen />;
    }

    if (
      profileQuery.data?.must_change_password === true &&
      location.pathname !== "/change-password"
    ) {
      return <Navigate to="/change-password" replace />;
    }
  }

  return <Outlet />;
}
