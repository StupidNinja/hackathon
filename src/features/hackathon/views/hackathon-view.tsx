import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Clock, Lock, ArrowRight, Timer } from "lucide-react";
import {
  getOnboardingSnapshot,
  getSubmissionsForTeam,
  getDecisionsForTeam,
} from "@/common/api/supabase";
import type { CheckpointCode, SubmissionRow, CheckpointDecisionRow } from "@/common/api/supabase";
import { useAuthStore } from "@/common/auth/authStore";
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
import { useHackathonTime, formatTimeRemaining } from "@/common/hooks/use-hackathon-time";
import { useI18n } from "@/common/i18n/use-i18n";
import { usePageTitle } from "@/common/hooks/use-page-title";

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
      className:
        "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    },
    open: {
      label: t("hackathon.status.open"),
      className:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
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
      className:
        "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
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
  if (status === "submitted")
    return (
      <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
    );
  if (status === "open" || status === "draft")
    return <Timer className="size-5 text-blue-600 dark:text-blue-400" />;
  if (status === "late" || status === "disqualified")
    return <AlertTriangle className="size-5 text-red-500" />;
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
    Boolean(timing.hasStarted && teamId && submissionsQuery.isLoading);

  if (isLoading) return <LoadingScreen message={t("hackathon.loading")} />;
  if (timing.isError || snapshotQuery.isError) {
    return <ErrorScreen message={t("hackathon.error")} />;
  }

  const submissions = submissionsQuery.data ?? [];
  const decisions = decisionsQuery.data ?? [];
  const teamDisqualified = teamStatus === "disqualified";

  const submissionMap = new Map<CheckpointCode, SubmissionRow>(
    submissions.map((s) => [s.checkpoint_code, s]),
  );
  const decisionMap = new Map<CheckpointCode, CheckpointDecisionRow>(
    decisions.map((d) => [d.checkpoint_code, d]),
  );

  const rejectedDecision = decisions.find((d) => d.decision === "rejected");
  const activeCheckpoint = timing.checkpoints.find((cp) => cp.isOpen) ?? null;

  // Not started state
  if (!timing.hasStarted) {
    return (
      <div className="mx-auto flex min-h-[76vh] w-full max-w-3xl items-center justify-center py-6">
        <Card className="w-full">
          <CardHeader className="border-b bg-muted/30 px-6 py-6">
            <CardTitle className="text-xl">{t("hackathon.pageTitle")}</CardTitle>
            <CardDescription>{t("hackathon.description")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Clock className="size-12 text-muted-foreground/40" />
            <p className="text-lg font-medium">{t("hackathon.notStarted.title")}</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {t("hackathon.notStarted.desc")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 py-2">
      {/* Disqualification banner */}
      {teamDisqualified && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className="size-5 text-destructive" />
              <div>
                <CardTitle className="text-base text-destructive">
                  {t("dashboard.disqualification.title")}
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          {rejectedDecision?.admin_comment && (
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {rejectedDecision.admin_comment}
              </p>
            </CardContent>
          )}
        </Card>
      )}

      {/* Timeline */}
      {!teamDisqualified && activeCheckpoint && (
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20">
          <CardHeader className="py-4">
            <CardDescription>{t("hackathon.timeline.currentTitle")}</CardDescription>
            <CardTitle className="text-base">{activeCheckpoint.title}</CardTitle>
            {activeCheckpoint.timeRemainingMs > 0 && (
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {t("hackathon.timeline.timeLeft", {
                  time: formatTimeRemaining(activeCheckpoint.timeRemainingMs),
                })}
              </p>
            )}
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader className="border-b bg-muted/30 px-6 py-5">
          <CardTitle className="text-lg">{t("hackathon.timeline.title")}</CardTitle>
          <CardDescription>{t("hackathon.timeline.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {timing.checkpoints.map((cp) => {
              const submission = submissionMap.get(cp.code) ?? null;
              const decision = decisionMap.get(cp.code) ?? null;
              const status = getCpStatus(
                cp.isUpcoming,
                cp.isOpen,
                cp.isLocked,
                submission,
                decision,
                teamDisqualified,
              );
              const canOpen =
                !teamDisqualified && status !== "upcoming";

              return (
                <div key={cp.code} className="flex items-center gap-4 px-6 py-4">
                  {/* Icon */}
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-background">
                    <CpIcon status={status} />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{cp.title}</span>
                      <StatusBadge status={status} />
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {cp.dueTime && (
                        <span>
                          {t("hackathon.timeline.deadline", {
                            time: dateFormatter.format(cp.dueTime),
                          })}
                        </span>
                      )}
                      {cp.isOpen && cp.timeRemainingMs > 0 && (
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          {t("hackathon.timeline.timeLeft", {
                            time: formatTimeRemaining(cp.timeRemainingMs),
                          })}
                        </span>
                      )}
                      {cp.isUpcoming && cp.openTime && (
                        <>
                          <span>
                            {t("hackathon.timeline.startsAt", {
                              time: dateFormatter.format(cp.openTime),
                            })}
                          </span>
                          {cp.timeUntilOpenMs > 0 && (
                            <span className="font-medium text-amber-600 dark:text-amber-400">
                              {t("hackathon.timeline.startsIn", {
                                time: formatTimeRemaining(cp.timeUntilOpenMs),
                              })}
                            </span>
                          )}
                        </>
                      )}
                      {submission?.submitted_at && (
                        <span className="text-green-600 dark:text-green-400">
                          {t("hackathon.form.submittedAt", {
                            time: dateFormatter.format(
                              new Date(submission.submitted_at),
                            ),
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action */}
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
                      <Link to={`/hackathon/${cp.code}`}>
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
