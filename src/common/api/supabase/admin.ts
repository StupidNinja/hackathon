import { supabase } from "./client";
import { type ProfileRow } from "./onboarding";

export type StaffUserRow = Pick<
  ProfileRow,
  | "id"
  | "email"
  | "first_name"
  | "last_name"
  | "role"
  | "is_super_admin"
  | "created_at"
>;

const STAFF_USER_COLUMNS =
  "id,email,first_name,last_name,role,is_super_admin,created_at";

export async function getStaffUsers(): Promise<StaffUserRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(STAFF_USER_COLUMNS)
    .in("role", ["admin", "jury"])
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data as StaffUserRow[];
}
