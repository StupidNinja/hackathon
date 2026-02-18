import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuthStore } from "@/common/auth/authStore";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const setToken = useAuthStore((state) => state.setToken);
  const navigate = useNavigate();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setToken(`demo-${email || "user"}`);
    void navigate({ to: "/" });
  };

  return (
    <section className="mx-auto w-full max-w-xl rounded-[28px] bg-white p-10 shadow-2xl shadow-slate-200/60">
      <h1 className="text-3xl font-semibold text-slate-900">Welcome back</h1>
      <p className="mt-3 text-sm text-slate-600">
        Use your real auth API later. This placeholder sets a local token.
      </p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Email
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="you@company.com"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Password
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            placeholder="••••••••"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
        >
          Sign in
        </button>
      </form>
    </section>
  );
}
