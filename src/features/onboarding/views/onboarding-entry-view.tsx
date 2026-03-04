import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { getOnboardingSnapshot } from "@/common/api/supabase";
import {
  getDashboardPathForRole,
  getUserRole,
  isStaffRole,
} from "@/common/auth/roles";
import { useAuthStore } from "@/common/auth/authStore";
import { ErrorScreen, LoadingScreen } from "@/common/components/loading-screen";
import { useI18n } from "@/common/i18n/use-i18n";

export function OnboardingEntryView() {
  const { t } = useI18n();
  const user = useAuthStore((state) => state.user);
  const userId = user?.id ?? null;
  const userRole = getUserRole(user);

  const { data, isPending, isFetching, isStale, isError, refetch } = useQuery({
    queryKey: ["onboarding", "snapshot", userId],
    queryFn: () => getOnboardingSnapshot(userId),
    enabled: Boolean(userId),
  });

  if (!userId) {
    return <Navigate to="/auth" replace />;
  }

  if (isPending || (isFetching && isStale)) {
    return <LoadingScreen message={t("onboarding.entry.loading")} />;
  }

  if (isError || !data) {
    return (
      <ErrorScreen
        message={t("onboarding.entry.error")}
        onRetry={() => void refetch()}
      />
    );
  }

  if (data.state === "NO_PROFILE") {
    if (isStaffRole(userRole)) {
      return <Navigate to="/staff/profile" replace />;
    }
    return <Navigate to="/profile" replace />;
  }

  if (data.state === "NO_TEAM") {
    return <Navigate to="/team" replace />;
  }

  if (isStaffRole(data.profile?.role ?? userRole)) {
    if (!data.profile?.first_name || !data.profile?.last_name) {
      return <Navigate to="/staff/profile" replace />;
    }

    return <Navigate to={getDashboardPathForRole(data.profile?.role ?? userRole)} replace />;
  }

  return <Navigate to="/dashboard" replace />;
}
