import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/common/auth/authStore";

export function NonAuthGuardLayout() {
  const isAuthReady = useAuthStore((state) => state.isAuthReady);
  const session = useAuthStore((state) => state.session);

  if (!isAuthReady) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
