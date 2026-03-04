import { Users } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { usePageTitle } from "@/common/hooks/use-page-title";
import { useI18n } from "@/common/i18n/use-i18n";

export function AdminTeamsView() {
  const { t } = useI18n();
  usePageTitle(t("admin.teams.pageTitle"));

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Users className="size-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">{t("admin.teams.title")}</CardTitle>
              <CardDescription>{t("admin.teams.desc")}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
