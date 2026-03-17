import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Scale,
  Settings2,
  ShieldCheck,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import { useHackathonTime } from "@/common/hooks/use-hackathon-time";
import { signOut, getProfile } from "@/common/api/supabase";
import { getDashboardPathForRole, getUserRole, isSuperAdmin } from "@/common/auth/roles";
import { useAuthStore } from "@/common/auth/authStore";
import { Avatar, AvatarFallback } from "@/common/components/ui/avatar";
import { Separator } from "@/common/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/common/components/ui/sidebar";
import { useI18n } from "@/common/i18n/use-i18n";

function getInitials({
  firstName,
  lastName,
  email,
}: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): string {
  const normalizedFirst = firstName?.trim() ?? "";
  const normalizedLast = lastName?.trim() ?? "";

  const byName = ((normalizedFirst[0] ?? "") + (normalizedLast[0] ?? "")).toUpperCase();
  if (byName) {
    return byName;
  }

  const emailLocalPart = email?.split("@")[0]?.trim() ?? "";
  if (emailLocalPart.length > 0) {
    return emailLocalPart[0].toUpperCase();
  }

  return "?";
}

function AppSidebar() {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const role = getUserRole(user);
  const dashboardPath = getDashboardPathForRole(role);
  const userId = user?.id ?? null;

  const profileQuery = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => getProfile(userId!),
    enabled: Boolean(userId) && role === "admin",
    staleTime: 60_000,
  });

  const isUserSuperAdmin = isSuperAdmin(profileQuery.data);

  const navItems = role === "admin"
    ? [
        {
          label: t("dashboard.nav.dashboard"),
          to: "/admin/dashboard",
          icon: LayoutDashboard,
        },
        { label: t("admin.nav.teams"), to: "/admin/teams", icon: Users },
        { label: t("admin.nav.checkpoints"), to: "/admin/checkpoints", icon: ListChecks },
        ...(isUserSuperAdmin
          ? [
              { label: t("admin.nav.staff"), to: "/admin/staff", icon: ShieldCheck },
              { label: t("admin.nav.settings"), to: "/admin/settings", icon: Settings2 },
            ]
          : []),
      ]
    : role === "jury"
      ? [{ label: t("dashboard.nav.dashboard"), to: dashboardPath, icon: Scale }]
      : [
          { label: t("dashboard.nav.dashboard"), to: dashboardPath, icon: LayoutDashboard },
          { label: t("dashboard.nav.hackathon"), to: "/hackathon", icon: CalendarDays },
          { label: t("dashboard.nav.profile"), to: "/settings/profile", icon: UserRound },
          { label: t("dashboard.nav.team"), to: "/settings/team", icon: Users },
        ];
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const location = useLocation();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const metadata = user?.user_metadata as
    | { first_name?: string; last_name?: string; full_name?: string }
    | undefined;
  let firstName = metadata?.first_name ?? null;
  let lastName = metadata?.last_name ?? null;

  if (!firstName && !lastName && metadata?.full_name) {
    const parts = metadata.full_name.trim().split(/\s+/);
    firstName = parts[0] ?? null;
    lastName = parts[1] ?? null;
  }

  const avatarInitials = getInitials({
    firstName,
    lastName,
    email: user?.email ?? null,
  });

  const handleSignOut = async () => {
    setIsSigningOut(true);
    const { error } = await signOut();
    if (error) {
      toast.error(error.message);
      setIsSigningOut(false);
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 border-b px-3 py-0">
        <div className="flex h-full min-w-0 items-center gap-2">
          <Trophy className="size-5 shrink-0 text-primary" />
          {!isCollapsed && (
            <span className="truncate font-semibold leading-tight">{t("app.name")}</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("dashboard.nav.navigation")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ label, to, icon: Icon }) => (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton asChild isActive={location.pathname === to} tooltip={label}>
                    <Link to={to}>
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          {!isCollapsed && (
            <SidebarMenuItem>
              <div className="flex min-w-0 items-center gap-2 px-2 py-1.5">
                <Avatar size="sm" className="shrink-0">
                  <AvatarFallback className="text-xs">{avatarInitials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium leading-tight">
                    {user?.email ?? t("common.noData")}
                  </p>
                </div>
              </div>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={t("common.signOut")}
              className="text-muted-foreground hover:text-destructive"
              disabled={isSigningOut}
              onClick={() => void handleSignOut()}
            >
              <LogOut />
              <span>{isSigningOut ? t("common.signingOut") : t("common.signOut")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

export function DashboardLayout() {
  const { t } = useI18n();
  const location = useLocation();

  const pageTitles: Record<string, string> = {
    "/dashboard": t("dashboard.nav.dashboard"),
    "/admin/dashboard": t("dashboard.nav.dashboard"),
    "/admin/teams": t("admin.nav.teams"),
    "/admin/staff": t("admin.nav.staff"),
    "/admin/checkpoints": t("admin.checkpoints.pageTitle"),
    "/admin/settings": t("admin.settings.pageTitle"),
    "/jury/dashboard": t("dashboard.nav.dashboard"),
    "/hackathon": t("hackathon.pageTitle"),
    "/settings/profile": t("dashboard.nav.profile"),
    "/staff/profile": t("dashboard.title.profile"),
    "/settings/team": t("dashboard.nav.team"),
  };

  const title = pageTitles[location.pathname]
    ?? (location.pathname.startsWith("/admin/teams/")
      ? t("admin.teams.details.title")
      : t("dashboard.nav.dashboard"));
  const timing = useHackathonTime();
  const isDemoActive = !timing.isLoading && timing.demoMode;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3 sm:px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-1 h-4" />
          <h1 className="truncate text-sm font-semibold">{title}</h1>
        </header>
        {isDemoActive && (
          <div className="flex items-center justify-center gap-2 bg-amber-400/20 px-4 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 border-b border-amber-400/40">
            {t("admin.settings.demoBanner", {
              time: timing.virtualNow.toLocaleString("ru-RU"),
            })}
          </div>
        )}
        <div className="flex flex-1 flex-col overflow-auto bg-muted/40 p-3 sm:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
