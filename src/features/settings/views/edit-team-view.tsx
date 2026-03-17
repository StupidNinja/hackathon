import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useUnsavedChanges } from "@/common/hooks/use-unsaved-changes";
import { UnsavedChangesDialog } from "@/common/components/unsaved-changes-dialog";
import { toast } from "sonner";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { z } from "zod";
import {
  getProfile,
  getTeamWithMembers,
  saveTeamWithMembers,
} from "@/common/api/supabase";
import { isStaffRole } from "@/common/auth/roles";
import { useAuthStore } from "@/common/auth/authStore";
import { ErrorScreen, LoadingScreen } from "@/common/components/loading-screen";
import { PhoneInput } from "@/common/components/ui/phone-input";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { usePageTitle } from "@/common/hooks/use-page-title";
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
import { Separator } from "@/common/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/common/components/ui/alert-dialog";
import { useI18n } from "@/common/i18n/use-i18n";

const createEmptyMember = () => ({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  telegram: "",
});

type TeamFormValues = {
  teamName: string;
  members: Array<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    telegram: string;
  }>;
};

export function EditTeamView() {
  const { t } = useI18n();
  usePageTitle(t("settings.team.pageTitle"));

  const user = useAuthStore((state) => state.user);
  const userId = user?.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [pendingRemoveIndex, setPendingRemoveIndex] = useState<number | null>(null);
  const [hasSubmitError, setHasSubmitError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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

  const unsaved = useUnsavedChanges(isEditing && isDirty);
  const { fields, append, remove } = useFieldArray({ control, name: "members" });

  const handleRemoveMember = (index: number) => {
    const values = form.getValues(`members.${index}`);
    const hasFilled = Object.values(values).some((value) => value.trim().length > 0);
    if (hasFilled) {
      setPendingRemoveIndex(index);
      return;
    }
    remove(index);
  };

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

  useEffect(() => {
    if (!teamQuery.isSuccess) {
      return;
    }

    const team = teamQuery.data.team;
    const members = teamQuery.data.members
      .filter((member) => !member.is_captain)
      .map((member) => ({
        firstName: member.first_name ?? "",
        lastName: member.last_name ?? "",
        email: member.email ?? "",
        phone: member.phone ?? "",
        telegram: member.telegram ?? "",
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
      void navigate("/settings/profile");
      return;
    }
    if (isStaffRole(profile.role)) {
      toast.error(t("settings.profile.error"));
      void navigate("/staff/profile");
      return;
    }
    if (!user.email || !profile.phone || !profile.telegram) {
      toast.error(t("toast.completeProfileContact"));
      void navigate("/settings/profile");
      return;
    }

    try {
      setHasSubmitError(false);
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
        members: values.members.map((member) => ({
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          phone: member.phone,
          telegram: member.telegram,
        })),
      });

      await queryClient.invalidateQueries({
        queryKey: ["onboarding"],
        refetchType: "all",
      });

      toast.success(t("settings.team.toast.saved"));
      reset(values);
      unsaved.confirmLeave();
      setIsEditing(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("toast.teamSaveFailed");
      toast.error(message);
      setHasSubmitError(true);
    }
  };

  const handleCancelEdit = () => {
    const team = teamQuery.data?.team;
    const members = (teamQuery.data?.members ?? [])
      .filter((member) => !member.is_captain)
      .map((member) => ({
        firstName: member.first_name ?? "",
        lastName: member.last_name ?? "",
        email: member.email ?? "",
        phone: member.phone ?? "",
        telegram: member.telegram ?? "",
      }));

    reset({
      teamName: team?.name ?? "",
      members,
    });

    setHasSubmitError(false);
    unsaved.confirmLeave();
    setIsEditing(false);
  };

  if (!userId) return null;

  if (profileQuery.isPending || teamQuery.isPending) {
    return <LoadingScreen message={t("settings.team.loading")} />;
  }

  if (profileQuery.isError || teamQuery.isError) {
    return (
      <ErrorScreen
        message={t("settings.team.error")}
        onRetry={() => {
          void profileQuery.refetch();
          void teamQuery.refetch();
        }}
      />
    );
  }

  const profile = profileQuery.data;

  if (!profile) return <Navigate to="/settings/profile" replace />;
  if (!profile.first_name || !profile.last_name)
    return <Navigate to="/settings/profile" replace />;
  if (!profile.phone || !profile.telegram)
    return <Navigate to="/settings/profile" replace />;
  if (profile.role !== "team") return <Navigate to="/staff/profile" replace />;

  const team = teamQuery.data?.team;
  const members = teamQuery.data?.members ?? [];
  const captain = members.find((member) => member.is_captain) ?? null;
  const additionalMembers = members.filter((member) => !member.is_captain);

  const teamStatusLabel = team
    ? {
        registered: t("dashboard.status.registered"),
        cancelled: t("dashboard.status.cancelled"),
        disqualified: t("dashboard.status.disqualified"),
      }[team.status]
    : t("common.noData");

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
                <CardTitle>{t("settings.team.detailsTitle")}</CardTitle>
                <CardDescription>{t("settings.team.detailsDesc")}</CardDescription>
              </div>
              <Button type="button" onClick={() => setIsEditing(true)}>
                {t("common.edit")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("onboarding.team.teamName")}
                </p>
                <p className="mt-1 font-medium">{team?.name ?? t("common.noData")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("admin.teams.table.status")}</p>
                <p className="mt-1 font-medium">{teamStatusLabel}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-sm font-medium">{t("onboarding.team.captainTitle")}</h3>
              <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                <div className="font-medium leading-6">
                  {captain?.first_name ?? profile.first_name}{" "}
                  {captain?.last_name ?? profile.last_name}
                </div>
                <div className="mt-2 text-muted-foreground leading-6">
                  {captain?.email ?? user.email ?? t("common.noData")}
                </div>
                <div className="mt-1 text-muted-foreground leading-6">
                  {captain?.telegram ?? profile.telegram}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium">{t("onboarding.team.additionalTitle")}</h3>
              {additionalMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
              ) : (
                <div className="space-y-3">
                  {additionalMembers.map((member) => (
                    <div key={member.id} className="rounded-lg border p-4 text-sm">
                      <p className="font-medium leading-6">
                        {member.first_name} {member.last_name}
                      </p>
                      <p className="mt-2 text-muted-foreground leading-6">
                        {member.email ?? t("common.noData")}
                      </p>
                      <p className="mt-1 text-muted-foreground leading-6">
                        {member.telegram ?? t("common.noData")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isEditing && (
        <Form {...form}>
          <form
            className="space-y-6"
            onSubmit={(e) => {
              void form.handleSubmit(onSubmit)(e);
            }}
          >
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>{t("settings.team.detailsTitle")}</CardTitle>
                <CardDescription>{t("settings.team.detailsDesc")}</CardDescription>
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
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{t("onboarding.team.captainTitle")}</CardTitle>
                    <CardDescription className="mt-0.5 text-xs">
                      {t("settings.team.captainSynced")}{" "}
                      <Link to="/settings/profile" className="text-primary hover:underline">
                        {t("settings.team.profileLink")}
                      </Link>
                      .
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{t("onboarding.team.autoFilled")}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
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
                  <div className="grid gap-1.5 sm:col-span-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("common.telegram")}
                    </span>
                    <Input value={profile.telegram ?? t("common.noData")} disabled />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {t("onboarding.team.additionalTitle")}
                    </CardTitle>
                    <CardDescription className="mt-0.5 text-xs">
                      {t("settings.team.additionalCount", {
                        additional: fields.length,
                        total: fields.length + 1,
                      })}
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
              <CardContent className="space-y-5">
                {form.formState.errors.members?.message && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.members.message}
                  </p>
                )}

                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="rounded-lg border border-l-4 border-l-primary/20 p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {t("dashboard.table.member")}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveMember(index)}
                        disabled={isSubmitting}
                        aria-label={t("settings.team.removeAria", { index: index + 2 })}
                      >
                        <Trash2 className="size-3.5" />
                        {t("onboarding.team.remove")}
                      </Button>
                    </div>
                    <Separator />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={control}
                        name={`members.${index}.firstName`}
                        render={({ field: memberField }) => (
                          <FormItem>
                            <FormLabel className="text-xs">{t("common.firstName")}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Alex"
                                disabled={isSubmitting}
                                {...memberField}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name={`members.${index}.lastName`}
                        render={({ field: memberField }) => (
                          <FormItem>
                            <FormLabel className="text-xs">{t("common.lastName")}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Kim"
                                disabled={isSubmitting}
                                {...memberField}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name={`members.${index}.email`}
                        render={({ field: memberField }) => (
                          <FormItem>
                            <FormLabel className="text-xs">{t("common.email")}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="alex@example.com"
                                disabled={isSubmitting}
                                {...memberField}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name={`members.${index}.phone`}
                        render={({ field: memberField }) => (
                          <FormItem>
                            <FormLabel className="text-xs">{t("common.phone")}</FormLabel>
                            <FormControl>
                              <PhoneInput
                                value={memberField.value}
                                onChange={memberField.onChange}
                                onBlur={memberField.onBlur}
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
                        render={({ field: memberField }) => (
                          <FormItem>
                            <FormLabel className="text-xs">{t("common.telegram")}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="@username"
                                disabled={isSubmitting}
                                {...memberField}
                              />
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

            <Card className="shadow-sm">
              <CardFooter className="flex flex-wrap gap-3 border-t bg-muted/30 px-6 py-4 sm:sticky sm:bottom-0 sm:z-10">
                <Button
                  type="submit"
                  disabled={isSubmitting || (!isDirty && !hasSubmitError)}
                >
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  {isSubmitting ? t("common.saving") : t("settings.team.saveTeam")}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancelEdit}>
                  {t("common.cancel")}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      )}

      <AlertDialog
        open={pendingRemoveIndex !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemoveIndex(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.team.removeMemberTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRemoveIndex !== null ? t("settings.team.removeConfirmSimple") : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingRemoveIndex !== null) {
                  remove(pendingRemoveIndex);
                  setPendingRemoveIndex(null);
                }
              }}
            >
              {t("settings.team.removeMemberConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
