import { type RouteObject } from "react-router-dom";
import { NotificationsLayout } from "@/common/layouts/notifications-layout";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <NotificationsLayout />,
    children: [
      {
        path: "auth",
        element: <div>Non-auth guard</div>,
        children: [
          {
            path: "sign-in",
            element: <div>Sign In</div>,
          }
        ]
      },
      {
        path: "/",
        element: <div>Auth guard</div>,
        children: [
          {

          }
        ]
      }
    ]
  },
];
