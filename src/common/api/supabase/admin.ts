import { supabase } from "./client";
import { supabaseConfig } from "@/common/api/config/supabase.config";
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

type NotifyRejectionCheckpointCode = "cp0" | "cp1" | "cp2" | "cp3";

export type NotifyRejectionInput = {
  teamId: string;
  teamName: string;
  cpCode: NotifyRejectionCheckpointCode | null;
  reasonCode: string;
  reasonLabel?: string;
  adminComment: string;
};

type NotifyRejectionResult = {
  ok: true;
};

const DASHBOARD_CHECKPOINTS = ["cp0", "cp1", "cp2", "cp3"] as const;
type DashboardCheckpointCode = (typeof DASHBOARD_CHECKPOINTS)[number];

export type AdminDashboardStatsRow = {
  total_teams: number;
  total_participants: number;
  passed_by_checkpoint: Record<DashboardCheckpointCode, number>;
};

export type AdminTeamRankingRow = {
  rank: number;
  team_id: string;
  team_name: string;
  captain_name: string;
  captain_email: string | null;
  total_score_sum: number;
  assessments_count: number;
  unique_jury_count: number;
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

type RawTeamIdRow = {
  team_id: string;
};

type RawJuryAssessmentRow = {
  id: string;
  team_id: string;
  jury_id: string;
};

type RawAssessmentScoreRow = {
  assessment_id: string;
  score: number;
};

type RawAssessmentScoreWithIdRow = RawAssessmentScoreRow & {
  id: string;
};

const POSTGREST_PAGE_SIZE = 1000;

async function fetchAllJuryAssessments(): Promise<RawJuryAssessmentRow[]> {
  const rows: RawJuryAssessmentRow[] = [];
  let from = 0;

  while (true) {
    const to = from + POSTGREST_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("jury_assessments")
      .select("id,team_id,jury_id")
      .order("id", { ascending: true })
      .range(from, to);

    if (error) throw error;

    const page = (data ?? []) as RawJuryAssessmentRow[];
    rows.push(...page);

    if (page.length < POSTGREST_PAGE_SIZE) {
      break;
    }

    from += POSTGREST_PAGE_SIZE;
  }

  return rows;
}

async function fetchAllJuryAssessmentScores(): Promise<RawAssessmentScoreRow[]> {
  const rows: RawAssessmentScoreRow[] = [];
  let from = 0;

  while (true) {
    const to = from + POSTGREST_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("jury_assessment_scores")
      .select("id,assessment_id,score")
      .order("id", { ascending: true })
      .range(from, to);

    if (error) throw error;

    const page = (data ?? []) as RawAssessmentScoreWithIdRow[];
    rows.push(...page.map(({ assessment_id, score }) => ({ assessment_id, score })));

    if (page.length < POSTGREST_PAGE_SIZE) {
      break;
    }

    from += POSTGREST_PAGE_SIZE;
  }

  return rows;
}

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

async function getAccessTokenOrThrow(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }

  const token = data.session?.access_token;
  if (!token) {
    throw new Error("No active session. Please sign in again.");
  }

  return token;
}

export async function getStaffUsers(): Promise<StaffUserRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(STAFF_USER_COLUMNS)
    .in("role", ["admin", "jury"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as StaffUserRow[];
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStatsRow> {
  const [
    teamsCountResult,
    participantsCountResult,
    ...checkpointPassCountResults
  ] = await Promise.all([
    supabase
      .from("teams")
      .select("id", { count: "exact", head: true })
      .eq("is_registered", true),
    supabase
      .from("team_members")
      .select("id,teams!inner(id)", { count: "exact", head: true })
      .eq("teams.is_registered", true),
    ...DASHBOARD_CHECKPOINTS.map((code) =>
      supabase
        .from("checkpoint_decisions")
        .select("team_id", { count: "exact", head: true })
        .eq("checkpoint_code", code)
        .eq("decision", "advanced"),
    ),
  ]);

  if (teamsCountResult.error) throw teamsCountResult.error;
  if (participantsCountResult.error) throw participantsCountResult.error;

  const passedByCheckpoint = DASHBOARD_CHECKPOINTS.reduce<
    Record<DashboardCheckpointCode, number>
  >(
    (acc, code, index) => {
      const result = checkpointPassCountResults[index];
      if (result.error) throw result.error;
      acc[code] = result.count ?? 0;
      return acc;
    },
    { cp0: 0, cp1: 0, cp2: 0, cp3: 0 },
  );

  return {
    total_teams: teamsCountResult.count ?? 0,
    total_participants: participantsCountResult.count ?? 0,
    passed_by_checkpoint: passedByCheckpoint,
  };
}

export async function getAdminTeamRanking(): Promise<AdminTeamRankingRow[]> {
  const [teams, cp3SubmittedResult, cp3AdvancedResult, assessmentsResult, scoresResult] =
    await Promise.all([
      getTeamsWithCaptains(),
      supabase
        .from("submissions")
        .select("team_id")
        .eq("checkpoint_code", "cp3")
        .eq("status", "submitted"),
      supabase
        .from("checkpoint_decisions")
        .select("team_id")
        .eq("checkpoint_code", "cp3")
        .eq("decision", "advanced"),
      fetchAllJuryAssessments(),
      fetchAllJuryAssessmentScores(),
    ]);

  if (cp3SubmittedResult.error) throw cp3SubmittedResult.error;
  if (cp3AdvancedResult.error) throw cp3AdvancedResult.error;
  const cp3SubmittedSet = new Set(
    ((cp3SubmittedResult.data ?? []) as RawTeamIdRow[]).map((row) => row.team_id),
  );
  const cp3AdvancedSet = new Set(
    ((cp3AdvancedResult.data ?? []) as RawTeamIdRow[]).map((row) => row.team_id),
  );

  const assessments = assessmentsResult;
  const scores = scoresResult;

  const assessmentTotalById = new Map<string, number>();
  for (const score of scores) {
    const current = assessmentTotalById.get(score.assessment_id) ?? 0;
    assessmentTotalById.set(score.assessment_id, current + score.score);
  }

  const assessmentsByTeamId = new Map<string, RawJuryAssessmentRow[]>();
  for (const assessment of assessments) {
    const current = assessmentsByTeamId.get(assessment.team_id) ?? [];
    current.push(assessment);
    assessmentsByTeamId.set(assessment.team_id, current);
  }

  const rows = teams
    .filter((team) => team.status !== "disqualified")
    .filter((team) => cp3SubmittedSet.has(team.id) && cp3AdvancedSet.has(team.id))
    .map((team) => {
      const teamAssessments = assessmentsByTeamId.get(team.id) ?? [];
      const scoredAssessments = teamAssessments.filter((assessment) =>
        assessmentTotalById.has(assessment.id),
      );
      const totalScoreSum = scoredAssessments.reduce(
        (sum, assessment) => sum + (assessmentTotalById.get(assessment.id) ?? 0),
        0,
      );
      const juryIds = new Set(scoredAssessments.map((assessment) => assessment.jury_id));

      return {
        team,
        totalScoreSum,
        assessmentsCount: scoredAssessments.length,
        uniqueJuryCount: juryIds.size,
      };
    })
    .filter((row) => row.assessmentsCount > 0)
    .sort((left, right) => {
      if (right.totalScoreSum !== left.totalScoreSum) {
        return right.totalScoreSum - left.totalScoreSum;
      }
      return left.team.name.localeCompare(right.team.name, "ru");
    })
    .map((row, index) => ({
      rank: index + 1,
      team_id: row.team.id,
      team_name: row.team.name,
      captain_name:
        `${row.team.captain.first_name ?? ""} ${row.team.captain.last_name ?? ""}`.trim() ||
        "—",
      captain_email: row.team.captain.email,
      total_score_sum: row.totalScoreSum,
      assessments_count: row.assessmentsCount,
      unique_jury_count: row.uniqueJuryCount,
    }));

  return rows;
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

export async function notifyRejection(
  input: NotifyRejectionInput,
): Promise<NotifyRejectionResult> {
  const accessToken = await getAccessTokenOrThrow();

  const endpoint = `${supabaseConfig.url}/functions/v1/notify_rejection`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseConfig.anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      ...input,
      accessToken,
    }),
  });

  let responseBody: unknown = null;
  try {
    responseBody = await response.json();
  } catch {
    // non-JSON response
  }

  if (!response.ok) {
    const message =
      typeof responseBody === "object" &&
      responseBody !== null &&
      "error" in responseBody &&
      typeof (responseBody as { error?: unknown }).error === "string"
        ? (responseBody as { error: string }).error
        : `notify_rejection failed with status ${response.status}`;
    throw new Error(message);
  }

  if (
    typeof responseBody !== "object" ||
    responseBody === null ||
    !("ok" in responseBody) ||
    (responseBody as { ok?: unknown }).ok !== true
  ) {
    throw new Error("Empty response from notify_rejection");
  }

  return responseBody as NotifyRejectionResult;
}
