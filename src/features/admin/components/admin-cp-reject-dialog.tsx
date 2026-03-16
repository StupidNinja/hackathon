import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import { notifyRejection, setCheckpointDecision } from "@/common/api/supabase";
import type { CheckpointCode } from "@/common/api/supabase";
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
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { Textarea } from "@/common/components/ui/textarea";

// CP-specific reject reason codes
const CP_REASON_CODES = {
  cp0: ["no_confirmation", "invalid_topic", "other"],
  cp1: ["incomplete_description", "missing_audience", "other"],
  cp2: ["invalid_repo", "no_implementation", "other"],
  cp3: ["no_build_or_presentation", "incomplete", "other"],
} as const satisfies Record<CheckpointCode, readonly string[]>;

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

  const reasonCodes = CP_REASON_CODES[cpCode];

  const schema = useMemo(
    () =>
      z.object({
        reasonCode: z.enum(reasonCodes as unknown as [string, ...string[]], {
          error: t("validation.selectReasonRequired"),
        }),
        adminComment: z
          .string()
          .min(5, t("admin.checkpoints.reject.commentMinLength")),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, cpCode],
  );

  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { reasonCode: "", adminComment: "" },
  });

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
            <strong>{teamName}</strong> — {t("admin.checkpoints.reject.desc")}
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
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={mutation.isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("admin.checkpoints.reject.reasonLabel")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {reasonCodes.map((code) => (
                        <SelectItem key={code} value={code}>
                          {t(
                            `admin.checkpoints.reject.reason.${cpCode}.${code}` as `admin.checkpoints.reject.reason.cp0.no_confirmation`,
                          )}
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
                  <FormLabel>
                    {t("admin.checkpoints.reject.commentLabel")}
                  </FormLabel>
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
            disabled={mutation.isPending}
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
