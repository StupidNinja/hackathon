import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Users, User, AlertTriangle } from "lucide-react";

import {
  getTeamById,
  getTeamMembersForAdmin,
  getDisqualificationByTeamId,
  getSubmissionsForTeamAdmin,
  getDecisionsForTeamAdmin,
} from "@/common/api/supabase";
import type { CheckpointCode } from "@/common/api/supabase";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/common/components/ui/tabs";
import { LoadingScreen } from "@/common/components/loading-screen";
import { ErrorScreen } from "@/common/components/loading-screen";
import { usePageTitle } from "@/common/hooks/use-page-title";
import { useI18n } from "@/common/i18n/use-i18n";
import { AdminDisqualifyDialog } from "@/features/admin/components/admin-disqualify-dialog";
import { AdminCheckpointTab } from "@/features/admin/components/admin-checkpoint-tab";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : dateFormatter.format(d);
}

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

export function AdminTeamDetailsView() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { teamId } = useParams<{ teamId: string }>();
  const [showDisqualifyDialog, setShowDisqualifyDialog] = useState(false);

  const teamQuery = useQuery({
    queryKey: ["admin-team-details", teamId],
    queryFn: () => {
      if (!teamId) return Promise.reject(new Error("No teamId"));
      return getTeamById(teamId);
    },
    enabled: !!teamId,
  });

  const membersQuery = useQuery({
    queryKey: ["admin-team-members", teamId],
    queryFn: () => {
      if (!teamId) return Promise.reject(new Error("No teamId"));
      return getTeamMembersForAdmin(teamId);
    },
    enabled: !!teamId,
  });

  const disqualificationQuery = useQuery({
    queryKey: ["admin-team-disqualification", teamId],
    queryFn: () => {
      if (!teamId) return Promise.reject(new Error("No teamId"));
      return getDisqualificationByTeamId(teamId);
    },
    enabled: !!teamId,
  });

  const submissionsQuery = useQuery({
    queryKey: ["admin-team-submissions", teamId],
    queryFn: () => {
      if (!teamId) return Promise.reject(new Error("No teamId"));
      return getSubmissionsForTeamAdmin(teamId);
    },
    enabled: !!teamId,
  });

  const decisionsQuery = useQuery({
    queryKey: ["admin-team-decisions", teamId],
    queryFn: () => {
      if (!teamId) return Promise.reject(new Error("No teamId"));
      return getDecisionsForTeamAdmin(teamId);
    },
    enabled: !!teamId,
  });

  usePageTitle(
    teamQuery.data
      ? `${teamQuery.data.name} — ${t("admin.teams.details.title")}`
      : t("admin.teams.details.title")
  );

  if (teamQuery.isLoading) {
    return <LoadingScreen />;
  }

  if (teamQuery.isError || !teamQuery.data) {
    return (
      <ErrorScreen
        message={t("admin.teams.error")}
          onRetry={() => { void teamQuery.refetch(); }}
      />
    );
  }

  const team = teamQuery.data;
  const members = membersQuery.data || [];
  const disqualification = disqualificationQuery.data;
  const submissions = submissionsQuery.data ?? [];
  const decisions = decisionsQuery.data ?? [];

  const CP_CODES: CheckpointCode[] = ["cp0", "cp1", "cp2", "cp3"];

  function getSubmissionForCp(code: CheckpointCode) {
    return submissions.find((s) => s.checkpoint_code === code) ?? null;
  }
  function getDecisionForCp(code: CheckpointCode) {
    return decisions.find((d) => d.checkpoint_code === code) ?? null;
  }

  return (
    <div className="space-y-5">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => { void navigate("/admin/teams"); }}
      >
        <ArrowLeft className="mr-2 size-4" />
        {t("admin.teams.details.back")}
      </Button>

      {/* Team Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Users className="size-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">{team.name}</CardTitle>
                <CardDescription>
                  {t("admin.teams.details.field.status")}:{" "}
                  <Badge
                    variant={getStatusBadgeVariant(team.status)}
                    className="ml-1"
                  >
                    {t(`dashboard.status.${team.status}`)}
                  </Badge>
                </CardDescription>
              </div>
            </div>
            {team.status !== "disqualified" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDisqualifyDialog(true)}
              >
                {t("admin.teams.actions.disqualify")}
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="info">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="info">
            {t("admin.teams.details.tabs.info")}
          </TabsTrigger>
          {CP_CODES.map((code) => (
            <TabsTrigger key={code} value={code}>
              {code.toUpperCase()}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="info" className="space-y-5 pt-4">

      {/* Disqualification Info (if disqualified) */}
      {disqualification && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className="size-5 text-destructive" />
              <div>
                <CardTitle className="text-base text-destructive">
                  {t("admin.teams.details.disqualification.section")}
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm font-medium">
                {t("admin.teams.details.disqualification.reason")}
              </span>
              <p className="text-sm text-muted-foreground">
                {t(
                  `admin.teams.disqualify.reason.${disqualification.reason_code}`
                )}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium">
                {t("admin.teams.details.disqualification.comment")}
              </span>
              <p className="text-sm text-muted-foreground">
                {disqualification.admin_comment}
              </p>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {t("admin.teams.details.disqualification.disqualifiedBy")}{" "}
                {disqualification.admin.first_name}{" "}
                {disqualification.admin.last_name}
              </span>
              <span>
                {t("admin.teams.details.disqualification.date")}{" "}
                {formatDate(disqualification.created_at)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Captain Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <User className="size-5 text-muted-foreground" />
            <CardTitle className="text-base">
              {t("admin.teams.details.captain.section")}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <span className="text-sm font-medium">
                {t("admin.teams.details.field.firstName")}
              </span>
              <p className="text-sm text-muted-foreground">
                {team.captain.first_name || "—"}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium">
                {t("admin.teams.details.field.lastName")}
              </span>
              <p className="text-sm text-muted-foreground">
                {team.captain.last_name || "—"}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium">
                {t("admin.teams.details.field.email")}
              </span>
              <p className="text-sm text-muted-foreground">
                {team.captain.email || "—"}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium">
                {t("admin.teams.details.field.telegram")}
              </span>
              <p className="text-sm text-muted-foreground">
                {team.captain.telegram || "—"}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium">
                {t("admin.teams.details.field.school")}
              </span>
              <p className="text-sm text-muted-foreground">
                {team.captain.school_name || "—"}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium">
                {t("admin.teams.details.field.grade")}
              </span>
              <p className="text-sm text-muted-foreground">
                {team.captain.grade || "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Users className="size-5 text-muted-foreground" />
            <CardTitle className="text-base">
              {t("admin.teams.details.members.section")}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {membersQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">
              {t("common.loading")}
            </p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("admin.teams.empty")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {t("admin.teams.details.field.firstName")}
                    </TableHead>
                    <TableHead>
                      {t("admin.teams.details.field.lastName")}
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      {t("admin.teams.details.field.email")}
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      {t("admin.teams.details.field.telegram")}
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      {t("admin.teams.details.field.phone")}
                    </TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.first_name || "—"}
                      </TableCell>
                      <TableCell>{member.last_name || "—"}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {member.email || "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {member.telegram || "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {member.phone || "—"}
                      </TableCell>
                      <TableCell>
                        {member.is_captain && (
                          <Badge variant="secondary">
                            {t("admin.teams.details.member.captain")}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

        </TabsContent>

        {CP_CODES.map((code) => (
          <TabsContent key={code} value={code} className="pt-4">
            <AdminCheckpointTab
              teamId={team.id}
              teamName={team.name}
              cpCode={code}
              submission={getSubmissionForCp(code)}
              decision={getDecisionForCp(code)}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Disqualify Dialog */}
      {showDisqualifyDialog && (
        <AdminDisqualifyDialog
          teamId={team.id}
          teamName={team.name}
          open={showDisqualifyDialog}
          onOpenChange={setShowDisqualifyDialog}
        />
      )}
    </div>
  );
}
