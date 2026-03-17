import { useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import { Users, Send, AlertTriangle, Timer } from "lucide-react";
import {
  getOnboardingSnapshot,
  getTeamWithMembers,
  getDisqualificationByTeamId,
} from "@/common/api/supabase";
import {
  getDashboardPathForRole,
  getUserRole,
  isStaffRole,
} from "@/common/auth/roles";
import { useAuthStore } from "@/common/auth/authStore";
import { Avatar, AvatarFallback } from "@/common/components/ui/avatar";
import { Badge } from "@/common/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { ErrorScreen } from "@/common/components/loading-screen";
import { useHackathonTime, formatTimeRemaining } from "@/common/hooks/use-hackathon-time";
import { useI18n } from "@/common/i18n/use-i18n";
import { usePageTitle } from "@/common/hooks/use-page-title";

function getInitials(firstName: string | null, lastName: string | null): string {
  return ((firstName?.[0] ?? "") + (lastName?.[0] ?? "")).toUpperCase() || "?";
}

function HomeDashboardSkeleton() {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>

      <Skeleton className="h-36 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-56 w-full" />
    </div>
  );
}

export function HomeProtectedView() {
  const { t } = useI18n();
  usePageTitle(t("dashboard.pageTitle"));
  const user = useAuthStore((state) => state.user);
  const userId = user?.id ?? null;
  const userRole = getUserRole(user);

  const onboardingQuery = useQuery({
    queryKey: ["onboarding", "snapshot", userId],
    queryFn: () => getOnboardingSnapshot(userId),
    enabled: Boolean(userId),
  });

  const teamQuery = useQuery({
    queryKey: ["onboarding", "team", userId],
    queryFn: () => getTeamWithMembers(userId!),
    enabled:
      Boolean(userId) &&
      onboardingQuery.data?.state === "READY" &&
      onboardingQuery.data.profile?.role === "team",
  });

  const disqualifTeamId = onboardingQuery.data?.team?.id;
  const disqualifEnabled =
    onboardingQuery.data?.profile?.role === "team" &&
    onboardingQuery.data?.team?.status === "disqualified";

  const disqualificationQuery = useQuery({
    queryKey: ["team-disqualification", disqualifTeamId],
    queryFn: () => getDisqualificationByTeamId(disqualifTeamId!),
    enabled: Boolean(disqualifTeamId) && disqualifEnabled,
  });

  const timing = useHackathonTime();

  if (!userId) return null;

  if (onboardingQuery.isPending || (onboardingQuery.isFetching && onboardingQuery.isStale)) {
    return <HomeDashboardSkeleton />;
  }

  if (onboardingQuery.isError || !onboardingQuery.data) {
    return <ErrorScreen message={t("dashboard.error")} />;
  }

  if (onboardingQuery.data.state === "NO_PROFILE") {
    if (isStaffRole(userRole)) {
      return <Navigate to="/staff/profile" replace />;
    }

    return <Navigate to="/profile" replace />;
  }
  if (onboardingQuery.data.state === "NO_TEAM") return <Navigate to="/team" replace />;

  const profile = onboardingQuery.data.profile;
  const profileRole = profile?.role ?? userRole;
  const isTeamProfile = profile?.role === "team";

  if (isStaffRole(profileRole) && (!profile?.first_name || !profile?.last_name)) {
    return <Navigate to="/staff/profile" replace />;
  }

  if (isStaffRole(profileRole)) {
    return <Navigate to={getDashboardPathForRole(profileRole)} replace />;
  }

  const team = onboardingQuery.data.team;
  const members = teamQuery.data?.members ?? [];
  const nonCaptainMembers = members.filter((m) => !m.is_captain);
  const captainMember = members.find((m) => m.is_captain);
  const firstName = profile?.first_name ?? "";
  const lastName = profile?.last_name ?? "";

  const nextOpenCp = timing.checkpoints.find((cp) => cp.isOpen);

  const statusLabel = team?.is_registered
    ? t("dashboard.status.registered")
    : t("dashboard.status.unregistered");
  const roleBadgeClass =
    "text-xs bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
  const teamStatusBadgeClass =
    team?.is_registered
      ? "text-xs bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
      : "text-xs bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300";

  return (
    <div className="space-y-5">
      {/* Disqualification Banner */}
      {isTeamProfile && team?.status === "disqualified" && (
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
          {disqualificationQuery.data && (
            <CardContent className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">
                  {t("dashboard.disqualification.reason")}:
                </span>{" "}
                {t(
                  `admin.teams.disqualify.reason.${
                    disqualificationQuery.data.reason_code
                  }`
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {disqualificationQuery.data.admin_comment}
              </p>
            </CardContent>
          )}
        </Card>
      )}

      {/* Next Checkpoint card */}
      {isTeamProfile &&
        timing.hasStarted &&
        team?.status !== "disqualified" &&
        nextOpenCp && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Timer className="size-4 text-primary" />
                <CardTitle className="text-base text-primary">
                  {t("hackathon.dashboard.title")}
                </CardTitle>
              </div>
              <CardDescription className="mt-1">{nextOpenCp.title}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              {nextOpenCp.timeRemainingMs > 0 && (
                <span className="font-mono text-sm tabular-nums">
                  {formatTimeRemaining(nextOpenCp.timeRemainingMs)}
                </span>
              )}
              <Link
                to={`/hackathon/${nextOpenCp.code}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                {t("hackathon.dashboard.go")}
              </Link>
            </CardContent>
          </Card>
        )}

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base">{t("dashboard.summary")}</CardTitle>
          <CardDescription>{t("dashboard.overview.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3">
          <Button asChild variant="outline" className="justify-start">
            <Link to="/hackathon">{t("dashboard.nav.hackathon")}</Link>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <Link to={isTeamProfile ? "/settings/profile" : "/staff/profile"}>
              {t("dashboard.title.profile")}
            </Link>
          </Button>
          {isTeamProfile ? (
            <Button asChild variant="outline" className="justify-start">
              <Link to="/settings/team">{t("dashboard.title.team")}</Link>
            </Button>
          ) : (
            <Button asChild variant="outline" className="justify-start">
              <Link to={getDashboardPathForRole(profileRole)}>
                {t("dashboard.nav.dashboard")}
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30">
        <CardHeader>
          <CardTitle className="text-base">{t("dashboard.telegram.title")}</CardTitle>
          <CardDescription className="mt-1.5">
            {t("dashboard.telegram.desc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href="https://t.me/+WmFh6nzgDKY5NDky"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            <Send className="size-4" />
            {t("dashboard.telegram.join")}
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">{t("dashboard.overview.title")}</CardTitle>
          <CardDescription>{t("dashboard.overview.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isTeamProfile && team && (
            <Card className="bg-muted/40">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-muted-foreground" />
                    <div>
                      <CardTitle className="flex items-center gap-2 text-sm">
                        {team.name}
                        <Badge className={teamStatusBadgeClass}>
                          {statusLabel}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-0.5 text-xs">
                        {t("dashboard.team.totalMembers", {
                          count: members.length > 0 ? members.length : (team.members_count ?? 0),
                        })}
                      </CardDescription>
                    </div>
                  </div>
                  <Link
                    to="/settings/team"
                    className="shrink-0 text-xs text-muted-foreground underline-offset-4 hover:underline"
                  >
                    {t("common.edit")}
                  </Link>
                </div>
              </CardHeader>
              {teamQuery.isLoading && (
                <CardContent className="space-y-2 pt-0">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={`team-member-skeleton:${index}`} className="h-11 w-full" />
                  ))}
                </CardContent>
              )}
              {!teamQuery.isLoading && members.length > 0 && (
                <CardContent className="pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("dashboard.table.name")}</TableHead>
                        <TableHead>{t("dashboard.table.role")}</TableHead>
                        <TableHead className="hidden sm:table-cell">{t("common.email")}</TableHead>
                        <TableHead className="hidden md:table-cell">{t("common.telegram")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {captainMember && (
                        <TableRow>
                          <TableCell className="font-medium">
                            {captainMember.first_name} {captainMember.last_name}
                          </TableCell>
                          <TableCell>
                            <Badge className={roleBadgeClass}>
                              {t("dashboard.table.captain")}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                            {captainMember.email ?? t("common.noData")}
                          </TableCell>
                          <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                            {captainMember.telegram ?? t("common.noData")}
                          </TableCell>
                        </TableRow>
                      )}
                      {nonCaptainMembers.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">
                            {member.first_name} {member.last_name}
                          </TableCell>
                          <TableCell>
                            <Badge className={roleBadgeClass}>
                              {t("dashboard.table.member")}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                            {member.email ?? t("common.noData")}
                          </TableCell>
                          <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                            {member.telegram ?? t("common.noData")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              )}
            </Card>
          )}

          {profile && (
            <Card className="bg-muted/40">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar size="lg">
                      <AvatarFallback className="text-sm font-medium">
                        {getInitials(firstName, lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-sm">
                        {firstName} {lastName}
                      </CardTitle>
                      <CardDescription className="text-xs">{user?.email}</CardDescription>
                    </div>
                  </div>
                  <Link
                    to={isTeamProfile ? "/settings/profile" : "/staff/profile"}
                    className="shrink-0 text-xs text-muted-foreground underline-offset-4 hover:underline"
                  >
                    {t("common.edit")}
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  {isTeamProfile && profile.grade && (
                    <div>
                      <dt className="text-xs text-muted-foreground">{t("dashboard.profile.grade")}</dt>
                      <dd className="mt-0.5 font-medium">{profile.grade}</dd>
                    </div>
                  )}
                  {isTeamProfile && (profile.schools?.name_ru ?? profile.custom_school_name) && (
                    <div className="col-span-2 sm:col-span-1">
                      <dt className="text-xs text-muted-foreground">{t("dashboard.profile.school")}</dt>
                      <dd className="mt-0.5 font-medium">
                        {profile.schools?.name_ru ?? profile.custom_school_name}
                      </dd>
                    </div>
                  )}
                  {isTeamProfile && profile.phone && (
                    <div>
                      <dt className="text-xs text-muted-foreground">{t("common.phone")}</dt>
                      <dd className="mt-0.5 font-medium">{profile.phone}</dd>
                    </div>
                  )}
                  {isTeamProfile && profile.telegram && (
                    <div>
                      <dt className="text-xs text-muted-foreground">{t("common.telegram")}</dt>
                      <dd className="mt-0.5 font-medium">{profile.telegram}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
