import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { getProfile, upsertProfile } from "@/common/api/supabase";
import { getUserRole, isStaffRole } from "@/common/auth/roles";
import { useAuthStore } from "@/common/auth/authStore";
import { ErrorScreen, LoadingScreen } from "@/common/components/loading-screen";
import { SchoolSearchSelect } from "@/common/components/school-search-select";
import { Button } from "@/common/components/ui/button";
import { PhoneInput } from "@/common/components/ui/phone-input";
import { usePageTitle } from "@/common/hooks/use-page-title";
import { useUnsavedChanges } from "@/common/hooks/use-unsaved-changes";
import { UnsavedChangesDialog } from "@/common/components/unsaved-changes-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { useI18n } from "@/common/i18n/use-i18n";

const OTHER_SCHOOL_VALUE = "__other__";

type ProfileFormValues = {
  firstName: string;
  lastName: string;
  phone: string;
  telegram: string;
  grade: "9" | "10" | "11";
  schoolSelection: string;
  customSchoolName: string;
};

export function EditProfileView() {
  const { t } = useI18n();
  usePageTitle(t("settings.profile.pageTitle"));

  const user = useAuthStore((state) => state.user);
  const userId = user?.id;
  const userRole = getUserRole(user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [hasSubmitError, setHasSubmitError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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
          grade: z.enum(["9", "10", "11"], {
            error: t("validation.selectGrade"),
          }),
          schoolSelection: z.string().min(1, t("validation.selectSchool")),
          customSchoolName: z
            .string()
            .trim()
            .max(120, t("validation.schoolNameTooLong")),
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
    setValue,
    getValues,
    formState: { isSubmitting, isDirty },
  } = form;

  const unsaved = useUnsavedChanges(isEditing && isDirty);

  const profileQuery = useQuery({
    queryKey: ["onboarding", "profile", userId],
    queryFn: () => getProfile(userId!),
    enabled: Boolean(userId),
  });

  useEffect(() => {
    if (!profileQuery.isSuccess) {
      return;
    }

    const profile = profileQuery.data;
    if (!profile) {
      reset(emptyProfileFormValues);
      return;
    }

    const defaultSchoolSelection =
      profile.school_id ?? (profile.custom_school_name ? OTHER_SCHOOL_VALUE : "");

    reset({
      firstName: profile.first_name ?? "",
      lastName: profile.last_name ?? "",
      phone: profile.phone ?? "",
      telegram: profile.telegram ?? "",
      grade: String(profile.grade) as "9" | "10" | "11",
      schoolSelection: defaultSchoolSelection,
      customSchoolName: profile.custom_school_name ?? "",
    });

    const currentSchoolSelection = getValues("schoolSelection");
    if (!currentSchoolSelection && defaultSchoolSelection) {
      setValue("schoolSelection", defaultSchoolSelection, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
    }
  }, [
    emptyProfileFormValues,
    getValues,
    profileQuery.data,
    profileQuery.isSuccess,
    reset,
    setValue,
  ]);

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
      setHasSubmitError(false);
      await upsertProfile(userId, {
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        telegram: values.telegram,
        grade: Number(values.grade) as 9 | 10 | 11,
        schoolId:
          values.schoolSelection === OTHER_SCHOOL_VALUE
            ? null
            : values.schoolSelection,
        customSchoolName:
          values.schoolSelection === OTHER_SCHOOL_VALUE
            ? values.customSchoolName
            : null,
      });

      await queryClient.invalidateQueries({
        queryKey: ["onboarding"],
        refetchType: "all",
      });

      toast.success(t("settings.profile.toast.saved"));
      reset(values);
      unsaved.confirmLeave();
      setIsEditing(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("toast.profileSaveFailed");
      toast.error(message);
      setHasSubmitError(true);
    }
  };

  const handleCancelEdit = () => {
    const profile = profileQuery.data;

    if (!profile) {
      reset(emptyProfileFormValues);
    } else {
      const defaultSchoolSelection =
        profile.school_id ?? (profile.custom_school_name ? OTHER_SCHOOL_VALUE : "");

      reset({
        firstName: profile.first_name ?? "",
        lastName: profile.last_name ?? "",
        phone: profile.phone ?? "",
        telegram: profile.telegram ?? "",
        grade: String(profile.grade) as "9" | "10" | "11",
        schoolSelection: defaultSchoolSelection,
        customSchoolName: profile.custom_school_name ?? "",
      });
    }

    setHasSubmitError(false);
    unsaved.confirmLeave();
    setIsEditing(false);
  };

  if (!userId) return null;

  if (profileQuery.isPending) {
    return <LoadingScreen message={t("settings.profile.loading")} />;
  }

  if (profileQuery.isError) {
    return (
      <ErrorScreen
        message={t("settings.profile.error")}
        onRetry={() => {
          void profileQuery.refetch();
        }}
      />
    );
  }

  if (!profileQuery.data && isStaffRole(userRole)) {
    return <Navigate to="/staff/profile" replace />;
  }

  if (profileQuery.data?.role && profileQuery.data.role !== "team") {
    return <Navigate to="/staff/profile" replace />;
  }

  const selectedSchoolFromProfile = profileQuery.data?.schools;
  const profile = profileQuery.data;
  const schoolName =
    profile?.schools?.name_ru ?? profile?.custom_school_name ?? t("common.noData");
  const gradeLabel = profile?.grade ? String(profile.grade) : t("common.noData");

  return (
    <div className="space-y-6">
      <UnsavedChangesDialog
        open={unsaved.isBlocked}
        onDiscard={unsaved.proceed}
        onCancel={unsaved.reset}
      />

      {!isEditing && (
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{t("settings.profile.title")}</CardTitle>
                <CardDescription>{t("settings.profile.desc")}</CardDescription>
              </div>
              <Button type="button" onClick={() => setIsEditing(true)}>
                {t("common.edit")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">{t("common.firstName")}</dt>
                <dd className="mt-1 font-medium">
                  {profile?.first_name ?? t("common.noData")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("common.lastName")}</dt>
                <dd className="mt-1 font-medium">
                  {profile?.last_name ?? t("common.noData")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("common.email")}</dt>
                <dd className="mt-1 font-medium">{user?.email ?? t("common.noData")}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("common.phone")}</dt>
                <dd className="mt-1 font-medium">
                  {profile?.phone ?? t("common.noData")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("common.telegram")}</dt>
                <dd className="mt-1 font-medium">
                  {profile?.telegram ?? t("common.noData")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("common.grade")}</dt>
                <dd className="mt-1 font-medium">{gradeLabel}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">{t("common.school")}</dt>
                <dd className="mt-1 font-medium">{schoolName}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}

      {isEditing && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>{t("settings.profile.title")}</CardTitle>
            <CardDescription>{t("settings.profile.desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                className="grid gap-5"
                onSubmit={(e) => {
                  void form.handleSubmit(onSubmit)(e);
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
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
                          <Input
                            placeholder="Johnson"
                            disabled={isSubmitting}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
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
                </div>

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

                <CardFooter className="flex flex-wrap gap-3 border-t bg-muted/30 px-6 py-4 sm:sticky sm:bottom-0 sm:z-10">
                  <Button
                    type="submit"
                    disabled={isSubmitting || (!isDirty && !hasSubmitError)}
                  >
                    {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                    {isSubmitting ? t("common.saving") : t("settings.profile.saveChanges")}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancelEdit}>
                    {t("common.cancel")}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
