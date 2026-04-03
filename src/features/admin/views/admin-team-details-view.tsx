import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, AlertTriangle, User, Users } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  getCheckpointRejectionTemplates,
  getDecisionsForTeamAdmin,
  getJurySummaryForTeam,
  getSubmissionsForTeamAdmin,
  getTeamById,
  getTeamMembersForAdmin,
} from "@/common/api/supabase";
import type { CheckpointCode } from "@/common/api/supabase";
import { ErrorScreen, LoadingScreen } from "@/common/components/loading-screen";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/common/components/ui/tabs";
import { usePageTitle } from "@/common/hooks/use-page-title";
import { useI18n } from "@/common/i18n/use-i18n";
import { AdminCheckpointTab } from "@/features/admin/components/admin-checkpoint-tab";

const CP_CODES: CheckpointCode[] = ["cp0", "cp1", "cp2", "cp3"];

function getStatusBadgeClass(status: "registered" | "cancelled" | "disqualified") {
  switch (status) {
    case "registered":
      return "border-green-300/50 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
    case "disqualified":
      return "border-red-300/50 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
    case "cancelled":
      return "border-gray-200 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    default:
      return "border-border text-foreground";
  }
}

function resolveBackPath(state: unknown): string {
  if (typeof state !== "object" || state === null) {
    return "/admin/teams";
  }

  const source = (state as { from?: unknown }).from;
  return typeof source === "string" && source.length > 0 ? source : "/admin/teams";
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Almaty",
  });
}

export function AdminTeamDetailsView() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const { teamId } = useParams<{ teamId: string }>();
  const backTo = resolveBackPath(location.state);

  const teamQuery = useQuery({
    queryKey: ["admin-team-details", teamId],
    queryFn: () => {
      if (!teamId) return Promise.reject(new Error("No teamId"));
      return getTeamById(teamId);
    },
    enabled: Boolean(teamId),
  });

  const membersQuery = useQuery({
    queryKey: ["admin-team-members", teamId],
    queryFn: () => {
      if (!teamId) return Promise.reject(new Error("No teamId"));
      return getTeamMembersForAdmin(teamId);
    },
    enabled: Boolean(teamId),
  });

  const submissionsQuery = useQuery({
    queryKey: ["admin-team-submissions", teamId],
    queryFn: () => {
      if (!teamId) return Promise.reject(new Error("No teamId"));
      return getSubmissionsForTeamAdmin(teamId);
    },
    enabled: Boolean(teamId),
  });

  const decisionsQuery = useQuery({
    queryKey: ["admin-team-decisions", teamId],
    queryFn: () => {
      if (!teamId) return Promise.reject(new Error("No teamId"));
      return getDecisionsForTeamAdmin(teamId);
    },
    enabled: Boolean(teamId),
  });

  const rejectionTemplatesQuery = useQuery({
    queryKey: ["checkpoint-rejection-templates", "all"],
    queryFn: () => getCheckpointRejectionTemplates(),
  });

  const jurySummaryQuery = useQuery({
    queryKey: ["team-jury-summary", teamId],
    queryFn: () => {
      if (!teamId) return Promise.reject(new Error("No teamId"));
      return getJurySummaryForTeam(teamId);
    },
    enabled: Boolean(teamId),
  });

  usePageTitle(
    teamQuery.data ? `${teamQuery.data.name} — ${t("admin.teams.details.title")}` : t("admin.teams.details.title"),
  );

  if (teamQuery.isLoading) {
    return <LoadingScreen />;
  }

  if (teamQuery.isError || !teamQuery.data) {
    return (
      <ErrorScreen
        message={t("admin.teams.error")}
        onRetry={() => {
          void teamQuery.refetch();
        }}
      />
    );
  }

  const team = teamQuery.data;
  const members = membersQuery.data ?? [];
  const submissions = submissionsQuery.data ?? [];
  const decisions = decisionsQuery.data ?? [];

  const templateLabelByKey = new Map<string, string>();
  for (const template of rejectionTemplatesQuery.data ?? []) {
    templateLabelByKey.set(`${template.checkpoint_code}:${template.code}`, template.label);
  }

  const rejectedDecision = decisions.find((decision) => decision.decision === "rejected") ?? null;
  const rejectedReasonLabel =
    rejectedDecision?.reason_code == null
      ? null
      : templateLabelByKey.get(`${rejectedDecision.checkpoint_code}:${rejectedDecision.reason_code}`)
        ?? rejectedDecision.reason_code;

  const getSubmissionForCp = (code: CheckpointCode) =>
    submissions.find((submission) => submission.checkpoint_code === code) ?? null;
  const getDecisionForCp = (code: CheckpointCode) =>
    decisions.find((decision) => decision.checkpoint_code === code) ?? null;

  return (
    <div className="space-y-5">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          void navigate(backTo);
        }}
      >
        <ArrowLeft className="mr-2 size-4" />
        {t("admin.teams.details.back")}
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <Users className="size-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">{team.name}</CardTitle>
              <CardDescription>
                {t("admin.teams.details.field.status")}:{" "}
                <Badge variant="outline" className={`ml-1 ${getStatusBadgeClass(team.status)}`}>
                  {t(`dashboard.status.${team.status}`)}
                </Badge>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {rejectedDecision && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className="size-5 text-destructive" />
              <CardTitle className="text-base text-destructive">Дисквалификация</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Чекпойнт:</span> {rejectedDecision.checkpoint_code.toUpperCase()}
            </p>
            {rejectedReasonLabel && (
              <p>
                <span className="font-medium">Причина:</span> {rejectedReasonLabel}
              </p>
            )}
            {rejectedDecision.admin_comment && (
              <p className="text-muted-foreground">{rejectedDecision.admin_comment}</p>
            )}
            <p className="text-xs text-muted-foreground">Обновлено: {formatDate(rejectedDecision.decided_at)}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <User className="size-5 text-muted-foreground" />
            <CardTitle className="text-base">{t("admin.teams.details.captain.section")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium">{t("admin.teams.details.field.firstName")}</p>
              <p className="text-sm text-muted-foreground">{team.captain.first_name || "—"}</p>
            </div>
            <div>
              <p className="text-sm font-medium">{t("admin.teams.details.field.lastName")}</p>
              <p className="text-sm text-muted-foreground">{team.captain.last_name || "—"}</p>
            </div>
            <div>
              <p className="text-sm font-medium">{t("admin.teams.details.field.email")}</p>
              <p className="text-sm text-muted-foreground">{team.captain.email || "—"}</p>
            </div>
            <div>
              <p className="text-sm font-medium">{t("admin.teams.details.field.telegram")}</p>
              <p className="text-sm text-muted-foreground">{team.captain.telegram || "—"}</p>
            </div>
            <div>
              <p className="text-sm font-medium">{t("admin.teams.details.field.school")}</p>
              <p className="text-sm text-muted-foreground">{team.captain.school_name || "—"}</p>
            </div>
            <div>
              <p className="text-sm font-medium">{t("admin.teams.details.field.grade")}</p>
              <p className="text-sm text-muted-foreground">{team.captain.grade || "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Users className="size-5 text-muted-foreground" />
            <CardTitle className="text-base">{t("admin.teams.details.members.section")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {membersQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("admin.teams.empty")}</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {members.map((member) => (
                  <div key={member.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">
                        {member.first_name || "—"} {member.last_name || "—"}
                      </p>
                      {member.is_captain && (
                        <Badge variant="secondary">{t("admin.teams.details.member.captain")}</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{member.email || "—"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{member.telegram || "—"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{member.phone || "—"}</p>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.teams.details.field.firstName")}</TableHead>
                      <TableHead>{t("admin.teams.details.field.lastName")}</TableHead>
                      <TableHead className="hidden sm:table-cell">{t("admin.teams.details.field.email")}</TableHead>
                      <TableHead className="hidden md:table-cell">{t("admin.teams.details.field.telegram")}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t("admin.teams.details.field.phone")}</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.first_name || "—"}</TableCell>
                        <TableCell>{member.last_name || "—"}</TableCell>
                        <TableCell className="hidden sm:table-cell">{member.email || "—"}</TableCell>
                        <TableCell className="hidden md:table-cell">{member.telegram || "—"}</TableCell>
                        <TableCell className="hidden lg:table-cell">{member.phone || "—"}</TableCell>
                        <TableCell>
                          {member.is_captain && (
                            <Badge variant="secondary">{t("admin.teams.details.member.captain")}</Badge>
                          )}
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Чекпойнты команды</CardTitle>
          <CardDescription>Проверка сдачи и решений по каждому чекпойнту.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="cp0" className="space-y-4">
            <TabsList className="w-full min-w-max justify-start overflow-x-auto">
              {CP_CODES.map((code) => (
                <TabsTrigger key={code} value={code}>
                  {code.toUpperCase()}
                </TabsTrigger>
              ))}
            </TabsList>

            {CP_CODES.map((code) => (
              <TabsContent key={code} value={code}>
                <AdminCheckpointTab
                  teamId={team.id}
                  teamName={team.name}
                  teamStatus={team.status}
                  cpCode={code}
                  submission={getSubmissionForCp(code)}
                  decision={getDecisionForCp(code)}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Сводка жюри</CardTitle>
          <CardDescription>Оценки жюри по финальному этапу для команды {team.name}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {jurySummaryQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : jurySummaryQuery.isError || !jurySummaryQuery.data ? (
            <p className="text-sm text-destructive">Не удалось загрузить сводку жюри.</p>
          ) : jurySummaryQuery.data.assessment_count === 0 ? (
            <p className="text-sm text-muted-foreground">У этой команды пока нет оценок жюри.</p>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <div className="text-xs text-muted-foreground">Оценок</div>
                  <div className="mt-1 text-2xl font-semibold">{jurySummaryQuery.data.assessment_count}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-xs text-muted-foreground">Средний итог</div>
                  <div className="mt-1 text-2xl font-semibold">
                    {jurySummaryQuery.data.total_average?.toFixed(2) ?? "—"} / {jurySummaryQuery.data.max_total}
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-xs text-muted-foreground">Критериев</div>
                  <div className="mt-1 text-2xl font-semibold">{jurySummaryQuery.data.criteria.length}</div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Средние баллы по критериям</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {jurySummaryQuery.data.criteria.map((criterion) => (
                    <div key={criterion.criterion_id} className="rounded-lg border p-4">
                      <div className="font-medium">{criterion.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {criterion.average_score?.toFixed(2) ?? "—"} / {criterion.max_points}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium">Оценки по членам жюри</h3>
                {jurySummaryQuery.data.assessments.map((entry) => (
                  <div key={entry.assessment.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">
                          {entry.jury?.first_name ?? "Жюри"} {entry.jury?.last_name ?? ""}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Обновлено {new Date(entry.assessment.updated_at).toLocaleString("ru-RU", { timeZone: "Asia/Almaty" })}
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {entry.total_score} / {jurySummaryQuery.data.max_total}
                      </Badge>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {entry.scores.map((score) => (
                        <div key={score.criterion_id} className="rounded-md bg-muted/40 p-3">
                          <div className="text-sm font-medium">{score.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {score.score ?? "—"} / {score.max_points}
                          </div>
                        </div>
                      ))}
                    </div>

                    {entry.assessment.overall_comment && (
                      <div className="mt-3 whitespace-pre-wrap rounded-md border bg-muted/20 p-3 text-sm">
                        {entry.assessment.overall_comment}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
