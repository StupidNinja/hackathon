import { TriangleAlert } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import { useI18n } from "@/common/i18n/use-i18n";

type UnsavedChangesDialogProps = {
  open: boolean;
  onDiscard: () => void;
  onCancel: () => void;
};

export function UnsavedChangesDialog({
  open,
  onDiscard,
  onCancel,
}: UnsavedChangesDialogProps) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent showCloseButton={false} className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <TriangleAlert className="size-5 text-amber-500" />
            <DialogTitle>{t("unsaved.title")}</DialogTitle>
          </div>
          <DialogDescription>{t("unsaved.desc")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t("unsaved.stay")}
          </Button>
          <Button variant="default" onClick={onDiscard}>
            {t("unsaved.discard")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
