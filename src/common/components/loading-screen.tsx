import { AlertCircle, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { useI18n } from "@/common/i18n/use-i18n";

type LoadingScreenProps = {
  message?: string;
};

export function LoadingScreen({ message }: LoadingScreenProps) {
  const { t } = useI18n();
  const resolvedMessage = message ?? t("common.loading");

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground"
    >
      <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm">{resolvedMessage}</p>
    </div>
  );
}

type ErrorScreenProps = {
  message?: string;
  onRetry?: () => void;
};

export function ErrorScreen({ message, onRetry }: ErrorScreenProps) {
  const { t } = useI18n();
  const resolvedMessage = message ?? t("common.error.generic");

  return (
    <div
      role="alert"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-destructive"
    >
      <AlertCircle className="size-8" aria-hidden="true" />
      <p className="text-sm">{resolvedMessage}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5 text-foreground">
          <RotateCcw className="size-3.5" aria-hidden="true" />
          {t("common.tryAgain")}
        </Button>
      )}
    </div>
  );
}
