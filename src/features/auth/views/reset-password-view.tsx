import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { signOut, updatePassword } from "@/common/api/supabase";
import { useAuthStore } from "@/common/auth/authStore";
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

export function ResetPasswordView() {
  const { t } = useI18n();
  usePageTitle(t("auth.reset.title"));

  const navigate = useNavigate();
  const session = useAuthStore((state) => state.session);
  const clearSession = useAuthStore((state) => state.clearSession);

  const schema = useMemo(
    () =>
      z
        .object({
          password: z
            .string()
            .min(8, t("auth.validation.password.min"))
            .max(128, t("auth.validation.password.max")),
          confirmPassword: z.string().min(1, t("auth.reset.validation.confirmRequired")),
        })
        .refine((values) => values.password === values.confirmPassword, {
          path: ["confirmPassword"],
          message: t("auth.reset.validation.passwordMismatch"),
        }),
    [t],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async ({ password }: FormValues) => {
    if (!session) {
      toast.error(t("auth.reset.toast.invalidSession"));
      void navigate("/auth/forgot-password", { replace: true });
      return;
    }

    const { error } = await updatePassword(password);
    if (error) {
      toast.error(error.message);
      return;
    }

    const { error: signOutError } = await signOut("local");
    if (signOutError) {
      clearSession();
    }

    toast.success(t("auth.reset.toast.success"));
    void navigate("/auth", { replace: true });
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight">{t("app.name")}</h1>
          <p className="text-sm text-muted-foreground">{t("auth.subtitle")}</p>
        </div>

        <Card className="shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{t("auth.reset.title")}</CardTitle>
            <CardDescription>{t("auth.reset.desc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Form {...form}>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  void form.handleSubmit(onSubmit)(e);
                }}
              >
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("auth.password")}</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          placeholder={t("auth.placeholderPasswordSignUp")}
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
                      <FormLabel>{t("auth.reset.confirmPassword")}</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          placeholder={t("auth.reset.placeholderConfirmPassword")}
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
                    ? t("auth.reset.submitting")
                    : t("auth.reset.submit")}
                </Button>
              </form>
            </Form>

            <p className="text-center text-sm text-muted-foreground">
              <Link
                to="/auth/forgot-password"
                className="underline underline-offset-4 hover:text-foreground"
              >
                {t("auth.reset.backToForgot")}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
