import { useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import {
  Users,
} from "lucide-react";
import { getOnboardingSnapshot, getTeamWithMembers } from "@/common/api/supabase";
import { useAuthStore } from "@/common/auth/authStore";
import {
  Avatar,
  AvatarFallback,
} from "@/common/components/ui/avatar";
import { Badge } from "@/common/components/ui/badge";
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
import { LoadingScreen, ErrorScreen } from "@/common/components/loading-screen";
import { usePageTitle } from "@/common/hooks/use-page-title";

const teamStatusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  registered: "default",
  cancelled: "destructive",
  disqualified: "outline",
};

function getInitials(firstName: string | null, lastName: string | null): string {
  return ((firstName?.[0] ?? "") + (lastName?.[0] ?? "")).toUpperCase() || "?";
}

export function HomeProtectedView() {
  usePageTitle("Dashboard");
  const user = useAuthStore((state) => state.user);
  const userId = user?.id ?? null;

  const onboardingQuery = useQuery({
    queryKey: ["onboarding", "snapshot", userId],
    queryFn: () => getOnboardingSnapshot(userId),
    enabled: Boolean(userId),
  });

  const teamQuery = useQuery({
    queryKey: ["onboarding", "team", userId],
    queryFn: () => getTeamWithMembers(userId!),
    enabled: Boolean(userId) && onboardingQuery.data?.state === "READY",
  });

  if (!userId) return null;

  if (onboardingQuery.isPending) return <LoadingScreen message="Loading dashboard…" />;

  if (onboardingQuery.isError || !onboardingQuery.data) {
    return <ErrorScreen message="Failed to load dashboard data." />;
  }

  if (onboardingQuery.data.state === "NO_PROFILE") return <Navigate to="/profile" replace />;
  if (onboardingQuery.data.state === "NO_TEAM") return <Navigate to="/team" replace />;

  const profile = onboardingQuery.data.profile;
  const team = onboardingQuery.data.team;
  const members = teamQuery.data?.members ?? [];
  const nonCaptainMembers = members.filter((m) => !m.is_captain);
  const captainMember = members.find((m) => m.is_captain);
  const firstName = profile?.first_name ?? "";
  const lastName = profile?.last_name ?? "";

  return (
    <div className="space-y-5">
      {/* Page heading */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">
          Welcome back{firstName ? `, ${firstName}` : ""}!
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Your registration summary.
        </p>
      </div>

      {/* Outer wrapper card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Registration overview</CardTitle>
          <CardDescription>Your profile and team details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Team inner card */}
          {team && (
            <Card className="bg-muted/40">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-muted-foreground" />
                    <div>
                      <CardTitle className="flex items-center gap-2 text-sm">
                        {team.name}
                        <Badge
                          variant={teamStatusVariant[team.status] ?? "secondary"}
                          className="text-xs"
                        >
                          {team.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-0.5 text-xs">
                        {members.length > 0 ? members.length : (team.members_count ?? 0)}{" "}
                        member{members.length !== 1 ? "s" : ""} total (including captain)
                      </CardDescription>
                    </div>
                  </div>
                  <Link
                    to="/settings/team"
                    className="shrink-0 text-xs text-muted-foreground underline-offset-4 hover:underline"
                  >
                    Edit
                  </Link>
                </div>
              </CardHeader>
              {members.length > 0 && (
                <CardContent className="pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="hidden sm:table-cell">Email</TableHead>
                        <TableHead className="hidden md:table-cell">Telegram</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {captainMember && (
                        <TableRow>
                          <TableCell className="font-medium">
                            {captainMember.first_name} {captainMember.last_name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">Captain</Badge>
                          </TableCell>
                          <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                            {captainMember.email ?? "—"}
                          </TableCell>
                          <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                            {captainMember.telegram ?? "—"}
                          </TableCell>
                        </TableRow>
                      )}
                      {nonCaptainMembers.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">
                            {member.first_name} {member.last_name}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">Member</TableCell>
                          <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                            {member.email ?? "—"}
                          </TableCell>
                          <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                            {member.telegram ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              )}
            </Card>
          )}

          {/* Profile inner card */}
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
                    to="/settings/profile"
                    className="shrink-0 text-xs text-muted-foreground underline-offset-4 hover:underline"
                  >
                    Edit
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  {profile.grade && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Grade</dt>
                      <dd className="mt-0.5 font-medium">{profile.grade}</dd>
                    </div>
                  )}
                  {profile.phone && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Phone</dt>
                      <dd className="mt-0.5 font-medium">{profile.phone}</dd>
                    </div>
                  )}
                  {profile.telegram && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Telegram</dt>
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
