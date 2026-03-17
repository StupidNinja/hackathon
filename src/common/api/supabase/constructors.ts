import { supabase } from "./client";
import type { CheckpointCode } from "./hackathon";

export type Cp0TopicRow = {
  id: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateCp0TopicInput = Pick<
  Cp0TopicRow,
  "label" | "sort_order" | "is_active"
>;

export type UpdateCp0TopicInput = Partial<
  Pick<Cp0TopicRow, "label" | "sort_order" | "is_active">
>;

export type CheckpointRejectionTemplateRow = {
  id: string;
  checkpoint_code: CheckpointCode;
  code: string;
  label: string;
  default_comment: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateCheckpointRejectionTemplateInput = Pick<
  CheckpointRejectionTemplateRow,
  | "checkpoint_code"
  | "code"
  | "label"
  | "default_comment"
  | "sort_order"
  | "is_active"
>;

export type UpdateCheckpointRejectionTemplateInput = Partial<
  Pick<
    CheckpointRejectionTemplateRow,
    "label" | "default_comment" | "sort_order" | "is_active"
  >
>;

export type JuryCriterionRow = {
  id: string;
  title: string;
  description: string | null;
  max_points: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateJuryCriterionInput = Pick<
  JuryCriterionRow,
  "title" | "description" | "max_points" | "sort_order" | "is_active"
>;

export type UpdateJuryCriterionInput = Partial<
  Pick<
    JuryCriterionRow,
    "title" | "description" | "max_points" | "sort_order" | "is_active"
  >
>;

type SupabaseWriteResponse<T> = {
  data: T | null;
  error: Error | null;
};

function normalizeNullableText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeRequiredText(value: string): string {
  const normalized = normalizeNullableText(value);
  if (!normalized) {
    throw new Error("Value is required");
  }
  return normalized;
}

export async function getCp0Topics(options?: {
  activeOnly?: boolean;
}): Promise<Cp0TopicRow[]> {
  let query = supabase
    .from("cp0_topics")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  if (options?.activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Cp0TopicRow[];
}

export async function createCp0Topic(
  input: CreateCp0TopicInput,
): Promise<Cp0TopicRow> {
  const payload = {
    label: normalizeRequiredText(input.label),
    sort_order: input.sort_order,
    is_active: input.is_active,
  };

  const response = (await supabase
    .from("cp0_topics")
    .insert(payload)
    .select("*")
    .single()) as SupabaseWriteResponse<unknown>;

  if (response.error) throw response.error;
  return response.data as Cp0TopicRow;
}

export async function updateCp0Topic(
  id: string,
  patch: UpdateCp0TopicInput,
): Promise<Cp0TopicRow> {
  const payload: UpdateCp0TopicInput = { ...patch };
  if (typeof payload.label === "string") {
    payload.label = normalizeRequiredText(payload.label);
  }

  const response = (await supabase
    .from("cp0_topics")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single()) as SupabaseWriteResponse<unknown>;

  if (response.error) throw response.error;
  return response.data as Cp0TopicRow;
}

export async function deleteCp0Topic(id: string): Promise<void> {
  const { error } = await supabase.from("cp0_topics").delete().eq("id", id);
  if (error) throw error;
}

export async function getCheckpointRejectionTemplates(options?: {
  checkpointCode?: CheckpointCode;
  activeOnly?: boolean;
}): Promise<CheckpointRejectionTemplateRow[]> {
  let query = supabase
    .from("checkpoint_rejection_templates")
    .select("*")
    .order("checkpoint_code", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("code", { ascending: true });

  if (options?.checkpointCode) {
    query = query.eq("checkpoint_code", options.checkpointCode);
  }
  if (options?.activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CheckpointRejectionTemplateRow[];
}

export async function createCheckpointRejectionTemplate(
  input: CreateCheckpointRejectionTemplateInput,
): Promise<CheckpointRejectionTemplateRow> {
  const payload = {
    checkpoint_code: input.checkpoint_code,
    code: normalizeRequiredText(input.code),
    label: normalizeRequiredText(input.label),
    default_comment: normalizeRequiredText(input.default_comment),
    sort_order: input.sort_order,
    is_active: input.is_active,
  };

  const response = (await supabase
    .from("checkpoint_rejection_templates")
    .insert(payload)
    .select("*")
    .single()) as SupabaseWriteResponse<unknown>;

  if (response.error) throw response.error;
  return response.data as CheckpointRejectionTemplateRow;
}

export async function updateCheckpointRejectionTemplate(
  id: string,
  patch: UpdateCheckpointRejectionTemplateInput,
): Promise<CheckpointRejectionTemplateRow> {
  const payload: UpdateCheckpointRejectionTemplateInput = { ...patch };
  if (typeof payload.label === "string") {
    payload.label = normalizeRequiredText(payload.label);
  }
  if (typeof payload.default_comment === "string") {
    payload.default_comment = normalizeRequiredText(payload.default_comment);
  }

  const response = (await supabase
    .from("checkpoint_rejection_templates")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single()) as SupabaseWriteResponse<unknown>;

  if (response.error) throw response.error;
  return response.data as CheckpointRejectionTemplateRow;
}

export async function deleteCheckpointRejectionTemplate(
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("checkpoint_rejection_templates")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function getJuryCriteria(options?: {
  activeOnly?: boolean;
}): Promise<JuryCriterionRow[]> {
  let query = supabase
    .from("jury_criteria")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (options?.activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as JuryCriterionRow[];
}

export async function createJuryCriterion(
  input: CreateJuryCriterionInput,
): Promise<JuryCriterionRow> {
  const payload = {
    title: normalizeRequiredText(input.title),
    description: normalizeNullableText(input.description),
    max_points: input.max_points,
    sort_order: input.sort_order,
    is_active: input.is_active,
  };

  const response = (await supabase
    .from("jury_criteria")
    .insert(payload)
    .select("*")
    .single()) as SupabaseWriteResponse<unknown>;

  if (response.error) throw response.error;
  return response.data as JuryCriterionRow;
}

export async function updateJuryCriterion(
  id: string,
  patch: UpdateJuryCriterionInput,
): Promise<JuryCriterionRow> {
  const payload: UpdateJuryCriterionInput = { ...patch };
  if (typeof payload.title === "string") {
    payload.title = normalizeRequiredText(payload.title);
  }
  if (payload.description !== undefined) {
    payload.description = normalizeNullableText(payload.description);
  }

  const response = (await supabase
    .from("jury_criteria")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single()) as SupabaseWriteResponse<unknown>;

  if (response.error) throw response.error;
  return response.data as JuryCriterionRow;
}

export async function deleteJuryCriterion(id: string): Promise<void> {
  const { error } = await supabase.from("jury_criteria").delete().eq("id", id);
  if (error) throw error;
}

export async function hasJuryAssessments(): Promise<boolean> {
  const { count, error } = await supabase
    .from("jury_assessments")
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return (count ?? 0) > 0;
}
