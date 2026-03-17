import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createCheckpointRejectionTemplate,
  createCp0Topic,
  createJuryCriterion,
  deleteCheckpointRejectionTemplate,
  deleteCp0Topic,
  deleteJuryCriterion,
  getCheckpointRejectionTemplates,
  getCp0Topics,
  getJuryCriteria,
  hasJuryAssessments,
  updateCheckpointRejectionTemplate,
  updateCp0Topic,
  updateJuryCriterion,
} from "@/common/api/supabase";
import type {
  CheckpointCode,
  CheckpointRejectionTemplateRow,
  Cp0TopicRow,
  CreateCheckpointRejectionTemplateInput,
  CreateCp0TopicInput,
  CreateJuryCriterionInput,
  JuryCriterionRow,
} from "@/common/api/supabase";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import { Input } from "@/common/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { Textarea } from "@/common/components/ui/textarea";
import { useI18n } from "@/common/i18n/use-i18n";

type MutableCp0TopicFields = Pick<Cp0TopicRow, "label" | "is_active">;
type MutableRejectionTemplateFields = Pick<
  CheckpointRejectionTemplateRow,
  "label" | "default_comment" | "is_active"
>;
type MutableJuryCriterionFields = Pick<
  JuryCriterionRow,
  "title" | "description" | "max_points" | "is_active"
>;

const CHECKPOINT_OPTIONS: CheckpointCode[] = ["cp0", "cp1", "cp2", "cp3"];

function parseNumber(value: string, fallback = 0): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function createTopicDraft(topic: Cp0TopicRow): MutableCp0TopicFields {
  return {
    label: topic.label,
    is_active: topic.is_active,
  };
}

function createRejectionTemplateDraft(
  template: CheckpointRejectionTemplateRow,
): MutableRejectionTemplateFields {
  return {
    label: template.label,
    default_comment: template.default_comment,
    is_active: template.is_active,
  };
}

function createJuryCriterionDraft(
  criterion: JuryCriterionRow,
): MutableJuryCriterionFields {
  return {
    title: criterion.title,
    description: criterion.description,
    max_points: criterion.max_points,
    is_active: criterion.is_active,
  };
}

function SectionError({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
      {message}
    </div>
  );
}

function TopicCreateDialog() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CreateCp0TopicInput>({
    label: "",
    sort_order: 0,
    is_active: true,
  });

  const resetDraft = () => {
    setDraft({
      label: "",
      sort_order: 0,
      is_active: true,
    });
  };

  const createMutation = useMutation({
    mutationFn: () => createCp0Topic(draft),
    onSuccess: () => {
      toast.success("Тема добавлена.");
      setOpen(false);
      resetDraft();
      void queryClient.invalidateQueries({ queryKey: ["cp0-topics"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    },
  });

  const disabled = createMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          resetDraft();
        }
      }}
    >
      <Button size="sm" onClick={() => setOpen(true)}>
        Добавить тему
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новая тема CP0</DialogTitle>
          <DialogDescription>
            Добавьте тему, которую команды смогут выбрать на этапе CP0.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Название</label>
            <Input
              value={draft.label}
              onChange={(event) =>
                setDraft((current) => ({ ...current, label: event.target.value }))
              }
              placeholder="Новая тема"
              disabled={disabled}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={draft.is_active}
              onChange={(event) =>
                setDraft((current) => ({ ...current, is_active: event.target.checked }))
              }
              disabled={disabled}
            />
            Активна
          </label>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={disabled}
          >
            Отмена
          </Button>
          <Button
            disabled={disabled || draft.label.trim().length === 0}
            onClick={() => createMutation.mutate()}
          >
            {disabled ? t("common.loading") : "Добавить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TopicRowEditor({ topic }: { topic: Cp0TopicRow }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<MutableCp0TopicFields>(() => createTopicDraft(topic));

  const saveMutation = useMutation({
    mutationFn: () => updateCp0Topic(topic.id, draft),
    onSuccess: () => {
      toast.success("Тема сохранена.");
      void queryClient.invalidateQueries({ queryKey: ["cp0-topics"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCp0Topic(topic.id),
    onSuccess: () => {
      toast.success("Тема удалена.");
      void queryClient.invalidateQueries({ queryKey: ["cp0-topics"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    },
  });

  const disabled = saveMutation.isPending || deleteMutation.isPending;

  return (
    <TableRow>
      <TableCell>
        <Input
          value={draft.label}
          onChange={(event) =>
            setDraft((current) => ({ ...current, label: event.target.value }))
          }
          disabled={disabled}
        />
      </TableCell>
      <TableCell className="w-24">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={draft.is_active}
          onChange={(event) =>
            setDraft((current) => ({ ...current, is_active: event.target.checked }))
          }
          disabled={disabled}
        />
      </TableCell>
      <TableCell className="w-40">
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={disabled || draft.label.trim().length === 0}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? t("common.loading") : t("common.save")}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={disabled}
            onClick={() => deleteMutation.mutate()}
          >
            Удалить
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function TopicCardEditor({ topic }: { topic: Cp0TopicRow }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<MutableCp0TopicFields>(() => createTopicDraft(topic));

  const saveMutation = useMutation({
    mutationFn: () => updateCp0Topic(topic.id, draft),
    onSuccess: () => {
      toast.success("Тема сохранена.");
      void queryClient.invalidateQueries({ queryKey: ["cp0-topics"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCp0Topic(topic.id),
    onSuccess: () => {
      toast.success("Тема удалена.");
      void queryClient.invalidateQueries({ queryKey: ["cp0-topics"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    },
  });

  const disabled = saveMutation.isPending || deleteMutation.isPending;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Тема</label>
          <Input
            value={draft.label}
            onChange={(event) =>
              setDraft((current) => ({ ...current, label: event.target.value }))
            }
            disabled={disabled}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={draft.is_active}
            onChange={(event) =>
              setDraft((current) => ({ ...current, is_active: event.target.checked }))
            }
            disabled={disabled}
          />
          Активна
        </label>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            disabled={disabled || draft.label.trim().length === 0}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? t("common.loading") : t("common.save")}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="flex-1"
            disabled={disabled}
            onClick={() => deleteMutation.mutate()}
          >
            Удалить
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function Cp0TopicsSettingsSection() {
  const topicsQuery = useQuery({
    queryKey: ["cp0-topics", "all"],
    queryFn: () => getCp0Topics(),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Темы проектов для CP0</CardTitle>
            <CardDescription>
              Управляйте списком тем, который видят команды на чекпоинте CP0.
            </CardDescription>
          </div>
          <TopicCreateDialog />
        </div>
      </CardHeader>
      <CardContent>
        {topicsQuery.isError ? (
          <SectionError message="Не удалось загрузить темы CP0." />
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {(topicsQuery.data ?? []).map((topic) => (
                <TopicCardEditor
                  key={`${topic.id}:${topic.updated_at}:card`}
                  topic={topic}
                />
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Тема</TableHead>
                    <TableHead className="w-24">Активна</TableHead>
                    <TableHead className="w-40 text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(topicsQuery.data ?? []).map((topic) => (
                    <TopicRowEditor
                      key={`${topic.id}:${topic.updated_at}`}
                      topic={topic}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function RejectionTemplateCreateDialog() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CreateCheckpointRejectionTemplateInput>({
    checkpoint_code: "cp0",
    code: "",
    label: "",
    default_comment: "",
    sort_order: 0,
    is_active: true,
  });

  const resetDraft = () => {
    setDraft({
      checkpoint_code: "cp0",
      code: "",
      label: "",
      default_comment: "",
      sort_order: 0,
      is_active: true,
    });
  };

  const createMutation = useMutation({
    mutationFn: () => createCheckpointRejectionTemplate(draft),
    onSuccess: () => {
      toast.success("Шаблон добавлен.");
      setOpen(false);
      resetDraft();
      void queryClient.invalidateQueries({ queryKey: ["checkpoint-rejection-templates"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    },
  });

  const disabled = createMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          resetDraft();
        }
      }}
    >
      <Button size="sm" onClick={() => setOpen(true)}>
        Добавить шаблон
      </Button>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Новый шаблон отклонения</DialogTitle>
          <DialogDescription>
            Укажите чекпоинт, код и текст по умолчанию для комментария администратора.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Чекпоинт</label>
            <Select
              value={draft.checkpoint_code}
              onValueChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  checkpoint_code: value as CheckpointCode,
                }))
              }
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHECKPOINT_OPTIONS.map((checkpointCode) => (
                  <SelectItem key={checkpointCode} value={checkpointCode}>
                    {checkpointCode.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Код шаблона</label>
            <Input
              value={draft.code}
              onChange={(event) =>
                setDraft((current) => ({ ...current, code: event.target.value }))
              }
              placeholder="reason_code"
              disabled={disabled}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Название</label>
            <Input
              value={draft.label}
              onChange={(event) =>
                setDraft((current) => ({ ...current, label: event.target.value }))
              }
              placeholder="Название"
              disabled={disabled}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Комментарий по умолчанию</label>
            <Textarea
              value={draft.default_comment}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  default_comment: event.target.value,
                }))
              }
              placeholder="Комментарий по умолчанию"
              rows={3}
              disabled={disabled}
            />
          </div>

          <label className="flex items-center gap-2 self-end text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={draft.is_active}
              onChange={(event) =>
                setDraft((current) => ({ ...current, is_active: event.target.checked }))
              }
              disabled={disabled}
            />
            Активен
          </label>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={disabled}
          >
            Отмена
          </Button>
          <Button
            disabled={
              disabled ||
              draft.code.trim().length === 0 ||
              draft.label.trim().length === 0 ||
              draft.default_comment.trim().length === 0
            }
            onClick={() => createMutation.mutate()}
          >
            {disabled ? t("common.loading") : "Добавить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectionTemplateRowEditor({
  template,
}: {
  template: CheckpointRejectionTemplateRow;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<MutableRejectionTemplateFields>(() =>
    createRejectionTemplateDraft(template),
  );

  const saveMutation = useMutation({
    mutationFn: () => updateCheckpointRejectionTemplate(template.id, draft),
    onSuccess: () => {
      toast.success("Шаблон сохранен.");
      void queryClient.invalidateQueries({ queryKey: ["checkpoint-rejection-templates"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCheckpointRejectionTemplate(template.id),
    onSuccess: () => {
      toast.success("Шаблон удален.");
      void queryClient.invalidateQueries({ queryKey: ["checkpoint-rejection-templates"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    },
  });

  const disabled = saveMutation.isPending || deleteMutation.isPending;

  return (
    <TableRow>
      <TableCell className="w-28 font-medium">
        {template.checkpoint_code.toUpperCase()}
      </TableCell>
      <TableCell className="w-40">
        <code className="text-xs">{template.code}</code>
      </TableCell>
      <TableCell>
        <Input
          value={draft.label}
          onChange={(event) =>
            setDraft((current) => ({ ...current, label: event.target.value }))
          }
          disabled={disabled}
        />
      </TableCell>
      <TableCell>
        <Textarea
          value={draft.default_comment}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              default_comment: event.target.value,
            }))
          }
          rows={2}
          disabled={disabled}
        />
      </TableCell>
      <TableCell className="w-24">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={draft.is_active}
          onChange={(event) =>
            setDraft((current) => ({ ...current, is_active: event.target.checked }))
          }
          disabled={disabled}
        />
      </TableCell>
      <TableCell className="w-36">
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={
              disabled ||
              draft.label.trim().length === 0 ||
              draft.default_comment.trim().length === 0
            }
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? t("common.loading") : t("common.save")}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={disabled}
            onClick={() => deleteMutation.mutate()}
          >
            Удалить
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function RejectionTemplateCardEditor({
  template,
}: {
  template: CheckpointRejectionTemplateRow;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<MutableRejectionTemplateFields>(() =>
    createRejectionTemplateDraft(template),
  );

  const saveMutation = useMutation({
    mutationFn: () => updateCheckpointRejectionTemplate(template.id, draft),
    onSuccess: () => {
      toast.success("Шаблон сохранен.");
      void queryClient.invalidateQueries({ queryKey: ["checkpoint-rejection-templates"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCheckpointRejectionTemplate(template.id),
    onSuccess: () => {
      toast.success("Шаблон удален.");
      void queryClient.invalidateQueries({ queryKey: ["checkpoint-rejection-templates"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    },
  });

  const disabled = saveMutation.isPending || deleteMutation.isPending;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline">{template.checkpoint_code.toUpperCase()}</Badge>
          <code className="text-xs text-muted-foreground">{template.code}</code>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Название</label>
          <Input
            value={draft.label}
            onChange={(event) =>
              setDraft((current) => ({ ...current, label: event.target.value }))
            }
            disabled={disabled}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Комментарий по умолчанию</label>
          <Textarea
            value={draft.default_comment}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                default_comment: event.target.value,
              }))
            }
            rows={3}
            disabled={disabled}
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={draft.is_active}
            onChange={(event) =>
              setDraft((current) => ({ ...current, is_active: event.target.checked }))
            }
            disabled={disabled}
          />
          Активен
        </label>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            disabled={
              disabled ||
              draft.label.trim().length === 0 ||
              draft.default_comment.trim().length === 0
            }
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? t("common.loading") : t("common.save")}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="flex-1"
            disabled={disabled}
            onClick={() => deleteMutation.mutate()}
          >
            Удалить
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function RejectionTemplatesSettingsSection() {
  const templatesQuery = useQuery({
    queryKey: ["checkpoint-rejection-templates", "all"],
    queryFn: () => getCheckpointRejectionTemplates(),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Шаблоны причин отклонения</CardTitle>
            <CardDescription>
              Эти шаблоны используются в диалоге отклонения и предзаполняют
              комментарий для команды.
            </CardDescription>
          </div>
          <RejectionTemplateCreateDialog />
        </div>
      </CardHeader>
      <CardContent>
        {templatesQuery.isError ? (
          <SectionError message="Не удалось загрузить шаблоны причин." />
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {(templatesQuery.data ?? []).map((template) => (
                <RejectionTemplateCardEditor
                  key={`${template.id}:${template.updated_at}:card`}
                  template={template}
                />
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Чекпоинт</TableHead>
                    <TableHead className="w-40">Код</TableHead>
                    <TableHead>Название</TableHead>
                    <TableHead>Комментарий по умолчанию</TableHead>
                    <TableHead className="w-24">Активен</TableHead>
                    <TableHead className="w-36 text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(templatesQuery.data ?? []).map((template) => (
                    <RejectionTemplateRowEditor
                      key={`${template.id}:${template.updated_at}`}
                      template={template}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function JuryCriterionCreateDialog({ locked }: { locked: boolean }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CreateJuryCriterionInput>({
    title: "",
    description: "",
    max_points: 10,
    sort_order: 0,
    is_active: true,
  });

  const resetDraft = () => {
    setDraft({
      title: "",
      description: "",
      max_points: 10,
      sort_order: 0,
      is_active: true,
    });
  };

  const createMutation = useMutation({
    mutationFn: () => createJuryCriterion(draft),
    onSuccess: () => {
      toast.success("Критерий добавлен.");
      setOpen(false);
      resetDraft();
      void queryClient.invalidateQueries({ queryKey: ["jury-criteria"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    },
  });

  const disabled = locked || createMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          resetDraft();
        }
      }}
    >
      <Button size="sm" disabled={locked} onClick={() => setOpen(true)}>
        Добавить критерий
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новый критерий жюри</DialogTitle>
          <DialogDescription>
            Настройте критерий и максимальное количество баллов.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Критерий</label>
            <Input
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Новый критерий"
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Описание</label>
            <Textarea
              value={draft.description ?? ""}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              rows={3}
              placeholder="Описание"
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Макс. балл</label>
              <Input
                type="number"
                value={draft.max_points}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    max_points: parseNumber(event.target.value, 1),
                  }))
                }
                disabled={disabled}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={draft.is_active}
              onChange={(event) =>
                setDraft((current) => ({ ...current, is_active: event.target.checked }))
              }
              disabled={disabled}
            />
            Активен
          </label>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={disabled}
          >
            Отмена
          </Button>
          <Button
            disabled={
              disabled || draft.title.trim().length === 0 || draft.max_points <= 0
            }
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? t("common.loading") : "Добавить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function JuryCriterionRowEditor({
  criterion,
  locked,
}: {
  criterion: JuryCriterionRow;
  locked: boolean;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<MutableJuryCriterionFields>(() =>
    createJuryCriterionDraft(criterion),
  );

  const saveMutation = useMutation({
    mutationFn: () => updateJuryCriterion(criterion.id, draft),
    onSuccess: () => {
      toast.success("Критерий сохранен.");
      void queryClient.invalidateQueries({ queryKey: ["jury-criteria"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteJuryCriterion(criterion.id),
    onSuccess: () => {
      toast.success("Критерий удален.");
      void queryClient.invalidateQueries({ queryKey: ["jury-criteria"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    },
  });

  const disabled = locked || saveMutation.isPending || deleteMutation.isPending;

  return (
    <TableRow>
      <TableCell>
        <Input
          value={draft.title}
          onChange={(event) =>
            setDraft((current) => ({ ...current, title: event.target.value }))
          }
          disabled={disabled}
        />
      </TableCell>
      <TableCell>
        <Textarea
          value={draft.description ?? ""}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              description: event.target.value,
            }))
          }
          rows={2}
          disabled={disabled}
        />
      </TableCell>
      <TableCell className="w-28">
        <Input
          type="number"
          value={draft.max_points}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              max_points: parseNumber(event.target.value, current.max_points),
            }))
          }
          disabled={disabled}
        />
      </TableCell>
      <TableCell className="w-24">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={draft.is_active}
          onChange={(event) =>
            setDraft((current) => ({ ...current, is_active: event.target.checked }))
          }
          disabled={disabled}
        />
      </TableCell>
      <TableCell className="w-36">
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={
              disabled || draft.title.trim().length === 0 || draft.max_points <= 0
            }
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? t("common.loading") : t("common.save")}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={disabled}
            onClick={() => deleteMutation.mutate()}
          >
            Удалить
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function JuryCriterionCardEditor({
  criterion,
  locked,
}: {
  criterion: JuryCriterionRow;
  locked: boolean;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<MutableJuryCriterionFields>(() =>
    createJuryCriterionDraft(criterion),
  );

  const saveMutation = useMutation({
    mutationFn: () => updateJuryCriterion(criterion.id, draft),
    onSuccess: () => {
      toast.success("Критерий сохранен.");
      void queryClient.invalidateQueries({ queryKey: ["jury-criteria"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteJuryCriterion(criterion.id),
    onSuccess: () => {
      toast.success("Критерий удален.");
      void queryClient.invalidateQueries({ queryKey: ["jury-criteria"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    },
  });

  const disabled = locked || saveMutation.isPending || deleteMutation.isPending;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Критерий</label>
          <Input
            value={draft.title}
            onChange={(event) =>
              setDraft((current) => ({ ...current, title: event.target.value }))
            }
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Описание</label>
          <Textarea
            value={draft.description ?? ""}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            rows={3}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Макс. балл</label>
          <Input
            type="number"
            value={draft.max_points}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                max_points: parseNumber(event.target.value, current.max_points),
              }))
            }
            disabled={disabled}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={draft.is_active}
            onChange={(event) =>
              setDraft((current) => ({ ...current, is_active: event.target.checked }))
            }
            disabled={disabled}
          />
          Активен
        </label>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            disabled={disabled || draft.title.trim().length === 0 || draft.max_points <= 0}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? t("common.loading") : t("common.save")}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="flex-1"
            disabled={disabled}
            onClick={() => deleteMutation.mutate()}
          >
            Удалить
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function JuryCriteriaSettingsSection() {
  const criteriaQuery = useQuery({
    queryKey: ["jury-criteria", "all"],
    queryFn: () => getJuryCriteria(),
  });
  const lockedQuery = useQuery({
    queryKey: ["jury-assessments", "has-any"],
    queryFn: hasJuryAssessments,
  });

  const locked = lockedQuery.data === true;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Критерии оценки жюри</CardTitle>
            <CardDescription>
              После появления первой оценки список критериев блокируется, чтобы все
              оценки оставались сопоставимыми.
            </CardDescription>
          </div>
          <JuryCriterionCreateDialog locked={locked} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {locked && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Изменение критериев заблокировано: жюри уже начало оценивание.
          </div>
        )}
        {criteriaQuery.isError || lockedQuery.isError ? (
          <SectionError message="Не удалось загрузить критерии жюри." />
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {(criteriaQuery.data ?? []).map((criterion) => (
                <JuryCriterionCardEditor
                  key={`${criterion.id}:${criterion.updated_at}:card`}
                  criterion={criterion}
                  locked={locked}
                />
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Критерий</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead className="w-28">Макс. балл</TableHead>
                    <TableHead className="w-24">Активен</TableHead>
                    <TableHead className="w-36 text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(criteriaQuery.data ?? []).map((criterion) => (
                    <JuryCriterionRowEditor
                      key={`${criterion.id}:${criterion.updated_at}`}
                      criterion={criterion}
                      locked={locked}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
