import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";

import { getHackathonSettings, updateHackathonSettings } from "@/common/api/supabase";
import { getProfile } from "@/common/api/supabase";
import { useAuthStore } from "@/common/auth/authStore";
import { isSuperAdmin } from "@/common/auth/roles";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/common/components/ui/tabs";
import { LoadingScreen } from "@/common/components/loading-screen";
import { useHackathonTime } from "@/common/hooks/use-hackathon-time";
import { usePageTitle } from "@/common/hooks/use-page-title";
import { useI18n } from "@/common/i18n/use-i18n";
import {
  Cp0TopicsSettingsSection,
  JuryCriteriaSettingsSection,
  RejectionTemplatesSettingsSection,
} from "@/features/admin/components/admin-settings-constructors";

const settingsSchema = z.object({
  t0: z.string().optional(),
  demo_mode: z.boolean(),
  demo_offset_minutes: z.number().int().min(0).max(99999),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

function localInputToIso(local: string): string | null {
  if (!local) return null;
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function AdminSettingsView() {
  const { t } = useI18n();
  usePageTitle(t("admin.settings.pageTitle"));

  const user = useAuthStore((state) => state.user);
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => getProfile(userId!),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });

  const settingsQuery = useQuery({
    queryKey: ["hackathon-settings"],
    queryFn: getHackathonSettings,
    staleTime: 10_000,
  });

  const timing = useHackathonTime();

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
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    },
  });

  const onSubmit = (values: SettingsFormValues) => {
    saveMutation.mutate(values);
  };

  const demoModeEnabled =
    useWatch({ control: form.control, name: "demo_mode" }) ?? false;

  if (profileQuery.isLoading) return <LoadingScreen />;
  if (!isSuperAdmin(profileQuery.data)) return <Navigate to="/admin/teams" replace />;

  const virtualNow = timing.virtualNow;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{t("admin.settings.pageTitle")}</h1>
        <p className="text-sm text-muted-foreground">
          Управляйте временем хакатона, темами CP0, причинами отклонения и критериями жюри.
        </p>
      </div>

      <Tabs defaultValue="time" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="time">Время этапов</TabsTrigger>
          <TabsTrigger value="cp0-topics">Темы проектов (CP0)</TabsTrigger>
          <TabsTrigger value="rejections">Шаблоны отклонения</TabsTrigger>
          <TabsTrigger value="jury">Критерии жюри</TabsTrigger>
        </TabsList>

        <TabsContent value="time" className="space-y-5">
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
                  onSubmit={(event) => {
                    void form.handleSubmit(onSubmit)(event);
                  }}
                  className="space-y-5"
                >
                  <FormField
                    control={form.control}
                    name="t0"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("admin.settings.t0Label")}</FormLabel>
                        <div className="flex flex-wrap gap-2">
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
                        <label
                          htmlFor="demo-mode"
                          className="cursor-pointer space-y-0.5 text-sm"
                        >
                          <div className="font-medium">{t("admin.settings.demoMode")}</div>
                          <div className="text-xs text-muted-foreground">
                            {t("admin.settings.demoModeDesc")}
                          </div>
                        </label>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
            <Button type="submit" form="settings-form" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? t("common.loading") : t("admin.settings.save")}
            </Button>
            {lastSaved && (
              <span className="text-xs text-muted-foreground">
                {t("common.saved")} {lastSaved}
              </span>
            )}
          </div>
        </TabsContent>

        <TabsContent value="cp0-topics">
          <Cp0TopicsSettingsSection />
        </TabsContent>

        <TabsContent value="rejections">
          <RejectionTemplatesSettingsSection />
        </TabsContent>

        <TabsContent value="jury">
          <JuryCriteriaSettingsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
