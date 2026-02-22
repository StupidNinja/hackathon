import { AlertCircle, Loader2 } from "lucide-react";

type LoadingScreenProps = {
  message?: string;
};

export function LoadingScreen({ message = "Loading…" }: LoadingScreenProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

type ErrorScreenProps = {
  message?: string;
};

export function ErrorScreen({ message = "Something went wrong." }: ErrorScreenProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-destructive">
      <AlertCircle className="size-8" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
