import { useEffect, useMemo } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Trash2, UserPlus } from "lucide-react";
import { z } from "zod";
import {
  getActiveSchools,
  getProfile,
  getTeamWithMembers,
  saveTeamWithMembers,
} from "@/common/api/supabase";
import { getUserRole, isStaffRole } from "@/common/auth/roles";
import { useAuthStore } from "@/common/auth/authStore";
import { ErrorScreen, LoadingScreen } from "@/common/components/loading-screen";
import { UnsavedChangesDialog } from "@/common/components/unsaved-changes-dialog";
import { Badge } from "@/common/components/ui/badge";
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
import { PhoneInput } from "@/common/components/ui/phone-input";
import { Separator } from "@/common/components/ui/separator";
import { Skeleton } from "@/common/components/ui/skeleton";
import { usePageTitle } from "@/common/hooks/use-page-title";
import { useUnsavedChanges } from "@/common/hooks/use-unsaved-changes";
import { useI18n } from "@/common/i18n/use-i18n";

const createEmptyMember = () => ({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  telegram: "",
});

export function OnboardingTeamView() {
  const { t } = useI18n();
  usePageTitle(t("onboarding.team.pageTitle"));
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;
  const userRole = getUserRole(user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const teamFormSchema = useMemo(() => {
    const requiredEmailSchema = z
      .string()
      .trim()
      .min(1, t("validation.emailRequired"))
      .max(254, t("validation.emailTooLong"))
      .pipe(z.email(t("validation.validEmail")));

    const memberSchema = z.object({
      firstName: z.string().trim().min(1, t("validation.firstNameRequired")),
      lastName: z.string().trim().min(1, t("validation.lastNameRequired")),
      email: requiredEmailSchema,
      phone: z
        .string()
        .trim()
        .min(1, t("validation.phoneRequired"))
        .max(32, t("validation.phoneTooLong")),
      telegram: z
        .string()
        .trim()
        .min(1, t("validation.telegramRequired"))
        .max(64, t("validation.telegramTooLong")),
    });

    return z.object({
      teamName: z.string().trim().min(1, t("validation.teamNameRequired")),
      members: z.array(memberSchema).max(3, t("validation.membersMax")),
    });
  }, [t]);

  type TeamFormValues = z.infer<typeof teamFormSchema>;

  const emptyTeamFormValues: TeamFormValues = {
    teamName: "",
    members: [],
  };

  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: emptyTeamFormValues,
  });

  const {
    control,
    reset,
    formState: { isSubmitting, isDirty },
  } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "members" });

  const unsaved = useUnsavedChanges(isDirty);

  const profileQuery = useQuery({
    queryKey: ["onboarding", "profile", userId],
    queryFn: () => getProfile(userId!),
    enabled: Boolean(userId),
  });

  const teamQuery = useQuery({
    queryKey: ["onboarding", "team", userId],
    queryFn: () => getTeamWithMembers(userId!),
    enabled: Boolean(userId),
  });

  const schoolsQuery = useQuery({
    queryKey: ["schools", "active"],
    queryFn: getActiveSchools,
    enabled: Boolean(userId),
  });

  useEffect(() => {
    if (!teamQuery.isSuccess) return;
    const team = teamQuery.data.team;
    const members = teamQuery.data.members
      .filter((m) => !m.is_captain)
      .map((m) => ({
        firstName: m.first_name ?? "",
        lastName: m.last_name ?? "",
        email: m.email ?? "",
        phone: m.phone ?? "",
        telegram: m.telegram ?? "",
      }));
    reset({
      teamName: team?.name ?? "",
      members,
    });
  }, [reset, teamQuery.data, teamQuery.isSuccess]);

  const onSubmit = async (values: TeamFormValues) => {
    if (!user || !userId) {
      toast.error(t("toast.sessionExpired"));
      void navigate("/auth", { replace: true });
      return;
    }
    const profile = profileQuery.data;
    if (!profile) {
      toast.error(t("toast.completeProfileFirst"));
      void navigate(isStaffRole(userRole) ? "/staff/profile" : "/profile");
      return;
    }
    if (profile.role !== "team") {
      toast.error(t("settings.profile.error"));
      void navigate("/staff/profile");
      return;
    }
    if (!user.email || !profile.phone || !profile.telegram) {
      toast.error(t("toast.completeProfileContact"));
      void navigate("/profile");
      return;
    }
    try {
      await saveTeamWithMembers({
        captainId: userId,
        teamName: values.teamName,
        captain: {
          userId,
          firstName: profile.first_name ?? "",
          lastName: profile.last_name ?? "",
          email: user.email ?? null,
          phone: profile.phone ?? null,
          telegram: profile.telegram ?? null,
        },
        members: values.members.map((m) => ({
          firstName: m.firstName,
          lastName: m.lastName,
          email: m.email,
          phone: m.phone,
          telegram: m.telegram,
        })),
      });
      await queryClient.invalidateQueries({
        queryKey: ["onboarding"],
        refetchType: "all",
      });
      toast.success(t("onboarding.team.toast.saved"));
      unsaved.confirmLeave();
      void navigate("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("toast.teamSaveFailed"));
    }
  };

  if (!userId) return null;

  if (profileQuery.isPending) {
    return <LoadingScreen message={t("onboarding.team.loading")} />;
  }

  if (profileQuery.isError) {
    return (
      <ErrorScreen
        message={t("onboarding.team.error")}
        onRetry={() => {
          void profileQuery.refetch();
          void teamQuery.refetch();
          void schoolsQuery.refetch();
        }}
      />
    );
  }

  const profile = profileQuery.data;
  const schools = schoolsQuery.data ?? [];

  if (!profile) return <Navigate to={isStaffRole(userRole) ? "/staff/profile" : "/profile"} replace />;
  if (!profile.first_name || !profile.last_name) return <Navigate to="/profile" replace />;
  if (!profile.phone || !profile.telegram) return <Navigate to="/profile" replace />;
  if (profile.role !== "team") return <Navigate to="/staff/profile" replace />;

  const schoolName = profile.school_id
    ? (schools.find((s) => s.id === profile.school_id)?.name_ru ?? profile.school_id)
    : (profile.custom_school_name ?? t("common.noData"));

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            void form.handleSubmit(onSubmit)(e);
          }}
        >
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>{t("onboarding.team.detailsTitle")}</CardTitle>
              <CardDescription>{t("onboarding.team.detailsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={control}
                name="teamName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("onboarding.team.teamName")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("onboarding.team.teamNamePlaceholder")}
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t("onboarding.team.captainTitle")}</CardTitle>
                <Badge variant="outline">{t("onboarding.team.autoFilled")}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("common.firstName")}
                  </span>
                  <Input value={profile.first_name ?? ""} disabled />
                </div>
                <div className="grid gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("common.lastName")}
                  </span>
                  <Input value={profile.last_name ?? ""} disabled />
                </div>
                <div className="grid gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("common.email")}
                  </span>
                  <Input value={user.email ?? t("common.noData")} disabled />
                </div>
                <div className="grid gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("common.phone")}
                  </span>
                  <Input value={profile.phone ?? t("common.noData")} disabled />
                </div>
                <div className="grid gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("common.telegram")}
                  </span>
                  <Input value={profile.telegram ?? t("common.noData")} disabled />
                </div>
                <div className="grid gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("common.grade")}
                  </span>
                  <Input
                    value={profile.grade ? `${t("common.grade")} ${profile.grade}` : t("common.noData")}
                    disabled
                  />
                </div>
                <div className="grid gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("common.school")}
                  </span>
                  {schoolsQuery.isPending ? (
                    <Skeleton className="h-9 w-full" />
                  ) : (
                    <Input value={schoolName} disabled />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{t("onboarding.team.additionalTitle")}</CardTitle>
                  <CardDescription className="mt-0.5 text-xs">
                    {t("onboarding.team.additionalUsed", { count: fields.length })}
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => append(createEmptyMember())}
                  disabled={fields.length >= 3 || isSubmitting}
                >
                  <UserPlus className="size-3.5" />
                  {t("onboarding.team.addMember")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.formState.errors.members?.message && (
                <p className="text-sm text-destructive">{form.formState.errors.members.message}</p>
              )}

              {fields.map((field, index) => (
                <div key={field.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {t("onboarding.team.member", { index: index + 2 })}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(index)}
                      disabled={isSubmitting}
                    >
                      <Trash2 className="size-3.5" />
                      {t("onboarding.team.remove")}
                    </Button>
                  </div>
                  <Separator />
                  <div className="grid gap-3">
                    <FormField
                      control={control}
                      name={`members.${index}.firstName`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t("common.firstName")}</FormLabel>
                          <FormControl>
                            <Input placeholder="Alex" disabled={isSubmitting} {...f} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name={`members.${index}.lastName`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t("common.lastName")}</FormLabel>
                          <FormControl>
                            <Input placeholder="Kim" disabled={isSubmitting} {...f} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name={`members.${index}.email`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t("common.email")}</FormLabel>
                          <FormControl>
                            <Input placeholder="alex@example.com" disabled={isSubmitting} {...f} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name={`members.${index}.phone`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t("common.phone")}</FormLabel>
                          <FormControl>
                            <PhoneInput
                              value={f.value}
                              onChange={f.onChange}
                              onBlur={f.onBlur}
                              disabled={isSubmitting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name={`members.${index}.telegram`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t("common.telegram")}</FormLabel>
                          <FormControl>
                            <Input placeholder="@username" disabled={isSubmitting} {...f} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("common.saving") : t("onboarding.team.saveTeam")}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link to="/profile">{t("onboarding.team.backProfile")}</Link>
            </Button>
          </div>
        </form>
      </Form>
      <UnsavedChangesDialog
        open={unsaved.isBlocked}
        onDiscard={unsaved.proceed}
        onCancel={unsaved.reset}
      />
    </div>
  );
}
