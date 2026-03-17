import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLocation, useNavigate } from "react-router-dom";

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
import { AdminTablePagination } from "@/features/admin/components/admin-table-pagination";
import { ADMIN_TABLE_SPACING_CLASS } from "@/features/admin/lib/admin-table-styles";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

type FilterCategory = "all" | "not_submitted" | "under_review" | "advanced" | "rejected";

const CP_CODES: CheckpointCode[] = ["cp0", "cp1", "cp2", "cp3"];
const PAGE_SIZE = 20;

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
      return (
        <Badge
          variant="outline"
          className="border-green-300/50 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
        >
          {label}
        </Badge>
      );
    case "rejected":
      return (
        <Badge
          variant="outline"
          className="border-red-300/50 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
        >
          {label}
        </Badge>
      );
    case "under_review":
      return (
        <Badge
          variant="outline"
          className="border-yellow-300/50 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
        >
          {label}
        </Badge>
      );
  }
}

type RowActionsProps = {
  row: TeamCheckpointStatusRow;
  cpCode: CheckpointCode;
  detailsFrom: string;
  onReject: (teamId: string, teamName: string) => void;
};

function RowActions({ row, cpCode, detailsFrom, onReject }: RowActionsProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const markMutation = useMutation({
    mutationFn: (d: Extract<DecisionType, "under_review" | "advanced">) =>
      setCheckpointDecision(row.team.id, cpCode, d),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-cp-statuses", cpCode] });
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
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
        onClick={() =>
          void navigate(`/admin/teams/${row.team.id}`, {
            state: { from: detailsFrom },
          })}
      >
        {t("admin.checkpoints.actions.view")}
      </Button>
      {hasSubmission && (
        <>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs border-green-300/50 bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-300"
            disabled={actionsLocked || row.decision?.decision === "advanced"}
            onClick={() => markMutation.mutate("advanced")}
          >
            {t("admin.checkpoints.actions.advanced")}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-7 px-2 text-xs"
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
  const location = useLocation();
  usePageTitle(t("admin.checkpoints.pageTitle"));

  const [selectedCp, setSelectedCp] = useState<CheckpointCode>("cp0");
  const [filter, setFilter] = useState<FilterCategory>("all");
  const [page, setPage] = useState(1);
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
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagedRows = filteredRows.slice(pageStart, pageStart + PAGE_SIZE);
  const detailsFrom = `${location.pathname}`;

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
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">
          {t("admin.checkpoints.selectCp")}:
        </span>
        <Select
          value={selectedCp}
          onValueChange={(v) => {
            setSelectedCp(v as CheckpointCode);
            setFilter("all");
            setPage(1);
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
          <div className="overflow-x-auto border-b px-4 pt-3">
            <Tabs
              value={filter}
              onValueChange={(v) => {
                setFilter(v as FilterCategory);
                setPage(1);
              }}
            >
              <TabsList className="h-8 min-w-max gap-0 bg-transparent p-0">
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
          ) : filteredRows.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t("admin.teams.empty")}
            </div>
          ) : (
            <>
              <div className="space-y-3 p-4 md:hidden">
                {pagedRows.map((row) => (
                  <Card key={row.team.id}>
                    <CardContent className="space-y-3 p-4">
                      <div>
                        <p className="text-sm font-semibold">{row.team.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.team.captain.first_name} {row.team.captain.last_name}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {!row.submission || row.submission.status === "draft" ? (
                          row.submission ? (
                            <Badge
                              variant="outline"
                              className="border-yellow-300/50 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
                            >
                              {t("admin.checkpoints.submission.draft")}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-gray-200 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            >
                              {t("admin.checkpoints.submission.missing")}
                            </Badge>
                          )
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-green-300/50 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                          >
                            {t("admin.checkpoints.submission.submitted")}
                          </Badge>
                        )}
                        <DecisionBadge decision={row.decision?.decision} />
                      </div>

                      {row.submission?.submitted_at && (
                        <p className="text-xs text-muted-foreground">
                          {t("admin.checkpoints.table.submittedAt")}: {dateFormatter.format(new Date(row.submission.submitted_at))}
                        </p>
                      )}

                      <RowActions
                        row={row}
                        cpCode={selectedCp}
                        detailsFrom={detailsFrom}
                        onReject={(teamId, teamName) => setRejectTarget({ teamId, teamName })}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
              <Table className={ADMIN_TABLE_SPACING_CLASS}>
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
                  {pagedRows.map((row) => (
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
                            row.submission ? (
                              <Badge
                                variant="outline"
                                className="border-yellow-300/50 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
                              >
                                {t("admin.checkpoints.submission.draft")}
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-gray-200 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                              >
                                {t("admin.checkpoints.submission.missing")}
                              </Badge>
                            )
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-green-300/50 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                            >
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
                            detailsFrom={detailsFrom}
                            onReject={(teamId, teamName) =>
                              setRejectTarget({ teamId, teamName })
                            }
                          />
                        </TableCell>
                      </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </>
          )}

          <AdminTablePagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
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
