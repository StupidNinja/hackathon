import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginPage } from "@/features/auth/LoginPage";
import { getAuthToken } from "@/common/auth/authStore";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    if (getAuthToken()) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/" });
    }
  },
  component: LoginPage,
});
