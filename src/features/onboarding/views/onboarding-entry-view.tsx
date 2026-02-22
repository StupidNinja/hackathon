import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { getOnboardingSnapshot } from "@/common/api/supabase";
import { useAuthStore } from "@/common/auth/authStore";
import { ErrorScreen, LoadingScreen } from "@/common/components/loading-screen";

export function OnboardingEntryView() {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id ?? null;

  const { data, isPending, isError } = useQuery({
    queryKey: ["onboarding", "snapshot", userId],
    queryFn: () => getOnboardingSnapshot(userId),
    enabled: Boolean(userId),
  });

  if (!userId) {
    return <Navigate to="/auth" replace />;
  }

  if (isPending) {
    return <LoadingScreen message="Checking onboarding state…" />;
  }

  if (isError || !data) {
    return <ErrorScreen message="Failed to load onboarding state." />;
  }

  if (data.state === "NO_PROFILE") {
    return <Navigate to="/profile" replace />;
  }

  if (data.state === "NO_TEAM") {
    return <Navigate to="/team" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}
