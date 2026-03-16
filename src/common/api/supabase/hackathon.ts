import { supabase } from "./client";
import { type TeamWithCaptainRow, getTeamsWithCaptains } from "./admin";

// ============================================================
// Types
// ============================================================

export type CheckpointCode = "cp0" | "cp1" | "cp2" | "cp3";
export type SubmissionStatus = "draft" | "submitted";
export type DecisionType = "under_review" | "advanced" | "rejected";

const CHECKPOINT_ORDER: Record<CheckpointCode, number> = {
  cp0: 0,
  cp1: 1,
  cp2: 2,
  cp3: 3,
};
const CHECKPOINT_SEQUENCE: CheckpointCode[] = ["cp0", "cp1", "cp2", "cp3"];

export type HackathonSettingsRow = {
  id: number;
  t0: string | null; // ISO timestamptz, null = not started
  demo_mode: boolean;
  demo_offset_minutes: number;
  updated_at: string;
};

export type CheckpointRow = {
  code: CheckpointCode;
  title: string;
  due_offset_minutes: number;
  open_offset_minutes: number;
  is_active: boolean;
};

// Strongly-typed payload shapes per checkpoint
export type Cp0Payload = {
  confirmed: boolean;
  topic: string;
};
export type Cp1Payload = {
  short_description: string;
  target_audience: string;
  doc_link?: string;
};
export type Cp2Payload = {
  git_url: string;
  implemented: string;
  run_instructions?: string;
};
export type Cp3Payload = {
  build_link?: string;
  build_file_url?: string;
  presentation_link?: string;
  presentation_file_url?: string;
  repo_url?: string;
  summary: string;
};

export type AnyCheckpointPayload =
  | Cp0Payload
  | Cp1Payload
  | Cp2Payload
  | Cp3Payload;

export type SubmissionRow = {
  id: string;
  team_id: string;
  checkpoint_code: CheckpointCode;
  payload: Record<string, unknown>;
  status: SubmissionStatus;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CheckpointDecisionRow = {
  id: string;
  team_id: string;
  checkpoint_code: CheckpointCode;
  decision: DecisionType;
  decided_by: string;
  decided_at: string;
  reason_code: string | null;
  admin_comment: string | null;
};

/** Combined row for the admin review queue (one row per team for a given CP) */
export type TeamCheckpointStatusRow = {
  team: TeamWithCaptainRow;
  submission: SubmissionRow | null;
  decision: CheckpointDecisionRow | null;
};

// ============================================================
// Hackathon settings
// ============================================================

export async function getHackathonSettings(): Promise<HackathonSettingsRow> {
  const { data, error } = await supabase
    .from("hackathon_settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) throw error;
  return data as HackathonSettingsRow;
}

export async function updateHackathonSettings(
  patch: Partial<
    Pick<HackathonSettingsRow, "t0" | "demo_mode" | "demo_offset_minutes">
  >,
): Promise<HackathonSettingsRow> {
  const { data, error } = await supabase
    .from("hackathon_settings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", 1)
    .select("*")
    .single();
  if (error) throw error;
  return data as HackathonSettingsRow;
}

// ============================================================
// Checkpoints
// ============================================================

export async function getCheckpoints(): Promise<CheckpointRow[]> {
  const { data, error } = await supabase
    .from("checkpoints")
    .select("*")
    .order("due_offset_minutes", { ascending: true });
  if (error) throw error;
  return data as CheckpointRow[];
}

// ============================================================
// Team submissions
// ============================================================

export async function getSubmissionsForTeam(
  teamId: string,
): Promise<SubmissionRow[]> {
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("team_id", teamId)
    .order("checkpoint_code", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SubmissionRow[];
}

export async function getSubmission(
  teamId: string,
  cpCode: CheckpointCode,
): Promise<SubmissionRow | null> {
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("team_id", teamId)
    .eq("checkpoint_code", cpCode)
    .maybeSingle();
  if (error) throw error;
  return data as SubmissionRow | null;
}

/**
 * Save a checkpoint draft via server-side RPC.
 * The RPC enforces: captain check, deadline check, not disqualified.
 */
export async function saveCheckpointDraft(
  teamId: string,
  cpCode: CheckpointCode,
  payload: AnyCheckpointPayload,
): Promise<SubmissionRow> {
  const { data, error } = await supabase.rpc("save_checkpoint_draft", {
    p_team_id: teamId,
    p_checkpoint_code: cpCode,
    p_payload: payload,
  });
  if (error) throw error;
  return data as SubmissionRow;
}

/**
 * Submit a checkpoint officially via server-side RPC.
 * The RPC enforces: captain check, deadline check, not disqualified.
 */
export async function submitCheckpoint(
  teamId: string,
  cpCode: CheckpointCode,
  payload: AnyCheckpointPayload,
): Promise<SubmissionRow> {
  const { data, error } = await supabase.rpc("submit_checkpoint", {
    p_team_id: teamId,
    p_checkpoint_code: cpCode,
    p_payload: payload,
  });
  if (error) throw error;
  return data as SubmissionRow;
}

// ============================================================
// Team decisions (read-only for team role)
// ============================================================

export async function getDecisionsForTeam(
  teamId: string,
): Promise<CheckpointDecisionRow[]> {
  const { data, error } = await supabase
    .from("checkpoint_decisions")
    .select("*")
    .eq("team_id", teamId);
  if (error) throw error;
  return (data ?? []) as CheckpointDecisionRow[];
}

// ============================================================
// Admin: read across all teams
// ============================================================

export async function getSubmissionsForCheckpoint(
  cpCode: CheckpointCode,
): Promise<SubmissionRow[]> {
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("checkpoint_code", cpCode);
  if (error) throw error;
  return (data ?? []) as SubmissionRow[];
}

export async function getDecisionsForCheckpoint(
  cpCode: CheckpointCode,
): Promise<CheckpointDecisionRow[]> {
  const { data, error } = await supabase
    .from("checkpoint_decisions")
    .select("*")
    .eq("checkpoint_code", cpCode);
  if (error) throw error;
  return (data ?? []) as CheckpointDecisionRow[];
}

type RejectedDecisionForFilter = Pick<
  CheckpointDecisionRow,
  "team_id" | "checkpoint_code"
>;
type SubmittedCheckpointForFilter = Pick<SubmissionRow, "team_id" | "checkpoint_code">;

async function getRejectedDecisionsForAllCheckpoints(): Promise<
  RejectedDecisionForFilter[]
> {
  const { data, error } = await supabase
    .from("checkpoint_decisions")
    .select("team_id, checkpoint_code")
    .eq("decision", "rejected");
  if (error) throw error;
  return (data ?? []) as RejectedDecisionForFilter[];
}

async function getSubmittedCheckpointsForCodes(
  cpCodes: CheckpointCode[],
): Promise<SubmittedCheckpointForFilter[]> {
  if (cpCodes.length === 0) return [];
  const { data, error } = await supabase
    .from("submissions")
    .select("team_id, checkpoint_code")
    .in("checkpoint_code", cpCodes)
    .eq("status", "submitted");
  if (error) throw error;
  return (data ?? []) as SubmittedCheckpointForFilter[];
}

export async function getDecisionsForTeamAdmin(
  teamId: string,
): Promise<CheckpointDecisionRow[]> {
  const { data, error } = await supabase
    .from("checkpoint_decisions")
    .select("*")
    .eq("team_id", teamId)
    .order("checkpoint_code", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CheckpointDecisionRow[];
}

export async function getSubmissionsForTeamAdmin(
  teamId: string,
): Promise<SubmissionRow[]> {
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("team_id", teamId)
    .order("checkpoint_code", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SubmissionRow[];
}

/**
 * Fetch combined team+submission+decision rows for a given checkpoint.
 * Used by the admin review queue.
 */
export async function getTeamCheckpointStatuses(
  cpCode: CheckpointCode,
): Promise<TeamCheckpointStatusRow[]> {
  const selectedOrder = CHECKPOINT_ORDER[cpCode];
  const priorCheckpointCodes = CHECKPOINT_SEQUENCE.filter(
    (code) => CHECKPOINT_ORDER[code] < selectedOrder,
  );

  const [teams, submissions, decisions, rejectedDecisions, submittedPriorCheckpoints] =
    await Promise.all([
    getTeamsWithCaptains(),
    getSubmissionsForCheckpoint(cpCode),
    getDecisionsForCheckpoint(cpCode),
    getRejectedDecisionsForAllCheckpoints(),
    getSubmittedCheckpointsForCodes(priorCheckpointCodes),
  ]);

  const submissionMap = new Map<string, SubmissionRow>(
    submissions.map((s) => [s.team_id, s]),
  );
  const decisionMap = new Map<string, CheckpointDecisionRow>(
    decisions.map((d) => [d.team_id, d]),
  );
  const earliestRejectedOrderByTeam = new Map<string, number>();
  for (const decision of rejectedDecisions) {
    const order = CHECKPOINT_ORDER[decision.checkpoint_code];
    const current = earliestRejectedOrderByTeam.get(decision.team_id);
    if (current === undefined || order < current) {
      earliestRejectedOrderByTeam.set(decision.team_id, order);
    }
  }

  const submittedPriorCodesByTeam = new Map<string, Set<CheckpointCode>>();
  for (const submission of submittedPriorCheckpoints) {
    const submittedCodes = submittedPriorCodesByTeam.get(submission.team_id) ?? new Set();
    submittedCodes.add(submission.checkpoint_code);
    submittedPriorCodesByTeam.set(submission.team_id, submittedCodes);
  }

  const visibleTeams = teams.filter((team) => {
    const submittedPriorCodes = submittedPriorCodesByTeam.get(team.id);
    const reachedCurrentCheckpoint = priorCheckpointCodes.every((code) =>
      submittedPriorCodes?.has(code),
    );
    if (!reachedCurrentCheckpoint) {
      return false;
    }

    const rejectedOrder = earliestRejectedOrderByTeam.get(team.id);
    if (rejectedOrder !== undefined) {
      return rejectedOrder >= selectedOrder;
    }
    // Directly disqualified teams (without a checkpoint rejection) are not eligible
    // for checkpoint review queues.
    return team.status !== "disqualified";
  });

  return visibleTeams.map((team) => ({
    team,
    submission: submissionMap.get(team.id) ?? null,
    decision: decisionMap.get(team.id) ?? null,
  }));
}

// ============================================================
// Admin: write decisions
// ============================================================

/**
 * Upsert a checkpoint decision for a team.
 * If decision = 'rejected', also sets teams.status = 'disqualified'.
 */
export async function setCheckpointDecision(
  teamId: string,
  cpCode: CheckpointCode,
  decision: DecisionType,
  reasonCode?: string,
  adminComment?: string,
): Promise<void> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const { data: team, error: teamFetchError } = await supabase
    .from("teams")
    .select("status")
    .eq("id", teamId)
    .maybeSingle();
  if (teamFetchError) throw teamFetchError;
  if (!team) throw new Error("Team not found");

  if (team.status === "disqualified" && decision !== "rejected") {
    throw new Error("Cannot change decision for a disqualified team");
  }

  const { data: currentDecision, error: currentDecisionError } = await supabase
    .from("checkpoint_decisions")
    .select("decision")
    .eq("team_id", teamId)
    .eq("checkpoint_code", cpCode)
    .maybeSingle();
  if (currentDecisionError) throw currentDecisionError;

  if (currentDecision?.decision === "rejected" && decision !== "rejected") {
    throw new Error("Cannot move a rejected team to another decision");
  }

  // Upsert decision
  const { error: decisionError } = await supabase
    .from("checkpoint_decisions")
    .upsert(
      {
        team_id: teamId,
        checkpoint_code: cpCode,
        decision,
        decided_by: userId,
        decided_at: new Date().toISOString(),
        reason_code: reasonCode ?? null,
        admin_comment: adminComment ?? null,
      },
      { onConflict: "team_id,checkpoint_code" },
    );
  if (decisionError) throw decisionError;

  // If rejected, also disqualify the team
  if (decision === "rejected") {
    const { error: teamError } = await supabase
      .from("teams")
      .update({ status: "disqualified", is_registered: false })
      .eq("id", teamId);
    if (teamError) throw teamError;
  }
}
