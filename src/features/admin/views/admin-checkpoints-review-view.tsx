import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

import {
  getTeamCheckpointStatuses,
  setCheckpointDecision,
} from "@/common/api/supabase";
import type {
  CheckpointCode,
  DecisionType,
  TeamCheckpointStatusRow,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/common/components/ui/tabs";
import { LoadingScreen } from "@/common/components/loading-screen";
import { usePageTitle } from "@/common/hooks/use-page-title";
import { useI18n } from "@/common/i18n/use-i18n";
import { AdminCpRejectDialog } from "@/features/admin/components/admin-cp-reject-dialog";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

type FilterCategory = "all" | "not_submitted" | "under_review" | "advanced" | "rejected";

const CP_CODES: CheckpointCode[] = ["cp0", "cp1", "cp2", "cp3"];

const FILTER_CATEGORIES: FilterCategory[] = [
  "all",
  "not_submitted",
  "under_review",
  "advanced",
  "rejected",
];

function getEffectiveCategory(row: TeamCheckpointStatusRow): FilterCategory {
  if (!row.submission || row.submission.status === "draft") return "not_submitted";
  const d = row.decision?.decision;
  if (d === "under_review" || d === "advanced" || d === "rejected") return d;
  return "under_review"; // submitted but no decision yet → treat as under_review
}

function DecisionBadge({ decision }: { decision: DecisionType | undefined }) {
  const { t } = useI18n();
  if (!decision) return <Badge variant="outline">—</Badge>;
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

type RowActionsProps = {
  row: TeamCheckpointStatusRow;
  cpCode: CheckpointCode;
  onReject: (teamId: string, teamName: string) => void;
};

function RowActions({ row, cpCode, onReject }: RowActionsProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const markMutation = useMutation({
    mutationFn: (d: Extract<DecisionType, "under_review" | "advanced">) =>
      setCheckpointDecision(row.team.id, cpCode, d),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-cp-statuses", cpCode] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    },
  });

  const hasSubmission = row.submission?.status === "submitted";
  const actionsLocked =
    markMutation.isPending ||
    row.team.status === "disqualified" ||
    row.decision?.decision === "rejected";

  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs"
        onClick={() => void navigate(`/admin/teams/${row.team.id}`)}
      >
        {t("admin.checkpoints.actions.view")}
      </Button>
      {hasSubmission && (
        <>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            disabled={actionsLocked || row.decision?.decision === "advanced"}
            onClick={() => markMutation.mutate("advanced")}
          >
            {t("admin.checkpoints.actions.advanced")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
            disabled={actionsLocked}
            onClick={() => onReject(row.team.id, row.team.name)}
          >
            {t("admin.checkpoints.actions.reject")}
          </Button>
        </>
      )}
    </div>
  );
}

export function AdminCheckpointsReviewView() {
  const { t } = useI18n();
  usePageTitle(t("admin.checkpoints.pageTitle"));

  const [selectedCp, setSelectedCp] = useState<CheckpointCode>("cp0");
  const [filter, setFilter] = useState<FilterCategory>("all");
  const [rejectTarget, setRejectTarget] = useState<{
    teamId: string;
    teamName: string;
  } | null>(null);

  const statusQuery = useQuery({
    queryKey: ["admin-cp-statuses", selectedCp],
    queryFn: () => getTeamCheckpointStatuses(selectedCp),
  });

  const rows = statusQuery.data ?? [];
  const filteredRows =
    filter === "all" ? rows : rows.filter((r) => getEffectiveCategory(r) === filter);

  const counts: Record<FilterCategory, number> = {
    all: rows.length,
    not_submitted: rows.filter((r) => getEffectiveCategory(r) === "not_submitted").length,
    under_review: rows.filter((r) => getEffectiveCategory(r) === "under_review").length,
    advanced: rows.filter((r) => getEffectiveCategory(r) === "advanced").length,
    rejected: rows.filter((r) => getEffectiveCategory(r) === "rejected").length,
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{t("admin.checkpoints.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("admin.checkpoints.desc")}</p>
      </div>

      {/* CP selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">
          {t("admin.checkpoints.selectCp")}:
        </span>
        <Select
          value={selectedCp}
          onValueChange={(v) => {
            setSelectedCp(v as CheckpointCode);
            setFilter("all");
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CP_CODES.map((code) => (
              <SelectItem key={code} value={code}>
                {code.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-base">
            {selectedCp.toUpperCase()}
          </CardTitle>
          <CardDescription>
            {rows.length} {t("admin.teams.count")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Filter tabs */}
          <div className="border-b px-4 pt-3">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterCategory)}>
              <TabsList className="h-8 gap-0 bg-transparent p-0">
                {FILTER_CATEGORIES.map((cat) => (
                  <TabsTrigger
                    key={cat}
                    value={cat}
                    className="h-8 rounded-none border-b-2 border-transparent px-3 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    {t(
                      `admin.checkpoints.filter.${cat}` as `admin.checkpoints.filter.all`,
                    )}
                    <span className="ml-1.5 tabular-nums text-muted-foreground">
                      {counts[cat]}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Table */}
          {statusQuery.isLoading ? (
            <div className="p-4">
              <LoadingScreen message={t("common.loading")} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.checkpoints.table.team")}</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      {t("admin.checkpoints.table.captain")}
                    </TableHead>
                    <TableHead>{t("admin.checkpoints.table.submission")}</TableHead>
                    <TableHead className="hidden md:table-cell">
                      {t("admin.checkpoints.table.submittedAt")}
                    </TableHead>
                    <TableHead>{t("admin.checkpoints.table.decision")}</TableHead>
                    <TableHead>{t("admin.checkpoints.table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        {t("admin.teams.empty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row) => (
                      <TableRow key={row.team.id}>
                        <TableCell className="font-medium">
                          {row.team.name}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {row.team.captain.first_name}{" "}
                          {row.team.captain.last_name}
                        </TableCell>
                        <TableCell>
                          {!row.submission || row.submission.status === "draft" ? (
                            <Badge variant="outline">
                              {row.submission
                                ? t("admin.checkpoints.submission.draft")
                                : t("admin.checkpoints.submission.missing")}
                            </Badge>
                          ) : (
                            <Badge>
                              {t("admin.checkpoints.submission.submitted")}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {row.submission?.submitted_at
                            ? dateFormatter.format(
                                new Date(row.submission.submitted_at),
                              )
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <DecisionBadge
                            decision={row.decision?.decision}
                          />
                        </TableCell>
                        <TableCell>
                          <RowActions
                            row={row}
                            cpCode={selectedCp}
                            onReject={(teamId, teamName) =>
                              setRejectTarget({ teamId, teamName })
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject dialog */}
      {rejectTarget && (
        <AdminCpRejectDialog
          teamId={rejectTarget.teamId}
          teamName={rejectTarget.teamName}
          cpCode={selectedCp}
          open={Boolean(rejectTarget)}
          onOpenChange={(open) => {
            if (!open) setRejectTarget(null);
          }}
        />
      )}
    </div>
  );
}
