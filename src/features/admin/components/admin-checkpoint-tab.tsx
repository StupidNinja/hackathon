import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

import {
  getCheckpointRejectionTemplates,
  setCheckpointDecision,
} from "@/common/api/supabase";
import type {
  CheckpointCode,
  CheckpointDecisionRow,
  DecisionType,
  SubmissionRow,
} from "@/common/api/supabase";
import { useI18n } from "@/common/i18n/use-i18n";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { AdminCpRejectDialog } from "./admin-cp-reject-dialog";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function DecisionBadge({ decision }: { decision: DecisionType }) {
  const { t } = useI18n();
  const label = t(
    `admin.checkpoints.decision.${decision}` as `admin.checkpoints.decision.under_review`,
  );

  switch (decision) {
    case "advanced":
      return <Badge className="bg-green-600 hover:bg-green-600">{label}</Badge>;
    case "rejected":
      return <Badge variant="destructive">{label}</Badge>;
    case "under_review":
      return <Badge variant="secondary">{label}</Badge>;
  }
}

function formatPayloadValue(value: unknown): string {
  if (typeof value === "boolean") {
    return value ? "Да" : "Нет";
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "bigint"
  ) {
    return `${value}`;
  }
  if (typeof value === "symbol") {
    return value.toString();
  }
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value, null, 2);
  }

  return "[unsupported value]";
}

function PayloadField({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === "") return null;

  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm whitespace-pre-wrap break-words">
        {formatPayloadValue(value)}
      </dd>
    </div>
  );
}

const CP_PAYLOAD_LABELS: Record<string, string> = {
  confirmed: "Участие подтверждено",
  topic: "Тема",
  short_description: "Краткое описание",
  target_audience: "Целевая аудитория",
  doc_link: "Ссылка на документ",
  git_url: "Git-репозиторий",
  implemented: "Реализовано",
  run_instructions: "Инструкция запуска",
  build_link: "Финальная сборка",
  presentation_link: "Презентация",
  repo_url: "Репозиторий (CP3)",
  summary: "Итог",
};

type Props = {
  teamId: string;
  teamName: string;
  teamStatus: "registered" | "cancelled" | "disqualified";
  cpCode: CheckpointCode;
  submission: SubmissionRow | null;
  decision: CheckpointDecisionRow | null;
};

export function AdminCheckpointTab({
  teamId,
  teamName,
  teamStatus,
  cpCode,
  submission,
  decision,
}: Props) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const templatesQuery = useQuery({
    queryKey: ["checkpoint-rejection-templates", cpCode, "all"],
    queryFn: () => getCheckpointRejectionTemplates({ checkpointCode: cpCode }),
    enabled: Boolean(decision?.reason_code),
  });

  const markMutation = useMutation({
    mutationFn: (nextDecision: Extract<DecisionType, "under_review" | "advanced">) =>
      setCheckpointDecision(teamId, cpCode, nextDecision),
    onSuccess: () => {
      toast.success(t("admin.checkpoints.actions.view"));
      void queryClient.invalidateQueries({ queryKey: ["admin-team-decisions", teamId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-cp-statuses", cpCode] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    },
  });

  if (!submission) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        {t("admin.checkpoints.tab.noSubmission")}
      </p>
    );
  }

  const payload = submission.payload;
  const actionsLocked =
    markMutation.isPending ||
    teamStatus === "disqualified" ||
    decision?.decision === "rejected";
  const reasonLabel =
    decision?.reason_code == null
      ? null
      : (templatesQuery.data ?? []).find((template) => template.code === decision.reason_code)
          ?.label ?? decision.reason_code;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <span>
          <strong>{t("admin.checkpoints.table.submission")}: </strong>
          {submission.status === "submitted"
            ? t("admin.checkpoints.submission.submitted")
            : t("admin.checkpoints.submission.draft")}
        </span>
        {submission.submitted_at && (
          <span>
            {t("admin.checkpoints.tab.submittedAt", {
              time: dateFormatter.format(new Date(submission.submitted_at)),
            })}
          </span>
        )}
        <span>
          {t("admin.checkpoints.tab.updatedAt", {
            time: dateFormatter.format(new Date(submission.updated_at)),
          })}
        </span>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        {Object.entries(payload).map(([key, value]) => (
          <PayloadField
            key={key}
            label={CP_PAYLOAD_LABELS[key] ?? key}
            value={value}
          />
        ))}
      </dl>

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">
          {t("admin.checkpoints.table.decision")}:
        </span>
        {decision ? (
          <>
            <DecisionBadge decision={decision.decision} />
            {reasonLabel && (
              <span className="text-xs text-muted-foreground">{reasonLabel}</span>
            )}
            {decision.admin_comment && (
              <span className="text-xs text-muted-foreground italic">
                "{decision.admin_comment}"
              </span>
            )}
          </>
        ) : (
          <span className="text-sm text-muted-foreground">
            {t("admin.checkpoints.tab.noDecision")}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={actionsLocked || decision?.decision === "under_review"}
          onClick={() => markMutation.mutate("under_review")}
        >
          <Clock className="mr-1.5 size-3.5" />
          {t("admin.checkpoints.actions.under_review")}
        </Button>
        <Button
          size="sm"
          variant="default"
          className="bg-green-600 hover:bg-green-700"
          disabled={actionsLocked || decision?.decision === "advanced"}
          onClick={() => markMutation.mutate("advanced")}
        >
          <CheckCircle2 className="mr-1.5 size-3.5" />
          {t("admin.checkpoints.actions.advanced")}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={actionsLocked}
          onClick={() => setShowRejectDialog(true)}
        >
          <XCircle className="mr-1.5 size-3.5" />
          {t("admin.checkpoints.actions.reject")}
        </Button>
      </div>

      <AdminCpRejectDialog
        teamId={teamId}
        teamName={teamName}
        cpCode={cpCode}
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
      />
    </div>
  );
}
