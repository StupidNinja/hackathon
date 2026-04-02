import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { sendPasswordResetEmail } from "@/common/api/supabase/auth";
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

const RESEND_COOLDOWN_SECONDS = 60;
const RESEND_COOLDOWN_STORAGE_KEY = "auth.forgotPasswordCooldownEndAt";

const getRemainingCooldownSeconds = (
  cooldownEndAtMs: number,
  currentNowMs: number,
): number => {
  const diff = Math.ceil((cooldownEndAtMs - currentNowMs) / 1000);
  return Math.max(0, diff);
};

export function ForgotPasswordView() {
  const { t } = useI18n();
  usePageTitle(t("auth.forgot.title"));
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [cooldownEndAtMs, setCooldownEndAtMs] = useState<number | null>(() => {
    const rawValue = localStorage.getItem(RESEND_COOLDOWN_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsedValue = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(parsedValue) || parsedValue <= Date.now()) {
      localStorage.removeItem(RESEND_COOLDOWN_STORAGE_KEY);
      return null;
    }

    return parsedValue;
  });

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(t("auth.validation.email")),
      }),
    [t],
  );

  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const cooldownLeft = cooldownEndAtMs
    ? getRemainingCooldownSeconds(cooldownEndAtMs, nowMs)
    : 0;

  useEffect(() => {
    if (!cooldownEndAtMs) {
      return;
    }

    const timer = setInterval(() => {
      const currentNow = Date.now();
      setNowMs(currentNow);

      const remaining = getRemainingCooldownSeconds(cooldownEndAtMs, currentNow);
      if (remaining <= 0) {
        localStorage.removeItem(RESEND_COOLDOWN_STORAGE_KEY);
        setCooldownEndAtMs(null);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownEndAtMs]);

  const onSubmit = async ({ email }: FormValues) => {
    if (cooldownLeft > 0) {
      return;
    }

    try {
      await (sendPasswordResetEmail as (value: string) => Promise<void>)(email);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("common.error.generic"));
      return;
    }

    toast.success(t("auth.forgot.toast.sent"));
    const newCooldownEndAtMs = Date.now() + RESEND_COOLDOWN_SECONDS * 1000;
    localStorage.setItem(
      RESEND_COOLDOWN_STORAGE_KEY,
      String(newCooldownEndAtMs),
    );
    setCooldownEndAtMs(newCooldownEndAtMs);
    setNowMs(Date.now());
    form.reset();
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
            <CardTitle className="text-lg">{t("auth.forgot.title")}</CardTitle>
            <CardDescription>{t("auth.forgot.desc")}</CardDescription>
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("common.email")}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          autoComplete="email"
                          placeholder={t("auth.placeholderEmail")}
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
                  disabled={form.formState.isSubmitting || cooldownLeft > 0}
                >
                  {form.formState.isSubmitting
                    ? t("auth.forgot.submitting")
                    : cooldownLeft > 0
                      ? t("auth.forgot.retryIn", { seconds: cooldownLeft })
                      : t("auth.forgot.submit")}
                </Button>
              </form>
            </Form>

            <p className="text-center text-sm text-muted-foreground">
              <Link to="/auth" className="underline underline-offset-4 hover:text-foreground">
                {t("auth.forgot.backToSignIn")}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
