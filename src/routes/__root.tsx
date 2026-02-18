import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  Link,
  Outlet,
} from "@tanstack/react-router";
import { AppShell } from "@/common/ui/AppShell";
import { PendingScreen } from "@/common/ui/PendingScreen";

type RouterContext = {
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  pendingComponent: PendingScreen,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    <AppShell
      title="React TS Template"
      nav={
        <nav className="flex items-center gap-2 text-sm">
          <Link
            to="/"
            className="rounded-full px-3 py-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 data-[status=active]:bg-slate-900 data-[status=active]:text-white"
            activeProps={{ "data-status": "active" }}
          >
            Home
          </Link>
          <Link
            to="/login"
            className="rounded-full px-3 py-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 data-[status=active]:bg-slate-900 data-[status=active]:text-white"
            activeProps={{ "data-status": "active" }}
          >
            Login
          </Link>
        </nav>
      }
    >
      <Outlet />
    </AppShell>
  );
}

function NotFound() {
  return (
    <section className="mx-auto w-full max-w-3xl rounded-3xl bg-white p-10 shadow-xl shadow-slate-200/50">
      <h1 className="text-3xl font-semibold">404 - Page not found</h1>
      <p className="mt-3 text-slate-600">
        The route you requested does not exist yet.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
      >
        Back to home
      </Link>
    </section>
  );
}
