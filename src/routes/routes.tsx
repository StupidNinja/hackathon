import { type RouteObject } from "react-router-dom";
import { AuthGuardLayout } from "@/common/layouts/auth-guard-layout/auth-guard-layout";
import { DashboardLayout } from "@/common/layouts/dashboard-layout/dashboard-layout";
import { NotificationsLayout } from "@/common/layouts/notifications-layout";
import { NonAuthGuardLayout } from "@/common/layouts/non-auth-guard-layout/non-auth-guard-layout";
import { OnboardingLayout } from "@/common/layouts/onboarding-layout/onboarding-layout";
import { AuthCallbackView } from "@/features/auth/views/auth-callback-view";
import { AuthView } from "@/features/auth/views/auth-view";
import { HackathonView } from "@/features/hackathon/views/hackathon-view";
import { HomeProtectedView } from "@/features/home/views/home-protected-view";
import { OnboardingEntryView } from "@/features/onboarding/views/onboarding-entry-view";
import { OnboardingProfileView } from "@/features/onboarding/views/onboarding-profile-view";
import { OnboardingTeamView } from "@/features/onboarding/views/onboarding-team-view";
import { EditProfileView } from "@/features/settings/views/edit-profile-view";
import { EditTeamView } from "@/features/settings/views/edit-team-view";
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
                path: "hackathon",
                element: <HackathonView />,
              },
              {
                path: "settings/profile",
                element: <EditProfileView />,
              },
              {
                path: "settings/team",
                element: <EditTeamView />,
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
