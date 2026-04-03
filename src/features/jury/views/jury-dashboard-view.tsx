import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  List,
  Save,
  Scale,
  Search,
} from "lucide-react";

import {
  getJuryCriteria,
  getJuryFinalistQueue,
  getMyJuryAssessment,
  upsertJuryAssessment,
} from "@/common/api/supabase";
import type {
  JuryAssessmentInput,
  JuryAssessmentWithScoresRow,
  JuryCriterionRow,
  JuryQueueRow,
} from "@/common/api/supabase";
import { getUserRole } from "@/common/auth/roles";
import { useAuthStore } from "@/common/auth/authStore";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Input } from "@/common/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/common/components/ui/sheet";
import { Skeleton } from "@/common/components/ui/skeleton";
import { Textarea } from "@/common/components/ui/textarea";
import { ErrorScreen } from "@/common/components/loading-screen";
import { useIsMobile } from "@/common/hooks/use-mobile";
import { usePageTitle } from "@/common/hooks/use-page-title";

type ScoreDraft = Record<string, string>;

const EMPTY_QUEUE: JuryQueueRow[] = [];
const EMPTY_CRITERIA: JuryCriterionRow[] = [];

function parseScore(value: string): number | null {
  if (value.trim().length === 0) return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

function buildScoreDraft(
  criteria: JuryCriterionRow[],
  assessment: JuryAssessmentWithScoresRow | null,
): ScoreDraft {
  const draft: ScoreDraft = {};

  for (const criterion of criteria) {
    const savedScore = assessment?.scores.find(
      (score) => score.criterion_id === criterion.id,
    );
    draft[criterion.id] = savedScore == null ? "" : String(savedScore.score);
  }

  return draft;
}

function buildQuickScoreOptions(maxPoints: number): number[] {
  if (maxPoints <= 12) {
    return Array.from({ length: maxPoints + 1 }, (_, index) => index);
  }

  return [...new Set([
    0,
    Math.round(maxPoints * 0.25),
    Math.round(maxPoints * 0.5),
    Math.round(maxPoints * 0.75),
    maxPoints,
  ])].sort((left, right) => left - right);
}

function getCaptainName(row: JuryQueueRow): string {
  const first = row.team.captain.first_name?.trim() ?? "";
  const last = row.team.captain.last_name?.trim() ?? "";
  const fullName = [first, last].filter(Boolean).join(" ");
  return fullName || "Без имени";
}

function matchesQueueRow(row: JuryQueueRow, search: string): boolean {
  if (search.length === 0) return true;

  const normalized = search.toLowerCase();
  const captain = getCaptainName(row).toLowerCase();
  const email = row.team.captain.email?.toLowerCase() ?? "";

  return (
    row.team.name.toLowerCase().includes(normalized) ||
    captain.includes(normalized) ||
    email.includes(normalized)
  );
}

function SubmissionLink({
  label,
  href,
}: {
  label: string;
  href: string | undefined;
}) {
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
    >
      <ExternalLink className="size-3.5" />
      {label}
    </a>
  );
}

type FinalistListProps = {
  queue: JuryQueueRow[];
  selectedTeamId: string | null;
  emptyMessage: string;
  onSelectTeam: (teamId: string) => void;
};

function FinalistList({
  queue,
  selectedTeamId,
  emptyMessage,
  onSelectTeam,
}: FinalistListProps) {
  if (queue.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {queue.map((row) => (
        <button
          key={row.team.id}
          type="button"
          onClick={() => onSelectTeam(row.team.id)}
          className={`w-full rounded-lg border px-3 py-3 text-left transition ${
            row.team.id === selectedTeamId
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40 hover:bg-muted/50"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="line-clamp-1 font-medium">{row.team.name}</span>
            {row.team.id === selectedTeamId && <Badge>Выбрана</Badge>}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {getCaptainName(row)}
          </div>
        </button>
      ))}
    </div>
  );
}

function JuryDashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start lg:gap-5 lg:space-y-0">
      <Card className="hidden lg:block">
        <CardHeader className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={`jury-queue-skeleton:${index}`} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Skeleton className="h-20 w-full lg:hidden" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  );
}

function JuryAssessmentSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={`assessment-skeleton:${index}`} className="space-y-2 rounded-lg border p-4">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-3/4" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((__, buttonIndex) => (
              <Skeleton
                key={`assessment-skeleton:${index}:${buttonIndex}`}
                className="h-8 w-10"
              />
            ))}
          </div>
        </div>
      ))}
      <Skeleton className="h-28 w-full" />
      <div className="flex justify-end">
        <Skeleton className="h-10 w-44" />
      </div>
    </div>
  );
}

type JurySelectedTeamPanelProps = {
  row: JuryQueueRow;
  criteria: JuryCriterionRow[];
  assessment: JuryAssessmentWithScoresRow | null;
  assessmentError: boolean;
  assessmentLoading: boolean;
  isSaving: boolean;
  onSave: (payload: JuryAssessmentInput) => void;
};

function JurySelectedTeamPanel({
  row,
  criteria,
  assessment,
  assessmentError,
  assessmentLoading,
  isSaving,
  onSave,
}: JurySelectedTeamPanelProps) {
  const [overallComment, setOverallComment] = useState(
    assessment?.overall_comment ?? "",
  );
  const [scores, setScores] = useState<ScoreDraft>(() =>
    buildScoreDraft(criteria, assessment),
  );

  const submissionPayload = (row.submission.payload ?? {}) as Record<
    string,
    string | undefined
  >;
  const maxTotal = criteria.reduce(
    (sum, criterion) => sum + criterion.max_points,
    0,
  );
  const currentTotal = criteria.reduce(
    (sum, criterion) => sum + (parseScore(scores[criterion.id] ?? "") ?? 0),
    0,
  );

  const handleSave = () => {
    try {
      const normalizedScores = criteria.map((criterion) => {
        const parsed = parseScore(scores[criterion.id] ?? "");
        if (parsed == null) {
          throw new Error(`Заполните балл для критерия "${criterion.title}".`);
        }
        if (!Number.isInteger(parsed) || parsed < 0 || parsed > criterion.max_points) {
          throw new Error(
            `Балл по критерию "${criterion.title}" должен быть в диапазоне 0..${criterion.max_points}.`,
          );
        }

        return { criterionId: criterion.id, score: parsed };
      });

      onSave({
        teamId: row.team.id,
        overallComment,
        scores: normalizedScores,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Проверьте введенные баллы.");
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">{row.team.name}</CardTitle>
              <CardDescription>
                Капитан: {getCaptainName(row)}
                {row.team.captain.email ? ` • ${row.team.captain.email}` : ""}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">
                Текущая сумма: {currentTotal} / {maxTotal}
              </div>
              {assessment && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Последнее сохранение:{" "}
                  {new Date(assessment.updated_at).toLocaleString("ru-RU", { timeZone: "Asia/Almaty" })}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-sm font-medium">Итог CP3</div>
            <p className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
              {submissionPayload.summary ?? "Команда не добавила итоговое описание."}
            </p>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">Материалы</div>
            <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
              <SubmissionLink
                label="Финальная сборка"
                href={submissionPayload.build_link}
              />
              <SubmissionLink
                label="Презентация"
                href={submissionPayload.presentation_link}
              />
              <SubmissionLink
                label="GitHub"
                href={row.github_url}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Оценка жюри</CardTitle>
          <CardDescription>
            Быстрый режим: выбирайте балл одним тапом по кнопке.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {assessmentLoading ? (
            <JuryAssessmentSkeleton />
          ) : assessmentError ? (
            <div className="text-sm text-destructive">
              Не удалось загрузить сохраненную оценку.
            </div>
          ) : (
            <>
              {criteria.map((criterion) => {
                const selectedScore = parseScore(scores[criterion.id] ?? "");
                const quickOptions = buildQuickScoreOptions(criterion.max_points);
                const showSlider = criterion.max_points > 12;

                return (
                  <div
                    key={criterion.id}
                    className="space-y-3 rounded-lg border p-4"
                  >
                    <div>
                      <div className="font-medium">{criterion.title}</div>
                      {criterion.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {criterion.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>Диапазон: 0..{criterion.max_points}</span>
                      <span>
                        Выбрано:{" "}
                        <span className="font-semibold text-foreground">
                          {selectedScore ?? "—"}
                        </span>
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {quickOptions.map((value) => (
                        <Button
                          key={`${criterion.id}:${value}`}
                          type="button"
                          size="sm"
                          variant={selectedScore === value ? "default" : "outline"}
                          onClick={() =>
                            setScores((current) => ({
                              ...current,
                              [criterion.id]: String(value),
                            }))
                          }
                          disabled={isSaving}
                          className="min-w-10"
                        >
                          {value}
                        </Button>
                      ))}
                    </div>

                    {showSlider && (
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_96px]">
                        <input
                          type="range"
                          min={0}
                          max={criterion.max_points}
                          value={selectedScore ?? 0}
                          onChange={(event) =>
                            setScores((current) => ({
                              ...current,
                              [criterion.id]: event.target.value,
                            }))
                          }
                          disabled={isSaving}
                        />
                        <Input
                          type="number"
                          min={0}
                          max={criterion.max_points}
                          value={scores[criterion.id] ?? ""}
                          onChange={(event) =>
                            setScores((current) => ({
                              ...current,
                              [criterion.id]: event.target.value,
                            }))
                          }
                          disabled={isSaving}
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Общий комментарий
                </label>
                <Textarea
                  rows={5}
                  value={overallComment}
                  onChange={(event) => setOverallComment(event.target.value)}
                  placeholder="Сильные стороны, риски, рекомендации."
                  disabled={isSaving}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="mr-2 size-4" />
                  {isSaving ? "Сохранение..." : "Сохранить оценку"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function JuryDashboardView() {
  const user = useAuthStore((state) => state.user);
  const role = getUserRole(user);
  const isJury = role === "jury";
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [isQueueSheetOpen, setIsQueueSheetOpen] = useState(false);

  const deferredSearch = useDeferredValue(searchText);

  usePageTitle("Жюри");

  const queueQuery = useQuery({
    queryKey: ["jury-finalist-queue"],
    queryFn: getJuryFinalistQueue,
    enabled: isJury,
  });
  const criteriaQuery = useQuery({
    queryKey: ["jury-criteria", "active"],
    queryFn: () => getJuryCriteria({ activeOnly: true }),
    enabled: isJury,
  });

  const queue = queueQuery.data ?? EMPTY_QUEUE;
  const criteria = criteriaQuery.data ?? EMPTY_CRITERIA;
  const filteredQueue = useMemo(
    () =>
      queue.filter((row) =>
        matchesQueueRow(row, deferredSearch.trim()),
      ),
    [queue, deferredSearch],
  );

  const effectiveSelectedTeamId =
    selectedTeamId && queue.some((row) => row.team.id === selectedTeamId)
      ? selectedTeamId
      : queue[0]?.team.id ?? null;

  const assessmentQuery = useQuery({
    queryKey: ["jury-assessment", "me", effectiveSelectedTeamId],
    queryFn: async () => {
      if (!effectiveSelectedTeamId) {
        throw new Error("Не выбрана команда для оценки.");
      }

      return getMyJuryAssessment(effectiveSelectedTeamId);
    },
    enabled: isJury && Boolean(effectiveSelectedTeamId),
  });

  const saveMutation = useMutation({
    mutationFn: upsertJuryAssessment,
    onSuccess: (_data, variables) => {
      toast.success("Оценка сохранена.");
      void queryClient.invalidateQueries({
        queryKey: ["jury-assessment", "me", variables.teamId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["team-jury-summary", variables.teamId],
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Не удалось сохранить оценку.",
      );
    },
  });

  const selectedRow =
    queue.find((row) => row.team.id === effectiveSelectedTeamId) ?? null;
  const selectedPanelKey = selectedRow
    ? [
        selectedRow.team.id,
        assessmentQuery.data?.updated_at ?? "new",
        criteria.map((criterion) => criterion.id).join("|"),
      ].join(":")
    : "jury-selected-team-empty";

  const selectedIndex = selectedRow
    ? queue.findIndex((row) => row.team.id === selectedRow.team.id)
    : -1;
  const previousTeamId =
    selectedIndex > 0 ? queue[selectedIndex - 1]?.team.id ?? null : null;
  const nextTeamId =
    selectedIndex >= 0 && selectedIndex < queue.length - 1
      ? queue[selectedIndex + 1]?.team.id ?? null
      : null;

  if (role === "admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (!isJury) {
    return <Navigate to="/dashboard" replace />;
  }

  if (queueQuery.isLoading || criteriaQuery.isLoading) {
    return <JuryDashboardSkeleton />;
  }

  if (queueQuery.isError || criteriaQuery.isError) {
    return <ErrorScreen message="Не удалось загрузить данные жюри." />;
  }

  if (queue.length === 0) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Scale className="size-5 text-sky-600" />
              Финалисты еще не выбраны.
            </CardTitle>
            <CardDescription>
              В очередь жюри попадают только команды с отправленным CP3 и
              решением «прошли дальше» на CP3.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (criteria.length === 0) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="size-5 text-amber-600" />
              Нет критериев оценки.
            </CardTitle>
            <CardDescription>
              Суперадмин должен настроить критерии жюри в разделе настроек.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start lg:gap-5 lg:space-y-0">
      <Card className="hidden h-fit lg:block">
        <CardHeader>
          <CardTitle className="text-base">Финалисты</CardTitle>
          <CardDescription>
            Команды, допущенные к оценке после решения по CP3.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Поиск команды"
              className="pl-9"
            />
          </div>
          <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            <FinalistList
              queue={filteredQueue}
              selectedTeamId={effectiveSelectedTeamId}
              emptyMessage="По вашему запросу ничего не найдено."
              onSelectTeam={setSelectedTeamId}
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="border-dashed">
          <CardContent className="space-y-1 pt-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Как начать оценивание</p>
            <p>1. Выберите команду в списке финалистов.</p>
            <p>2. Поставьте баллы по каждому критерию одним тапом.</p>
            <p>3. Добавьте комментарий и сохраните оценку.</p>
          </CardContent>
        </Card>

        {isMobile && selectedRow && (
          <Card className="lg:hidden">
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{selectedRow.team.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {selectedIndex + 1} из {queue.length}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsQueueSheetOpen(true)}
                >
                  <List className="mr-2 size-4" />
                  Команды
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!previousTeamId}
                  onClick={() => {
                    if (previousTeamId) {
                      setSelectedTeamId(previousTeamId);
                    }
                  }}
                >
                  <ChevronLeft className="mr-1 size-4" />
                  Назад
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!nextTeamId}
                  onClick={() => {
                    if (nextTeamId) {
                      setSelectedTeamId(nextTeamId);
                    }
                  }}
                >
                  Вперед
                  <ChevronRight className="ml-1 size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedRow && (
          <JurySelectedTeamPanel
            key={selectedPanelKey}
            row={selectedRow}
            criteria={criteria}
            assessment={assessmentQuery.data ?? null}
            assessmentError={assessmentQuery.isError}
            assessmentLoading={assessmentQuery.isLoading}
            isSaving={saveMutation.isPending}
            onSave={(payload) => saveMutation.mutate(payload)}
          />
        )}
      </div>

      <Sheet open={isQueueSheetOpen} onOpenChange={setIsQueueSheetOpen}>
        <SheetContent
          side="left"
          className={isMobile ? "w-full p-0 sm:max-w-none" : undefined}
        >
          <SheetHeader>
            <SheetTitle>Финалисты</SheetTitle>
            <SheetDescription>
              Найдите команду и переключитесь на оценивание.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-3 px-4 pb-4">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Поиск команды"
                className="pl-9"
              />
            </div>
            <div className="max-h-[calc(100vh-180px)] overflow-y-auto pr-1">
              <FinalistList
                queue={filteredQueue}
                selectedTeamId={effectiveSelectedTeamId}
                emptyMessage="По вашему запросу ничего не найдено."
                onSelectTeam={(teamId) => {
                  setSelectedTeamId(teamId);
                  setIsQueueSheetOpen(false);
                }}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
