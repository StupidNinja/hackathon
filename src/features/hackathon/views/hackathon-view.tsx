import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Lock,
  Timer,
} from "lucide-react";
import {
  getDecisionsForTeam,
  getOnboardingSnapshot,
  getSubmissionsForTeam,
} from "@/common/api/supabase";
import type {
  CheckpointCode,
  CheckpointDecisionRow,
  SubmissionRow,
} from "@/common/api/supabase";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { ErrorScreen, LoadingScreen } from "@/common/components/loading-screen";
import {
  formatTimeRemaining,
  useHackathonTime,
} from "@/common/hooks/use-hackathon-time";
import { useI18n } from "@/common/i18n/use-i18n";
import { usePageTitle } from "@/common/hooks/use-page-title";
import { useAuthStore } from "@/common/auth/authStore";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

type CpStatus =
  | "upcoming"
  | "open"
  | "draft"
  | "submitted"
  | "late"
  | "locked"
  | "disqualified";

function getCpStatus(
  isUpcoming: boolean,
  isOpen: boolean,
  isLocked: boolean,
  submission: SubmissionRow | null,
  decision: CheckpointDecisionRow | null,
  teamDisqualified: boolean,
): CpStatus {
  if (teamDisqualified || decision?.decision === "rejected") return "disqualified";
  if (isUpcoming) return "upcoming";
  if (isLocked) {
    if (submission?.status === "submitted") return "submitted";
    return "late";
  }
  if (isOpen) {
    if (submission?.status === "submitted") return "submitted";
    if (submission?.status === "draft") return "draft";
    return "open";
  }
  return "locked";
}

function StatusBadge({ status }: { status: CpStatus }) {
  const { t } = useI18n();

  const variantMap: Record<CpStatus, { label: string; className: string }> = {
    upcoming: {
      label: t("hackathon.status.upcoming"),
      className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    },
    open: {
      label: t("hackathon.status.open"),
      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    },
    draft: {
      label: t("hackathon.status.draft"),
      className:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
    },
    submitted: {
      label: t("hackathon.status.submitted"),
      className:
        "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    },
    late: {
      label: t("hackathon.status.late"),
      className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    },
    locked: {
      label: t("hackathon.status.locked"),
      className: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
    },
    disqualified: {
      label: t("hackathon.status.disqualified"),
      className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    },
  };

  const { label, className } = variantMap[status];
  return (
    <Badge className={`text-xs font-medium ${className}`} variant="outline">
      {label}
    </Badge>
  );
}

function CpIcon({ status }: { status: CpStatus }) {
  if (status === "submitted") {
    return <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />;
  }
  if (status === "open" || status === "draft") {
    return <Timer className="size-5 text-blue-600 dark:text-blue-400" />;
  }
  if (status === "late" || status === "disqualified") {
    return <AlertTriangle className="size-5 text-red-500" />;
  }
  if (status === "upcoming") {
    return <Clock className="size-5 text-amber-600 dark:text-amber-400" />;
  }
  return <Lock className="size-5 text-muted-foreground" />;
}

export function HackathonView() {
  const { t } = useI18n();
  usePageTitle(t("hackathon.pageTitle"));

  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? null;
  const timing = useHackathonTime();

  const snapshotQuery = useQuery({
    queryKey: ["onboarding", "snapshot", userId],
    queryFn: () => getOnboardingSnapshot(userId),
    enabled: Boolean(userId),
  });

  const teamId = snapshotQuery.data?.team?.id ?? null;
  const teamStatus = snapshotQuery.data?.team?.status;

  const submissionsQuery = useQuery({
    queryKey: ["submissions", teamId],
    queryFn: () => getSubmissionsForTeam(teamId!),
    enabled: Boolean(teamId) && timing.hasStarted,
  });

  const decisionsQuery = useQuery({
    queryKey: ["decisions-team", teamId],
    queryFn: () => getDecisionsForTeam(teamId!),
    enabled: Boolean(teamId) && timing.hasStarted,
  });

  const isLoading =
    timing.isLoading ||
    snapshotQuery.isLoading ||
    Boolean(
      timing.hasStarted &&
        teamId &&
        (submissionsQuery.isLoading || decisionsQuery.isLoading),
    );

  if (isLoading) return <LoadingScreen message={t("hackathon.loading")} />;
  if (timing.isError || snapshotQuery.isError) {
    return <ErrorScreen message={t("hackathon.error")} />;
  }

  const submissions = submissionsQuery.data ?? [];
  const decisions = decisionsQuery.data ?? [];
  const teamDisqualified =
    teamStatus === "disqualified" ||
    decisions.some((decision) => decision.decision === "rejected");

  const submissionMap = new Map<CheckpointCode, SubmissionRow>(
    submissions.map((submission) => [submission.checkpoint_code, submission]),
  );
  const decisionMap = new Map<CheckpointCode, CheckpointDecisionRow>(
    decisions.map((decision) => [decision.checkpoint_code, decision]),
  );

  const timeUntilT0Ms = timing.t0
    ? Math.max(0, timing.t0.getTime() - timing.virtualNow.getTime())
    : 0;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 py-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("hackathon.t0.title")}</CardTitle>
          <CardDescription>
            {timing.t0
              ? timing.hasStarted
                ? t("hackathon.t0.startedAt", {
                    time: dateFormatter.format(timing.t0),
                  })
                : t("hackathon.t0.startsAt", {
                    time: dateFormatter.format(timing.t0),
                  })
              : t("hackathon.t0.notSet")}
          </CardDescription>
        </CardHeader>
        {timing.t0 && !timing.hasStarted && timeUntilT0Ms > 0 && (
          <CardContent className="pt-0">
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
              {t("hackathon.t0.startsIn", {
                time: formatTimeRemaining(timeUntilT0Ms),
              })}
            </p>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader className="border-b bg-muted/30 px-6 py-5">
          <CardTitle className="text-lg">{t("hackathon.timeline.title")}</CardTitle>
          <CardDescription>{t("hackathon.timeline.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {timing.checkpoints.map((checkpoint) => {
              const submission = submissionMap.get(checkpoint.code) ?? null;
              const decision = decisionMap.get(checkpoint.code) ?? null;
              const status = getCpStatus(
                checkpoint.isUpcoming,
                checkpoint.isOpen,
                checkpoint.isLocked,
                submission,
                decision,
                teamDisqualified,
              );

              const canOpen = !teamDisqualified && status !== "upcoming";

              return (
                <div
                  key={checkpoint.code}
                  className="flex items-center gap-4 px-6 py-4"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-background">
                    <CpIcon status={status} />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{checkpoint.title}</span>
                      <StatusBadge status={status} />
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {checkpoint.dueTime && (
                        <span>
                          {t("hackathon.timeline.deadline", {
                            time: dateFormatter.format(checkpoint.dueTime),
                          })}
                        </span>
                      )}
                      {checkpoint.isOpen && checkpoint.timeRemainingMs > 0 && (
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          {t("hackathon.timeline.timeLeft", {
                            time: formatTimeRemaining(checkpoint.timeRemainingMs),
                          })}
                        </span>
                      )}
                      {checkpoint.isUpcoming && checkpoint.openTime && (
                        <>
                          <span>
                            {t("hackathon.timeline.startsAt", {
                              time: dateFormatter.format(checkpoint.openTime),
                            })}
                          </span>
                          {checkpoint.timeUntilOpenMs > 0 && (
                            <span className="font-medium text-amber-600 dark:text-amber-400">
                              {t("hackathon.timeline.startsIn", {
                                time: formatTimeRemaining(checkpoint.timeUntilOpenMs),
                              })}
                            </span>
                          )}
                        </>
                      )}
                      {checkpoint.isUpcoming && !checkpoint.openTime && (
                        <span>{t("hackathon.timeline.afterT0")}</span>
                      )}
                    </div>
                  </div>

                  {canOpen && (
                    <Button
                      asChild
                      variant={
                        status === "open" || status === "draft"
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      className="shrink-0"
                    >
                      <Link to={`/hackathon/${checkpoint.code}`}>
                        {t("hackathon.timeline.open")}
                        <ArrowRight className="ml-1 size-3" />
                      </Link>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
