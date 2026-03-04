import { Navigate } from "react-router-dom";
import { Scale } from "lucide-react";
import { getUserRole } from "@/common/auth/roles";
import { useAuthStore } from "@/common/auth/authStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { usePageTitle } from "@/common/hooks/use-page-title";

export function JuryDashboardView() {
  const user = useAuthStore((state) => state.user);
  const role = getUserRole(user);

  usePageTitle("Jury Dashboard");

  if (role === "admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (role !== "jury") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Scale className="size-5 text-sky-600" />
            Jury Dashboard
          </CardTitle>
          <CardDescription>
            You are signed in as jury. Evaluation workflows can be placed on this screen.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Jury users are routed here and do not go through team participant onboarding.
        </CardContent>
      </Card>
    </div>
  );
}
