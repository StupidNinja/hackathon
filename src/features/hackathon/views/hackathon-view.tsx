import { CalendarClock, Trophy, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { usePageTitle } from "@/common/hooks/use-page-title";
import { useI18n } from "@/common/i18n/use-i18n";

export function HackathonView() {
  const { t } = useI18n();
  usePageTitle(t("hackathon.pageTitle"));

  return (
    <div className="mx-auto flex min-h-[76vh] w-full max-w-6xl items-center justify-center py-6 lg:py-10">
      <Card className="w-full max-w-5xl overflow-hidden">
        <CardHeader className="gap-2 border-b bg-muted/30 px-6 py-6 lg:px-8 lg:py-7">
          <CardTitle className="text-xl sm:text-2xl">{t("hackathon.pageTitle")}</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            {t("hackathon.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-8 p-6 md:p-8 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:gap-10 lg:p-10">
          <div className="space-y-6">
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t("hackathon.details")}
            </p>
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <div className="rounded-lg border bg-background p-4 lg:p-5">
                <p className="font-medium">{t("hackathon.card.nextLabel")}</p>
                <p className="mt-1 text-muted-foreground">{t("hackathon.card.nextValue")}</p>
              </div>
              <div className="rounded-lg border bg-background p-4 lg:p-5">
                <p className="font-medium">{t("hackathon.card.prepareLabel")}</p>
                <p className="mt-1 text-muted-foreground">{t("hackathon.card.prepareValue")}</p>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-blue-50 via-indigo-50 to-sky-100 p-6 lg:p-7 dark:from-blue-950 dark:via-indigo-950 dark:to-sky-950">
              <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blue-200/60 blur-2xl dark:bg-blue-700/40" />
              <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-sky-200/70 blur-2xl dark:bg-sky-700/40" />
              <div className="relative space-y-5">
                <div className="inline-flex rounded-full border bg-background/80 p-2.5">
                  <Trophy className="size-5 text-blue-600 dark:text-blue-300" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-md border bg-background/80 px-4 py-3">
                    <CalendarClock className="size-4 text-blue-600 dark:text-blue-300" />
                    <span className="text-sm font-medium">{t("hackathon.placeholder")}</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-md border bg-background/80 px-4 py-3">
                    <Users className="size-4 text-blue-600 dark:text-blue-300" />
                    <span className="text-sm text-muted-foreground">{t("hackathon.card.teamHint")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
