import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import {
  getCheckpointRejectionTemplates,
  notifyRejection,
  setCheckpointDecision,
} from "@/common/api/supabase";
import type {
  CheckpointCode,
  CheckpointRejectionTemplateRow,
} from "@/common/api/supabase";
import { useI18n } from "@/common/i18n/use-i18n";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/common/components/ui/alert-dialog";
import { Button } from "@/common/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/common/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { Textarea } from "@/common/components/ui/textarea";

type Props = {
  teamId: string;
  teamName: string;
  cpCode: CheckpointCode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AdminCpRejectDialog({
  teamId,
  teamName,
  cpCode,
  open,
  onOpenChange,
}: Props) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const templatesQuery = useQuery({
    queryKey: ["checkpoint-rejection-templates", cpCode, "active"],
    queryFn: () =>
      getCheckpointRejectionTemplates({
        checkpointCode: cpCode,
        activeOnly: true,
      }),
    enabled: open,
  });

  const reasonTemplates = templatesQuery.data ?? [];

  const schema = useMemo(
    () =>
      z.object({
        reasonCode: z.string().min(1, t("validation.selectReasonRequired")),
        adminComment: z
          .string()
          .trim()
          .min(5, t("admin.checkpoints.reject.commentMinLength")),
      }),
    [t],
  );

  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { reasonCode: "", adminComment: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset({ reasonCode: "", adminComment: "" });
    }
  }, [cpCode, form, open]);

  const mutation = useMutation({
    mutationFn: ({ reasonCode, adminComment }: FormValues) =>
      setCheckpointDecision(teamId, cpCode, "rejected", reasonCode, adminComment),
    onSuccess: (_data, values) => {
      void notifyRejection({
        teamId,
        teamName,
        cpCode,
        reasonCode: values.reasonCode,
        adminComment: values.adminComment,
      }).catch(() => {
        toast.warning(t("admin.checkpoints.reject.emailWarning"));
      });

      toast.success(t("admin.checkpoints.reject.success"));
      void queryClient.invalidateQueries({ queryKey: ["admin-teams"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-team-details", teamId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-cp-statuses", cpCode] });
      void queryClient.invalidateQueries({ queryKey: ["admin-team-decisions", teamId] });
      onOpenChange(false);
      form.reset();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : t("admin.checkpoints.reject.error"),
      );
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };

  const handleTemplateSelect = (
    template: CheckpointRejectionTemplateRow | undefined,
    onChange: (value: string) => void,
  ) => {
    const nextCode = template?.code ?? "";
    onChange(nextCode);
    form.setValue("adminComment", template?.default_comment ?? "", {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const submitDisabled =
    mutation.isPending ||
    templatesQuery.isLoading ||
    templatesQuery.isError ||
    reasonTemplates.length === 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("admin.checkpoints.reject.title", {
              code: cpCode.toUpperCase(),
            })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{teamName}</strong> - {t("admin.checkpoints.reject.desc")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Form {...form}>
          <form
            id="cp-reject-form"
            onSubmit={(event) => {
              void form.handleSubmit(onSubmit)(event);
            }}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="reasonCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("admin.checkpoints.reject.reasonLabel")}</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      handleTemplateSelect(
                        reasonTemplates.find((template) => template.code === value),
                        field.onChange,
                      );
                    }}
                    value={field.value}
                    disabled={mutation.isPending || templatesQuery.isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("admin.checkpoints.reject.reasonLabel")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {templatesQuery.isLoading && (
                        <SelectLabel>{t("common.loading")}</SelectLabel>
                      )}
                      {reasonTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.code}>
                          {template.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="adminComment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("admin.checkpoints.reject.commentLabel")}</FormLabel>
                  {templatesQuery.isError && (
                    <p className="text-sm text-destructive">
                      {t("admin.checkpoints.reject.error")}
                    </p>
                  )}
                  <FormControl>
                    <Textarea
                      placeholder={t("admin.checkpoints.reject.commentPlaceholder")}
                      rows={3}
                      disabled={mutation.isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>
            {t("common.cancel")}
          </AlertDialogCancel>
          <Button
            type="submit"
            form="cp-reject-form"
            variant="destructive"
            disabled={submitDisabled}
          >
            {mutation.isPending
              ? t("common.loading")
              : t("admin.checkpoints.reject.confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
