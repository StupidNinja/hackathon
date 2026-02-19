import { type RouteObject } from "react-router-dom";
import { AuthGuardLayout } from "@/common/layouts/auth-guard-layout/auth-guard-layout";
import { NotificationsLayout } from "@/common/layouts/notifications-layout";
import { NonAuthGuardLayout } from "@/common/layouts/non-auth-guard-layout/non-auth-guard-layout";
import { AuthView } from "@/features/auth/views/auth-view";
import { HomeProtectedView } from "@/features/home/views/home-protected-view";

function NotFoundView() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <p className="text-sm text-muted-foreground">Page not found.</p>
    </div>
  );
}

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <NotificationsLayout />,
    children: [
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
            element: <HomeProtectedView />,
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
