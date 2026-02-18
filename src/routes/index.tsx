import { createFileRoute, redirect } from "@tanstack/react-router";
import { HomePage } from "@/features/home/HomePage";
import { getAuthToken } from "@/common/auth/authStore";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (!getAuthToken()) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/login" });
    }
  },
  component: HomePage,
});
