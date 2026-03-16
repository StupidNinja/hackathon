import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMemo } from "react";
import { z } from "zod";
import { toast } from "sonner";

import { disqualifyTeam, notifyRejection } from "@/common/api/supabase";
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

type AdminDisqualifyDialogProps = {
  teamId: string;
  teamName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AdminDisqualifyDialog({
  teamId,
  teamName,
  open,
  onOpenChange,
}: AdminDisqualifyDialogProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const schema = useMemo(
    () =>
      z.object({
        reasonCode: z.enum(
          ["invalid_data", "spam", "duplicate_team", "other"] as const,
          {
            message: t("validation.selectReasonRequired"),
          }
        ),
        adminComment: z
          .string()
          .min(5, t("admin.teams.disqualify.commentMinLength")),
      }),
    [t]
  );

  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      reasonCode: undefined,
      adminComment: "",
    },
  });

  const mutation = useMutation({
    mutationFn: ({ reasonCode, adminComment }: FormValues) =>
      disqualifyTeam(teamId, reasonCode, adminComment),
    onSuccess: (_data, values) => {
      void notifyRejection({
        teamId,
        teamName,
        cpCode: null,
        reasonCode: values.reasonCode,
        adminComment: values.adminComment,
      }).catch(() => {
        toast.warning(t("admin.teams.disqualify.emailWarning"));
      });

      toast.success(t("admin.teams.disqualify.success"));
      void queryClient.invalidateQueries({ queryKey: ["admin-teams"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-team-details", teamId] });
      void queryClient.invalidateQueries({
        queryKey: ["admin-team-members", teamId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin-team-disqualification", teamId],
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message || t("admin.teams.disqualify.error"));
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!mutation.isPending) {
      onOpenChange(newOpen);
      if (!newOpen) {
        form.reset();
      }
    }
  };

  const reasonOptions = [
    "invalid_data",
    "spam",
    "duplicate_team",
    "other",
  ] as const;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent
        onEscapeKeyDown={(e) => { if (mutation.isPending) { e.preventDefault(); } }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("admin.teams.disqualify.title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("admin.teams.disqualify.description")}
            <br />
            <strong className="mt-2 block">{teamName}</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => { void form.handleSubmit(onSubmit)(e); }}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="reasonCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("admin.teams.disqualify.reasonLabel")}
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={mutation.isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {reasonOptions.map((reason) => (
                        <SelectItem key={reason} value={reason}>
                          {t(`admin.teams.disqualify.reason.${reason}`)}
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
                    {t("admin.teams.disqualify.commentLabel")}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t(
                        "admin.teams.disqualify.commentPlaceholder"
                      )}
                      rows={4}
                      disabled={mutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <AlertDialogFooter>
              <AlertDialogCancel disabled={mutation.isPending}>
                {t("common.cancel")}
              </AlertDialogCancel>
              <Button
                type="submit"
                variant="destructive"
                disabled={mutation.isPending}
              >
                {mutation.isPending
                  ? t("common.loading")
                  : t("admin.teams.disqualify.confirm")}
              </Button>
            </AlertDialogFooter>
          </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
