import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Lock, Send, Save } from "lucide-react";

import {
  getCp0Topics,
  getOnboardingSnapshot,
  getSubmission,
  saveCheckpointDraft,
  submitCheckpoint,
} from "@/common/api/supabase";
import type {
  CheckpointCode,
  Cp0TopicRow,
  Cp0Payload,
  Cp1Payload,
  Cp2Payload,
  Cp3Payload,
  AnyCheckpointPayload,
} from "@/common/api/supabase";
import { getUserRole } from "@/common/auth/roles";
import { useAuthStore } from "@/common/auth/authStore";
import { Button } from "@/common/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/common/components/ui/form";
import { Input } from "@/common/components/ui/input";
import { Textarea } from "@/common/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/common/components/ui/alert-dialog";
import { LoadingScreen, ErrorScreen } from "@/common/components/loading-screen";
import { useHackathonTime, formatTimeRemaining } from "@/common/hooks/use-hackathon-time";
import { useI18n } from "@/common/i18n/use-i18n";
import type { TranslationKey } from "@/common/i18n/translations";
import { usePageTitle } from "@/common/hooks/use-page-title";

const VALID_CODES: CheckpointCode[] = ["cp0", "cp1", "cp2", "cp3"];

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

// ============================================================
// Zod schema builders per CP
// ============================================================

function buildCp0Schema(t: (k: TranslationKey) => string) {
  return z.object({
    confirmed: z
      .boolean()
      .refine((v) => v, { message: t("hackathon.cp0.confirmRequired") }),
    topic: z.string().min(1, t("hackathon.cp0.topicRequired")),
  });
}

function buildCp1Schema(t: (k: TranslationKey) => string) {
  return z.object({
    short_description: z
      .string()
      .min(1, t("hackathon.cp1.shortDescRequired")),
    target_audience: z.string().min(1, t("hackathon.cp1.audienceRequired")),
    doc_link: z.string().url({ message: t("hackathon.cp2.gitUrlInvalid") }).optional().or(z.literal("")),
  });
}

function buildCp2Schema(t: (k: TranslationKey) => string) {
  return z.object({
    git_url: z
      .string()
      .url({ message: t("hackathon.cp2.gitUrlInvalid") })
      .min(1, t("hackathon.cp2.gitUrlRequired")),
    implemented: z.string().min(1, t("hackathon.cp2.implementedRequired")),
    run_instructions: z.string().optional(),
  });
}

function buildCp3Schema(t: (k: TranslationKey) => string) {
  return z.object({
    build_link: z
      .string()
      .min(1, t("hackathon.cp3.buildLinkRequired"))
      .url({ message: t("hackathon.cp2.gitUrlInvalid") }),
    presentation_link: z
      .string()
      .min(1, t("hackathon.cp3.presentationLinkRequired"))
      .url({ message: t("hackathon.cp2.gitUrlInvalid") }),
    repo_url: z.string().url({ message: t("hackathon.cp2.gitUrlInvalid") }).optional().or(z.literal("")),
    summary: z.string().min(1, t("hackathon.cp3.summaryRequired")),
  });
}

type Cp0FormValues = z.infer<ReturnType<typeof buildCp0Schema>>;
type Cp1FormValues = z.infer<ReturnType<typeof buildCp1Schema>>;
type Cp2FormValues = z.infer<ReturnType<typeof buildCp2Schema>>;
type Cp3FormValues = z.infer<ReturnType<typeof buildCp3Schema>>;

// ============================================================
// CP-specific form field components
// ============================================================

function Cp0Fields({
  form,
  readOnly,
  topics,
}: {
  form: ReturnType<typeof useForm<Cp0FormValues>>;
  readOnly: boolean;
  topics: Cp0TopicRow[];
}) {
  const { t } = useI18n();
  return (
    <>
      <FormField
        control={form.control}
        name="confirmed"
        render={({ field }) => (
          <FormItem className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="confirmed"
                className="mt-0.5 size-4 cursor-pointer accent-primary"
                checked={field.value}
                onChange={field.onChange}
                disabled={readOnly}
              />
              <label
                htmlFor="confirmed"
                className="cursor-pointer text-sm leading-relaxed"
              >
                {t("hackathon.cp0.confirm")}
              </label>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="topic"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("hackathon.cp0.topic")}</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value}
              disabled={readOnly}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={t("hackathon.cp0.topicPlaceholder")} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {topics.map((topic) => (
                  <SelectItem key={topic.id} value={topic.label}>
                    {topic.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

function Cp1Fields({
  form,
  readOnly,
}: {
  form: ReturnType<typeof useForm<Cp1FormValues>>;
  readOnly: boolean;
}) {
  const { t } = useI18n();
  return (
    <>
      <FormField
        control={form.control}
        name="short_description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("hackathon.cp1.shortDescription")}</FormLabel>
            <FormControl>
              <Textarea
                placeholder={t("hackathon.cp1.shortDescriptionPlaceholder")}
                rows={4}
                disabled={readOnly}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="target_audience"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("hackathon.cp1.targetAudience")}</FormLabel>
            <FormControl>
              <Textarea
                placeholder={t("hackathon.cp1.targetAudiencePlaceholder")}
                rows={3}
                disabled={readOnly}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="doc_link"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("hackathon.cp1.docLink")}{" "}
              <span className="text-muted-foreground">{t("common.optional")}</span>
            </FormLabel>
            <FormControl>
              <Input
                placeholder={t("hackathon.cp1.docLinkPlaceholder")}
                disabled={readOnly}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

function Cp2Fields({
  form,
  readOnly,
}: {
  form: ReturnType<typeof useForm<Cp2FormValues>>;
  readOnly: boolean;
}) {
  const { t } = useI18n();
  return (
    <>
      <FormField
        control={form.control}
        name="git_url"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("hackathon.cp2.gitUrl")}</FormLabel>
            <FormControl>
              <Input
                placeholder={t("hackathon.cp2.gitUrlPlaceholder")}
                disabled={readOnly}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="implemented"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("hackathon.cp2.implemented")}</FormLabel>
            <FormControl>
              <Textarea
                placeholder={t("hackathon.cp2.implementedPlaceholder")}
                rows={4}
                disabled={readOnly}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="run_instructions"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("hackathon.cp2.runInstructions")}{" "}
              <span className="text-muted-foreground">{t("common.optional")}</span>
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder={t("hackathon.cp2.runInstructionsPlaceholder")}
                rows={3}
                disabled={readOnly}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

function Cp3Fields({
  form,
  readOnly,
}: {
  form: ReturnType<typeof useForm<Cp3FormValues>>;
  readOnly: boolean;
}) {
  const { t } = useI18n();
  return (
    <>
      <FormField
        control={form.control}
        name="build_link"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("hackathon.cp3.buildLink")}{" "}
              <span className="text-muted-foreground">{t("common.optional")}</span>
            </FormLabel>
            <FormControl>
              <Input
                placeholder={t("hackathon.cp3.buildLinkPlaceholder")}
                disabled={readOnly}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="presentation_link"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("hackathon.cp3.presentationLink")}{" "}
              <span className="text-muted-foreground">{t("common.optional")}</span>
            </FormLabel>
            <FormControl>
              <Input
                placeholder={t("hackathon.cp3.presentationLinkPlaceholder")}
                disabled={readOnly}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="repo_url"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("hackathon.cp3.repoUrl")}{" "}
              <span className="text-muted-foreground">{t("common.optional")}</span>
            </FormLabel>
            <FormControl>
              <Input
                placeholder={t("hackathon.cp3.repoUrlPlaceholder")}
                disabled={readOnly}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="summary"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("hackathon.cp3.summary")}</FormLabel>
            <FormControl>
              <Textarea
                placeholder={t("hackathon.cp3.summaryPlaceholder")}
                rows={4}
                disabled={readOnly}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

// ============================================================
// Main view — wraps the right form based on cpCode
// ============================================================

export function CheckpointFormView() {
  const { t } = useI18n();
  const { cpCode } = useParams<{ cpCode: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? null;
  const userRole = getUserRole(user);

  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingPayload, setPendingPayload] =
    useState<AnyCheckpointPayload | null>(null);

  const timing = useHackathonTime();

  const snapshotQuery = useQuery({
    queryKey: ["onboarding", "snapshot", userId],
    queryFn: () => getOnboardingSnapshot(userId),
    enabled: Boolean(userId),
  });

  const teamId = snapshotQuery.data?.team?.id ?? null;
  const isCaptain = Boolean(snapshotQuery.data?.team?.captain_id === userId);

  const code = cpCode as CheckpointCode;
  const isValidCode = VALID_CODES.includes(code);

  const cpTiming = timing.checkpoints.find((cp) => cp.code === code);
  const activeCheckpoint = timing.checkpoints.find((cp) => cp.isOpen) ?? null;
  const isUpcoming = cpTiming?.isUpcoming ?? false;
  const isLocked = cpTiming?.isLocked ?? false;
  const isCurrentCheckpointOpen = cpTiming?.isOpen ?? false;
  const teamDisqualified = snapshotQuery.data?.team?.status === "disqualified";
  const readOnly = !isCurrentCheckpointOpen || !isCaptain || teamDisqualified;

  const submissionQuery = useQuery({
    queryKey: ["submission", teamId, code],
    queryFn: () => getSubmission(teamId!, code),
    enabled: Boolean(teamId) && isValidCode,
  });
  const cp0TopicsQuery = useQuery({
    queryKey: ["cp0-topics", "active"],
    queryFn: () => getCp0Topics({ activeOnly: true }),
    enabled: isValidCode && code === "cp0",
  });

  const titleKey = `hackathon.${code}.title` as `hackathon.cp0.title`;
  const descKey = `hackathon.${code}.desc` as `hackathon.cp0.desc`;
  usePageTitle(isValidCode ? t(titleKey) : t("hackathon.pageTitle"));

  // ---- Cp0 form ----
  const cp0Schema = useMemo(() => buildCp0Schema(t), [t]);
  const cp0Form = useForm<Cp0FormValues>({
    resolver: zodResolver(cp0Schema),
    defaultValues: { confirmed: false, topic: "" },
    values: submissionQuery.data?.payload
      ? (submissionQuery.data.payload as unknown as Cp0FormValues)
      : undefined,
  });

  // ---- Cp1 form ----
  const cp1Schema = useMemo(() => buildCp1Schema(t), [t]);
  const cp1Form = useForm<Cp1FormValues>({
    resolver: zodResolver(cp1Schema),
    defaultValues: { short_description: "", target_audience: "", doc_link: "" },
    values: submissionQuery.data?.payload
      ? (submissionQuery.data.payload as unknown as Cp1FormValues)
      : undefined,
  });

  // ---- Cp2 form ----
  const cp2Schema = useMemo(() => buildCp2Schema(t), [t]);
  const cp2Form = useForm<Cp2FormValues>({
    resolver: zodResolver(cp2Schema),
    defaultValues: { git_url: "", implemented: "", run_instructions: "" },
    values: submissionQuery.data?.payload
      ? (submissionQuery.data.payload as unknown as Cp2FormValues)
      : undefined,
  });

  // ---- Cp3 form ----
  const cp3Schema = useMemo(() => buildCp3Schema(t), [t]);
  const cp3Form = useForm<Cp3FormValues>({
    resolver: zodResolver(cp3Schema),
    defaultValues: {
      build_link: "",
      presentation_link: "",
      repo_url: "",
      summary: "",
    },
    values: submissionQuery.data?.payload
      ? (submissionQuery.data.payload as unknown as Cp3FormValues)
      : undefined,
  });

  const saveInvalidateKeys = () => {
    void queryClient.invalidateQueries({ queryKey: ["submission", teamId, code] });
    void queryClient.invalidateQueries({ queryKey: ["submissions", teamId] });
  };

  const draftMutation = useMutation({
    mutationFn: (payload: AnyCheckpointPayload) =>
      saveCheckpointDraft(teamId!, code, payload),
    onSuccess: () => {
      toast.success(t("hackathon.form.savedDraft"));
      saveInvalidateKeys();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t("hackathon.form.saveError"));
    },
  });

  const submitMutation = useMutation({
    mutationFn: (payload: AnyCheckpointPayload) =>
      submitCheckpoint(teamId!, code, payload),
    onSuccess: () => {
      toast.success(t("hackathon.form.submitSuccess"));
      saveInvalidateKeys();
      setShowConfirm(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t("hackathon.form.submitError"));
      setShowConfirm(false);
    },
  });

  const isLoading =
    timing.isLoading ||
    snapshotQuery.isLoading ||
    submissionQuery.isLoading ||
    cp0TopicsQuery.isLoading;

  if (isLoading) return <LoadingScreen message={t("hackathon.loading")} />;
  if (
    !isValidCode ||
    timing.isError ||
    snapshotQuery.isError ||
    cp0TopicsQuery.isError
  ) {
    return <ErrorScreen message={t("hackathon.error")} />;
  }

  const submission = submissionQuery.data;
  const isSubmitted = submission?.status === "submitted";
  const isWorking = draftMutation.isPending || submitMutation.isPending;

  // Helpers to get payload and trigger submit dialog
  function handleSaveDraft() {
    if (code === "cp0") {
      void cp0Form.handleSubmit((v) => draftMutation.mutate(v as Cp0Payload))();
    } else if (code === "cp1") {
      void cp1Form.handleSubmit((v) =>
        draftMutation.mutate({ ...v, doc_link: v.doc_link || undefined } as Cp1Payload),
      )();
    } else if (code === "cp2") {
      void cp2Form.handleSubmit((v) =>
        draftMutation.mutate({ ...v, run_instructions: v.run_instructions || undefined } as Cp2Payload),
      )();
    } else if (code === "cp3") {
      void cp3Form.handleSubmit((v) => {
        const clean: Cp3Payload = {
          summary: v.summary,
          ...(v.build_link ? { build_link: v.build_link } : {}),
          ...(v.presentation_link ? { presentation_link: v.presentation_link } : {}),
          ...(v.repo_url ? { repo_url: v.repo_url } : {}),
        };
        draftMutation.mutate(clean);
      })();
    }
  }

  function handleSubmitOpen() {
    if (code === "cp0") {
      void cp0Form.handleSubmit((v) => {
        setPendingPayload(v as Cp0Payload);
        setShowConfirm(true);
      })();
    } else if (code === "cp1") {
      void cp1Form.handleSubmit((v) => {
        setPendingPayload({ ...v, doc_link: v.doc_link || undefined } as Cp1Payload);
        setShowConfirm(true);
      })();
    } else if (code === "cp2") {
      void cp2Form.handleSubmit((v) => {
        setPendingPayload({ ...v, run_instructions: v.run_instructions || undefined } as Cp2Payload);
        setShowConfirm(true);
      })();
    } else if (code === "cp3") {
      void cp3Form.handleSubmit((v) => {
        const clean: Cp3Payload = {
          summary: v.summary,
          ...(v.build_link ? { build_link: v.build_link } : {}),
          ...(v.presentation_link ? { presentation_link: v.presentation_link } : {}),
          ...(v.repo_url ? { repo_url: v.repo_url } : {}),
        };
        setPendingPayload(clean);
        setShowConfirm(true);
      })();
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 py-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => void navigate("/hackathon")}
      >
        <ArrowLeft className="mr-2 size-4" />
        {t("hackathon.form.back")}
      </Button>

      <Card>
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">{t(titleKey)}</CardTitle>
              <CardDescription className="mt-1">{t(descKey)}</CardDescription>
            </div>
            {cpTiming?.dueTime && (
              <div className="shrink-0 text-right text-xs text-muted-foreground">
                <div>
                  {t("hackathon.timeline.deadline", {
                    time: dateFormatter.format(cpTiming.dueTime),
                  })}
                </div>
                {cpTiming.isOpen && cpTiming.timeRemainingMs > 0 && (
                  <div className="font-medium text-blue-600 dark:text-blue-400">
                    {t("hackathon.timeline.timeLeft", {
                      time: formatTimeRemaining(cpTiming.timeRemainingMs),
                    })}
                  </div>
                )}
                {isUpcoming && cpTiming.openTime && (
                  <>
                    <div>
                      {t("hackathon.timeline.startsAt", {
                        time: dateFormatter.format(cpTiming.openTime),
                      })}
                    </div>
                    {cpTiming.timeUntilOpenMs > 0 && (
                      <div className="font-medium text-amber-600 dark:text-amber-400">
                        {t("hackathon.timeline.startsIn", {
                          time: formatTimeRemaining(cpTiming.timeUntilOpenMs),
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-5">
          {/* Locked / disqualified notices */}
          {isUpcoming && cpTiming?.openTime && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              {t("hackathon.form.notOpenYet", {
                time: dateFormatter.format(cpTiming.openTime),
              })}
              {cpTiming.timeUntilOpenMs > 0 && (
                <div className="mt-1 font-medium">
                  {t("hackathon.timeline.startsIn", {
                    time: formatTimeRemaining(cpTiming.timeUntilOpenMs),
                  })}
                </div>
              )}
            </div>
          )}
          {!isUpcoming && !isLocked && !isCurrentCheckpointOpen && activeCheckpoint && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              {t("hackathon.form.onlyCurrentOpen", {
                title: activeCheckpoint.title,
              })}
            </div>
          )}
          {isLocked && (
            <div className="flex items-center gap-2 rounded-lg border border-muted bg-muted/30 p-3 text-sm text-muted-foreground">
              <Lock className="size-4 shrink-0" />
              {t("hackathon.form.deadlinePassed")}
            </div>
          )}
          {!isCaptain && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-900/50 dark:bg-yellow-950/30 dark:text-yellow-200">
              {t("hackathon.form.notCaptain")}
            </div>
          )}
          {teamDisqualified && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              {t("hackathon.form.disqualified")}
            </div>
          )}

          {isSubmitted && submission?.submitted_at && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-800 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-200">
              {t("hackathon.form.submittedAt", {
                time: dateFormatter.format(new Date(submission.submitted_at)),
              })}
            </div>
          )}

          {/* Forms */}
          {code === "cp0" && (
            <Form {...cp0Form}>
              <form className="space-y-4">
                <Cp0Fields
                  form={cp0Form}
                  readOnly={readOnly}
                  topics={cp0TopicsQuery.data ?? []}
                />
              </form>
            </Form>
          )}
          {code === "cp1" && (
            <Form {...cp1Form}>
              <form className="space-y-4">
                <Cp1Fields form={cp1Form} readOnly={readOnly} />
              </form>
            </Form>
          )}
          {code === "cp2" && (
            <Form {...cp2Form}>
              <form className="space-y-4">
                <Cp2Fields form={cp2Form} readOnly={readOnly} />
              </form>
            </Form>
          )}
          {code === "cp3" && (
            <Form {...cp3Form}>
              <form className="space-y-4">
                <Cp3Fields form={cp3Form} readOnly={readOnly} />
              </form>
            </Form>
          )}

          {/* Action buttons */}
          {!readOnly && (
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isWorking}
                onClick={handleSaveDraft}
              >
                <Save className="mr-2 size-4" />
                {draftMutation.isPending
                  ? t("hackathon.form.savingDraft")
                  : t("hackathon.form.saveDraft")}
              </Button>
              <Button
                type="button"
                disabled={isWorking}
                onClick={handleSubmitOpen}
              >
                <Send className="mr-2 size-4" />
                {submitMutation.isPending
                  ? t("hackathon.form.submitting")
                  : t("hackathon.form.submit")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit confirmation dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("hackathon.form.submitConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("hackathon.form.submitConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitMutation.isPending}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={submitMutation.isPending}
              onClick={() => {
                if (pendingPayload) {
                  submitMutation.mutate(pendingPayload);
                }
              }}
            >
              {submitMutation.isPending
                ? t("hackathon.form.submitting")
                : t("hackathon.form.submitConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
