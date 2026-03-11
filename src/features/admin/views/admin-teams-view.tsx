import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Users, Search } from "lucide-react";

import { getTeamsWithCaptains } from "@/common/api/supabase";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { Skeleton } from "@/common/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { usePageTitle } from "@/common/hooks/use-page-title";
import { useDebouncedValue } from "@/common/hooks/use-debounced-value";
import { useI18n } from "@/common/i18n/use-i18n";
import { AdminDisqualifyDialog } from "@/features/admin/components/admin-disqualify-dialog";

type StatusFilter = "all" | "registered" | "disqualified";

function getStatusBadgeVariant(
  status: "registered" | "cancelled" | "disqualified"
) {
  switch (status) {
    case "registered":
      return "default";
    case "disqualified":
      return "destructive";
    case "cancelled":
      return "secondary";
    default:
      return "outline";
  }
}

export function AdminTeamsView() {
  const { t } = useI18n();
  const navigate = useNavigate();
  usePageTitle(t("admin.teams.pageTitle"));

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [disqualifyTeam, setDisqualifyTeam] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const teamsQuery = useQuery({
    queryKey: ["admin-teams"],
    queryFn: getTeamsWithCaptains,
  });

  const filteredTeams = useMemo(() => {
    return (
      teamsQuery.data?.filter((team) => {
        const matchesStatus =
          statusFilter === "all" || team.status === statusFilter;
        const matchesSearch =
          !debouncedSearch ||
          team.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          team.captain.email
            ?.toLowerCase()
            .includes(debouncedSearch.toLowerCase()) ||
          `${team.captain.first_name} ${team.captain.last_name}`
            .toLowerCase()
            .includes(debouncedSearch.toLowerCase());
        return matchesStatus && matchesSearch;
      }) || []
    );
  }, [teamsQuery.data, statusFilter, debouncedSearch]);

  const handleOpenTeam = (teamId: string) => {
    void navigate(`/admin/teams/${teamId}`);
  };

  const handleDisqualify = (teamId: string, teamName: string) => {
    setDisqualifyTeam({ id: teamId, name: teamName });
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Users className="size-5 text-muted-foreground" />
            <div className="flex-1">
              <CardTitle className="text-base">
                {t("admin.teams.title")}
              </CardTitle>
              <CardDescription>{t("admin.teams.desc")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("admin.teams.search.placeholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.teams.filter.all")}
                </SelectItem>
                <SelectItem value="registered">
                  {t("admin.teams.filter.registered")}
                </SelectItem>
                <SelectItem value="disqualified">
                  {t("admin.teams.filter.disqualified")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {teamsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : teamsQuery.isError ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t("admin.teams.error")}
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t("admin.teams.empty")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
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
                    <TableHead className="text-right">
                      {t("admin.teams.table.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeams.map((team) => (
                    <TableRow key={team.id}>
                      <TableCell className="font-medium">
                        {team.name}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {team.captain.first_name} {team.captain.last_name}
                          </span>
                          {team.captain.email && (
                            <span className="text-xs text-muted-foreground">
                              {team.captain.email}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm">
                          {team.captain.school_name || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-center">
                        <span className="text-sm">
                          {team.captain.grade || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-center">
                        <span className="text-sm">
                          {team.members_count || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(team.status)}>
                          {t(`dashboard.status.${team.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { handleOpenTeam(team.id); }}
                          >
                            {t("admin.teams.actions.view")}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              handleDisqualify(team.id, team.name);
                            }}
                            disabled={team.status === "disqualified"}
                          >
                            {t("admin.teams.actions.disqualify")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disqualify Dialog */}
      {disqualifyTeam && (
        <AdminDisqualifyDialog
          teamId={disqualifyTeam.id}
          teamName={disqualifyTeam.name}
          open={!!disqualifyTeam}
          onOpenChange={(open) => !open && setDisqualifyTeam(null)}
        />
      )}
    </div>
  );
}
