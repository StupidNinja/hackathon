import { Navigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import {
  getAdminTeamRanking,
  getHackathonSettings,
  type AdminTeamRankingRow,
} from "@/common/api/supabase";
import { useAdminContext } from "@/common/layouts/admin-guard-layout/admin-guard-layout";
import { LoadingScreen, ErrorScreen } from "@/common/components/loading-screen";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { usePageTitle } from "@/common/hooks/use-page-title";
import { useI18n } from "@/common/i18n/use-i18n";
import { buildCsv, downloadCsv } from "@/common/lib/csv";

export function AdminRankingView() {
  const { t } = useI18n();
  const { isSuperAdmin } = useAdminContext();

  const handleExportCsv = (rows: AdminTeamRankingRow[]) => {
    const csv = buildCsv(
      [
        t("admin.ranking.columns.rank"),
        t("admin.ranking.columns.team"),
        t("admin.ranking.columns.captain"),
        t("admin.staff.table.email"),
        t("admin.ranking.columns.scoreSum"),
        t("admin.ranking.columns.assessments"),
      ],
      rows.map((row) => [
        row.rank,
        row.team_name,
        row.captain_name,
        row.captain_email ?? "",
        row.total_score_sum,
        row.assessments_count,
      ]),
    );

    const datePart = new Date().toISOString().slice(0, 10);
    downloadCsv(csv, `ranking-${datePart}.csv`);
  };

  usePageTitle(t("admin.ranking.pageTitle"));

  const settingsQuery = useQuery({
    queryKey: ["hackathon-settings"],
    queryFn: getHackathonSettings,
    staleTime: 30_000,
  });

  const rankingQuery = useQuery({
    queryKey: ["admin-ranking"],
    queryFn: getAdminTeamRanking,
    enabled: settingsQuery.data?.rankings_enabled === true,
  });

  const isLoading = settingsQuery.isLoading || rankingQuery.isLoading;

  if (isLoading) {
    return <LoadingScreen message={t("common.loading")} />;
  }

  if (settingsQuery.isError || rankingQuery.isError) {
    return <ErrorScreen message={t("common.error")} />;
  }

  const rankingsEnabled = settingsQuery.data?.rankings_enabled === true;

  if (!rankingsEnabled && !isSuperAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (!rankingsEnabled && isSuperAdmin) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold">{t("admin.ranking.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("admin.ranking.desc")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("admin.ranking.notLaunchedTitle")}</CardTitle>
            <CardDescription>{t("admin.ranking.notLaunchedDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/admin/settings">{t("admin.ranking.goToSettings")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rows = rankingQuery.data ?? [];
  const leaders = rows.slice(0, 3);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{t("admin.ranking.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("admin.ranking.desc")}</p>
      </div>

      <Card>
        <CardHeader className="border-b pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">{t("admin.ranking.tableTitle")}</CardTitle>
              <CardDescription>
                {rows.length} {t("admin.teams.count")}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={rows.length === 0}
              onClick={() => handleExportCsv(rows)}
            >
              {t("admin.ranking.exportCsv")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          {rows.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {t("admin.ranking.empty")}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {leaders.map((row) => (
                  <Badge key={row.team_id} variant="outline" className="px-2 py-1">
                    #{row.rank} {row.team_name}: {row.total_score_sum}
                  </Badge>
                ))}
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.ranking.columns.rank")}</TableHead>
                      <TableHead>{t("admin.ranking.columns.team")}</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        {t("admin.ranking.columns.captain")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("admin.ranking.columns.scoreSum")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("admin.ranking.columns.assessments")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.team_id}>
                        <TableCell className="font-medium">#{row.rank}</TableCell>
                        <TableCell>
                          <div className="font-medium">{row.team_name}</div>
                          {row.captain_email && (
                            <div className="text-xs text-muted-foreground sm:hidden">
                              {row.captain_email}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div>{row.captain_name}</div>
                          {row.captain_email && (
                            <div className="text-xs text-muted-foreground">
                              {row.captain_email}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {row.total_score_sum}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.assessments_count}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
