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
import { AdminTeamDetailsView } from "@/features/admin/views/admin-team-details-view";
import { AdminTeamsView } from "@/features/admin/views/admin-teams-view";
import { AdminDashboardView } from "@/features/admin/views/admin-dashboard-view";
import { AdminCheckpointsReviewView } from "@/features/admin/views/admin-checkpoints-review-view";
import { AdminSettingsView } from "@/features/admin/views/admin-settings-view";
import { ChangePasswordView } from "@/features/settings/views/change-password-view";
import { CheckpointFormView } from "@/features/hackathon/views/checkpoint-form-view";
import { HackathonView } from "@/features/hackathon/views/hackathon-view";
import { HomePublicView } from "@/features/home/views/home-public-view";
import { HomeRulesView } from "@/features/home/views/home-rules-view";
import { HomeScheduleView } from "@/features/home/views/home-schedule-view";
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
        index: true,
        element: <HomePublicView />,
      },
      {
        path: "rules",
        element: <HomeRulesView />,
      },
      {
        path: "schedule",
        element: <HomeScheduleView />,
      },
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
        element: <AuthGuardLayout />,
        children: [
          {
            path: "start",
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
                element: <Navigate to="/admin/dashboard" replace />,
              },
              {
                path: "admin",
                element: <AdminGuardLayout />,
                children: [
                  {
                    index: true,
                    element: <Navigate to="/admin/dashboard" replace />,
                  },
                  {
                    path: "dashboard",
                    element: <AdminDashboardView />,
                  },
                  {
                    path: "teams",
                    element: <AdminTeamsView />,
                  },
                  {
                    path: "teams/:teamId",
                    element: <AdminTeamDetailsView />,
                  },
                  {
                    path: "staff",
                    element: <AdminStaffView />,
                  },
                  {
                    path: "checkpoints",
                    element: <AdminCheckpointsReviewView />,
                  },
                  {
                    path: "settings",
                    element: <AdminSettingsView />,
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
                path: "hackathon/:cpCode",
                element: <CheckpointFormView />,
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
                element: <Navigate to="/start" replace />,
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
