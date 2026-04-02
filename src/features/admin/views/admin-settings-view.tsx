import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";

import {
  getCheckpoints,
  getHackathonSettings,
  updateCheckpoint,
  updateHackathonSettings,
} from "@/common/api/supabase";
import type { CheckpointCode, CheckpointRow } from "@/common/api/supabase";
import { getProfile } from "@/common/api/supabase";
import { useAuthStore } from "@/common/auth/authStore";
import { isSuperAdmin } from "@/common/auth/roles";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/common/components/ui/tabs";
import { LoadingScreen } from "@/common/components/loading-screen";
import { useHackathonTime } from "@/common/hooks/use-hackathon-time";
import { usePageTitle } from "@/common/hooks/use-page-title";
import { useI18n } from "@/common/i18n/use-i18n";
import {
  Cp0TopicsSettingsSection,
  JuryCriteriaSettingsSection,
  RejectionTemplatesSettingsSection,
} from "@/features/admin/components/admin-settings-constructors";

const settingsSchema = z.object({
  t0: z.string().optional(),
  demo_mode: z.boolean(),
  demo_offset_minutes: z.number().int().min(0).max(99999),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

type CheckpointOffsetFormRow = Pick<
  CheckpointRow,
  "code" | "title" | "open_offset_minutes" | "due_offset_minutes"
>;

type DurationFormRow = {
  code: CheckpointCode;
  title: string;
  duration_minutes: number;
  duration_hours: number;
  duration_remainder_minutes: number;
};

type CheckpointDurationsFormValues = {
  checkpoints: DurationFormRow[];
};

const CHECKPOINT_ORDER: CheckpointCode[] = ["cp0", "cp1", "cp2", "cp3"];

function toNonNegativeInt(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

function toDurationRows(checkpoints: CheckpointOffsetFormRow[]): DurationFormRow[] {
  const orderMap = new Map(CHECKPOINT_ORDER.map((code, index) => [code, index]));
  const sorted = [...checkpoints].sort((a, b) => {
    const left = orderMap.get(a.code as CheckpointCode) ?? Number.MAX_SAFE_INTEGER;
    const right = orderMap.get(b.code as CheckpointCode) ?? Number.MAX_SAFE_INTEGER;
    return left - right;
  });

  let previousDue = 0;

  return sorted.map((checkpoint) => {
    const effectiveOpen = Math.max(checkpoint.open_offset_minutes, previousDue);
    const duration = Math.max(1, checkpoint.due_offset_minutes - effectiveOpen);
    previousDue = checkpoint.due_offset_minutes;

    return {
      code: checkpoint.code as CheckpointCode,
      title: checkpoint.title,
      duration_minutes: duration,
      duration_hours: Math.floor(duration / 60),
      duration_remainder_minutes: duration % 60,
    };
  });
}

function toOffsets(rows: DurationFormRow[]): CheckpointOffsetFormRow[] {
  let currentOpen = 0;

  return rows.map((row) => {
    const duration = Math.max(1, toNonNegativeInt(row.duration_minutes));
    const nextDue = currentOpen + duration;

    const output: CheckpointOffsetFormRow = {
      code: row.code,
      title: row.title,
      open_offset_minutes: currentOpen,
      due_offset_minutes: nextDue,
    };

    currentOpen = nextDue;
    return output;
  });
}

function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

function localInputToIso(local: string): string | null {
  if (!local) return null;
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function AdminSettingsView() {
  const { t } = useI18n();
  usePageTitle(t("admin.settings.pageTitle"));

  const user = useAuthStore((state) => state.user);
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [showDurationConfirm, setShowDurationConfirm] = useState(false);
  const [pendingDurationSave, setPendingDurationSave] =
    useState<CheckpointDurationsFormValues | null>(null);

  const profileQuery = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => getProfile(userId!),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });

  const settingsQuery = useQuery({
    queryKey: ["hackathon-settings"],
    queryFn: getHackathonSettings,
    staleTime: 10_000,
  });

  const checkpointsQuery = useQuery({
    queryKey: ["checkpoints"],
    queryFn: getCheckpoints,
    staleTime: 10_000,
  });

  const timing = useHackathonTime();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    values: settingsQuery.data
      ? {
          t0: isoToLocalInput(settingsQuery.data.t0),
          demo_mode: settingsQuery.data.demo_mode,
          demo_offset_minutes: settingsQuery.data.demo_offset_minutes,
        }
      : undefined,
  });

  const checkpointsForm = useForm<CheckpointDurationsFormValues>({
    values: checkpointsQuery.data
      ? {
          checkpoints: toDurationRows(checkpointsQuery.data),
        }
      : undefined,
  });

  const saveMutation = useMutation({
    mutationFn: (values: SettingsFormValues) =>
      updateHackathonSettings({
        t0: values.t0 ? localInputToIso(values.t0) : null,
        demo_mode: values.demo_mode,
        demo_offset_minutes: values.demo_offset_minutes,
      }),
    onSuccess: () => {
      toast.success(t("admin.settings.save"));
      setLastSaved(new Date().toLocaleTimeString("ru-RU"));
      void queryClient.invalidateQueries({ queryKey: ["hackathon-settings"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    },
  });

  const saveDurationsMutation = useMutation({
    mutationFn: async (values: CheckpointDurationsFormValues) => {
      const invalidCheckpoint = values.checkpoints.find(
        (checkpoint) => toNonNegativeInt(checkpoint.duration_minutes) < 1,
      );

      if (invalidCheckpoint) {
        throw new Error(
          t("admin.settings.durationInvalid", {
            checkpoint: invalidCheckpoint.code.toUpperCase(),
          }),
        );
      }

      const offsets = toOffsets(values.checkpoints);

      await Promise.all(
        offsets.map((checkpoint) =>
          updateCheckpoint(checkpoint.code as CheckpointCode, {
            open_offset_minutes: checkpoint.open_offset_minutes,
            due_offset_minutes: checkpoint.due_offset_minutes,
          }),
        ),
      );
    },
    onSuccess: () => {
      toast.success(t("admin.settings.durationSaveSuccess"));
      void queryClient.invalidateQueries({ queryKey: ["checkpoints"] });
      setPendingDurationSave(null);
      setShowDurationConfirm(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    },
  });

  const onSubmit = (values: SettingsFormValues) => {
    saveMutation.mutate(values);
  };

  const onDurationsSubmit = (values: CheckpointDurationsFormValues) => {
    if (timing.t0) {
      setPendingDurationSave(values);
      setShowDurationConfirm(true);
      return;
    }
    saveDurationsMutation.mutate(values);
  };

  const durationRows = checkpointsForm.watch("checkpoints") ?? [];

  const durationPreviewRows = useMemo(() => {
    if (!durationRows.length) return [];

    const offsets = toOffsets(durationRows);
    const t0 = timing.t0;

    return offsets.map((row) => {
      const duration = row.due_offset_minutes - row.open_offset_minutes;
      const openAt = t0
        ? new Date(t0.getTime() + row.open_offset_minutes * 60 * 1000).toLocaleString(
            "ru-RU",
          )
        : null;
      const dueAt = t0
        ? new Date(t0.getTime() + row.due_offset_minutes * 60 * 1000).toLocaleString(
            "ru-RU",
          )
        : null;

      return {
        code: row.code,
        openOffset: row.open_offset_minutes,
        dueOffset: row.due_offset_minutes,
        duration,
        openAt,
        dueAt,
      };
    });
  }, [durationRows, timing.t0]);

  const updateMinutes = (index: number, minutes: number) => {
    const normalized = Math.max(1, toNonNegativeInt(minutes));
    checkpointsForm.setValue(`checkpoints.${index}.duration_minutes`, normalized, {
      shouldDirty: true,
    });
    checkpointsForm.setValue(`checkpoints.${index}.duration_hours`, Math.floor(normalized / 60), {
      shouldDirty: true,
    });
    checkpointsForm.setValue(
      `checkpoints.${index}.duration_remainder_minutes`,
      normalized % 60,
      {
        shouldDirty: true,
      },
    );
  };

  const updateHoursMinutes = (index: number, hours: number, minutes: number) => {
    const normalizedHours = toNonNegativeInt(hours);
    const normalizedMinutes = Math.min(59, toNonNegativeInt(minutes));
    const total = Math.max(1, normalizedHours * 60 + normalizedMinutes);

    checkpointsForm.setValue(`checkpoints.${index}.duration_hours`, normalizedHours, {
      shouldDirty: true,
    });
    checkpointsForm.setValue(
      `checkpoints.${index}.duration_remainder_minutes`,
      normalizedMinutes,
      {
        shouldDirty: true,
      },
    );
    checkpointsForm.setValue(`checkpoints.${index}.duration_minutes`, total, {
      shouldDirty: true,
    });
  };

  const demoModeEnabled =
    useWatch({ control: form.control, name: "demo_mode" }) ?? false;

  if (profileQuery.isLoading) return <LoadingScreen />;
  if (!isSuperAdmin(profileQuery.data)) return <Navigate to="/admin/dashboard" replace />;

  const virtualNow = timing.virtualNow;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{t("admin.settings.pageTitle")}</h1>
        <p className="text-sm text-muted-foreground">
          Управляйте временем хакатона, темами CP0, причинами отклонения и критериями жюри.
        </p>
      </div>

      <Tabs defaultValue="time" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="h-9 min-w-max gap-1">
            <TabsTrigger value="time">Время этапов</TabsTrigger>
            <TabsTrigger value="cp0-topics">Темы проектов (CP0)</TabsTrigger>
            <TabsTrigger value="rejections">Шаблоны отклонения</TabsTrigger>
            <TabsTrigger value="jury">Критерии жюри</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="time" className="space-y-5">
          <Card className="bg-muted/30">
            <CardContent className="pt-4 pb-4 text-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium">{t("admin.settings.virtualNow")}</span>
                <span className="font-mono tabular-nums">
                  {timing.t0
                    ? virtualNow.toLocaleString("ru-RU")
                    : t("admin.settings.hackathonNotStarted")}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("admin.settings.t0Label")}</CardTitle>
              <CardDescription>{t("admin.settings.desc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  id="settings-form"
                  onSubmit={(event) => {
                    void form.handleSubmit(onSubmit)(event);
                  }}
                  className="space-y-5"
                >
                  <FormField
                    control={form.control}
                    name="t0"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("admin.settings.t0Label")}</FormLabel>
                        <div className="flex flex-wrap gap-2">
                          <FormControl>
                            <Input
                              type="datetime-local"
                              {...field}
                              value={field.value ?? ""}
                              disabled={saveMutation.isPending}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={saveMutation.isPending}
                            onClick={() => {
                              form.setValue("t0", isoToLocalInput(new Date().toISOString()));
                            }}
                          >
                            {t("admin.settings.setNow")}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={saveMutation.isPending}
                            onClick={() => form.setValue("t0", "")}
                          >
                            {t("admin.settings.clearT0")}
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="demo_mode"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-3 rounded-lg border p-3">
                        <input
                          id="demo-mode"
                          type="checkbox"
                          className="size-4 cursor-pointer accent-primary"
                          checked={field.value}
                          onChange={field.onChange}
                          disabled={saveMutation.isPending}
                        />
                        <label
                          htmlFor="demo-mode"
                          className="cursor-pointer space-y-0.5 text-sm"
                        >
                          <div className="font-medium">{t("admin.settings.demoMode")}</div>
                          <div className="text-xs text-muted-foreground">
                            {t("admin.settings.demoModeDesc")}
                          </div>
                        </label>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="demo_offset_minutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("admin.settings.demoOffset")}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={99999}
                            disabled={saveMutation.isPending || !demoModeEnabled}
                            name={field.name}
                            ref={field.ref}
                            value={field.value}
                            onBlur={field.onBlur}
                            onChange={(event) => {
                              field.onChange(event.target.valueAsNumber);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button type="submit" form="settings-form" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? t("common.loading") : t("admin.settings.save")}
            </Button>
            {lastSaved && (
              <span className="text-xs text-muted-foreground">
                {t("common.saved")} {lastSaved}
              </span>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("admin.settings.durationTitle")}</CardTitle>
              <CardDescription>{t("admin.settings.durationDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Form {...checkpointsForm}>
                <form
                  id="checkpoint-durations-form"
                  onSubmit={(event) => {
                    void checkpointsForm.handleSubmit(onDurationsSubmit)(event);
                  }}
                  className="space-y-4"
                >
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("admin.settings.durationCheckpoint")}</TableHead>
                          <TableHead>{t("admin.settings.durationMinutes")}</TableHead>
                          <TableHead>{t("admin.settings.durationHoursMinutes")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {durationRows.map((checkpoint, index) => (
                          <TableRow key={checkpoint.code}>
                            <TableCell className="font-medium uppercase">{checkpoint.code}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="text-[11px] font-medium text-muted-foreground">
                                  {t("admin.settings.durationMinutesHint")}
                                </p>
                                <Input
                                  type="number"
                                  min={1}
                                  step={1}
                                  disabled={saveDurationsMutation.isPending}
                                  value={checkpoint.duration_minutes}
                                  onChange={(event) => {
                                    updateMinutes(index, Number(event.target.value));
                                  }}
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="text-[11px] font-medium text-muted-foreground">
                                  {t("admin.settings.durationSplitHint")}
                                </p>
                                <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/40 p-2">
                                  <div className="space-y-1">
                                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                      {t("admin.settings.durationHoursShort")}
                                    </p>
                                    <Input
                                      type="number"
                                      min={0}
                                      step={1}
                                      disabled={saveDurationsMutation.isPending}
                                      value={checkpoint.duration_hours}
                                      onChange={(event) => {
                                        updateHoursMinutes(
                                          index,
                                          Number(event.target.value),
                                          checkpoint.duration_remainder_minutes,
                                        );
                                      }}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                      {t("admin.settings.durationMinutesShort")}
                                    </p>
                                    <Input
                                      type="number"
                                      min={0}
                                      max={59}
                                      step={1}
                                      disabled={saveDurationsMutation.isPending}
                                      value={checkpoint.duration_remainder_minutes}
                                      onChange={(event) => {
                                        updateHoursMinutes(
                                          index,
                                          checkpoint.duration_hours,
                                          Number(event.target.value),
                                        );
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="space-y-2 rounded-md bg-muted/40 p-3">
                    <p className="text-sm font-medium">{t("admin.settings.durationPreviewTitle")}</p>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {durationPreviewRows.map((row) => (
                        <p key={`preview-${row.code}`}>
                          {row.code.toUpperCase()}: +{row.openOffset} → +{row.dueOffset} мин ({row.duration} мин)
                          {row.openAt && row.dueAt ? ` | ${row.openAt} - ${row.dueAt}` : ""}
                        </p>
                      ))}
                    </div>
                  </div>

                  {timing.t0 && (
                    <p className="text-xs text-amber-600">
                      {t("admin.settings.durationStartedWarning")}
                    </p>
                  )}

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      form="checkpoint-durations-form"
                      disabled={saveDurationsMutation.isPending || checkpointsQuery.isLoading}
                    >
                      {saveDurationsMutation.isPending
                        ? t("common.loading")
                        : t("admin.settings.durationSave")}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <AlertDialog open={showDurationConfirm} onOpenChange={setShowDurationConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("admin.settings.durationConfirmTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("admin.settings.durationConfirmDesc")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => {
                    setPendingDurationSave(null);
                  }}
                >
                  {t("common.close")}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (!pendingDurationSave) return;
                    saveDurationsMutation.mutate(pendingDurationSave);
                  }}
                >
                  {t("admin.settings.durationConfirmAction")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        <TabsContent value="cp0-topics">
          <Cp0TopicsSettingsSection />
        </TabsContent>

        <TabsContent value="rejections">
          <RejectionTemplatesSettingsSection />
        </TabsContent>

        <TabsContent value="jury">
          <JuryCriteriaSettingsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
