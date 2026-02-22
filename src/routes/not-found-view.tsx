import { useI18n } from "@/common/i18n/use-i18n";

export function NotFoundView() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <p className="text-sm text-muted-foreground">{t("notFound.page")}</p>
    </div>
  );
}
