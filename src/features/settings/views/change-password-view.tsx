import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/common/api/supabase";
import { useAuthStore } from "@/common/auth/authStore";
import { getUserRole, getDashboardPathForRole } from "@/common/auth/roles";
import { Button } from "@/common/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/common/components/ui/form";
import { Input } from "@/common/components/ui/input";
import { usePageTitle } from "@/common/hooks/use-page-title";
import { useI18n } from "@/common/i18n/use-i18n";

type FormValues = {
  password: string;
  confirmPassword: string;
};

function useSchema() {
  const { t } = useI18n();
  return useMemo(
    () =>
      z
        .object({
          password: z
            .string()
            .min(8, t("changePassword.passwordMinLength"))
            .max(72, t("changePassword.passwordMaxLength")),
          confirmPassword: z.string().min(1, t("changePassword.confirmRequired")),
        })
        .refine((data) => data.password === data.confirmPassword, {
          path: ["confirmPassword"],
          message: t("changePassword.passwordMismatch"),
        }),
    [t],
  );
}

export function ChangePasswordView() {
  const { t } = useI18n();
  usePageTitle(t("changePassword.pageTitle"));

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const userId = user?.id ?? null;

  const schema = useSchema();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: FormValues) => {
    const { error: pwError } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (pwError) {
      toast.error(pwError.message);
      return;
    }

    // Clear the flag in the profiles table (source of truth)
    if (userId) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ must_change_password: false })
        .eq("id", userId);

      if (profileError) {
        toast.error(profileError.message);
        return;
      }

      // Invalidate the cached profile so AuthGuardLayout re-reads the updated row
      await queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    }

    toast.success(t("changePassword.success"));
    const role = getUserRole(useAuthStore.getState().user);
    const destination = getDashboardPathForRole(role);
    void navigate(destination, { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{t("changePassword.title")}</CardTitle>
          <CardDescription>{t("changePassword.desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            >
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("changePassword.newPassword")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        disabled={form.formState.isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("changePassword.confirmPassword")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        disabled={form.formState.isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting
                  ? t("changePassword.submitting")
                  : t("changePassword.submit")}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
