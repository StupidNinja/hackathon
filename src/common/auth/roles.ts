import type { User } from "@supabase/supabase-js";
import type { AppRole } from "@/common/api/supabase/onboarding";

const APP_ROLES = new Set<AppRole>(["team", "admin", "jury"]);
type StaffRole = Exclude<AppRole, "team">;

export function getUserRole(user: User | null | undefined): AppRole | null {
  const rawRole = (user?.app_metadata as { role?: unknown } | undefined)?.role;

  if (typeof rawRole !== "string") {
    return null;
  }

  return APP_ROLES.has(rawRole as AppRole) ? (rawRole as AppRole) : null;
}

export function isStaffRole(role: AppRole | null | undefined): role is StaffRole {
  return role === "admin" || role === "jury";
}

export function getDashboardPathForRole(role: AppRole | null | undefined): string {
  if (role === "admin") {
    return "/admin/dashboard";
  }

  if (role === "jury") {
    return "/jury/dashboard";
  }

  return "/dashboard";
}
