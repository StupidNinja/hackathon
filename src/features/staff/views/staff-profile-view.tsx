import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { getProfile, upsertStaffProfile } from "@/common/api/supabase";
import {
  getDashboardPathForRole,
  getUserRole,
  isStaffRole,
} from "@/common/auth/roles";
import { useAuthStore } from "@/common/auth/authStore";
import { ErrorScreen, LoadingScreen } from "@/common/components/loading-screen";
import { UnsavedChangesDialog } from "@/common/components/unsaved-changes-dialog";
import { Button } from "@/common/components/ui/button";
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
import { usePageTitle } from "@/common/hooks/use-page-title";
import { useUnsavedChanges } from "@/common/hooks/use-unsaved-changes";
import { useI18n } from "@/common/i18n/use-i18n";

export function StaffProfileView() {
  const { t } = useI18n();
  usePageTitle(t("settings.profile.pageTitle"));
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userRole = getUserRole(user);

  const schema = useMemo(
    () =>
      z.object({
        firstName: z.string().trim().min(1, t("validation.firstNameRequired")),
        lastName: z.string().trim().min(1, t("validation.lastNameRequired")),
      }),
    [t],
  );

  type StaffProfileFormValues = z.infer<typeof schema>;

  const form = useForm<StaffProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
    },
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
    if (!profileQuery.isSuccess) {
      return;
    }

    const profile = profileQuery.data;
    reset({
      firstName: profile?.first_name ?? "",
      lastName: profile?.last_name ?? "",
    });
  }, [profileQuery.data, profileQuery.isSuccess, reset]);

  const onSubmit = async (values: StaffProfileFormValues) => {
    if (!userId) {
      toast.error(t("toast.sessionExpired"));
      void navigate("/auth", { replace: true });
      return;
    }

    const profileRole = profileQuery.data?.role;
    const effectiveRole =
      profileRole === "admin" || profileRole === "jury"
        ? profileRole
        : userRole === "admin" || userRole === "jury"
          ? userRole
          : null;

    if (!effectiveRole) {
      toast.error(t("settings.profile.error"));
      return;
    }

    try {
      await upsertStaffProfile(userId, {
        firstName: values.firstName,
        lastName: values.lastName,
        role: effectiveRole,
      });

      await queryClient.invalidateQueries({
        queryKey: ["onboarding"],
        refetchType: "all",
      });
      toast.success(t("settings.profile.toast.saved"));
      reset(values);
      unsaved.confirmLeave();
      void navigate(getDashboardPathForRole(effectiveRole));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("toast.profileSaveFailed"));
    }
  };

  if (!userId) {
    return null;
  }

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

  if (profileQuery.data?.role === "team") {
    return <Navigate to="/settings/profile" replace />;
  }

  if (!isStaffRole(profileQuery.data?.role ?? null) && !isStaffRole(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{t("settings.profile.title")}</CardTitle>
          <CardDescription>
            {t("staff.profile.cardDesc")}
          </CardDescription>
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
                        <Input placeholder="Johnson" disabled={isSubmitting} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <CardFooter className="flex flex-wrap gap-3 border-t bg-muted/30 px-6 py-4 sm:sticky sm:bottom-0 sm:z-10">
                <Button type="submit" disabled={isSubmitting || !isDirty}>
                  {isSubmitting ? t("common.saving") : t("settings.profile.saveChanges")}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link to="/dashboard">{t("common.cancel")}</Link>
                </Button>
              </CardFooter>
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
