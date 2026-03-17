import { supabase } from "./client";
import { type TeamWithCaptainRow, getTeamsWithCaptains } from "./admin";
import { getJuryCriteria } from "./constructors";
import {
  getDecisionsForCheckpoint,
  getSubmissionsForCheckpoint,
  type CheckpointDecisionRow,
  type SubmissionRow,
} from "./hackathon";

type JuryProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

export type JuryAssessmentRow = {
  id: string;
  team_id: string;
  jury_id: string;
  overall_comment: string | null;
  created_at: string;
  updated_at: string;
};

export type JuryAssessmentScoreRow = {
  id: string;
  assessment_id: string;
  criterion_id: string;
  score: number;
  created_at: string;
};

export type JuryAssessmentWithScoresRow = JuryAssessmentRow & {
  scores: JuryAssessmentScoreRow[];
};

export type JuryAssessmentScoreInput = {
  criterionId: string;
  score: number;
};

export type JuryAssessmentInput = {
  teamId: string;
  overallComment: string;
  scores: JuryAssessmentScoreInput[];
};

export type JuryQueueRow = {
  team: TeamWithCaptainRow;
  submission: SubmissionRow;
  decision: CheckpointDecisionRow;
};

export type JuryCriterionAverageRow = {
  criterion_id: string;
  title: string;
  max_points: number;
  average_score: number | null;
};

export type JuryAssessmentSummaryRow = {
  assessment: JuryAssessmentRow;
  jury: JuryProfileRow | null;
  total_score: number;
  scores: Array<{
    criterion_id: string;
    title: string;
    max_points: number;
    score: number | null;
  }>;
};

export type JuryTeamSummary = {
  assessment_count: number;
  max_total: number;
  total_average: number | null;
  criteria: JuryCriterionAverageRow[];
  assessments: JuryAssessmentSummaryRow[];
};

type SupabaseWriteResponse<T> = {
  data: T | null;
  error: Error | null;
};

function normalizeNullableText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function getCurrentUserIdOrThrow(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

async function getAssessmentScores(
  assessmentIds: string[],
): Promise<JuryAssessmentScoreRow[]> {
  if (assessmentIds.length === 0) return [];

  const { data, error } = await supabase
    .from("jury_assessment_scores")
    .select("*")
    .in("assessment_id", assessmentIds);

  if (error) throw error;
  return (data ?? []) as JuryAssessmentScoreRow[];
}

async function getJuryProfiles(juryIds: string[]): Promise<Map<string, JuryProfileRow>> {
  const uniqueIds = [...new Set(juryIds)];
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("profiles")
    .select("id,first_name,last_name")
    .in("id", uniqueIds);

  if (error) throw error;

  return new Map(
    ((data ?? []) as JuryProfileRow[]).map((profile) => [profile.id, profile]),
  );
}

function buildScoresByAssessment(
  scores: JuryAssessmentScoreRow[],
): Map<string, JuryAssessmentScoreRow[]> {
  const byAssessment = new Map<string, JuryAssessmentScoreRow[]>();

  for (const score of scores) {
    const current = byAssessment.get(score.assessment_id) ?? [];
    current.push(score);
    byAssessment.set(score.assessment_id, current);
  }

  return byAssessment;
}

export async function getJuryFinalistQueue(): Promise<JuryQueueRow[]> {
  const [teams, submissions, decisions] = await Promise.all([
    getTeamsWithCaptains(),
    getSubmissionsForCheckpoint("cp3"),
    getDecisionsForCheckpoint("cp3"),
  ]);

  const submissionMap = new Map(
    submissions
      .filter((submission) => submission.status === "submitted")
      .map((submission) => [submission.team_id, submission]),
  );
  const decisionMap = new Map(
    decisions
      .filter((decision) => decision.decision === "advanced")
      .map((decision) => [decision.team_id, decision]),
  );

  return teams
    .filter((team) => team.status !== "disqualified")
    .map((team) => ({
      team,
      submission: submissionMap.get(team.id) ?? null,
      decision: decisionMap.get(team.id) ?? null,
    }))
    .filter(
      (
        row,
      ): row is {
        team: TeamWithCaptainRow;
        submission: SubmissionRow;
        decision: CheckpointDecisionRow;
      } => row.submission !== null && row.decision !== null,
    )
    .sort((left, right) => left.team.name.localeCompare(right.team.name, "ru"));
}

export async function getMyJuryAssessment(
  teamId: string,
): Promise<JuryAssessmentWithScoresRow | null> {
  const juryId = await getCurrentUserIdOrThrow();

  const response = (await supabase
    .from("jury_assessments")
    .select("*")
    .eq("team_id", teamId)
    .eq("jury_id", juryId)
    .maybeSingle()) as SupabaseWriteResponse<unknown>;

  if (response.error) throw response.error;
  if (!response.data) return null;

  const assessment = response.data as JuryAssessmentRow;
  const scores = await getAssessmentScores([assessment.id]);
  return {
    ...assessment,
    scores,
  };
}

export async function upsertJuryAssessment(
  input: JuryAssessmentInput,
): Promise<JuryAssessmentWithScoresRow> {
  const juryId = await getCurrentUserIdOrThrow();
  const activeCriteria = await getJuryCriteria({ activeOnly: true });

  if (activeCriteria.length === 0) {
    throw new Error("No active jury criteria configured");
  }

  const criteriaById = new Map(activeCriteria.map((criterion) => [criterion.id, criterion]));
  const seenCriterionIds = new Set<string>();

  for (const scoreInput of input.scores) {
    const criterion = criteriaById.get(scoreInput.criterionId);
    if (!criterion) {
      throw new Error("Assessment contains an unknown criterion");
    }
    if (seenCriterionIds.has(scoreInput.criterionId)) {
      throw new Error("Assessment contains duplicate criterion scores");
    }
    if (!Number.isInteger(scoreInput.score)) {
      throw new Error("Scores must be integers");
    }
    if (scoreInput.score < 0 || scoreInput.score > criterion.max_points) {
      throw new Error(`Score for "${criterion.title}" must be between 0 and ${criterion.max_points}`);
    }
    seenCriterionIds.add(scoreInput.criterionId);
  }

  if (seenCriterionIds.size !== activeCriteria.length) {
    throw new Error("Assessment must include a score for every active criterion");
  }

  const assessmentResponse = (await supabase
    .from("jury_assessments")
    .upsert(
      {
        team_id: input.teamId,
        jury_id: juryId,
        overall_comment: normalizeNullableText(input.overallComment),
      },
      { onConflict: "team_id,jury_id" },
    )
    .select("*")
    .single()) as SupabaseWriteResponse<unknown>;

  if (assessmentResponse.error) throw assessmentResponse.error;

  const assessment = assessmentResponse.data as JuryAssessmentRow;
  const scorePayload = input.scores.map((score) => ({
    assessment_id: assessment.id,
    criterion_id: score.criterionId,
    score: score.score,
  }));

  const { error: scoreError } = await supabase
    .from("jury_assessment_scores")
    .upsert(scorePayload, { onConflict: "assessment_id,criterion_id" });

  if (scoreError) throw scoreError;

  const freshAssessment = await getMyJuryAssessment(input.teamId);
  if (!freshAssessment) {
    throw new Error("Failed to load saved jury assessment");
  }

  return freshAssessment;
}

export async function getJurySummaryForTeam(
  teamId: string,
): Promise<JuryTeamSummary> {
  const [criteria, assessmentsResponse] = await Promise.all([
    getJuryCriteria(),
    supabase.from("jury_assessments").select("*").eq("team_id", teamId),
  ]);

  if (assessmentsResponse.error) throw assessmentsResponse.error;

  const assessments = (assessmentsResponse.data ?? []) as JuryAssessmentRow[];
  const assessmentIds = assessments.map((assessment) => assessment.id);
  const scores = await getAssessmentScores(assessmentIds);
  const scoresByAssessment = buildScoresByAssessment(scores);
  const profilesById = await getJuryProfiles(assessments.map((assessment) => assessment.jury_id));

  const maxTotal = criteria.reduce((sum, criterion) => sum + criterion.max_points, 0);

  const criteriaSummary: JuryCriterionAverageRow[] = criteria.map((criterion) => {
    const criterionScores = scores.filter(
      (score) => score.criterion_id === criterion.id,
    );
    const average =
      criterionScores.length > 0
        ? criterionScores.reduce((sum, score) => sum + score.score, 0) /
          criterionScores.length
        : null;

    return {
      criterion_id: criterion.id,
      title: criterion.title,
      max_points: criterion.max_points,
      average_score: average,
    };
  });

  const assessmentSummaries = assessments.map((assessment) => {
    const assessmentScores = scoresByAssessment.get(assessment.id) ?? [];
    const scoresMap = new Map(
      assessmentScores.map((score) => [score.criterion_id, score.score]),
    );

    const detailedScores = criteria.map((criterion) => ({
      criterion_id: criterion.id,
      title: criterion.title,
      max_points: criterion.max_points,
      score: scoresMap.get(criterion.id) ?? null,
    }));

    const totalScore = detailedScores.reduce(
      (sum, score) => sum + (score.score ?? 0),
      0,
    );

    return {
      assessment,
      jury: profilesById.get(assessment.jury_id) ?? null,
      total_score: totalScore,
      scores: detailedScores,
    };
  });

  const totalAverage =
    assessmentSummaries.length > 0
      ? assessmentSummaries.reduce((sum, assessment) => sum + assessment.total_score, 0) /
        assessmentSummaries.length
      : null;

  return {
    assessment_count: assessments.length,
    max_total: maxTotal,
    total_average: totalAverage,
    criteria: criteriaSummary,
    assessments: assessmentSummaries,
  };
}
