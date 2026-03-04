import { createContext, useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@/common/api/supabase";
import { getUserRole, isSuperAdmin } from "@/common/auth/roles";
import { useAuthStore } from "@/common/auth/authStore";
import { LoadingScreen } from "@/common/components/loading-screen";

type AdminContextValue = {
  isSuperAdmin: boolean;
};

const AdminContext = createContext<AdminContextValue>({ isSuperAdmin: false });

export function useAdminContext(): AdminContextValue {
  return useContext(AdminContext);
}

export function AdminGuardLayout() {
  const user = useAuthStore((state) => state.user);
  const role = getUserRole(user);
  const userId = user?.id ?? null;

  const profileQuery = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => getProfile(userId!),
    enabled: Boolean(userId) && role === "admin",
  });

  if (role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  if (profileQuery.isPending) {
    return <LoadingScreen />;
  }

  return (
    <AdminContext.Provider value={{ isSuperAdmin: isSuperAdmin(profileQuery.data) }}>
      <Outlet />
    </AdminContext.Provider>
  );
}
