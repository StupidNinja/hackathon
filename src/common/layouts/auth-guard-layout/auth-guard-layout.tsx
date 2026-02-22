import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/common/auth/authStore";
import { LoadingScreen } from "@/common/components/loading-screen";

export function AuthGuardLayout() {
  const isAuthReady = useAuthStore((state) => state.isAuthReady);
  const session = useAuthStore((state) => state.session);

  if (!isAuthReady) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
}
