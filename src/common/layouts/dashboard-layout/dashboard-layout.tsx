import { Link, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { Trophy, LayoutDashboard, LogOut } from "lucide-react";
import { signOut } from "@/common/api/supabase";
import { useAuthStore } from "@/common/auth/authStore";
import {
  Avatar,
  AvatarFallback,
} from "@/common/components/ui/avatar";
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

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
];

function getInitials(firstName: string | null, lastName: string | null): string {
  return ((firstName?.[0] ?? "") + (lastName?.[0] ?? "")).toUpperCase() || "?";
}

function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const profile = user
    ? { firstName: null as string | null, lastName: null as string | null }
    : null;

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
      <SidebarHeader className="border-b px-3 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Trophy className="size-5 shrink-0 text-primary" />
          {!isCollapsed && (
            <span className="truncate font-semibold leading-none">Hackathon 2026</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
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
                  <AvatarFallback className="text-xs">
                    {getInitials(profile?.firstName ?? null, profile?.lastName ?? null)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium leading-none">
                    {user?.email ?? "—"}
                  </p>
                </div>
              </div>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sign out"
              className="text-muted-foreground hover:text-destructive"
              disabled={isSigningOut}
              onClick={() => void handleSignOut()}
            >
              <LogOut />
              <span>{isSigningOut ? "Signing out…" : "Sign out"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/settings/profile": "Edit Profile",
  "/settings/team": "Edit Team",
};

export function DashboardLayout() {
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? "Dashboard";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-1 h-4" />
          <h1 className="text-sm font-semibold">{title}</h1>
        </header>
        <div className="flex flex-1 flex-col overflow-auto bg-muted/40 p-4 sm:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
