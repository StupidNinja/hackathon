import { type RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { AdminGuardLayout } from "@/common/layouts/admin-guard-layout/admin-guard-layout";
import { AuthGuardLayout } from "@/common/layouts/auth-guard-layout/auth-guard-layout";
import { DashboardLayout } from "@/common/layouts/dashboard-layout/dashboard-layout";
import { NotificationsLayout } from "@/common/layouts/notifications-layout";
import { NonAuthGuardLayout } from "@/common/layouts/non-auth-guard-layout/non-auth-guard-layout";
import { OnboardingLayout } from "@/common/layouts/onboarding-layout/onboarding-layout";
import { AuthCallbackView } from "@/features/auth/views/auth-callback-view";
import { AuthView } from "@/features/auth/views/auth-view";
import { AdminStaffView } from "@/features/admin/views/admin-staff-view";
import { AdminTeamsView } from "@/features/admin/views/admin-teams-view";
import { ChangePasswordView } from "@/features/settings/views/change-password-view";
import { HackathonView } from "@/features/hackathon/views/hackathon-view";
import { HomeProtectedView } from "@/features/home/views/home-protected-view";
import { JuryDashboardView } from "@/features/jury/views/jury-dashboard-view";
import { OnboardingEntryView } from "@/features/onboarding/views/onboarding-entry-view";
import { OnboardingProfileView } from "@/features/onboarding/views/onboarding-profile-view";
import { OnboardingTeamView } from "@/features/onboarding/views/onboarding-team-view";
import { EditProfileView } from "@/features/settings/views/edit-profile-view";
import { EditTeamView } from "@/features/settings/views/edit-team-view";
import { StaffProfileView } from "@/features/staff/views/staff-profile-view";
import { NotFoundView } from "@/routes/not-found-view";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <NotificationsLayout />,
    children: [
      {
        path: "auth/callback",
        element: <AuthCallbackView />,
      },
      {
        path: "auth",
        element: <NonAuthGuardLayout />,
        children: [
          {
            index: true,
            element: <AuthView />,
          },
        ],
      },
      {
        path: "/",
        element: <AuthGuardLayout />,
        children: [
          {
            index: true,
            element: <OnboardingEntryView />,
          },
          {
            path: "change-password",
            element: <ChangePasswordView />,
          },
          {
            element: <OnboardingLayout />,
            children: [
              {
                path: "profile",
                element: <OnboardingProfileView />,
              },
              {
                path: "team",
                element: <OnboardingTeamView />,
              },
            ],
          },
          {
            element: <DashboardLayout />,
            children: [
              {
                path: "dashboard",
                element: <HomeProtectedView />,
              },
              {
                path: "dashboard/admin",
                element: <Navigate to="/admin/teams" replace />,
              },
              {
                path: "admin",
                element: <AdminGuardLayout />,
                children: [
                  {
                    index: true,
                    element: <Navigate to="/admin/teams" replace />,
                  },
                  {
                    path: "dashboard",
                    element: <Navigate to="/admin/teams" replace />,
                  },
                  {
                    path: "teams",
                    element: <AdminTeamsView />,
                  },
                  {
                    path: "staff",
                    element: <AdminStaffView />,
                  },
                ],
              },
              {
                path: "jury/dashboard",
                element: <JuryDashboardView />,
              },
              {
                path: "hackathon",
                element: <HackathonView />,
              },
              {
                path: "settings/profile",
                element: <EditProfileView />,
              },
              {
                path: "staff/profile",
                element: <StaffProfileView />,
              },
              {
                path: "settings/team",
                element: <EditTeamView />,
              },
              {
                path: "*",
                element: <Navigate to="/" replace />,
              },
            ],
          },
        ],
      },
      {
        path: "*",
        element: <NotFoundView />,
      },
    ],
  },
];
