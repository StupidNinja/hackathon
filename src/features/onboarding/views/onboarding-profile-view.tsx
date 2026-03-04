import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import {
  getProfile,
  getTeamByCaptain,
  upsertProfile,
} from "@/common/api/supabase";
import { getUserRole, isStaffRole } from "@/common/auth/roles";
import { useAuthStore } from "@/common/auth/authStore";
import { ErrorScreen, LoadingScreen } from "@/common/components/loading-screen";
import { SchoolSearchSelect } from "@/common/components/school-search-select";
import { UnsavedChangesDialog } from "@/common/components/unsaved-changes-dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { usePageTitle } from "@/common/hooks/use-page-title";
import { useUnsavedChanges } from "@/common/hooks/use-unsaved-changes";
import { useI18n } from "@/common/i18n/use-i18n";

const OTHER_SCHOOL_VALUE = "__other__";

export function OnboardingProfileView() {
  const { t } = useI18n();
  usePageTitle(t("onboarding.profile.pageTitle"));
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;
  const userRole = getUserRole(user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const profileFormSchema = useMemo(
    () =>
      z
        .object({
          firstName: z.string().trim().min(1, t("validation.firstNameRequired")),
          lastName: z.string().trim().min(1, t("validation.lastNameRequired")),
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
          grade: z.enum(["9", "10", "11"], { error: t("validation.selectGrade") }),
          schoolSelection: z.string().min(1, t("validation.selectSchool")),
          customSchoolName: z.string().trim().max(120, t("validation.schoolNameTooLong")),
        })
        .superRefine((value, context) => {
          if (
            value.schoolSelection === OTHER_SCHOOL_VALUE &&
            value.customSchoolName.trim().length === 0
          ) {
            context.addIssue({
              code: "custom",
              path: ["customSchoolName"],
              message: t("validation.customSchoolRequired"),
            });
          }
        }),
    [t],
  );

  type ProfileFormValues = z.infer<typeof profileFormSchema>;

  const emptyProfileFormValues = useMemo<ProfileFormValues>(
    () => ({
      firstName: "",
      lastName: "",
      phone: "",
      telegram: "",
      grade: "10",
      schoolSelection: "",
      customSchoolName: "",
    }),
    [],
  );

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: emptyProfileFormValues,
  });

  const {
    control,
    reset,
    formState: { isSubmitting, isDirty },
  } = form;

  const unsaved = useUnsavedChanges(isDirty);

  const profileQuery = useQuery({
    queryKey: ["onboarding", "profile", userId],
    queryFn: () => getProfile(userId!),
    enabled: Boolean(userId),
  });

  useEffect(() => {
    if (!profileQuery.isSuccess) return;
    const profile = profileQuery.data;
    if (!profile) {
      reset(emptyProfileFormValues);
      return;
    }
    reset({
      firstName: profile.first_name ?? "",
      lastName: profile.last_name ?? "",
      phone: profile.phone ?? "",
      telegram: profile.telegram ?? "",
      grade: String(profile.grade) as "9" | "10" | "11",
      schoolSelection:
        profile.school_id ?? (profile.custom_school_name ? OTHER_SCHOOL_VALUE : ""),
      customSchoolName: profile.custom_school_name ?? "",
    });
  }, [emptyProfileFormValues, profileQuery.data, profileQuery.isSuccess, reset]);

  const schoolSelection = useWatch({ control, name: "schoolSelection" });
  const showCustomSchoolInput = schoolSelection === OTHER_SCHOOL_VALUE;

  const onSubmit = async (values: ProfileFormValues) => {
    if (!userId) {
      toast.error(t("toast.sessionExpired"));
      void navigate("/auth", { replace: true });
      return;
    }

    if (isStaffRole(profileQuery.data?.role ?? userRole)) {
      toast.error(t("settings.profile.error"));
      void navigate("/staff/profile");
      return;
    }

    try {
      await upsertProfile(userId, {
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        telegram: values.telegram,
        grade: Number(values.grade) as 9 | 10 | 11,
        schoolId: values.schoolSelection === OTHER_SCHOOL_VALUE ? null : values.schoolSelection,
        customSchoolName:
          values.schoolSelection === OTHER_SCHOOL_VALUE ? values.customSchoolName : null,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("toast.profileSaveFailed"));
      return;
    }

    // Profile is saved. Determine redirect — if this secondary fetch fails we
    // still navigate to /team (the safe default), never show a "save failed" toast.
    let team = null;
    try {
      team = await getTeamByCaptain(userId);
    } catch {
      // Non-critical: profile is already persisted. Fall through to /team.
    }

    await queryClient.invalidateQueries({
      queryKey: ["onboarding"],
      refetchType: "all",
    });
    toast.success(t("onboarding.profile.toast.saved"));
    unsaved.confirmLeave();
    void navigate(team ? "/dashboard" : "/team");
  };

  if (!userId) return null;

  if (profileQuery.isPending) {
    return <LoadingScreen message={t("onboarding.profile.loading")} />;
  }

  if (profileQuery.isError) {
    return (
      <ErrorScreen
        message={t("onboarding.profile.error")}
        onRetry={() => void profileQuery.refetch()}
      />
    );
  }

  const profile = profileQuery.data;
  if (!profile && isStaffRole(userRole)) {
    return <Navigate to="/staff/profile" replace />;
  }

  if (profile?.role && profile.role !== "team") {
    return <Navigate to="/staff/profile" replace />;
  }

  const selectedSchoolFromProfile = profileQuery.data?.schools;

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{t("onboarding.profile.title")}</CardTitle>
          <CardDescription>{t("onboarding.profile.desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              className="grid gap-5"
              onSubmit={(e) => {
                void form.handleSubmit(onSubmit)(e);
              }}
            >
              <FormField
                control={control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.firstName")}</FormLabel>
                    <FormControl>
                      <Input placeholder="Alex" disabled={isSubmitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.lastName")}</FormLabel>
                    <FormControl>
                      <Input placeholder="Johnson" disabled={isSubmitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.phone")}</FormLabel>
                    <FormControl>
                      <PhoneInput
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="telegram"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.telegram")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("onboarding.profile.telegramPlaceholder")}
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.grade")}</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("common.selectGrade")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="9">9</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="11">11</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="schoolSelection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.school")}</FormLabel>
                    <FormControl>
                      <SchoolSearchSelect
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isSubmitting}
                        selectedSchoolFallback={selectedSchoolFromProfile}
                        otherOptionValue={OTHER_SCHOOL_VALUE}
                        otherOptionLabel={t("common.otherSchool")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showCustomSchoolInput && (
                <FormField
                  control={control}
                  name="customSchoolName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("common.schoolName")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("common.enterSchoolName")}
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                {isSubmitting ? t("common.saving") : t("onboarding.profile.saveContinue")}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <UnsavedChangesDialog
        open={unsaved.isBlocked}
        onDiscard={unsaved.proceed}
        onCancel={unsaved.reset}
      />
    </div>
  );
}
