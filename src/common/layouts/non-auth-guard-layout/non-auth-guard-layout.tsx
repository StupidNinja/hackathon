import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/common/auth/authStore";
import { useI18n } from "@/common/i18n/use-i18n";

export function NonAuthGuardLayout() {
  const { t } = useI18n();
  const isAuthReady = useAuthStore((state) => state.isAuthReady);
  const session = useAuthStore((state) => state.session);

  if (!isAuthReady) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  if (session) {
    return <Navigate to="/start" replace />;
  }

  return <Outlet />;
}
