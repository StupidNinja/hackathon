import { Link } from "@tanstack/react-router";
import { useAuthStore } from "@/common/auth/authStore";

export function HomePage() {
  const token = useAuthStore((state) => state.token);
  const clearToken = useAuthStore((state) => state.clearToken);

  return (
    <section className="mx-auto w-full max-w-4xl rounded-[28px] bg-white p-10 shadow-2xl shadow-slate-200/60">
      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
        React + TS + Vite
      </span>
      <h1 className="mt-5 text-4xl font-semibold text-slate-900">
        Template ready for real product work.
      </h1>
      <p className="mt-4 text-base text-slate-600">
        This starter ships with TanStack Router, Tailwind CSS, strict linting,
        and pre-commit quality checks. Drop features into
        <span className="font-semibold text-slate-900"> src/features</span> and
        shared pieces into
        <span className="font-semibold text-slate-900"> src/common</span>.
      </p>
      <p className="mt-3 text-base text-slate-600">
        Server state goes to TanStack Query, client state to Zustand, and all
        requests flow through the shared Axios client.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        {token ? (
          <button
            type="button"
            onClick={clearToken}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Sign out
          </button>
        ) : (
          <Link
            to="/login"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Go to login
          </Link>
        )}
        <span className="text-sm text-slate-500">
          Status: {token ? "authenticated" : "anonymous"}
        </span>
      </div>
    </section>
  );
}
