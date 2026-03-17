import type { ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  CircleSlash2,
  Send,
  Timer,
} from "lucide-react";
import {
  getCheckpointRejectionTemplates,
  getDecisionsForTeam,
  getDisqualificationByTeamId,
  getOnboardingSnapshot,
  getSubmissionsForTeam,
} from "@/common/api/supabase";
import type {
  CheckpointCode,
  CheckpointDecisionRow,
  SubmissionRow,
} from "@/common/api/supabase";
import {
  getDashboardPathForRole,
  getUserRole,
  isStaffRole,
} from "@/common/auth/roles";
import { useAuthStore } from "@/common/auth/authStore";
import { ErrorScreen } from "@/common/components/loading-screen";
import { Button } from "@/common/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Skeleton } from "@/common/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/common/components/ui/tooltip";
import {
  formatTimeRemaining,
  useHackathonTime,
} from "@/common/hooks/use-hackathon-time";
import { useI18n } from "@/common/i18n/use-i18n";
import { usePageTitle } from "@/common/hooks/use-page-title";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

type DashboardCheckpointStatus =
  | "not_submitted"
  | "submitted"
  | "passed"
  | "eliminated";

function getDashboardCheckpointStatus(
  submission: SubmissionRow | null,
  decision: CheckpointDecisionRow | null,
  teamDisqualified: boolean,
): DashboardCheckpointStatus {
  if (teamDisqualified || decision?.decision === "rejected") {
    return "eliminated";
  }

  if (decision?.decision === "advanced") {
    return "passed";
  }

  if (submission?.status === "submitted") {
    return "submitted";
  }

  return "not_submitted";
}

function HomeDashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-36 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function HomeProtectedView() {
  const { t } = useI18n();
  usePageTitle(t("dashboard.pageTitle"));

  const user = useAuthStore((state) => state.user);
  const userId = user?.id ?? null;
  const userRole = getUserRole(user);
  const timing = useHackathonTime();

  const onboardingQuery = useQuery({
    queryKey: ["onboarding", "snapshot", userId],
    queryFn: () => getOnboardingSnapshot(userId),
    enabled: Boolean(userId),
  });

  const teamId = onboardingQuery.data?.team?.id ?? null;
  const shouldLoadProgress = Boolean(teamId) && timing.hasStarted;

  const submissionsQuery = useQuery({
    queryKey: ["submissions", teamId],
    queryFn: () => getSubmissionsForTeam(teamId!),
    enabled: shouldLoadProgress,
  });

  const decisionsQuery = useQuery({
    queryKey: ["decisions-team", teamId],
    queryFn: () => getDecisionsForTeam(teamId!),
    enabled: shouldLoadProgress,
  });

  const disqualifEnabled = onboardingQuery.data?.team?.status === "disqualified";
  const disqualificationQuery = useQuery({
    queryKey: ["team-disqualification", teamId],
    queryFn: () => getDisqualificationByTeamId(teamId!),
    enabled: Boolean(teamId) && disqualifEnabled,
  });
  const rejectionTemplatesQuery = useQuery({
    queryKey: ["checkpoint-rejection-templates", "all"],
    queryFn: () => getCheckpointRejectionTemplates(),
    enabled: shouldLoadProgress,
  });

  if (!userId) {
    return null;
  }

  const isProgressPending =
    shouldLoadProgress &&
    (submissionsQuery.isPending || decisionsQuery.isPending);

  if (onboardingQuery.isPending || timing.isLoading || isProgressPending) {
    return <HomeDashboardSkeleton />;
  }

  const hasProgressError =
    shouldLoadProgress &&
    (submissionsQuery.isError || decisionsQuery.isError);

  if (onboardingQuery.isError || timing.isError || hasProgressError) {
    return <ErrorScreen message={t("dashboard.error")} />;
  }

  if (!onboardingQuery.data) {
    return <ErrorScreen message={t("dashboard.error")} />;
  }

  if (onboardingQuery.data.state === "NO_PROFILE") {
    if (isStaffRole(userRole)) {
      return <Navigate to="/staff/profile" replace />;
    }

    return <Navigate to="/profile" replace />;
  }

  if (onboardingQuery.data.state === "NO_TEAM") {
    return <Navigate to="/team" replace />;
  }

  const profile = onboardingQuery.data.profile;
  const profileRole = profile?.role ?? userRole;

  if (isStaffRole(profileRole) && (!profile?.first_name || !profile?.last_name)) {
    return <Navigate to="/staff/profile" replace />;
  }

  if (isStaffRole(profileRole)) {
    return <Navigate to={getDashboardPathForRole(profileRole)} replace />;
  }

  const team = onboardingQuery.data.team;
  const submissions = submissionsQuery.data ?? [];
  const decisions = decisionsQuery.data ?? [];

  const submissionMap = new Map<CheckpointCode, SubmissionRow>(
    submissions.map((submission) => [submission.checkpoint_code, submission]),
  );
  const decisionMap = new Map<CheckpointCode, CheckpointDecisionRow>(
    decisions.map((decision) => [decision.checkpoint_code, decision]),
  );

  const hasRejectedDecision = decisions.some(
    (decision) => decision.decision === "rejected",
  );
  const teamDisqualified = team?.status === "disqualified" || hasRejectedDecision;
  const rejectedDecision = decisions.find((decision) => decision.decision === "rejected") ?? null;
  const templateLabelByKey = new Map<string, string>();
  for (const template of rejectionTemplatesQuery.data ?? []) {
    templateLabelByKey.set(`${template.checkpoint_code}:${template.code}`, template.label);
  }
  const rejectedReasonLabel =
    rejectedDecision?.reason_code == null
      ? null
      : templateLabelByKey.get(
          `${rejectedDecision.checkpoint_code}:${rejectedDecision.reason_code}`,
        ) ?? rejectedDecision.reason_code;

  const cp3Decision = decisionMap.get("cp3") ?? null;
  const teamOutcome = teamDisqualified
    ? "disqualified"
    : cp3Decision?.decision === "advanced"
      ? "finalist"
      : "in_progress";

  const currentCheckpoint = timing.checkpoints.find((cp) => cp.isOpen) ?? null;
  const upcomingCheckpoint = timing.checkpoints.find((cp) => cp.isUpcoming) ?? null;
  const checkpointCardItem = currentCheckpoint ?? upcomingCheckpoint ?? null;

  const checkpointStatuses = timing.checkpoints.map((checkpoint) => {
    const submission = submissionMap.get(checkpoint.code) ?? null;
    const decision = decisionMap.get(checkpoint.code) ?? null;
    const status = getDashboardCheckpointStatus(submission, decision, teamDisqualified);
    return { checkpoint, status };
  });

  const teamStatusConfig = {
    disqualified: {
      title: t("dashboard.teamStatus.disqualified"),
      description: t("dashboard.teamStatus.disqualifiedHint"),
      className: "border-destructive/30 bg-destructive/5",
    },
    finalist: {
      title: t("dashboard.teamStatus.finalist"),
      description: t("dashboard.teamStatus.finalistHint"),
      className: "border-emerald-300/40 bg-emerald-50/70 dark:bg-emerald-950/20",
    },
    in_progress: {
      title: t("dashboard.teamStatus.inProgress"),
      description: t("dashboard.teamStatus.inProgressHint"),
      className: "border-amber-300/40 bg-amber-50/70 dark:bg-amber-950/20",
    },
  } as const;

  const showTeamStatusCard = teamOutcome !== "in_progress";

  const checkpointStatusConfig: Record<
    DashboardCheckpointStatus,
    {
      label: string;
      hint: string;
      className: string;
      icon: ComponentType<{ className?: string }>;
    }
  > = {
    not_submitted: {
      label: t("dashboard.checkpointStatus.notSubmitted"),
      hint: t("dashboard.checkpointStatus.notSubmittedHint"),
      className: "border-muted bg-muted/40 text-muted-foreground",
      icon: CircleSlash2,
    },
    submitted: {
      label: t("dashboard.checkpointStatus.submitted"),
      hint: t("dashboard.checkpointStatus.submittedHint"),
      className: "border-blue-300/50 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300",
      icon: CheckCircle2,
    },
    passed: {
      label: t("dashboard.checkpointStatus.passed"),
      hint: t("dashboard.checkpointStatus.passedHint"),
      className:
        "border-emerald-300/50 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
      icon: BadgeCheck,
    },
    eliminated: {
      label: t("dashboard.checkpointStatus.eliminated"),
      hint: t("dashboard.checkpointStatus.eliminatedHint"),
      className:
        "border-destructive/40 bg-destructive/10 text-destructive dark:bg-destructive/20",
      icon: AlertTriangle,
    },
  };

  return (
    <div className="space-y-4">
      <Card className="border-blue-200 bg-blue-50/70 dark:border-blue-900 dark:bg-blue-950/30">
        <CardHeader>
          <CardTitle className="text-base">{t("dashboard.telegram.title")}</CardTitle>
          <CardDescription>{t("dashboard.telegram.desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href="https://t.me/+WmFh6nzgDKY5NDky"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Send className="size-4" />
            {t("dashboard.telegram.join")}
          </a>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Timer className="size-4 text-primary" />
            {t("dashboard.currentCheckpoint.title")}
          </CardTitle>
          <CardDescription>
            {checkpointCardItem
              ? currentCheckpoint
                ? t("dashboard.currentCheckpoint.active")
                : t("dashboard.currentCheckpoint.upcoming")
              : t("dashboard.currentCheckpoint.empty")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {checkpointCardItem ? (
            <>
              <div className="text-sm font-medium">{checkpointCardItem.title}</div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {checkpointCardItem.isOpen && checkpointCardItem.timeRemainingMs > 0 && (
                  <span className="font-medium text-primary">
                    {t("dashboard.currentCheckpoint.timeLeft", {
                      time: formatTimeRemaining(checkpointCardItem.timeRemainingMs),
                    })}
                  </span>
                )}
                {checkpointCardItem.isUpcoming && checkpointCardItem.openTime && (
                  <>
                    <span>
                      {t("dashboard.currentCheckpoint.startsAt", {
                        time: dateFormatter.format(checkpointCardItem.openTime),
                      })}
                    </span>
                    {checkpointCardItem.timeUntilOpenMs > 0 && (
                      <span className="font-medium text-amber-600 dark:text-amber-400">
                        {t("dashboard.currentCheckpoint.startsIn", {
                          time: formatTimeRemaining(checkpointCardItem.timeUntilOpenMs),
                        })}
                      </span>
                    )}
                  </>
                )}
              </div>
              <div>
                <Button
                  asChild
                  size="sm"
                  variant={currentCheckpoint && !teamDisqualified ? "default" : "outline"}
                >
                  <Link
                    to={
                      currentCheckpoint && !teamDisqualified
                        ? `/hackathon/${currentCheckpoint.code}`
                        : "/hackathon"
                    }
                  >
                    {currentCheckpoint && !teamDisqualified
                      ? t("dashboard.currentCheckpoint.open")
                      : t("dashboard.currentCheckpoint.openTimeline")}
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <Button asChild size="sm" variant="outline">
              <Link to="/hackathon">{t("dashboard.currentCheckpoint.openTimeline")}</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {showTeamStatusCard && (
        <Card className={teamStatusConfig[teamOutcome].className}>
          <CardHeader>
            <CardTitle className="text-base">{t("dashboard.teamStatus.title")}</CardTitle>
            <CardDescription>{teamStatusConfig[teamOutcome].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm font-medium">{teamStatusConfig[teamOutcome].title}</div>
            {teamOutcome === "disqualified" && (
              <>
                {rejectedReasonLabel && (
                  <p className="text-sm">
                    <span className="font-medium">{t("dashboard.disqualification.reason")}:</span>{" "}
                    {rejectedReasonLabel}
                  </p>
                )}
                {rejectedDecision?.admin_comment && (
                  <p className="text-sm text-muted-foreground">
                    {rejectedDecision.admin_comment}
                  </p>
                )}
                {!rejectedDecision && disqualificationQuery.data && (
                  <>
                    <p className="text-sm">
                      <span className="font-medium">{t("dashboard.disqualification.reason")}:</span>{" "}
                      {t(
                        `admin.teams.disqualify.reason.${
                          disqualificationQuery.data.reason_code
                        }`,
                      )}
                    </p>
                    {disqualificationQuery.data.admin_comment && (
                      <p className="text-sm text-muted-foreground">
                        {disqualificationQuery.data.admin_comment}
                      </p>
                    )}
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("dashboard.checkpointLegend.title")}</CardTitle>
          <CardDescription>{t("dashboard.checkpointLegend.desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <div className="overflow-x-auto pb-1">
              <div className="flex min-w-max items-start gap-0">
                {checkpointStatuses.map(({ checkpoint, status }, index) => {
                  const statusMeta = checkpointStatusConfig[status];
                  const StatusIcon = statusMeta.icon;
                  const hasNext = index < checkpointStatuses.length - 1;

                  return (
                    <div key={checkpoint.code} className="flex items-start">
                      <div className="flex w-36 flex-col items-center px-2 text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className={`flex size-8 items-center justify-center rounded-full border ${statusMeta.className}`}
                              aria-label={`${checkpoint.code.toUpperCase()}: ${statusMeta.label}`}
                            >
                              <StatusIcon className="size-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={8}>
                            {statusMeta.hint}
                          </TooltipContent>
                        </Tooltip>
                        <div className="mt-3 space-y-1">
                          <div className="text-xs font-medium leading-5">{checkpoint.title}</div>
                          <p className="text-[11px] text-muted-foreground">{statusMeta.label}</p>
                        </div>
                      </div>
                      {hasNext && <div className="mt-4 h-px w-8 bg-border" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  );
}
