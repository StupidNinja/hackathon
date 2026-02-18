import type { ReactNode } from "react";

type AppShellProps = {
  title: string;
  nav?: ReactNode;
  children: ReactNode;
};

export function AppShell({ title, nav, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-100 via-white to-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200/60 bg-white/80 px-6 py-5 backdrop-blur">
        <span className="text-lg font-semibold tracking-tight text-slate-900">
          {title}
        </span>
        {nav}
      </header>
      <main className="flex-1 px-6 py-10 sm:px-10 lg:px-14">{children}</main>
    </div>
  );
}
