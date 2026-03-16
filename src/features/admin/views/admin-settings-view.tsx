import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { getHackathonSettings, updateHackathonSettings } from "@/common/api/supabase";
import { useAuthStore } from "@/common/auth/authStore";
import { isSuperAdmin } from "@/common/auth/roles";
import { getProfile } from "@/common/api/supabase";
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
import { Navigate } from "react-router-dom";
import { LoadingScreen } from "@/common/components/loading-screen";
import { useHackathonTime } from "@/common/hooks/use-hackathon-time";
import { usePageTitle } from "@/common/hooks/use-page-title";
import { useI18n } from "@/common/i18n/use-i18n";

const settingsSchema = z.object({
  t0: z.string().optional(),
  demo_mode: z.boolean(),
  demo_offset_minutes: z.number().int().min(0).max(99999),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

/** Convert ISO string (UTC) to local datetime-local input value */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // datetime-local expects "YYYY-MM-DDTHH:mm" in local time
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

/** Convert local datetime-local string to UTC ISO */
function localInputToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function AdminSettingsView() {
  const { t } = useI18n();
  usePageTitle(t("admin.settings.pageTitle"));

  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => getProfile(userId!),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });

  const userIsSuperAdmin = isSuperAdmin(profileQuery.data);

  const settingsQuery = useQuery({
    queryKey: ["hackathon-settings"],
    queryFn: getHackathonSettings,
    staleTime: 10_000,
  });

  const timing = useHackathonTime();

  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    values: settingsQuery.data
      ? {
          t0: isoToLocalInput(settingsQuery.data.t0),
          demo_mode: settingsQuery.data.demo_mode,
          demo_offset_minutes: settingsQuery.data.demo_offset_minutes,
        }
      : undefined,
  });
  const demoModeEnabled = form.watch("demo_mode");

  const saveMutation = useMutation({
    mutationFn: (values: SettingsFormValues) =>
      updateHackathonSettings({
        t0: values.t0 ? localInputToIso(values.t0) : null,
        demo_mode: values.demo_mode,
        demo_offset_minutes: values.demo_offset_minutes,
      }),
    onSuccess: () => {
      toast.success(t("admin.settings.save"));
      setLastSaved(new Date().toLocaleTimeString("ru-RU"));
      void queryClient.invalidateQueries({ queryKey: ["hackathon-settings"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    },
  });

  const onSubmit = (values: SettingsFormValues) => {
    saveMutation.mutate(values);
  };

  if (profileQuery.isLoading) return <LoadingScreen />;
  // Only super-admins can access settings
  if (!userIsSuperAdmin) return <Navigate to="/admin/teams" replace />;

  const virtualNow = timing.virtualNow;

  return (
    <div className="mx-auto w-full max-w-lg space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{t("admin.settings.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("admin.settings.desc")}</p>
      </div>

      {/* Virtual clock status */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 pb-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">{t("admin.settings.virtualNow")}</span>
            <span className="font-mono tabular-nums">
              {timing.t0
                ? virtualNow.toLocaleString("ru-RU")
                : t("admin.settings.hackathonNotStarted")}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("admin.settings.t0Label")}</CardTitle>
          <CardDescription>{t("admin.settings.desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              id="settings-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-5"
            >
              {/* T0 */}
              <FormField
                control={form.control}
                name="t0"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("admin.settings.t0Label")}</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          value={field.value ?? ""}
                          disabled={saveMutation.isPending}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={saveMutation.isPending}
                        onClick={() => {
                          form.setValue("t0", isoToLocalInput(new Date().toISOString()));
                        }}
                      >
                        {t("admin.settings.setNow")}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={saveMutation.isPending}
                        onClick={() => form.setValue("t0", "")}
                      >
                        {t("admin.settings.clearT0")}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Demo Mode toggle */}
              <FormField
                control={form.control}
                name="demo_mode"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 rounded-lg border p-3">
                    <input
                      id="demo-mode"
                      type="checkbox"
                      className="size-4 cursor-pointer accent-primary"
                      checked={field.value}
                      onChange={field.onChange}
                      disabled={saveMutation.isPending}
                    />
                    <label htmlFor="demo-mode" className="cursor-pointer text-sm space-y-0.5">
                      <div className="font-medium">{t("admin.settings.demoMode")}</div>
                      <div className="text-xs text-muted-foreground">
                        {t("admin.settings.demoModeDesc")}
                      </div>
                    </label>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Demo Offset */}
              <FormField
                control={form.control}
                name="demo_offset_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("admin.settings.demoOffset")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={99999}
                        disabled={saveMutation.isPending || !demoModeEnabled}
                        name={field.name}
                        ref={field.ref}
                        value={field.value}
                        onBlur={field.onBlur}
                        onChange={(event) => {
                          field.onChange(event.target.valueAsNumber);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          type="submit"
          form="settings-form"
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? t("common.loading") : t("admin.settings.save")}
        </Button>
        {lastSaved && (
          <span className="text-xs text-muted-foreground">
            {t("common.saved")} {lastSaved}
          </span>
        )}
      </div>
    </div>
  );
}
