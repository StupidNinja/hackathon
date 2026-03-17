import type { ReactNode } from "react";
import { Check, ChevronRight } from "lucide-react";
import { Badge } from "@/common/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Skeleton } from "@/common/components/ui/skeleton";
import { cn } from "@/common/lib/utils";

type Tone = "default" | "accent" | "warning" | "danger" | "muted";

const toneStyles: Record<Tone, string> = {
  default: "border-border bg-card",
  accent: "border-primary/20 bg-primary/5",
  warning: "border-amber-200 bg-amber-50/90 dark:border-amber-900/40 dark:bg-amber-950/20",
  danger: "border-destructive/20 bg-destructive/5",
  muted: "border-border/70 bg-muted/40",
};

type RolePageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  badge?: ReactNode;
  action?: ReactNode;
  meta?: ReactNode;
  tone?: Tone;
  className?: string;
};

export function RolePageHeader({
  eyebrow,
  title,
  description,
  badge,
  action,
  meta,
  tone = "default",
  className,
}: RolePageHeaderProps) {
  return (
    <Card className={cn("overflow-hidden shadow-sm", toneStyles[tone], className)}>
      <CardHeader className="gap-4 border-b border-black/5 pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            {eyebrow ? (
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {eyebrow}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-xl leading-tight sm:text-2xl">
                {title}
              </CardTitle>
              {badge}
            </div>
            {description ? (
              <CardDescription className="max-w-3xl text-sm leading-6">
                {description}
              </CardDescription>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
        {meta ? <div className="grid gap-3 sm:grid-cols-3">{meta}</div> : null}
      </CardHeader>
    </Card>
  );
}

type FlowStepStatus = "done" | "current" | "upcoming" | "locked";

export type FlowStep = {
  id: string;
  label: string;
  description?: string;
  status: FlowStepStatus;
};

type FlowStepRailProps = {
  title: string;
  description?: string;
  steps: FlowStep[];
  className?: string;
};

export function FlowStepRail({
  title,
  description,
  steps,
  className,
}: FlowStepRailProps) {
  return (
    <Card className={cn("shadow-sm", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step, index) => {
          const isDone = step.status === "done";
          const isCurrent = step.status === "current";

          return (
            <div key={step.id} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border text-xs font-semibold",
                    isDone && "border-emerald-200 bg-emerald-100 text-emerald-700",
                    isCurrent && "border-primary/30 bg-primary text-primary-foreground",
                    step.status === "upcoming" &&
                      "border-border bg-background text-muted-foreground",
                    step.status === "locked" &&
                      "border-border bg-muted text-muted-foreground",
                  )}
                >
                  {isDone ? <Check className="size-4" /> : index + 1}
                </div>
                {index < steps.length - 1 ? (
                  <div className="mt-2 h-8 w-px bg-border" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 space-y-1 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-medium leading-5">{step.label}</div>
                  {isCurrent ? <Badge>Ð¡ÐµÐ¹Ñ‡Ð°Ñ</Badge> : null}
                  {step.status === "locked" ? <Badge variant="outline">ÐŸÐ¾Ð·Ð¶Ðµ</Badge> : null}
                </div>
                {step.description ? (
                  <p className="text-sm leading-5 text-muted-foreground">
                    {step.description}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

type ContextSectionProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  tone?: Tone;
  className?: string;
  compact?: boolean;
};

export function ContextSection({
  title,
  description,
  action,
  children,
  tone = "default",
  className,
  compact = false,
}: ContextSectionProps) {
  return (
    <Card className={cn("shadow-sm", toneStyles[tone], className)}>
      <CardHeader className={cn(compact ? "pb-3" : "pb-4")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </CardHeader>
      <CardContent className={compact ? "pt-0" : undefined}>{children}</CardContent>
    </Card>
  );
}

type PrimaryActionPanelProps = {
  title: string;
  description: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  meta?: ReactNode;
  tone?: Tone;
  className?: string;
};

export function PrimaryActionPanel({
  title,
  description,
  action,
  secondaryAction,
  meta,
  tone = "accent",
  className,
}: PrimaryActionPanelProps) {
  return (
    <ContextSection
      title={title}
      description={description}
      tone={tone}
      compact
      className={className}
      action={
        action || secondaryAction ? (
          <div className="flex flex-wrap gap-2">
            {action}
            {secondaryAction}
          </div>
        ) : null
      }
    >
      {meta ? <div className="grid gap-3 sm:grid-cols-3">{meta}</div> : null}
    </ContextSection>
  );
}

type StatTileProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: boolean;
};

export function StatTile({ label, value, hint, accent = false }: StatTileProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-4 shadow-sm",
        accent ? "border-primary/20 bg-primary/8" : "border-border bg-background/80",
      )}
    >
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold leading-none">{value}</div>
      {hint ? <div className="mt-2 text-sm text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

type PageSkeletonProps = {
  sectionHeights?: number[];
  showSidebar?: boolean;
  className?: string;
};

export function PageSkeleton({
  sectionHeights = [168, 224, 224],
  showSidebar = false,
  className,
}: PageSkeletonProps) {
  return (
    <div
      className={cn(
        "space-y-4",
        showSidebar && "lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-5 lg:space-y-0",
        className,
      )}
    >
      {showSidebar ? (
        <Card className="hidden lg:block">
          <CardHeader className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={`page-skeleton-nav:${index}`} className="h-14 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : null}
      <div className="space-y-4">
        <Card>
          <CardHeader className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-3/5" />
            <Skeleton className="h-4 w-4/5" />
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </CardContent>
        </Card>
        {sectionHeights.map((height, index) => (
          <Skeleton
            key={`page-skeleton-section:${index}`}
            className="w-full rounded-[24px]"
            style={{ height }}
          />
        ))}
      </div>
    </div>
  );
}

export function EmptyHint({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-5 text-sm">
      <div className="font-medium text-foreground">{title}</div>
      <p className="mt-1 leading-6 text-muted-foreground">{description}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function InlineListRow({
  label,
  value,
  trailing,
}: {
  label: string;
  value: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 text-sm font-medium leading-6 text-foreground">{value}</div>
      </div>
      {trailing ? (
        <div className="shrink-0 self-center text-muted-foreground">{trailing}</div>
      ) : (
        <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
      )}
    </div>
  );
}






