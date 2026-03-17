import { useQuery } from "@tanstack/react-query";
import { ChartBar, CheckCircle2, Users } from "lucide-react";
import { getAdminDashboardStats } from "@/common/api/supabase";
import { ErrorScreen, LoadingScreen } from "@/common/components/loading-screen";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { usePageTitle } from "@/common/hooks/use-page-title";
import { useI18n } from "@/common/i18n/use-i18n";

const CHECKPOINT_CODES = ["cp0", "cp1", "cp2", "cp3"] as const;

export function AdminDashboardView() {
  const { t } = useI18n();
  usePageTitle(t("dashboard.nav.dashboard"));

  const statsQuery = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: getAdminDashboardStats,
  });

  if (statsQuery.isLoading) {
    return <LoadingScreen />;
  }

  if (statsQuery.isError || !statsQuery.data) {
    return <ErrorScreen onRetry={() => void statsQuery.refetch()} />;
  }

  const stats = statsQuery.data;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{t("dashboard.nav.dashboard")}</h1>
        <p className="text-sm text-muted-foreground">
          Общая статистика по командам и прохождению чекпойнтов.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Команд участвует</CardDescription>
            <CardTitle className="text-3xl">{stats.total_teams}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="size-4" />
              Зарегистрированные активные команды.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Участников</CardDescription>
            <CardTitle className="text-3xl">{stats.total_participants}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ChartBar className="size-4" />
              Сумма участников по активным командам.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Прошли чекпойнты</CardTitle>
          <CardDescription>
            Количество команд с решением <span className="font-medium">прошли дальше</span> по каждому
            чекпойнту.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CHECKPOINT_CODES.map((code) => (
            <div key={code} className="rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="size-4 text-emerald-600" />
                {code.toUpperCase()}
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {stats.passed_by_checkpoint[code]}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
