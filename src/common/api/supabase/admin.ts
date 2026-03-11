import { supabase } from "./client";
import { type ProfileRow, type TeamMemberRow } from "./onboarding";

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

export type TeamWithCaptainRow = {
  id: string;
  name: string;
  status: "registered" | "cancelled" | "disqualified";
  members_count: number | null;
  created_at: string;
  captain: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    telegram: string | null;
    grade: number | null;
    school_name: string | null;
  };
};

export type DisqualificationRow = {
  id: string;
  team_id: string;
  reason_code: "invalid_data" | "spam" | "duplicate_team" | "other";
  admin_comment: string;
  created_by: string;
  created_at: string;
  admin: {
    first_name: string | null;
    last_name: string | null;
  };
};

type RawCaptainProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  telegram: string | null;
  grade: number | null;
  custom_school_name: string | null;
  schools: { name_ru: string | null } | { name_ru: string | null }[] | null;
};
type RawTeamBaseRow = {
  id: string;
  name: string;
  status: "registered" | "cancelled" | "disqualified";
  members_count: number | null;
  created_at: string;
  captain_id: string | null;
};
type RawAdminProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};
type RawDisqualificationRow = {
  id: string;
  team_id: string;
  reason_code: "invalid_data" | "spam" | "duplicate_team" | "other";
  admin_comment: string;
  created_by: string;
  created_at: string;
};

function resolveSchoolName(captain: RawCaptainProfile): string | null {
  const school = captain.schools;
  if (!school) return captain.custom_school_name;
  const s = Array.isArray(school) ? school[0] : school;
  return s?.name_ru ?? captain.custom_school_name ?? null;
}
function mergeTeamWithCaptain(
  team: RawTeamBaseRow,
  captainMap: Map<string, RawCaptainProfile>,
): TeamWithCaptainRow {
  const captain = team.captain_id ? captainMap.get(team.captain_id) : undefined;
  return {
    id: team.id,
    name: team.name,
    status: team.status,
    members_count: team.members_count,
    created_at: team.created_at,
    captain: {
      id: captain?.id ?? "",
      first_name: captain?.first_name ?? null,
      last_name: captain?.last_name ?? null,
      email: captain?.email ?? null,
      telegram: captain?.telegram ?? null,
      grade: captain?.grade ?? null,
      school_name: captain ? resolveSchoolName(captain) : null,
    },
  };
}

const STAFF_USER_COLUMNS =
  "id,email,first_name,last_name,role,is_super_admin,created_at";

const TEAM_BASE_COLUMNS = "id,name,status,members_count,created_at,captain_id";
const CAPTAIN_PROFILE_COLUMNS =
  "id,first_name,last_name,email,telegram,grade,custom_school_name,schools(name_ru)";

const DISQUALIFICATION_COLUMNS =
  "id,team_id,reason_code,admin_comment,created_by,created_at";

export async function getStaffUsers(): Promise<StaffUserRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(STAFF_USER_COLUMNS)
    .in("role", ["admin", "jury"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as StaffUserRow[];
}

async function fetchCaptainProfiles(
  captainIds: string[],
): Promise<Map<string, RawCaptainProfile>> {
  const uniqueIds = [...new Set(captainIds)];
  if (uniqueIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("profiles")
    .select(CAPTAIN_PROFILE_COLUMNS)
    .in("id", uniqueIds);
  if (error) throw error;
  const map = new Map<string, RawCaptainProfile>();
  for (const profile of (data ?? []) as unknown as RawCaptainProfile[]) {
    map.set(profile.id, profile);
  }
  return map;
}

export async function getTeamsWithCaptains(): Promise<TeamWithCaptainRow[]> {
  const { data, error } = await supabase
    .from("teams")
    .select(TEAM_BASE_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const teams = (data ?? []) as unknown as RawTeamBaseRow[];
  const captainIds = teams
    .map((t) => t.captain_id)
    .filter((id): id is string => id !== null);
  const captainMap = await fetchCaptainProfiles(captainIds);
  return teams.map((t) => mergeTeamWithCaptain(t, captainMap));
}

export async function getTeamById(teamId: string): Promise<TeamWithCaptainRow> {
  const { data, error } = await supabase
    .from("teams")
    .select(TEAM_BASE_COLUMNS)
    .eq("id", teamId)
    .single();
  if (error) throw error;
  if (!data) throw new Error("Team not found");
  const team = data as unknown as RawTeamBaseRow;
  const captainMap = await fetchCaptainProfiles(
    team.captain_id ? [team.captain_id] : [],
  );
  return mergeTeamWithCaptain(team, captainMap);
}

export async function getTeamMembersForAdmin(
  teamId: string,
): Promise<TeamMemberRow[]> {
  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("team_id", teamId)
    .order("is_captain", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TeamMemberRow[];
}

export async function getDisqualificationByTeamId(
  teamId: string,
): Promise<DisqualificationRow | null> {
  const { data, error } = await supabase
    .from("disqualifications")
    .select(DISQUALIFICATION_COLUMNS)
    .eq("team_id", teamId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const raw = data as unknown as RawDisqualificationRow;
  const { data: adminData } = await supabase
    .from("profiles")
    .select("id,first_name,last_name")
    .eq("id", raw.created_by)
    .maybeSingle();
  const admin = adminData as RawAdminProfile | null;
  return {
    id: raw.id,
    team_id: raw.team_id,
    reason_code: raw.reason_code,
    admin_comment: raw.admin_comment,
    created_by: raw.created_by,
    created_at: raw.created_at,
    admin: {
      first_name: admin?.first_name ?? null,
      last_name: admin?.last_name ?? null,
    },
  };
}

export async function disqualifyTeam(
  teamId: string,
  reasonCode: "invalid_data" | "spam" | "duplicate_team" | "other",
  adminComment: string,
): Promise<void> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError ?? !user) throw new Error("User not authenticated");

  const { error: insertError } = await supabase
    .from("disqualifications")
    .insert({
      team_id: teamId,
      reason_code: reasonCode,
      admin_comment: adminComment,
      created_by: user.id,
    });
  if (insertError) throw insertError;

  const { error: updateError } = await supabase
    .from("teams")
    .update({ status: "disqualified", is_registered: false })
    .eq("id", teamId);
  if (updateError) throw updateError;
}
