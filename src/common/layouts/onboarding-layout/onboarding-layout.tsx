import { Outlet } from "react-router-dom";
import { Trophy } from "lucide-react";

export function OnboardingLayout() {
  return (
    <div className="min-h-screen bg-muted/40">
      <div className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
        <div className="mb-8 flex items-center gap-2">
          <Trophy className="size-5 text-primary" />
          <span className="font-semibold">Hackathon 2026</span>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
