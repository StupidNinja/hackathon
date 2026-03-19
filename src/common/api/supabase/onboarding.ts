import { supabase } from "./client";

export type AppRole = "team" | "admin" | "jury";
export type StaffRole = Exclude<AppRole, "team">;

export type ProfileRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  telegram: string | null;
  grade: number | null;
  school_id: string | null;
  custom_school_name: string | null;
  role: AppRole;
  is_super_admin: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
  schools: { id: string; name_ru: string } | null;
};

export type SchoolRow = {
  id: string;
  code: string;
  name_ru: string;
  name_kz: string | null;
  name_en: string | null;
  is_active: boolean;
  created_at: string;
};

export type SearchSchoolsInput = {
  query: string;
  limit?: number;
  signal?: AbortSignal;
};

export type TeamRow = {
  id: string;
  name: string;
  captain_id: string;
  members_count: number | null;
  is_registered: boolean;
  status: "registered" | "cancelled" | "disqualified";
  created_at: string;
  updated_at: string;
};

export type TeamMemberRow = {
  id: string;
  team_id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  telegram: string | null;
  is_captain: boolean;
};

export type OnboardingState =
  | "UNAUTHENTICATED"
  | "NO_PROFILE"
  | "NO_TEAM"
  | "READY";

export type OnboardingSnapshot = {
  profile: ProfileRow | null;
  team: TeamRow | null;
  state: OnboardingState;
};

export type UpsertProfileInput = {
  firstName: string;
  lastName: string;
  phone?: string | null;
  telegram?: string | null;
  grade: 9 | 10 | 11;
  schoolId?: string | null;
  customSchoolName?: string | null;
};

export type UpsertStaffProfileInput = {
  firstName: string;
  lastName: string;
  role: StaffRole;
};

export type CaptainMemberInput = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  telegram: string | null;
};

export type AdditionalMemberInput = {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  telegram: string | null;
};

export type SaveTeamInput = {
  captainId: string;
  teamName: string;
  captain: CaptainMemberInput;
  members: AdditionalMemberInput[];
};

const PROFILE_COLUMNS =
  "id,email,first_name,last_name,phone,telegram,grade,school_id,custom_school_name,role,is_super_admin,must_change_password,created_at,updated_at,schools(id,name_ru)";
const SCHOOL_COLUMNS = "id,code,name_ru,name_kz,name_en,is_active,created_at";
const TEAM_COLUMNS =
  "id,name,captain_id,members_count,is_registered,status,created_at,updated_at";
const TEAM_MEMBER_COLUMNS =
  "id,team_id,user_id,first_name,last_name,email,phone,telegram,is_captain";

const escapePostgresLikePattern = (value: string): string =>
  value.replace(/[\\%_]/g, "\\$&");

const normalizeNullableText = (
  value: string | null | undefined,
): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const createValidationError = (message: string): Error => {
  const error = new Error(message) as Error & { status?: number };
  error.status = 400;
  return error;
};

const isStaffRole = (role: AppRole | null | undefined): role is StaffRole =>
  role === "admin" || role === "jury";

async function getStoredRole(userId: string): Promise<AppRole | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data?.role as AppRole | null | undefined) ?? null;
}

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as unknown as ProfileRow | null;
}

export async function getActiveSchools(): Promise<SchoolRow[]> {
  const { data, error } = await supabase
    .from("schools")
    .select(SCHOOL_COLUMNS)
    .eq("is_active", true)
    .order("name_ru", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as SchoolRow[];
}

/**
 * Normalises common substitutions for the "№" (numero) sign so that students
 * can type "#3", "No 3", "N°3", "школа 3" etc. and still find "Школа №3".
 */
function normalizeSchoolQuery(query: string): string {
  return query
    .replace(/#\s*/g, "№") // "#3"      → "№3"
    .replace(/\bNo\.?\s*/gi, "№") // "No3", "No. 3" → "№3"
    .replace(/[Nn]°\s*/g, "№") // "N°3"    → "№3"
    .replace(/(\D)\s+(\d)/g, "$1 №$2"); // "школа 3" → "школа №3"
}

export async function searchActiveSchools(
  input: SearchSchoolsInput,
): Promise<SchoolRow[]> {
  const rawQuery = input.query.trim();
  const normalizedQuery = normalizeSchoolQuery(rawQuery);
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);

  let queryBuilder = supabase
    .from("schools")
    .select(SCHOOL_COLUMNS)
    .eq("is_active", true)
    .order("name_ru", { ascending: true })
    .limit(limit);

  if (normalizedQuery.length > 0) {
    queryBuilder = queryBuilder.ilike(
      "name_ru",
      `%${escapePostgresLikePattern(normalizedQuery)}%`,
    );
  }

  if (input.signal) {
    queryBuilder = queryBuilder.abortSignal(input.signal);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    throw error;
  }

  return (data ?? []) as SchoolRow[];
}

export async function getTeamByCaptain(
  captainId: string,
): Promise<TeamRow | null> {
  const { data, error } = await supabase
    .from("teams")
    .select(TEAM_COLUMNS)
    .eq("captain_id", captainId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    throw error;
  }
  return ((data ?? [])[0] ?? null) as TeamRow | null;
}

export async function getTeamMembers(teamId: string): Promise<TeamMemberRow[]> {
  const { data, error } = await supabase
    .from("team_members")
    .select(TEAM_MEMBER_COLUMNS)
    .eq("team_id", teamId)
    .order("is_captain", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as TeamMemberRow[];
}

export async function getTeamWithMembers(captainId: string): Promise<{
  team: TeamRow | null;
  members: TeamMemberRow[];
}> {
  const team = await getTeamByCaptain(captainId);

  if (!team) {
    return {
      team: null,
      members: [],
    };
  }

  const members = await getTeamMembers(team.id);

  return {
    team,
    members,
  };
}

export async function getOnboardingSnapshot(
  userId: string | null,
): Promise<OnboardingSnapshot> {
  if (!userId) {
    return {
      profile: null,
      team: null,
      state: "UNAUTHENTICATED",
    };
  }

  const [profile, team] = await Promise.all([
    getProfile(userId),
    getTeamByCaptain(userId),
  ]);

  if (!profile) {
    return {
      profile,
      team,
      state: "NO_PROFILE",
    };
  }

  if (profile.role !== "team") {
    return {
      profile,
      team,
      state: "READY",
    };
  }

  if (!team) {
    return {
      profile,
      team,
      state: "NO_TEAM",
    };
  }

  return {
    profile,
    team,
    state: "READY",
  };
}

export async function upsertProfile(
  userId: string,
  input: UpsertProfileInput,
): Promise<ProfileRow> {
  const storedRole = await getStoredRole(userId);
  if (isStaffRole(storedRole)) {
    throw createValidationError(
      "Staff profiles can only update first and last name.",
    );
  }

  const schoolId = input.schoolId ?? null;
  const customSchoolName = schoolId
    ? null
    : normalizeNullableText(input.customSchoolName);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload = {
    id: userId,
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    email: user?.email ?? null,
    phone: normalizeNullableText(input.phone),
    telegram: normalizeNullableText(input.telegram),
    grade: input.grade,
    school_id: schoolId,
    custom_school_name: customSchoolName,
    role: storedRole ?? "team",
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return data as unknown as ProfileRow;
}

export async function upsertStaffProfile(
  userId: string,
  input: UpsertStaffProfileInput,
): Promise<ProfileRow> {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();

  if (firstName.length === 0) {
    throw createValidationError("First name is required.");
  }

  if (lastName.length === 0) {
    throw createValidationError("Last name is required.");
  }

  if (!isStaffRole(input.role)) {
    throw createValidationError("Staff role must be admin or jury.");
  }

  const storedRole = await getStoredRole(userId);
  if (storedRole && storedRole !== input.role) {
    throw createValidationError("Profile role does not match invited role.");
  }

  const payload = {
    id: userId,
    first_name: firstName,
    last_name: lastName,
    phone: null,
    telegram: null,
    grade: null,
    school_id: null,
    custom_school_name: null,
    role: input.role,
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return data as unknown as ProfileRow;
}

export async function saveTeamWithMembers(input: SaveTeamInput): Promise<{
  team: TeamRow;
  members: TeamMemberRow[];
}> {
  const normalizedTeamName = input.teamName.trim();

  // Track whether we created a new team in this call so we can compensate on failure.
  let newlyCreatedTeamId: string | null = null;

  let team = await getTeamByCaptain(input.captainId);

  try {
    if (!team) {
      const { data, error } = await supabase
        .from("teams")
        .insert({
          name: normalizedTeamName,
          captain_id: input.captainId,
          is_registered: true,
        })
        .select(TEAM_COLUMNS)
        .single();

      if (error) {
        throw error;
      }
      team = data as TeamRow;
      newlyCreatedTeamId = team.id;
    } else {
      const { data, error } = await supabase
        .from("teams")
        .update({
          name: normalizedTeamName,
          captain_id: input.captainId,
        })
        .eq("id", team.id)
        .select(TEAM_COLUMNS)
        .single();

      if (error) {
        throw error;
      }
      team = data as TeamRow;
    }

    const captainPayload = {
      team_id: team.id,
      user_id: input.captain.userId,
      first_name: input.captain.firstName.trim(),
      last_name: input.captain.lastName.trim(),
      email: normalizeNullableText(input.captain.email),
      phone: normalizeNullableText(input.captain.phone),
      telegram: normalizeNullableText(input.captain.telegram),
      is_captain: true,
    };

    // Upsert captain row: fetch existing id and update, or insert fresh.
    const { data: existingCaptainRowsRaw, error: captainReadError } =
      await supabase
        .from("team_members")
        .select("id")
        .eq("team_id", team.id)
        .eq("is_captain", true)
        .limit(1);

    if (captainReadError) {
      throw captainReadError;
    }

    const existingCaptainRows = (existingCaptainRowsRaw ?? []) as Array<{
      id: string;
    }>;
    const existingCaptainId = existingCaptainRows[0]?.id;

    if (existingCaptainId) {
      const { error } = await supabase
        .from("team_members")
        .update(captainPayload)
        .eq("id", existingCaptainId);

      if (error) {
        throw error;
      }
    } else {
      const { error } = await supabase
        .from("team_members")
        .insert(captainPayload);

      if (error) {
        throw error;
      }
    }

    const { error: deleteError } = await supabase
      .from("team_members")
      .delete()
      .eq("team_id", team.id)
      .eq("is_captain", false);

    if (deleteError) {
      throw deleteError;
    }

    const additionalMembersPayload = input.members.map((member) => ({
      // `team` is always a TeamRow at this point (both branches above assign it or throw),
      // but TypeScript doesn't narrow `let` inside arrow-function closures.
      team_id: team!.id,
      user_id: null,
      first_name: member.firstName.trim(),
      last_name: member.lastName.trim(),
      email: normalizeNullableText(member.email),
      phone: normalizeNullableText(member.phone),
      telegram: normalizeNullableText(member.telegram),
      is_captain: false,
    }));

    if (additionalMembersPayload.length > 0) {
      const { error } = await supabase
        .from("team_members")
        .insert(additionalMembersPayload);

      if (error) {
        throw error;
      }
    }

    const totalMembers = 1 + additionalMembersPayload.length;

    const { data: updatedTeam, error: updateTeamError } = await supabase
      .from("teams")
      .update({
        members_count: totalMembers,
        is_registered: true,
      })
      .eq("id", team.id)
      .select(TEAM_COLUMNS)
      .single();

    if (updateTeamError) {
      throw updateTeamError;
    }

    const members = await getTeamMembers(team.id);

    return {
      team: updatedTeam as TeamRow,
      members,
    };
  } catch (err) {
    // Compensation: if we created a new team row in this call, delete it so the
    // user is not left with a partial/orphaned record and can safely retry.
    if (newlyCreatedTeamId) {
      await supabase.from("teams").delete().eq("id", newlyCreatedTeamId);
    }
    throw err;
  }
}
