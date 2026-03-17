import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, Users } from "lucide-react";
import { getTeamCheckpointStatuses, getTeamsWithCaptains } from "@/common/api/supabase";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Input } from "@/common/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { Skeleton } from "@/common/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { useDebouncedValue } from "@/common/hooks/use-debounced-value";
import { usePageTitle } from "@/common/hooks/use-page-title";
import { useI18n } from "@/common/i18n/use-i18n";
import { AdminTablePagination } from "@/features/admin/components/admin-table-pagination";
import { ADMIN_TABLE_SPACING_CLASS } from "@/features/admin/lib/admin-table-styles";

type StatusFilter = "all" | "registered" | "disqualified" | "finalists";

const PAGE_SIZE = 20;

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

export function AdminTeamsView() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  usePageTitle(t("admin.teams.pageTitle"));

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const teamsQuery = useQuery({
    queryKey: ["admin-teams"],
    queryFn: getTeamsWithCaptains,
  });

  const finalistsQuery = useQuery({
    queryKey: ["admin-teams", "finalists", "cp3"],
    queryFn: () => getTeamCheckpointStatuses("cp3"),
  });

  const finalistTeamIds = useMemo(
    () =>
      new Set(
        (finalistsQuery.data ?? [])
          .filter((row) => row.decision?.decision === "advanced")
          .map((row) => row.team.id),
      ),
    [finalistsQuery.data],
  );

  const filteredTeams = useMemo(
    () =>
      (teamsQuery.data ?? []).filter((team) => {
        const matchesStatus =
          statusFilter === "all"
          || (statusFilter === "finalists"
            ? finalistTeamIds.has(team.id)
            : team.status === statusFilter);
        const matchesSearch =
          !debouncedSearch
          || team.name.toLowerCase().includes(debouncedSearch.toLowerCase())
          || team.captain.email?.toLowerCase().includes(debouncedSearch.toLowerCase())
          || `${team.captain.first_name} ${team.captain.last_name}`
            .toLowerCase()
            .includes(debouncedSearch.toLowerCase());
        return matchesStatus && matchesSearch;
      }),
    [debouncedSearch, finalistTeamIds, statusFilter, teamsQuery.data],
  );

  const pageCount = Math.max(1, Math.ceil(filteredTeams.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagedTeams = filteredTeams.slice(pageStart, pageStart + PAGE_SIZE);

  const handleOpenTeam = (teamId: string) => {
    void navigate(`/admin/teams/${teamId}`, {
      state: { from: `${location.pathname}${location.search}` },
    });
  };

  const totalTeams = teamsQuery.data?.length ?? 0;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Users className="size-5 text-muted-foreground" />
            <div className="flex-1">
              <CardTitle className="text-base">{t("admin.teams.title")}</CardTitle>
              <CardDescription>
                Всего команд: <span className="font-medium">{totalTeams}</span>.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-0">
          <div className="space-y-3 px-6 pt-6">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("admin.teams.search.placeholder")}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as StatusFilter);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-55">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("admin.teams.filter.all")}</SelectItem>
                  <SelectItem value="registered">{t("admin.teams.filter.registered")}</SelectItem>
                  <SelectItem value="disqualified">{t("admin.teams.filter.disqualified")}</SelectItem>
                  <SelectItem value="finalists">{t("admin.teams.filter.finalists")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-sm text-muted-foreground">
              Найдено: <span className="font-medium text-foreground">{filteredTeams.length}</span>{" "}
              {t("admin.teams.count")}
            </p>
          </div>

          {teamsQuery.isLoading || finalistsQuery.isLoading ? (
            <div className="space-y-2 px-6 pb-6">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : teamsQuery.isError ? (
            <div className="py-10 text-center text-sm text-muted-foreground">{t("admin.teams.error")}</div>
          ) : filteredTeams.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">{t("admin.teams.empty")}</div>
          ) : (
            <>
              <div className="space-y-3 px-4 pb-2 md:hidden">
                {pagedTeams.map((team) => (
                  <Card key={team.id}>
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{team.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {team.captain.first_name} {team.captain.last_name}
                          </p>
                          {team.captain.email && (
                            <p className="truncate text-xs text-muted-foreground">
                              {team.captain.email}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className={getStatusBadgeClass(team.status)}>
                          {t(`dashboard.status.${team.status}`)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>
                          <p>{t("admin.teams.table.school")}</p>
                          <p className="text-foreground">{team.captain.school_name || "—"}</p>
                        </div>
                        <div>
                          <p>{t("admin.teams.table.grade")}</p>
                          <p className="text-foreground">{team.captain.grade || "—"}</p>
                        </div>
                        <div>
                          <p>{t("admin.teams.table.members")}</p>
                          <p className="text-foreground">{team.members_count || "—"}</p>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-blue-300/50 bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300"
                        onClick={() => handleOpenTeam(team.id)}
                      >
                        {t("admin.teams.actions.view")}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table className={ADMIN_TABLE_SPACING_CLASS}>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.teams.table.teamName")}</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        {t("admin.teams.table.captain")}
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        {t("admin.teams.table.school")}
                      </TableHead>
                      <TableHead className="hidden lg:table-cell text-center">
                        {t("admin.teams.table.grade")}
                      </TableHead>
                      <TableHead className="hidden lg:table-cell text-center">
                        {t("admin.teams.table.members")}
                      </TableHead>
                      <TableHead>{t("admin.teams.table.status")}</TableHead>
                      <TableHead className="text-right">{t("admin.teams.table.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {pagedTeams.map((team) => (
                      <TableRow key={team.id}>
                        <TableCell className="font-medium">{team.name}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {team.captain.first_name} {team.captain.last_name}
                            </span>
                            {team.captain.email && (
                              <span className="text-xs text-muted-foreground">{team.captain.email}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {team.captain.school_name || "—"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-center text-sm">
                          {team.captain.grade || "—"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-center text-sm">
                          {team.members_count || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusBadgeClass(team.status)}>
                            {t(`dashboard.status.${team.status}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-blue-300/50 bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300"
                            onClick={() => handleOpenTeam(team.id)}
                          >
                            {t("admin.teams.actions.view")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <AdminTablePagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
